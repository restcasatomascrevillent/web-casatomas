/**
 * E2E: condiciones de reserva + consentimiento de la newsletter en la reserva web,
 * en los tres idiomas (`/reservas`, `/en/reservas`, `/fr/reservas`).
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
import { TEXTOS_PRIVACIDAD as TEXTOS_POLITICA } from "../src/lib/politica-privacidad-textos";

/** Host al que apunta el bundle E2E (ver scripts/e2e-build.mjs). */
const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
/** Día fijo a principios de mes: el calendario siempre ofrece días seleccionables. */
const AHORA = new Date("2026-10-05T10:00:00+02:00");
const HORA = "13:00";

type T = typeof es;
type Idioma = { codigo: "es" | "en" | "fr"; prefijo: string; t: T };
const IDIOMAS: ReadonlyArray<Idioma> = [
  { codigo: "es", prefijo: "", t: es },
  { codigo: "en", prefijo: "/en", t: en as unknown as T },
  { codigo: "fr", prefijo: "/fr", t: fr as unknown as T },
];
const ESPANOL = IDIOMAS[0];
const TRADUCIDOS = IDIOMAS.filter((i) => i.codigo !== "es");

/** Etiqueta accesible del selector de idioma (la pone `Header.tsx`, por idioma). */
const CAMBIAR_IDIOMA = { es: "Cambiar idioma", en: "Change language", fr: "Changer de langue" } as const;
/** Opción del selector que lleva a cada idioma. */
const ETIQUETA_IDIOMA = { es: "Español", en: "English", fr: "Français" } as const;

/** Campos exactos que viajan a `reservas-web/crear` (los mismos en los tres idiomas). */
const CAMPOS_CREAR = [
  "acepta_condiciones", "consentimiento_newsletter", "email", "estado", "fecha", "hora",
  "nombre", "notas_cliente", "numero_comensales", "telefono",
];

/**
 * Doble opt-in: la sección #newsletter debe explicar que el alta llega solo al
 * confirmar la reserva desde el enlace del email. Texto escrito a mano (no se
 * deriva de los diccionarios) para que el test falle si alguien lo borra.
 * Sin apóstrofos: React los escapa (`&#x27;`) en el HTML del SSG.
 */
const CONFIRMACION_EMAIL: Record<"es" | "en" | "fr", { titulo: string; frase: RegExp }> = {
  es: { titulo: "Cuándo empiezas a recibirla", frase: /confirmes tu reserva desde el enlace del email/ },
  en: { titulo: "When you start receiving it", frase: /confirm your booking using the link in the email/ },
  fr: { titulo: "Quand vous commencez à la recevoir", frase: /confirmé votre réservation grâce au lien de l/ },
};

/** Origen público que usan canonical, hreflang y sitemap (`SITE_URL`, sin barra final). */
const URL_SITIO = "https://restaurantecasatomascrevillente.es";
/** React escapa `&`, `<`, `>`, `"` y `'` en el HTML del SSG. */
const escaparHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
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
 * El formulario vive en `/reservas`, `/en/reservas` y `/fr/reservas`
 * (`App.tsx`): los botones «Reservar» (Header, Hero, Footer, CTA móvil) llevan
 * a la ruta de su idioma.
 */
async function abrirFormulario(page: Page, idioma: Idioma = ESPANOL) {
  await page.goto(`${idioma.prefijo}/reservas`);
  await esperarHidratacion(page);
  const locators = formulario(page, idioma.t);
  await expect(locators.condiciones).toBeVisible();
  return locators;
}

