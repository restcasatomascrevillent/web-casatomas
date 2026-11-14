/**
 * E2E: pestaña abierta desde antes de publicar (Super Admin › Logs: «Failed to
 * fetch dynamically imported module», 10–13/11/2026).
 *
 * Contra el build SSG real (`dist-e2e/`) servido como en Vercel
 * (`publicacion-simulada.ts`), y con builds nuevas DE VERDAD: todos los JS/CSS
 * cambian de nombre y los de la build anterior desaparecen. Como en
 * producción, las builds nuevas son del MISMO commit (el panel reconstruye la
 * web al guardar la carta).
 *
 *   1. Navegar tras una build nueva: UNA recarga, directa a la página pedida.
 *      Otra build más (mismo commit): otra recarga (antes la marca por commit
 *      lo impedía y la pestaña se quedaba rota). Ir a una página cuyo código
 *      ya estaba cargado no recarga ni rompe (antes: «Unexpected Application
 *      Error!» por los datos estáticos de vite-react-ssg). En Logs, cada fallo
 *      sale tras su recarga marcado como recuperado.
 *   2. Sin bucle: si tras recargar la pestaña sigue con la build vieja (caché),
 *      no hay segunda recarga sino el aviso «Hay una versión nueva de la web ·
 *      Toca para actualizar».
 *   3. Sin versión nueva (falla la red): no recarga; «No se pudo cargar esta
 *      página» en vez de la pantalla de desarrollador de react-router.
 */
import { test as base, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { borrarBuild, copiarBuild, copiarComoBuildNueva, copiarConCacheVieja, servirComoVercel, type OpcionesBuild, type ServidorVercel } from "./publicacion-simulada";

const DIST = path.resolve(process.cwd(), "dist-e2e");
const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const ERROR_ROUTER = /Unexpected Application Error/;

interface EventoEnviado { tipo: string; accion?: string; ruta?: string; error?: { mensaje?: string }; props?: Record<string, unknown> }

interface Web {
  url: string;
  srv: ServidorVercel;
  /** Carpeta de la build publicada ahora. */
  actual: () => string;
  /** Publica otra build (del mismo commit) hecha a partir de la actual y borra la anterior. */
  publicar: (opciones: OpcionesBuild) => Promise<string>;
  /** Publica una carpeta ya preparada (sin borrar la anterior). */
  publicarDir: (dir: string) => void;
  eventos: EventoEnviado[];
  erroresJs: string[];
}

const test = base.extend<{ web: Web }>({
  web: async ({ page, context }, usar) => {
    let actual = await copiarBuild(DIST);
    const carpetas = [actual];
    const srv = await servirComoVercel(actual);
    const eventos: EventoEnviado[] = [];
    const erroresJs: string[] = [];
    await context.addInitScript(() => {
      window.localStorage.setItem("cookieConsent", JSON.stringify({ maps: false, estadisticas: true, ts: new Date().toISOString() }));
      // Un navegador automatizado no manda actividad salvo que lo pida (src/lib/actividad/clasificar.ts).
      window.localStorage.setItem("ct_actividad_e2e", "1");
    });
    page.on("pageerror", (e) => erroresJs.push(e.message));
    await context.route("**/*", async (route) => {
      const r = route.request();
      const url = new URL(r.url());
      if (url.origin === srv.url) return route.continue();
      if (url.origin !== SUPABASE_FALSO) return route.abort("blockedbyclient");
      if (r.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      if (url.pathname.endsWith("/functions/v1/registrar-actividad-web")) {
        eventos.push(...((JSON.parse(r.postData() ?? "{}") as { eventos?: EventoEnviado[] }).eventos ?? []));
        return route.fulfill({ status: 202, headers: CORS, contentType: "application/json", body: '{"aceptados":1}' });
      }
      return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: "[]" });
    });
    await usar({
      url: srv.url,
      srv,
      actual: () => actual,
      publicar: async (opciones) => {
        const anterior = actual;
        actual = await copiarComoBuildNueva(anterior, opciones);
        carpetas.push(actual);
        srv.publicar(actual);
        await borrarBuild(anterior);
        return actual;
      },
      publicarDir: (dir) => {
        carpetas.push(dir);
        srv.publicar(dir);
      },
      eventos,
      erroresJs,
    });
    await srv.cerrar();
    await Promise.all(carpetas.map(borrarBuild));
  },
});

/** React ha hidratado la cabecera (hasta entonces los enlaces recargan la página entera). */
async function esperarHidratacion(page: Page) {
  await page.waitForFunction(() => {
    const cabecera = document.querySelector("header.site-header");
    return !!cabecera && Object.keys(cabecera).some((k) => k.startsWith("__reactFiber"));
  }, null, { timeout: 30_000 });
}

/** Fuerza el envío de lo pendiente como al cambiar de pestaña. */
async function vaciar(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });
}

const enlace = (page: Page, href: string) => page.locator(`a[href="${href}"]`).first();

