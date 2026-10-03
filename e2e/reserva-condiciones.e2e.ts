/**
 * E2E: condiciones de reserva + consentimiento de la newsletter en la reserva web.
 *
 * Contra el build SSG real (`vite preview` de `dist-e2e/`). La Edge Function
 * `reservas-web` se intercepta SIEMPRE con `context.route` (también en las
 * pestañas nuevas que abren los enlaces legales): nunca se llama al backend
 * real. Cualquier otra petición fuera del propio sitio se bloquea (aborta) antes
 * de salir del navegador, y al final de cada test se comprueba que las llamadas
 * a reservas-web iban al host de mentira del build E2E (si no, se estaría
 * probando otro build, p. ej. uno que apunta a Supabase de verdad).
 */
import { test as base, expect, type Locator, type Page } from "@playwright/test";
import { translations as es } from "../src/i18n/languages/es";
import { translations as en } from "../src/i18n/languages/en";
import { translations as fr } from "../src/i18n/languages/fr";

/** Host al que apunta el bundle E2E (ver scripts/e2e-build.mjs). */
const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
/** Día fijo a principios de mes: el calendario siempre ofrece días seleccionables. */
const AHORA = new Date("2026-10-05T10:00:00+02:00");
const HORA = "13:00";

type T = typeof es;
const IDIOMAS: ReadonlyArray<{ codigo: "es" | "en" | "fr"; prefijo: string; t: T }> = [
  { codigo: "es", prefijo: "", t: es },
  { codigo: "en", prefijo: "/en", t: en as unknown as T },
  { codigo: "fr", prefijo: "/fr", t: fr as unknown as T },
];

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface Backend {
  /** Cuerpos JSON recibidos en reservas-web/crear. */
  crear: Record<string, unknown>[];
  /** Origen de cada llamada a reservas-web (debe ser siempre SUPABASE_FALSO). */
  origenesReservasWeb: string[];
  /** URLs bloqueadas (todo lo que no es el propio sitio ni el backend simulado). */
  bloqueadas: string[];
}

function respuestaDisponibilidad(fecha: string) {
  return [
    { kind: "meta", fecha, cerrado: false, aforo_turno: {}, total_periodos: 1, total_ocupacion: 0 },
    {
      kind: "periodo",
      fecha,
      nombre_periodo: "Comida",
      hora_inicio: "13:00",
      hora_fin: "16:00",
      intervalo_base_minutos: 60,
      umbral_apertura_secundario: 0,
      dias_semana: [],
      ocultar_primario_si_secundario: false,
    },
    {
      kind: "hueco",
      fecha,
      hora: HORA,
      turno: "comida",
      nivel: 0,
      minutos_nivel: 60,
      etiqueta_nivel: "hora en punto",
      umbral_nivel: 0,
      estado: "libre",
      ofrecido: true,
      motivo: null,
      periodo: "Comida",
      abierto_por: null,
      abierto_con_porcentaje: null,
      promovido: false,
      comensales_hora: 0,
      reservas_hora: 0,
      porcentaje_hora: 0,
      porcentaje_para_umbral: 0,
      capacidad_maxima: 80,
      capacidad_disponible: 80,
      porcentaje_ocupacion: 0,
    },
  ];
}

const test = base.extend<{ backend: Backend }>({
  // (el segundo parámetro de una fixture se suele llamar `use`; aquí no, para
  // que la regla de hooks de React de ESLint no lo confunda con `React.use`.)
  backend: async ({ page, context, baseURL }, entregar) => {
    const backend: Backend = { crear: [], origenesReservasWeb: [], bloqueadas: [] };
    const propio = new URL(baseURL!).origin;

    // Aviso de cookies ya contestado con la opción más restrictiva (rechazar
    // lo opcional): el banner no tapa el formulario.
    await context.addInitScript(() => {
      window.localStorage.setItem("cookieConsent", JSON.stringify({ maps: false, ts: new Date().toISOString() }));
    });
    await page.clock.setFixedTime(AHORA);

    await context.route("**/*", async (route) => {
      const peticion = route.request();
      const url = new URL(peticion.url());
      if (url.origin === propio) return route.continue();

      const esReservasWeb = url.pathname.includes("/functions/v1/reservas-web/");
      if (esReservasWeb) backend.origenesReservasWeb.push(url.origin);
      if ((esReservasWeb || url.origin === SUPABASE_FALSO) && peticion.method() === "OPTIONS") {
        return route.fulfill({ status: 204, headers: CORS });
      }
      if (esReservasWeb && url.pathname.endsWith("/disponibilidad")) {
        const { fecha } = peticion.postDataJSON() as { fecha: string };
        return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(respuestaDisponibilidad(fecha)) });
      }
      if (esReservasWeb && url.pathname.endsWith("/crear")) {
        backend.crear.push(peticion.postDataJSON());
        return route.fulfill({
          status: 201,
          headers: CORS,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, reserva_id: "e2e-reserva", estado: "pendiente" }),
        });
      }
      if (url.origin === SUPABASE_FALSO) {
        // Resto de consultas del sitio a «Supabase» (carta del día, etc.): vacías.
        return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: "[]" });
      }
      backend.bloqueadas.push(peticion.url());
      return route.abort("blockedbyclient");
    });

    await entregar(backend);

    // Red de seguridad: se está probando el build E2E (reservas-web apunta al
    // host de mentira). Lo demás que intente salir ya se ha abortado arriba.
    expect(backend.origenesReservasWeb.filter((o) => o !== SUPABASE_FALSO)).toEqual([]);
  },
});