/** Abre el selector de idioma del header (el visible: hay uno de escritorio y otro de móvil) y elige `destino`. */
async function cambiarIdioma(page: Page, desde: Idioma, destino: Idioma) {
  await page.getByRole("button", { name: CAMBIAR_IDIOMA[desde.codigo] }).filter({ visible: true }).click();
  await page.getByRole("menuitem", { name: ETIQUETA_IDIOMA[destino.codigo] }).click();
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

for (const idioma of TRADUCIDOS) {
  const { codigo, prefijo, t } = idioma;
  const f = t.reservationForm;

  test.describe(`formulario de reserva en ${codigo} (${prefijo}/reservas)`, () => {
    test("las dos casillas empiezan desmarcadas y sin aceptar las condiciones NO se envía nada (error en su idioma)", async ({ page, backend }) => {
      const { form, condiciones, newsletter, enviar } = await abrirFormulario(page, idioma);
      await expect(page.locator("html")).toHaveAttribute("lang", codigo);
      await expect(condiciones).not.toBeChecked();
      await expect(newsletter).not.toBeChecked();

      await rellenarSinCasillas(page, form, t);
      await newsletter.check(); // la newsletter sola no basta
      await enviar.click();

      await expect(form.getByText(t.validation.termsRequired)).toBeVisible();
      await expect(form.getByText(es.validation.termsRequired)).toHaveCount(0);
      await expect(condiciones).toHaveAttribute("aria-invalid", "true");
      await expect(page.getByText(f.successTitle)).toHaveCount(0);
      expect(backend.crear).toEqual([]);
    });

    test("los enlaces de las casillas abren las condiciones y la política de SU idioma en pestaña nueva, sin marcar la casilla", async ({ page, context }) => {
      const { form, condiciones, newsletter, enlaceCondiciones, enlaceNewsletter } = await abrirFormulario(page, idioma);
      const enlacePolitica = form.getByRole("link", { name: new RegExp(escapar(f.privacyLink), "i") });
      const c = t.conditionsPage;

      for (const { enlace, casilla, ruta, ancla, titulo } of [
        { enlace: enlaceCondiciones, casilla: condiciones, ruta: `${prefijo}/condiciones`, ancla: "reservas", titulo: c.bookingHeading },
        { enlace: enlaceNewsletter, casilla: newsletter, ruta: `${prefijo}/condiciones`, ancla: "newsletter", titulo: c.newsletterHeading },
        { enlace: enlacePolitica, casilla: condiciones, ruta: `${prefijo}/politica-privacidad`, ancla: "", titulo: "" },
      ]) {
        await expect(enlace).toHaveAttribute("href", ancla ? `${ruta}#${ancla}` : ruta);
        await expect(enlace).toHaveAttribute("target", "_blank");
        await expect(enlace).toHaveAttribute("rel", /noopener/);

        const [pestana] = await Promise.all([context.waitForEvent("page"), enlace.click()]);
        await pestana.waitForLoadState();
        expect(new URL(pestana.url()).pathname).toBe(ruta);
        await expect(pestana.locator("html")).toHaveAttribute("lang", codigo);
        if (ancla) {
          const encabezado = pestana.locator(`#${ancla}-titulo`);
          await expect(encabezado).toHaveText(titulo);
          await expect(encabezado).toBeInViewport();
        } else {
          await expect(pestana.getByRole("heading", { level: 1, name: TEXTOS_POLITICA[codigo].title })).toBeVisible();
        }
        await pestana.close();
        await expect(casilla).not.toBeChecked();
      }
      // Y el formulario sigue en la pestaña original (no se navegó fuera).
      expect(new URL(page.url()).pathname).toBe(`${prefijo}/reservas`);
    });

    test("el texto de las casillas no avisa de que algo esté «en español»", async ({ page }) => {
      const { form } = await abrirFormulario(page, idioma);
      await expect(form).not.toContainText(/in Spanish|en espagnol|en español/i);
    });

    test("con las dos casillas: el cuerpo enviado es idéntico al de /reservas (mismos campos) y el resguardo sale en su idioma", async ({ page, backend }) => {
      const { form, condiciones, newsletter, enviar } = await abrirFormulario(page, idioma);
      await rellenarSinCasillas(page, form, t);
      await newsletter.check();
      await condiciones.check();

      const peticion = page.waitForRequest((r) => r.url().endsWith("/reservas-web/crear") && r.method() === "POST");
      await enviar.click();
      const cuerpo = (await peticion).postDataJSON();

      expect(Object.keys(cuerpo).sort()).toEqual(CAMPOS_CREAR);
      expect(cuerpo).toMatchObject({
        nombre: "Marta Ruiz",
        telefono: "+34 612345678",
        email: "marta@example.com",
        hora: HORA,
        numero_comensales: 2,
        notas_cliente: "",
        estado: "pendiente",
        acepta_condiciones: true,
        consentimiento_newsletter: true,
      });
      expect(cuerpo.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      await expect(page.getByText(f.successTitle)).toBeVisible();
      await expect(page.getByText(f.successLead)).toBeVisible();
      await expect(page.getByText(es.reservationForm.successTitle)).toHaveCount(0);
      expect(backend.crear).toHaveLength(1);
    });

    test("newsletter desmarcada: viaja consentimiento_newsletter:false (booleano) y cerrar el resguardo vuelve a la portada del idioma", async ({ page, backend }) => {
      const { form, condiciones, enviar } = await abrirFormulario(page, idioma);
      await rellenarSinCasillas(page, form, t);
      await condiciones.check();
      await enviar.click();
      await expect(page.getByText(f.successTitle)).toBeVisible();

      expect(backend.crear).toHaveLength(1);
      expect(backend.crear[0]).toMatchObject({ acepta_condiciones: true, consentimiento_newsletter: false });
      expect(typeof backend.crear[0].consentimiento_newsletter).toBe("boolean");

      await page.getByRole("button", { name: f.successButton }).click();
      await expect.poll(() => new URL(page.url()).pathname).toBe(prefijo);
      await expect(page.locator("html")).toHaveAttribute("lang", codigo);
    });

    test("los botones «Reservar» de la portada y del pie llevan a las reservas de su idioma", async ({ page }) => {
      await page.goto(prefijo);
      await esperarHidratacion(page);
      await page.getByRole("button", { name: t.header.cta, exact: true }).filter({ visible: true }).first().click();
      await expect.poll(() => new URL(page.url()).pathname).toBe(`${prefijo}/reservas`);
      await expect(formulario(page, t).condiciones).toBeVisible();

      await page.goto(prefijo);
      await esperarHidratacion(page);
      await expect(page.getByRole("link", { name: t.hero.ctaPrimary }).first()).toHaveAttribute("href", `${prefijo}/reservas`);
      const pie = page.getByRole("contentinfo");
      await expect(pie.getByRole("link", { name: t.footer.reserveLink, exact: true })).toHaveAttribute("href", `${prefijo}/reservas`);
      await expect(pie.getByRole("link", { name: t.footer.terms, exact: true })).toHaveAttribute("href", `${prefijo}/politica-privacidad`);
    });
  });

  test.describe(`prerenderizado de ${prefijo}/reservas y ${prefijo}/politica-privacidad`, () => {
    test("reservas: HTML con el idioma, canonical propio, hreflang es/en/fr/x-default, indexable y con el formulario (sin JS)", async ({ request }) => {
      const respuesta = await request.get(`${prefijo}/reservas`);
      expect(respuesta.status()).toBe(200);
      const html = await respuesta.text();
      expect(html).toMatch(new RegExp(`<html[^>]*lang="${codigo}"`));
      expect(html).toContain(escaparHtml(t.reservasPage.seoTitle));
      expect(html).toContain(`rel="canonical" href="${URL_SITIO}${prefijo}/reservas"`);
      for (const [hreflang, ruta] of [["es", "/reservas"], ["en", "/en/reservas"], ["fr", "/fr/reservas"], ["x-default", "/reservas"]]) {
        expect(html).toMatch(new RegExp(`<link[^>]*hreflang="${hreflang}"[^>]*href="${URL_SITIO}${ruta}"`, "i"));
      }
      expect(html).not.toMatch(/name="robots"[^>]*noindex/);
      expect(html).toContain(escaparHtml(f.stepOne));
      expect(html).toContain(escaparHtml(f.termsLink));
      expect(html).toContain(`href="${prefijo}/condiciones#reservas"`);
      expect(html).toContain(`href="${prefijo}/politica-privacidad"`);
    });

    test("política de privacidad: HTML con el idioma, noindex y sin hreflang", async ({ request }) => {
      const respuesta = await request.get(`${prefijo}/politica-privacidad`);
      expect(respuesta.status()).toBe(200);
      const html = await respuesta.text();
      expect(html).toMatch(new RegExp(`<html[^>]*lang="${codigo}"`));
      expect(html).toMatch(/<meta[^>]*name="robots"[^>]*content="noindex[^"]*"/);
      expect(html).toContain(escaparHtml(TEXTOS_POLITICA[codigo].title));
      expect(html).toContain(escaparHtml(TEXTOS_POLITICA[codigo].controller.heading));
      expect(html).not.toMatch(/hreflang=/i);
      expect(html).not.toMatch(/in Spanish|en espagnol/i);
    });
  });
}

test.describe("sitemap y páginas solo en español", () => {
  test("/reservas sale en el sitemap en los tres idiomas con alternates; la política y las condiciones no salen", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const ruta of ["/reservas", "/en/reservas", "/fr/reservas"]) {
      expect(sitemap).toContain(`<loc>${URL_SITIO}${ruta}</loc>`);
    }
    const inicio = sitemap.indexOf(`<loc>${URL_SITIO}/en/reservas</loc>`);
    const bloque = sitemap.slice(inicio, sitemap.indexOf("</url>", inicio));
    for (const [hreflang, ruta] of [["es", "/reservas"], ["en", "/en/reservas"], ["fr", "/fr/reservas"], ["x-default", "/reservas"]]) {
      expect(bloque).toContain(`hreflang="${hreflang}" href="${URL_SITIO}${ruta}"`);
    }
    expect(sitemap).not.toContain("politica-privacidad");
    expect(sitemap).not.toContain("condiciones");
  });

  for (const ruta of ["/reserva/respuesta", "/newsletter/baja"]) {
    test(`${ruta} sigue solo en español (los correos enlazan a esa versión): no hay ${ruta} en /en ni /fr`, async ({ request }) => {
      const respuestaEs = await request.get(ruta);
      expect(respuestaEs.status()).toBe(200);
      expect(await respuestaEs.text()).toMatch(/<html[^>]*lang="es"/);
      for (const { prefijo } of TRADUCIDOS) {
        const otra = await request.get(`${prefijo}${ruta}`);
        // Sin fichero prerenderizado (Vercel sirve el 404): ni canonical ni página propia en ese idioma.
        expect(await otra.text()).not.toContain(`href="${URL_SITIO}${prefijo}${ruta}"`);
      }
    });
  }
});

