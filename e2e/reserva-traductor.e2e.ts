/**
 * E2E (CAS-13): la reserva no se rompe con la página traducida por el navegador.
 *
 * El 18/11/2026 un visitante con Chrome en neerlandés reservó dos veces la misma
 * mesa: su navegador traducía `/reservas` y, justo después de guardarse la
 * reserva, React tiraba la página con «NotFoundError: Failed to execute
 * 'removeChild' on 'Node'». El traductor de Chrome cambia cada texto por
 * `<font><font>texto traducido</font></font>` y deja el nodo de texto original
 * fuera del documento; cuando React lo quiere quitar (al vaciar el formulario y
 * abrir el resguardo), el navegador lanza esa excepción. El visitante veía la
 * pantalla de error en lugar del resguardo y volvía a reservar.
 *
 * Aquí se imita al traductor (mismo DOM, mismo texto para que los locators
 * sigan sirviendo) y se recorre la reserva completa: tiene que salir el
 * resguardo, sin la pantalla de error de la ruta.
 *
 * Mismo montaje que `reserva-condiciones.e2e.ts`: build SSG real, reservas-web
 * interceptada y todo lo externo bloqueado.
 */
import { test as base, expect, type Page } from "@playwright/test";
import { translations as es } from "../src/i18n/languages/es";

/**
 * La pantalla de error de la ruta (`ErrorDeRuta`, texto `falloPagina` de
 * `src/lib/textos-version-nueva.ts`). Escrito a mano: ese módulo usa el alias
 * `@/`, que el tsconfig de `e2e/` no resuelve.
 */
const FALLO_PAGINA = "No se pudo cargar esta página.";
const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
const AHORA = new Date("2026-10-05T10:00:00+02:00");
const HORA = "13:00";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function respuestaDisponibilidad(fecha: string) {
  return [
    { kind: "meta", fecha, cerrado: false, aforo_turno: {}, total_periodos: 1, total_ocupacion: 0 },
    {
      kind: "periodo", fecha, nombre_periodo: "Comida", hora_inicio: "13:00", hora_fin: "16:00",
      intervalo_base_minutos: 60, umbral_apertura_secundario: 0, dias_semana: [], ocultar_primario_si_secundario: false,
    },
    {
      kind: "hueco", fecha, hora: HORA, turno: "comida", nivel: 0, minutos_nivel: 60, etiqueta_nivel: "hora en punto",
      umbral_nivel: 0, estado: "libre", ofrecido: true, motivo: null, periodo: "Comida", abierto_por: null,
      abierto_con_porcentaje: null, promovido: false, comensales_hora: 0, reservas_hora: 0, porcentaje_hora: 0,
      porcentaje_para_umbral: 0, capacidad_maxima: 80, capacidad_disponible: 80, porcentaje_ocupacion: 0,
    },
  ];
}

const test = base.extend<{ crear: Record<string, unknown>[] }>({
  crear: async ({ page, context, baseURL }, entregar) => {
    const crear: Record<string, unknown>[] = [];
    const propio = new URL(baseURL!).origin;
    await context.addInitScript(() => {
      window.localStorage.setItem("cookieConsent", JSON.stringify({ maps: false, ts: new Date().toISOString() }));
    });
    await page.clock.setFixedTime(AHORA);
    await context.route("**/*", async (route) => {
      const peticion = route.request();
      const url = new URL(peticion.url());
      if (url.origin === propio) return route.continue();
      const esReservasWeb = url.pathname.includes("/functions/v1/reservas-web/");
      if ((esReservasWeb || url.origin === SUPABASE_FALSO) && peticion.method() === "OPTIONS") {
        return route.fulfill({ status: 204, headers: CORS });
      }
      if (esReservasWeb && url.pathname.endsWith("/disponibilidad")) {
        const { fecha } = peticion.postDataJSON() as { fecha: string };
        return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(respuestaDisponibilidad(fecha)) });
      }
      if (esReservasWeb && url.pathname.endsWith("/crear")) {
        crear.push(peticion.postDataJSON());
        return route.fulfill({
          status: 201, headers: CORS, contentType: "application/json",
          body: JSON.stringify({ ok: true, reserva_id: "e2e-reserva", estado: "pendiente" }),
        });
      }
      if (url.origin === SUPABASE_FALSO) {
        return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: "[]" });
      }
      return route.abort("blockedbyclient");
    });
    await entregar(crear);
  },
});

/**
 * Imita al traductor de Chrome: cada texto visible pasa a
 * `<font><font>texto</font></font>` y el nodo original queda FUERA del
 * documento (React lo sigue teniendo apuntado). Un MutationObserver hace lo
 * mismo con lo que se pinte después, como el traductor de verdad. El texto no
 * cambia (los locators siguen sirviendo): lo que importa es el DOM.
 */
async function traducirComoChrome(page: Page) {
  await page.evaluate(() => {
    const SALTAR = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "FONT"]);
    const envolver = (nodo: Text) => {
      const padre = nodo.parentNode;
      if (!padre || !nodo.data.trim() || SALTAR.has((padre as Element).nodeName)) return;
      const exterior = document.createElement("font");
      const interior = document.createElement("font");
      exterior.style.verticalAlign = "inherit";
      interior.style.verticalAlign = "inherit";
      interior.textContent = nodo.data;
      exterior.appendChild(interior);
      padre.replaceChild(exterior, nodo);
    };
    const recorrer = (raiz: Node) => {
      if (raiz.nodeType === Node.TEXT_NODE) return envolver(raiz as Text);
      const it = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
      const textos: Text[] = [];
      while (it.nextNode()) textos.push(it.currentNode as Text);
      textos.forEach(envolver);
    };
    document.documentElement.classList.add("translated-ltr");
    recorrer(document.body);
    new MutationObserver((cambios) => {
      for (const c of cambios) c.addedNodes.forEach((n) => recorrer(n));
    }).observe(document.body, { childList: true, subtree: true });
  });
}

test("con la página traducida por el navegador, reservar enseña el resguardo (no la pantalla de error)", async ({ page, crear }) => {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(e.message));

  await page.goto("/reservas");
  await page.waitForFunction(() => window.localStorage.getItem("language") !== null);
  const form = page.locator("section#reservas form");
  const f = es.reservationForm;
  await expect(form.getByRole("button", { name: f.submit, exact: true })).toBeVisible();

  await traducirComoChrome(page);

  await form.locator("button", { hasText: f.datePlaceholder }).click();
  await page.locator('button[name="day"]:not([disabled])').last().click();
  await form.getByRole("button", { name: f.checkAvailability }).click();
  await form.getByRole("button", { name: HORA, exact: true }).click();
  await form.getByRole("textbox", { name: f.nameLabel }).fill("Marta Ruiz");
  await form.getByPlaceholder("+34 612345678").fill("+34 612345678");
  await form.getByRole("textbox", { name: f.emailLabel }).fill("marta@example.com");
  await form.getByRole("checkbox", { name: new RegExp(f.termsLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }).check();
  await form.getByRole("button", { name: f.submit, exact: true }).click();

  await expect(page.getByText(f.successTitle)).toBeVisible();
  expect(crear).toHaveLength(1);
  await expect(page.getByText(FALLO_PAGINA)).toHaveCount(0);
  expect(errores.filter((m) => /removeChild|insertBefore|not a child of this node/i.test(m))).toEqual([]);
});
