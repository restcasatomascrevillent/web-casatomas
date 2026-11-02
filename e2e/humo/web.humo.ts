/**
 * Prueba rápida («humo») de la web ya desplegada. Se lanza con
 * `BASE_URL=<url> npm run test:humo` (ver `playwright.humo.config.ts`).
 *
 * SOLO LECTURA, también en producción:
 *  - se cortan todas las peticiones que no sean GET/HEAD/OPTIONS (Supabase lee
 *    por GET a `/rest/v1/...`; las escrituras y las funciones van por POST);
 *  - se cortan las de Vercel Analytics / Speed Insights para no ensuciar la analítica;
 *  - se rechazan las cookies de antemano;
 *  - no se toca el chatbot ni ningún formulario.
 *
 * Qué comprueba, en escritorio (1440x900) y en móvil (375x812): portada, /version.json,
 * carta, menú del día e idioma. Las comprobaciones anotan lo que ven (versión, commit,
 * si salió el menú del día...) como `annotations`, que acaban en el informe HTML y en
 * el resumen del workflow.
 */
import { test as base, expect, type Locator, type Page } from "@playwright/test";

const METODOS_DE_LECTURA = new Set(["GET", "HEAD", "OPTIONS"]);
const ANALITICA_VERCEL = /\/_vercel\/(insights|speed-insights)(\/|$)/;

const test = base.extend<{ erroresJs: string[] }>({
  erroresJs: [
    async ({ page, context, baseURL }, entregar) => {
      const errores: string[] = [];
      const propio = new URL(baseURL!).origin;
      const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
      const cortadas: string[] = [];

      // Rechazar las cookies = lo que guarda el botón «Rechazar» (ver lib/cookie-consent.ts).
      await context.addInitScript(() => {
        try {
          window.localStorage.setItem("cookieConsent", JSON.stringify({ maps: false, ts: new Date().toISOString() }));
        } catch {
          /* sin localStorage: el aviso de cookies saldrá y no estorba a lo que se comprueba */
        }
      });

      page.on("pageerror", (error) => errores.push(error.message));

      await context.route("**/*", async (route) => {
        const peticion = route.request();
        const url = peticion.url();
        if (!METODOS_DE_LECTURA.has(peticion.method()) || ANALITICA_VERCEL.test(new URL(url).pathname)) {
          cortadas.push(`${peticion.method()} ${new URL(url).pathname}`);
          return route.abort("blockedbyclient");
        }
        // El bypass de Vercel solo se manda al propio sitio: con `extraHTTPHeaders`
        // llegaría también a Supabase y a cualquier tercero, y el secreto no es suyo.
        if (bypass && new URL(url).origin === propio) {
          return route.continue({
            headers: {
              ...peticion.headers(),
              "x-vercel-protection-bypass": bypass,
              "x-vercel-set-bypass-cookie": "true",
            },
          });
        }
        return route.continue();
      });

      await entregar(errores);

      const escrituras = cortadas.filter((c) => !c.includes("/_vercel/"));
      if (escrituras.length > 0) {
        test.info().annotations.push({ type: "peticiones de escritura cortadas", description: [...new Set(escrituras)].join(", ") });
      }
      expect(errores, "errores JavaScript sin capturar (incluida la hidratación)").toEqual([]);
    },
    { auto: true },
  ],
});

/** Quita el secreto del bypass (si lo hay) de un texto, por si algún error lo arrastrase. */
function redactar(texto: string): string {
  const secreto = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  return secreto ? texto.split(secreto).join("[secreto-redactado]") : texto;
}

function anotar(tipo: string, descripcion: string) {
  test.info().annotations.push({ type: tipo, description: descripcion });
}

/** Día de la semana (0 = domingo) en Madrid, como lo calcula el propio componente. */
function diaSemanaMadrid(): number {
  const dia = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", weekday: "short" }).format(new Date());
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(dia);
}