/** Locators del formulario de reserva. */
function formulario(page: Page, t: T) {
  const form = page.locator("section#reservas form");
  const f = t.reservationForm;
  return {
    form,
    condiciones: form.getByRole("checkbox", { name: new RegExp(escapar(f.termsLink), "i") }),
    newsletter: form.getByRole("checkbox", { name: f.newsletterLabel }),
    enlaceCondiciones: form.getByRole("link", { name: new RegExp(escapar(f.termsLink), "i") }),
    enlaceNewsletter: form.getByRole("link", { name: new RegExp(escapar(f.newsletterTermsLink), "i") }),
    enviar: form.getByRole("button", { name: f.submit, exact: true }),
  };
}

/**
 * Espera a que React haya hidratado: el `useEffect` de LanguageProvider
 * guarda el idioma en localStorage al montar (el contexto de cada test
 * empieza con localStorage vacío, salvo el aviso de cookies).
 */
async function esperarHidratacion(page: Page) {
  await page.waitForFunction(() => window.localStorage.getItem("language") !== null);
}

/**
 * El formulario vive en `/reservas` (rama española, `App.tsx`): es a donde
 * llevan TODOS los botones «Reservar» (Header, Hero, Footer, CTA móvil),
 * también desde `/en` y `/fr`.
 */
async function abrirFormulario(page: Page) {
  await page.goto("/reservas");
  await esperarHidratacion(page);
  const locators = formulario(page, es);
  await expect(locators.condiciones).toBeVisible();
  return locators;
}

/** Pasos 1-3 rellenos, SIN tocar ninguna casilla. */
async function rellenarSinCasillas(page: Page, form: Locator, t: T) {
  const f = t.reservationForm;
  await form.locator("button", { hasText: f.datePlaceholder }).click();
  await page.locator('button[name="day"]:not([disabled])').last().click();
  await form.getByRole("button", { name: f.checkAvailability }).click();
  await form.getByRole("button", { name: HORA, exact: true }).click();
  await form.getByRole("textbox", { name: f.nameLabel }).fill("Marta Ruiz");
  await form.getByPlaceholder("+34 612345678").fill("+34 612345678");
  await form.getByRole("textbox", { name: f.emailLabel }).fill("marta@example.com");
}

test.describe("formulario de reserva (/reservas)", () => {
  test("las dos casillas empiezan desmarcadas y sin aceptar las condiciones NO se envía nada", async ({ page, backend }) => {
    const { form, condiciones, newsletter, enviar } = await abrirFormulario(page);
    await expect(condiciones).not.toBeChecked();
    await expect(newsletter).not.toBeChecked();

    await rellenarSinCasillas(page, form, es);
    await newsletter.check(); // la newsletter sola no basta
    await enviar.click();

    await expect(form.getByText(es.validation.termsRequired)).toBeVisible();
    await expect(condiciones).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(es.reservationForm.successTitle)).toHaveCount(0);
    expect(backend.crear).toEqual([]);
  });

  test("newsletter desmarcada: viaja consentimiento_newsletter:false (booleano)", async ({ page, backend }) => {
    const { form, condiciones, enviar } = await abrirFormulario(page);
    await rellenarSinCasillas(page, form, es);
    await condiciones.check();

    const peticion = page.waitForRequest((r) => r.url().endsWith("/reservas-web/crear") && r.method() === "POST");
    await enviar.click();
    const cuerpo = (await peticion).postDataJSON();

    expect(cuerpo).toMatchObject({ acepta_condiciones: true, consentimiento_newsletter: false, hora: HORA });
    expect(typeof cuerpo.acepta_condiciones).toBe("boolean");
    expect(typeof cuerpo.consentimiento_newsletter).toBe("boolean");
    await expect(page.getByText(es.reservationForm.successTitle)).toBeVisible();
    expect(backend.crear).toHaveLength(1);
  });

  test("newsletter marcada: viaja consentimiento_newsletter:true", async ({ page, backend }) => {
    const { form, condiciones, newsletter, enviar } = await abrirFormulario(page);
    await rellenarSinCasillas(page, form, es);
    await newsletter.check();
    await condiciones.check();

    await enviar.click();
    await expect(page.getByText(es.reservationForm.successTitle)).toBeVisible();

    expect(backend.crear).toHaveLength(1);
    expect(backend.crear[0]).toMatchObject({ acepta_condiciones: true, consentimiento_newsletter: true });
  });

  test("desmarcar la newsletter tras marcarla vuelve a enviar false", async ({ page, backend }) => {
    const { form, condiciones, newsletter, enviar } = await abrirFormulario(page);
    await rellenarSinCasillas(page, form, es);
    await newsletter.check();
    await newsletter.uncheck();
    await condiciones.check();

    await enviar.click();
    await expect(page.getByText(es.reservationForm.successTitle)).toBeVisible();
    expect(backend.crear[0]).toMatchObject({ consentimiento_newsletter: false });
  });

  test("los enlaces abren las condiciones en pestaña nueva, en su sección, sin marcar la casilla", async ({ page, context }) => {
    const { condiciones, newsletter, enlaceCondiciones, enlaceNewsletter } = await abrirFormulario(page);
    const c = es.conditionsPage;

    for (const { enlace, casilla, ancla, titulo } of [
      { enlace: enlaceCondiciones, casilla: condiciones, ancla: "reservas", titulo: c.bookingHeading },
      { enlace: enlaceNewsletter, casilla: newsletter, ancla: "newsletter", titulo: c.newsletterHeading },
    ]) {
      await expect(enlace).toHaveAttribute("href", `/condiciones#${ancla}`);
      await expect(enlace).toHaveAttribute("target", "_blank");
      await expect(enlace).toHaveAttribute("rel", /noopener/);

      const [pestana] = await Promise.all([context.waitForEvent("page"), enlace.click()]);
      await pestana.waitForLoadState();
      expect(new URL(pestana.url()).pathname).toBe("/condiciones");
      expect(new URL(pestana.url()).hash).toBe(`#${ancla}`);
      const encabezado = pestana.locator(`#${ancla}-titulo`);
      await expect(encabezado).toHaveText(titulo);
      await expect(encabezado).toBeInViewport();
      await pestana.close();

      // Pulsar el enlace (dentro o junto a la etiqueta) no marca la casilla.
      await expect(casilla).not.toBeChecked();
    }
    // Y el formulario sigue en la pestaña original (no se navegó fuera).
    expect(new URL(page.url()).pathname).toBe("/reservas");
  });
});