test.describe("selector de idioma en /reservas (existe en los tres idiomas)", () => {
  for (const destino of TRADUCIDOS) {
    test(`de /reservas a ${destino.codigo}: va a ${destino.prefijo}/reservas con el formulario en su idioma`, async ({ page }) => {
      await abrirFormulario(page);
      await cambiarIdioma(page, ESPANOL, destino);

      await expect.poll(() => new URL(page.url()).pathname).toBe(`${destino.prefijo}/reservas`);
      await expect(page.locator("html")).toHaveAttribute("lang", destino.codigo);
      await expect(page.getByRole("heading", { level: 1, name: destino.t.notFound.title })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: destino.t.reservas.title })).toBeVisible();
      await expect(formulario(page, destino.t).condiciones).toBeVisible();
    });
  }

  test("de /en/reservas a fr y de vuelta a es: conserva la página en cada idioma", async ({ page }) => {
    const [ingles, frances] = TRADUCIDOS;
    await abrirFormulario(page, ingles);
    await cambiarIdioma(page, ingles, frances);
    await expect.poll(() => new URL(page.url()).pathname).toBe("/fr/reservas");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");

    await cambiarIdioma(page, frances, ESPANOL);
    await expect.poll(() => new URL(page.url()).pathname).toBe("/reservas");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(formulario(page, es).condiciones).toBeVisible();
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

    // Antes era un `test.fixme`: el formulario solo existía en `/reservas` y sus
    // casillas abrían `/condiciones` en español incluso desde `/en` y `/fr`.
    test(`el formulario en ${codigo} enlaza a ${prefijo}/condiciones`, async ({ page }) => {
      const { enlaceCondiciones, enlaceNewsletter } = await abrirFormulario(page, { codigo, prefijo, t });
      await expect(enlaceCondiciones).toHaveAttribute("href", `${prefijo}/condiciones#reservas`);
      await expect(enlaceNewsletter).toHaveAttribute("href", `${prefijo}/condiciones#newsletter`);
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

      // La sección de la newsletter (ya en el HTML, sin JS) explica la
      // confirmación por email.
      const inicio = html.indexOf('id="newsletter"');
      const seccion = html.slice(inicio, html.indexOf("</section>", inicio));
      expect(seccion).toContain(CONFIRMACION_EMAIL[codigo].titulo);
      expect(seccion).toMatch(CONFIRMACION_EMAIL[codigo].frase);
    });

    test(`${codigo}: tras hidratar sigue con noindex`, async ({ page, backend }) => {
      await page.goto(`${prefijo}/condiciones`);
      await expect(page.getByRole("heading", { level: 1, name: t.conditionsPage.title })).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      expect(backend.crear).toEqual([]);
    });

    test(`${codigo}: la sección #newsletter avisa de que el alta llega al confirmar la reserva desde el email`, async ({ page }) => {
      await page.goto(`${prefijo}/condiciones#newsletter`);
      await esperarHidratacion(page);
      const seccion = page.locator("section#newsletter");
      await expect(seccion.getByRole("heading", { level: 3, name: CONFIRMACION_EMAIL[codigo].titulo })).toBeVisible();
      await expect(seccion).toContainText(CONFIRMACION_EMAIL[codigo].frase);
    });
  }

  test("no aparece en el sitemap", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("<urlset");
    expect(sitemap).not.toContain("condiciones");
  });
});
