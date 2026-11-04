// ============================================================================
// Hidratación con estado ya guardado en el navegador: el primer render del
// cliente tiene que coincidir con el HTML del SSG.
// ----------------------------------------------------------------------------
// El SSG se pinta en Node, sin `localStorage` ni `sessionStorage`: en
// `/carta/vinos` sale el aviso «Activar mapa». Un visitante que YA aceptó el
// mapa (o que ya confirmó la edad, o tiene un pedido abierto) llega con ese
// estado guardado ANTES de cargar la página; si algún componente lo lee durante
// el primer render, el navegador pinta otra cosa que el HTML y React tira el
// árbol (errores #418, #422, #423, #425 del build minificado).
//
// Contra el build SSG real de `dist-e2e/` (token de Mapbox falso:
// `scripts/e2e-build.mjs`); «Supabase» devuelve un catálogo pequeño y
// `api.mapbox.com` un estilo vacío, así que no se sale nunca a la red.
// ============================================================================
import { test, expect, type Page, type Route } from "@playwright/test";
import { translations as es } from "../src/i18n/languages/es";
import { translations as en } from "../src/i18n/languages/en";
import { translations as fr } from "../src/i18n/languages/fr";

const SUPABASE_FALSO = `http://127.0.0.1:${Number(process.env.E2E_SUPABASE_PORT ?? 54329)}`;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const ESTILO_VACIO = { version: 8, name: "e2e", sources: {}, layers: [{ id: "fondo", type: "background", paint: { "background-color": "#e8e4dc" } }] };

// Tres vinos con punto en el mapa (Rioja, Champagne, Rueda).
const CATALOGO = [
  { nombre: "Tinto de Rioja", categoria: "VINOS TINTOS — RIOJA", denominacion_origen: "Rioja", ubicacion_pais: "España", ubicacion_region: "Rioja" },
  { nombre: "Champagne Brut", categoria: "VINOS ESPUMOSOS — CHAMPAGNE", denominacion_origen: "AOC Champagne", ubicacion_pais: "Francia", ubicacion_region: "Champagne" },
  { nombre: "Verdejo de Rueda", categoria: "VINOS BLANCOS — RUEDA", denominacion_origen: "D.O. Rueda", ubicacion_pais: "España", ubicacion_region: "Rueda, Castilla y León" },
].map((v, i) => ({ ...v, id: `vino-${i + 1}`, precio_eur: 20 + i, orden: i, activado: true, restaurante: true, imagen_url: null, descripcion: "" }));

/** Errores de hidratación de React: mensajes de desarrollo y códigos del build minificado (#418–#425). */
const HIDRATACION = /hydrat|did not match|server.rendered|Minified React error #4(?:1[89]|2[0-5])\b/i;

const CONSENTIMIENTO = { maps: true, ts: "2026-01-01T00:00:00.000Z" };

/** Lo que el visitante ya tenía guardado al abrir la página, antes de que corra ningún script de la web. */
type Sembrado = (page: Page) => Promise<unknown>;

const consentimientoEnLocalStorage: Sembrado = (page) =>
  page.addInitScript((valor) => window.localStorage.setItem("cookieConsent", JSON.stringify(valor)), CONSENTIMIENTO);

/** Sin `localStorage` (p. ej. se borró «solo» él): la cookie real basta. */
const consentimientoEnCookie: Sembrado = (page) =>
  page.context().addCookies([
    { name: "cookie_consent", value: encodeURIComponent(JSON.stringify(CONSENTIMIENTO)), url: `http://127.0.0.1:${process.env.E2E_PORT ?? 4391}` },
  ]);

/** Visitante que vuelve: mapa aceptado, edad confirmada, idioma guardado, pedido y «Mi mesa» abiertos. */
const visitanteQueVuelve: Sembrado = (page) =>
  page.addInitScript((valor) => {
    window.localStorage.setItem("cookieConsent", JSON.stringify(valor));
    window.localStorage.setItem("language", "en");
    window.sessionStorage.setItem("edad_vinos_confirmada", "true");
    window.sessionStorage.setItem("user_session_id", "session_e2e");
    window.sessionStorage.setItem(
      "pedidos",
      JSON.stringify({ session_e2e: [{ id: 1, nombre: "Plato E2E", precio_eur: 10, categoria: "Entrantes", cantidad: 2 }] }),
    );
    window.sessionStorage.setItem("mi_mesa", JSON.stringify({ comensales: 3, modo: "cadaUno", nombres: ["Ana", "Luis", ""], asignaciones: {} }));
  }, CONSENTIMIENTO);

