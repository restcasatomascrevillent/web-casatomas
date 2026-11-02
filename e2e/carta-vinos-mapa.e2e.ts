/**
 * El mapa de `/carta/vinos` sigue los filtros de la carta (tipo, denominación y
 * buscador) y encuadra los vinos que quedan. Contra el build SSG real de
 * `dist-e2e/` (con un token de Mapbox falso: `scripts/e2e-build.mjs`);
 * «Supabase» devuelve un catálogo pequeño y `api.mapbox.com` un estilo vacío,
 * así que no se sale nunca a la red.
 */
import { test as base, expect, type Page, type Route } from "@playwright/test";
import { translations as es } from "../src/i18n/languages/es";

const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const ESTILO_VACIO = { version: 8, name: "e2e", sources: {}, layers: [{ id: "fondo", type: "background", paint: { "background-color": "#e8e4dc" } }] };

// Tres vinos con punto en el mapa (Rioja, Champagne, Rueda) y uno sin él (Galicia).
const CATALOGO = [
  { nombre: "Tinto de Rioja", categoria: "VINOS TINTOS — RIOJA", denominacion_origen: "Rioja", ubicacion_pais: "España", ubicacion_region: "Rioja" },
  { nombre: "Champagne Brut", categoria: "VINOS ESPUMOSOS — CHAMPAGNE", denominacion_origen: "AOC Champagne", ubicacion_pais: "Francia", ubicacion_region: "Champagne" },
  { nombre: "Verdejo de Rueda", categoria: "VINOS BLANCOS — RUEDA", denominacion_origen: "D.O. Rueda", ubicacion_pais: "España", ubicacion_region: "Rueda, Castilla y León" },
  { nombre: "Albariño gallego", categoria: "VINOS BLANCOS — RÍAS BAIXAS", denominacion_origen: "D.O. Rías Baixas", ubicacion_pais: "España", ubicacion_region: "Galicia" },
].map((v, i) => ({ ...v, id: `vino-${i + 1}`, precio_eur: 20 + i, orden: i, activado: true, restaurante: true, imagen_url: null, descripcion: "" }));

/**
 * El visitante acepta el mapa DESPUÉS de hidratar (como al pulsar «Activar
 * mapa»): con el consentimiento ya guardado antes de cargar, el primer render
 * del navegador no coincide con el del SSG.
 */
async function aceptarMapa(page: Page) {
  await page.evaluate(() => {
    const valor = { maps: true, ts: new Date().toISOString() };
    window.localStorage.setItem("cookieConsent", JSON.stringify(valor));
    window.dispatchEvent(new CustomEvent("cookie-consent:changed", { detail: valor }));
  });
}

function consultarVinos(url: URL) {
  let filas = [...CATALOGO];
  for (const [clave, valor] of url.searchParams) {
    if (["select", "order", "offset", "limit"].includes(clave)) continue;
    const [op, ...resto] = valor.split(".");
    const dato = resto.join(".");
    if (op === "eq") filas = filas.filter((f) => String(f[clave as keyof typeof f]) === dato);
    if (op === "in") {
      const permitidos = dato.replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, ""));
      filas = filas.filter((f) => permitidos.includes(String(f[clave as keyof typeof f])));
    }
  }
  const desde = Number(url.searchParams.get("offset") ?? 0);
  return filas.slice(desde, desde + Number(url.searchParams.get("limit") ?? 1000));
}

const test = base.extend<{ erroresJs: string[] }>({
  erroresJs: async ({ page, context, baseURL }, entregar) => {
    const errores: string[] = [];
    const propio = new URL(baseURL!).origin;
    page.on("pageerror", (error) => errores.push(error.message));
    await context.route("**/*", async (route: Route) => {
      const url = new URL(route.request().url());
      if (url.origin === propio) return route.continue();
      if (url.hostname === "api.mapbox.com" || url.hostname.endsWith(".mapbox.com")) {
        if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
        if (url.pathname.startsWith("/styles/v1/")) return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(ESTILO_VACIO) });
        return route.fulfill({ status: 204, headers: CORS });
      }
      if (url.origin !== SUPABASE_FALSO) return route.abort("blockedbyclient");
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      const cuerpo = url.pathname === "/rest/v1/Vinos" ? consultarVinos(url) : [];
      return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(cuerpo) });
    });
    await entregar(errores);
    expect(errores, "errores JavaScript sin capturar").toEqual([]);
  },
});