test("navegar tras builds nuevas del mismo commit: una recarga por build, a la página pedida; Logs lo marca como recuperado", async ({ page, web }) => {
  await page.goto(`${web.url}/`);
  await esperarHidratacion(page);
  // El rastreador se instala en un momento ocioso (≤ 3 s): así la recarga no lo pilla a medias.
  await page.waitForTimeout(3_500);

  // Build B: la pestaña tiene la A, cuyos ficheros ya no existen.
  await web.publicar({ sufijo: "B1" });
  await enlace(page, "/carta/carnes").click();
  await expect(page).toHaveURL(`${web.url}/carta/carnes`);
  await expect(page.getByText("Carne E2E").first()).toBeVisible();
  expect(web.srv.documentos).toEqual(["/", "/carta/carnes"]);
  await esperarHidratacion(page);
  await page.waitForTimeout(3_500);

  // Build C, mismo commit. A otra categoría: su código ya está cargado → ni recarga ni pantalla de error.
  await web.publicar({ sufijo: "C1" });
  await enlace(page, "/carta/entrantes").click();
  await expect(page).toHaveURL(`${web.url}/carta/entrantes`);
  await expect(page.getByText("Entrante E2E 9").first()).toBeVisible();
  await expect(page.getByText(ERROR_ROUTER)).toHaveCount(0);
  expect(web.srv.documentos).toHaveLength(2);
  expect(web.srv.noEncontrados.filter((r) => r.includes("static-loader-data"))).toEqual([]);

  // Una página cuyo código no estaba cargado: otra recarga (la segunda build del mismo commit también).
  await enlace(page, "/carta/bebidas").click();
  await expect(page).toHaveURL(`${web.url}/carta/bebidas`);
  await expect(page.getByText("Bebida E2E").first()).toBeVisible();
  expect(web.srv.documentos).toEqual(["/", "/carta/carnes", "/carta/bebidas"]);
  await expect(page.getByText(ERROR_ROUTER)).toHaveCount(0);

  // Sin bucles: la página se queda quieta.
  await page.waitForTimeout(3_500);
  expect(web.srv.documentos).toHaveLength(3);
  await expect(page.getByText(/Hay una versión nueva/)).toHaveCount(0);

  // Super Admin › Logs: cada fallo, una vez y tras su recarga, marcado como recuperado. Los 404 de
  // las precargas de Vite de ese mismo fallo no salen: son ruido de la recarga.
  await vaciar(page);
  await expect.poll(() => web.eventos.filter((e) => e.accion === "recuperado_tras_recarga").length, { timeout: 15_000 }).toBe(2);
  const recuperados = web.eventos.filter((e) => e.tipo.startsWith("error_"));
  expect(recuperados.map((e) => e.accion)).toEqual(["recuperado_tras_recarga", "recuperado_tras_recarga"]);
  for (const e of recuperados) {
    expect(e.error?.mensaje).toMatch(/dynamically imported module|Unable to preload CSS/);
    expect(e.error?.mensaje).toContain("· recuperado: la pestaña se recargó sola con la versión nueva");
  }
  expect(web.erroresJs).toEqual([]);
});

test("sin bucle: si tras recargar sigue la build vieja (caché), avisa «Hay una versión nueva de la web» en vez de recargar otra vez", async ({ page, web }) => {
  await page.goto(`${web.url}/`);
  await esperarHidratacion(page);
  const vieja = web.actual();
  const nueva = await copiarComoBuildNueva(vieja, { sufijo: "B1" });
  // El navegador sigue sirviendo /carta/carnes de la build vieja, con los ficheros que ya tenía; el de la carta nunca lo bajó.
  web.publicarDir(await copiarConCacheVieja(nueva, vieja, { paginas: ["carta/carnes.html"], faltan: /^Categoria-/ }));

  await enlace(page, "/carta/carnes").click();
  const aviso = page.locator("#aviso-version-nueva");
  await expect(aviso).toHaveText("Hay una versión nueva de la web · Toca para actualizar");
  expect(web.srv.documentos).toEqual(["/", "/carta/carnes"]);
  await page.waitForTimeout(3_500);
  expect(web.srv.documentos).toHaveLength(2);

  // La caché se arregla (como al recargar a mano): tocar el aviso trae la build nueva.
  web.publicarDir(nueva);
  await aviso.getByRole("button").click();
  await expect(page.getByText("Carne E2E").first()).toBeVisible();
  await expect(aviso).toHaveCount(0);
  expect(web.srv.documentos).toEqual(["/", "/carta/carnes", "/carta/carnes"]);
  await esperarHidratacion(page);
  expect(await page.evaluate(() => document.querySelector("header.site-header") !== null)).toBe(true);
  // La build de la pestaña es ya la publicada.
  const publicada = JSON.parse(await readFile(path.join(nueva, "version.json"), "utf8")).build;
  expect(await page.evaluate(() => (window as Window & { __VITE_REACT_SSG_HASH__?: string }).__VITE_REACT_SSG_HASH__)).toBe(publicada);
});

test("sin versión nueva (falla la red): no recarga y la página dice «No se pudo cargar esta página»", async ({ page, web, context }) => {
  await page.goto(`${web.url}/`);
  await esperarHidratacion(page);
  await page.waitForTimeout(3_500);
  await context.route(`${web.url}/assets/Categoria-*.js`, (route) => route.abort("internetdisconnected"));

  await enlace(page, "/carta/carnes").click();
  await expect(page.getByText("No se pudo cargar esta página.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Recargar página" })).toBeVisible();
  await expect(page.getByText(ERROR_ROUTER)).toHaveCount(0);
  await page.waitForTimeout(2_000);
  expect(web.srv.documentos).toEqual(["/"]);

  await vaciar(page);
  await expect.poll(() => web.eventos.find((e) => e.tipo === "error_react")?.accion, { timeout: 15_000 }).toBe("sin_version_nueva");
  expect(web.eventos.find((e) => e.tipo === "error_react")?.props).toMatchObject({ componente: "ruta" });
});