/** Abre `ruta` con las respuestas falsas de Supabase y Mapbox y devuelve los errores de hidratación (consola y página). */
async function abrir(page: Page, ruta: string) {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && HIDRATACION.test(m.text())) errores.push(`console: ${m.text()}`);
  });
  await page.context().route("**/*", async (route: Route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "api.mapbox.com" || url.hostname.endsWith(".mapbox.com")) {
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      if (url.pathname.startsWith("/styles/v1/")) return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(ESTILO_VACIO) });
      return route.fulfill({ status: 204, headers: CORS });
    }
    if (url.origin === SUPABASE_FALSO) {
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      const cuerpo = url.pathname === "/rest/v1/Vinos" ? CATALOGO : [];
      return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(cuerpo) });
    }
    if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") return route.abort("blockedbyclient");
    // Los chunks perezosos llegan con retraso, como en un móvil real: el contenido
    // de la ruta (dentro de un `Suspense`) termina de hidratar DESPUÉS que el resto.
    if (url.pathname.startsWith("/assets/") && url.pathname.endsWith(".js")) await new Promise((r) => setTimeout(r, 150));
    return route.continue();
  });
  const respuesta = await page.goto(ruta);
  expect(respuesta?.status()).toBe(200);
  return errores;
}

const VINOS = ["/carta/vinos", "/en/carta/vinos", "/fr/carta/vinos"];
const IDIOMA = (ruta: string) => (ruta.startsWith("/en/") ? en : ruta.startsWith("/fr/") ? fr : es);
const ESCENARIOS: [string, Sembrado][] = [
  ["consentimiento del mapa en localStorage", consentimientoEnLocalStorage],
  ["consentimiento del mapa solo en la cookie", consentimientoEnCookie],
];

for (const ancho of [390, 1280]) {
  test.describe(`${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: 900 } });

    for (const [nombre, sembrar] of ESCENARIOS) {
      for (const ruta of VINOS) {
        test(`${ruta} con ${nombre}: se hidrata sin errores y el mapa aparece solo`, async ({ page }) => {
          await sembrar(page);
          const errores = await abrir(page, ruta);
          // Sin pulsar nada: en cuanto hidrata, el mapa aceptado sustituye al aviso del HTML.
          await expect(page.locator(".mapboxgl-map")).toBeVisible();
          await expect(page.locator(".mapboxgl-map .wine-marker")).toHaveCount(3);
          await expect(page.getByRole("button", { name: IDIOMA(ruta).cookie.mapsEnableCta })).toHaveCount(0);
          await page.waitForLoadState("networkidle");
          expect(errores).toEqual([]);
        });
      }
    }

    for (const ruta of [...VINOS, "/carta/entrantes", "/"]) {
      test(`${ruta} con el visitante que vuelve (mapa, edad, idioma, pedido y Mi mesa guardados): se hidrata sin errores`, async ({ page }) => {
        await visitanteQueVuelve(page);
        const errores = await abrir(page, ruta);
        await page.waitForLoadState("networkidle");
        // Margen para los efectos de después de hidratar (pedido, Mi mesa, idioma).
        await page.waitForTimeout(500);
        expect(errores).toEqual([]);
        if (ruta.endsWith("/carta/vinos")) {
          // Edad ya confirmada: ni diálogo ni bloqueo, y el mapa a la vista.
          await expect(page.getByRole("dialog")).toHaveCount(0);
          await expect(page.locator(".mapboxgl-map .wine-marker")).toHaveCount(3);
        }
      });
    }

    test("/carta/vinos sin consentimiento: se hidrata sin errores y sigue el aviso, sin mapa", async ({ page }) => {
      const errores = await abrir(page, "/carta/vinos");
      await expect(page.getByRole("button", { name: es.cookie.mapsEnableCta })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      expect(errores).toEqual([]);
      await expect(page.locator(".mapboxgl-map")).toHaveCount(0);
    });
  });
}

test("el HTML prerenderizado de /carta/vinos lleva el aviso del mapa y la carta, no el mapa", async ({ request }) => {
  const html = await (await request.get("/carta/vinos")).text();
  // El SSG no sabe qué eligió el visitante: pinta el caso sin consentimiento…
  expect(html).toContain(es.cookie.mapsEnableCta);
  expect(html).not.toContain("mapboxgl-map");
  // …y la carta de vinos sigue ahí, indexable.
  expect(html).toContain("Vino E2E");
});