for (const ancho of [390, 1280]) {
  test(`${ancho}px: el mapa sigue los filtros de tipo, denominación y búsqueda y encuadra lo que queda`, async ({ page, erroresJs: _ }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto("/carta/vinos");
    const dialogo = page.getByRole("dialog");
    await dialogo.getByRole("button", { name: es.vinos.ageCheckConfirm }).click();
    await expect(dialogo).toBeHidden();
    await aceptarMapa(page);

    const mapa = page.locator(".mapboxgl-map");
    const marcadores = mapa.locator(".wine-marker");
    const chipGalicia = page.getByRole("button", { name: "Galicia (1)" });
    const tipos = page.getByRole("group", { name: "Filtrar vinos por tipo" });

    // Por defecto, todos: tres puntos y el vino sin ubicación puntual.
    await expect(marcadores).toHaveCount(3);
    await expect(chipGalicia).toBeVisible();

    // El marcador que queda se encuadra en el centro del mapa (con la vista general, a 12º del centro, estaría a ~30 px).
    const alCentro = async () => {
      const caja = (await mapa.boundingBox())!;
      const punto = (await marcadores.first().boundingBox())!;
      return {
        dx: Math.abs(punto.x + punto.width / 2 - (caja.x + caja.width / 2)),
        dy: Math.abs(punto.y + punto.height / 2 - (caja.y + caja.height / 2)),
      };
    };

    await tipos.getByRole("button", { name: "Tintos" }).click();
    await expect(marcadores).toHaveCount(1);
    await expect(chipGalicia).toHaveCount(0);
    await expect.poll(async () => (await alCentro()).dx, { message: "encuadre horizontal" }).toBeLessThan(6);
    await expect.poll(async () => (await alCentro()).dy, { message: "encuadre vertical" }).toBeLessThan(6);

    // Denominación (tipo Blancos → Rueda): otro punto, y el vino sin punto sigue en la lista de debajo.
    await tipos.getByRole("button", { name: "Blancos" }).click();
    await expect(marcadores).toHaveCount(1);
    await expect(chipGalicia).toBeVisible();
    await page.getByRole("group", { name: "Filtrar vinos por denominación" }).getByRole("button", { name: "Rueda" }).click();
    await expect(marcadores).toHaveCount(1);
    await expect(chipGalicia).toHaveCount(0);

    // Buscador, sin tipo: el punto de Champagne.
    await tipos.getByRole("button", { name: "Todos" }).click();
    await expect(marcadores).toHaveCount(3);
    await page.getByRole("searchbox").fill("champagne");
    await expect(marcadores).toHaveCount(1);
    await expect(marcadores.first()).toHaveAttribute("title", /Champagne/);

    // Una búsqueda sin ningún vino situable: aviso en vez de un mapa vacío sin explicación.
    await page.getByRole("searchbox").fill("albariño");
    await expect(marcadores).toHaveCount(0);
    await expect(mapa.locator("xpath=..").getByRole("status")).toContainText("no tienen ubicación puntual verificada");
    await expect(chipGalicia).toBeVisible();

    // Sin filtros, todo como al entrar.
    await page.getByRole("searchbox").fill("");
    await expect(marcadores).toHaveCount(3);
    await expect(chipGalicia).toBeVisible();
    await expect(mapa.locator("xpath=..").getByRole("status")).toBeEmpty();
  });
}

test("con prefers-reduced-motion el mapa se encuadra sin animación", async ({ page, erroresJs: _ }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/carta/vinos");
  await page.getByRole("dialog").getByRole("button", { name: es.vinos.ageCheckConfirm }).click();
  await aceptarMapa(page);
  const mapa = page.locator(".mapboxgl-map");
  const marcadores = mapa.locator(".wine-marker");
  await expect(marcadores).toHaveCount(3);
  await page.getByRole("group", { name: "Filtrar vinos por tipo" }).getByRole("button", { name: "Tintos" }).click();
  await expect(marcadores).toHaveCount(1);
  // Sin animación el marcador ya está en el centro un instante después (la animación dura 900 ms).
  await page.waitForTimeout(150);
  const caja = (await mapa.boundingBox())!;
  const punto = (await marcadores.first().boundingBox())!;
  expect(Math.abs(punto.x + punto.width / 2 - (caja.x + caja.width / 2))).toBeLessThan(6);
  expect(Math.abs(punto.y + punto.height / 2 - (caja.y + caja.height / 2))).toBeLessThan(6);
});