for (const { codigo, prefijo, t } of IDIOMAS.filter((i) => i.codigo !== "es")) {
  test.describe(`condiciones en ${codigo} (${prefijo}/condiciones)`, () => {
    test("el pie de página enlaza a las condiciones en su idioma", async ({ page }) => {
      await page.goto(prefijo);
      const enlace = page.getByRole("contentinfo").getByRole("link", { name: t.footer.bookingTerms });
      await expect(enlace).toHaveAttribute("href", `${prefijo}/condiciones`);
    });

    for (const { ancla, titulo } of [
      { ancla: "reservas", titulo: t.conditionsPage.bookingHeading },
      { ancla: "newsletter", titulo: t.conditionsPage.newsletterHeading },
    ]) {
      test(`abrir ${prefijo}/condiciones#${ancla} (como la pestaña nueva) aterriza en la sección`, async ({ page }) => {
        await page.goto(`${prefijo}/condiciones#${ancla}`);
        await esperarHidratacion(page);
        const encabezado = page.locator(`#${ancla}-titulo`);
        await expect(encabezado).toHaveText(titulo);
        await expect(encabezado).toBeInViewport();
        await expect(page.locator("html")).toHaveAttribute("lang", codigo);
      });
    }

    // HALLAZGO (anterior a esta funcionalidad, pero la afecta): el formulario
    // solo existe en `/reservas` (rama española). Quien llega desde `/en` o
    // `/fr` pulsa «Reservar» y acepta las casillas EN ESPAÑOL, con enlaces a
    // `/condiciones` en español; `/en|fr/condiciones` solo se alcanzan desde el
    // pie. Cuando exista `/en/reservas` y `/fr/reservas`, quitar el fixme: sus
    // enlaces deben ir a `${prefijo}/condiciones#...`.
    test.fixme(`el formulario en ${codigo} enlaza a ${prefijo}/condiciones`, async ({ page }) => {
      await page.goto(`${prefijo}/reservas`);
      await esperarHidratacion(page);
      await expect(formulario(page, t).enlaceCondiciones).toHaveAttribute("href", `${prefijo}/condiciones#reservas`);
    });
  });
}

test.describe("página /condiciones", () => {
  for (const { codigo, prefijo, t } of IDIOMAS) {
    test(`${codigo}: prerenderizada con noindex y las dos secciones (sin JS)`, async ({ request }) => {
      const respuesta = await request.get(`${prefijo}/condiciones`);
      expect(respuesta.status()).toBe(200);
      const html = await respuesta.text();
      expect(html).toMatch(/<meta[^>]*name="robots"[^>]*content="noindex[^"]*"/);
      expect(html).toContain('id="reservas"');
      expect(html).toContain('id="newsletter"');
      expect(html).toContain(t.conditionsPage.title);
    });

    test(`${codigo}: tras hidratar sigue con noindex`, async ({ page, backend }) => {
      await page.goto(`${prefijo}/condiciones`);
      await expect(page.getByRole("heading", { level: 1, name: t.conditionsPage.title })).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      expect(backend.crear).toEqual([]);
    });
  }

  test("no aparece en el sitemap", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("<urlset");
    expect(sitemap).not.toContain("condiciones");
  });
});