/**
 * Espera a que React haya hidratado la cabecera. Las páginas son HTML estático
 * (SSG) hasta que llega y se ejecuta el JS: un clic anterior no hace nada.
 *
 * Causa de la inestabilidad TEC-09 (móvil, «carta», 1 de 3 en la demo): antes se
 * repetía el clic durante 15 s esperando 1 s cada vez; con la demo en frío (primera
 * visita: Vercel sirve los chunks sin caché y Supabase arranca) la hidratación
 * podía pasar de 15 s y la prueba fallaba sin que la web lo hiciera. Ahora se
 * espera a la condición real: React deja `__reactProps$…` en cada nodo que hidrata.
 */
async function esperarHidratacion(page: Page) {
  await page.waitForFunction(
    () => {
      const boton = document.querySelector("header button[aria-label]");
      return !!boton && Object.keys(boton).some((k) => k.startsWith("__reactProps$"));
    },
    undefined,
    { timeout: 40_000 },
  );
}

/** Abre el menú de hamburguesa solo si el botón está a la vista (móvil). */
async function abrirMenuSiHaceFalta(page: Page, enlace: Locator) {
  await esperarHidratacion(page);
  const abrir = page.getByRole("button", { name: "Abrir menú" });
  if (await abrir.isVisible()) await abrir.click();
  await expect(enlace).toBeVisible();
}

/** Abre el desplegable de idioma, ya hidratada la página. */
async function abrirIdiomas(page: Page, nombreBoton: string, idioma: string) {
  await esperarHidratacion(page);
  const opcion = page.getByRole("menuitem", { name: idioma });
  if (!(await opcion.isVisible())) await page.getByRole("button", { name: nombreBoton }).click();
  await expect(opcion).toBeVisible();
  return opcion;
}

test.describe("web en producción o demo (solo lectura)", () => {
  test("portada: responde 200 y no hay errores de JavaScript", async ({ page }) => {
    const respuesta = await page.goto("/");
    expect(respuesta?.status(), "estado HTTP de la portada").toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("button", { name: "Cambiar idioma" })).toBeVisible();
    await expect(page.locator("#carta")).toBeAttached();
    // Margen para que hidrate y carguen las secciones en diferido: cualquier
    // `pageerror` de ese rato lo recoge la fixture al terminar.
    await page.waitForLoadState("networkidle").catch(() => undefined);
  });

  test("/version.json: anota versión y commit", async ({ page }) => {
    // Se pide con `page.goto` y no con `request.get(..., { headers })`: así la cabecera
    // del bypass la pone solo el `context.route` de la fixture y nunca aparece en el
    // «Call log» del error de Playwright (que acababa en consola, JSON e informe HTML).
    let respuesta;
    try {
      respuesta = await page.goto("/version.json");
    } catch (error) {
      throw new Error(redactar(error instanceof Error ? error.message : String(error)));
    }
    expect(respuesta?.status(), "estado HTTP de /version.json").toBe(200);
    const datos = (await respuesta!.json()) as { version?: unknown; commit?: unknown; entorno?: unknown; rama?: unknown };
    expect(typeof datos.version, "version").toBe("string");
    expect(typeof datos.commit, "commit").toBe("string");
    const version = String(datos.version);
    const commit = String(datos.commit);
    anotar("versión", `v${version} · ${commit} (rama ${String(datos.rama ?? "?")}, entorno ${String(datos.entorno ?? "?")})`);

    const esperado = process.env.EXPECTED_COMMIT?.trim().toLowerCase();
    if (esperado) {
      // /version.json lleva el SHA corto y el despliegue de GitHub el largo.
      const obtenido = commit.toLowerCase();
      const coincide = obtenido.length >= 7 && (esperado.startsWith(obtenido) || obtenido.startsWith(esperado));
      expect(coincide, `el commit publicado (${commit}) no es el esperado (${esperado.slice(0, 7)})`).toBe(true);
      anotar("commit esperado", `${esperado.slice(0, 7)}: coincide`);
    }
  });

  test("carta: del menú a /carta, abrir una categoría y ver platos", async ({ page }) => {
    await page.goto("/");

    // «Carta» del menú de la cabecera lleva a la sección de la portada...
    const enlaceCarta = page.locator("header").getByRole("link", { name: "Carta", exact: true });
    await abrirMenuSiHaceFalta(page, enlaceCarta);
    await enlaceCarta.click();
    await expect(page.locator("#carta")).toBeInViewport();

    // ... y de ahí se entra a la carta completa (enlace real a /carta, en el pie).
    await page.getByRole("link", { name: "Nuestra carta" }).click();
    await expect(page).toHaveURL(/\/carta\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Una categoría de platos (los vinos y las bebidas tienen su propia página y verificación de edad).
    const categoria = page
      .locator('main a[href^="/carta/"]:not([href="/carta/vinos"]):not([href="/carta/bebidas"])')
      .first();
    await expect(categoria).toBeVisible();
    await categoria.click();
    await expect(page).toHaveURL(/\/carta\/[^/]+\/?$/);

    const platos = page.locator('main [id^="plato-"]');
    await expect(platos.first()).toBeAttached();
    expect(await platos.count(), "platos en la categoría").toBeGreaterThan(0);
    anotar("carta", `${await platos.count()} platos en ${new URL(page.url()).pathname}`);
  });

  test("menú del día: bloque o estado vacío documentado", async ({ page }) => {
    // El menú de mediodía solo existe de martes a jueves (hora de Madrid) y si el
    // panel no lo ha ocultado (`MenuDiarioCards`: «Cada tarjeta solo existe el día
    // que toca»). Fuera de eso el componente no pinta nada: es el estado vacío.
    const configuracion = page
      .waitForResponse((r) => r.url().includes("/rest/v1/configuracion_web") && r.request().method() === "GET", { timeout: 20_000 })
      .catch(() => null);

    await page.goto("/");
    await page.locator("#novedades").scrollIntoViewIfNeeded();
    await expect(page.locator("#novedades h2").first()).toBeVisible();

    let menuActivadoEnPanel = true;
    const respuestaConfiguracion = await configuracion;
    if (respuestaConfiguracion?.ok()) {
      const filas = (await respuestaConfiguracion.json().catch(() => [])) as Array<{ mostrar_menu_dia_casa_tomas?: boolean }>;
      menuActivadoEnPanel = filas?.[0]?.mostrar_menu_dia_casa_tomas !== false;
    }
    await page.waitForLoadState("networkidle").catch(() => undefined);

    const dia = diaSemanaMadrid();
    const tocaMenu = dia >= 2 && dia <= 4 && menuActivadoEnPanel;
    const bloque = page.getByRole("heading", { name: "Menú de mediodía" });
    const boton = page.getByRole("button", { name: "Ver menú de hoy" });

    if (!tocaMenu) {
      await expect(bloque).toHaveCount(0);
      anotar(
        "menú del día",
        menuActivadoEnPanel
          ? "estado vacío documentado: hoy no es martes a jueves, no hay bloque"
          : "estado vacío documentado: el panel tiene el menú del día oculto, no hay bloque",
      );
      return;
    }

    await expect(bloque).toBeVisible();
    await boton.click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo).toBeVisible();
    const sinMenu = await dialogo.getByText("No hay menú disponible hoy").isVisible();
    anotar("menú del día", sinMenu ? "bloque visible; el diálogo dice «No hay menú disponible hoy»" : "bloque visible con el menú de hoy cargado");
  });

  test("idioma: español, English y Français", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByText("Reservar mesa").locator("visible=true").first()).toBeVisible();
    const tituloEs = await page.title();

    // Español -> English
    await (await abrirIdiomas(page, "Cambiar idioma", "English")).click();
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByText("Book a Table").locator("visible=true").first()).toBeVisible();
    await expect(page.getByText("Reservar mesa").locator("visible=true")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Change language" })).toBeVisible();
    const tituloEn = await page.title();
    expect(tituloEn, "el título de la página cambia con el idioma").not.toBe(tituloEs);

    // English -> Français
    await (await abrirIdiomas(page, "Change language", "Français")).click();
    await expect(page).toHaveURL(/\/fr\/?$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.getByText("Réserver une table").locator("visible=true").first()).toBeVisible();
    await expect(page.getByText("Book a Table").locator("visible=true")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Changer de langue" })).toBeVisible();
  });
});
