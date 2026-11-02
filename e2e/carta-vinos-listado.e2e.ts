/**
 * «Ver listado completo de vinos y precios» en `/carta/vinos` (QA: en el móvil
 * el precio quedaba fuera de la pantalla, dentro de un scroll horizontal de la
 * tabla). Contra el build SSG real de `dist-e2e/`; «Supabase» devuelve un
 * catálogo pequeño con los nombres más largos de la carta real, y el precio
 * más ancho que puede salir («1.234,50 €» cuando cambie el formato; hoy
 * «Consultar precio» es el más largo).
 */
import { test as base, expect, type Route } from "@playwright/test";
import { translations as es } from "../src/i18n/languages/es";

const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };

const MAS_LARGO = "L. Roederer Brut Vintage Rosé 2012 (Magnum)";
const CATALOGO = [
  { nombre: MAS_LARGO, categoria: "VINOS ESPUMOSOS — CHAMPAGNE", denominacion_origen: "AOC Champagne", precio_eur: 1234.5, ubicacion_pais: "Francia" },
  { nombre: "Castillo de Peñafiel Vendimia Seleccionada", categoria: "VINOS TINTOS — RIBERA DEL DUERO", denominacion_origen: "D.O. Ribera del Duero", precio_eur: 0, ubicacion_pais: "España" },
  { nombre: "Capellanía Reserva (Marqués de Murrieta)", categoria: "VINOS BLANCOS — RIOJA", denominacion_origen: "D.O.Ca. Rioja", precio_eur: 86, ubicacion_pais: "España" },
].map((v, i) => ({ ...v, id: `vino-${i + 1}`, orden: i, activado: true, restaurante: true, imagen_url: null, ubicacion_region: "", descripcion: "" }));

function consultarVinos(url: URL) {
  let filas = [...CATALOGO];
  for (const [clave, valor] of url.searchParams) {
    if (["select", "order", "offset", "limit"].includes(clave)) continue;
    const [op, ...resto] = valor.split(".");
    if (op === "eq") filas = filas.filter((f) => String(f[clave as keyof typeof f]) === resto.join("."));
  }
  const desde = Number(url.searchParams.get("offset") ?? 0);
  return filas.slice(desde, desde + Number(url.searchParams.get("limit") ?? 1000));
}

const test = base.extend<{ erroresJs: string[] }>({
  erroresJs: async ({ page, context, baseURL }, entregar) => {
    const errores: string[] = [];
    const propio = new URL(baseURL!).origin;
    await context.addInitScript(() => {
      window.localStorage.setItem("cookieConsent", JSON.stringify({ maps: false, ts: new Date().toISOString() }));
    });
    page.on("pageerror", (error) => errores.push(error.message));
    await context.route("**/*", async (route: Route) => {
      const url = new URL(route.request().url());
      if (url.origin === propio) return route.continue();
      if (url.origin !== SUPABASE_FALSO) return route.abort("blockedbyclient");
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      const cuerpo = url.pathname === "/rest/v1/Vinos" ? consultarVinos(url) : [];
      return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(cuerpo) });
    });
    await entregar(errores);
    expect(errores, "errores JavaScript sin capturar").toEqual([]);
  },
});

for (const ancho of [360, 390, 1440]) {
  test(`${ancho}px: nombre y precio de cada vino completos y sin scroll horizontal`, async ({ page, erroresJs: _ }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto("/carta/vinos");
    const dialogo = page.getByRole("dialog");
    await dialogo.getByRole("button", { name: es.vinos.ageCheckConfirm }).click();
    await expect(dialogo).toBeHidden();

    const listado = page.locator("details").filter({ hasText: "Ver listado completo de vinos y precios" });
    await listado.locator("summary").click();
    const tabla = listado.getByRole("table");
    await expect(tabla.getByRole("rowheader", { name: new RegExp(MAS_LARGO.replace(/[()]/g, "\\$&")) })).toBeVisible();
    await expect(tabla.locator("tbody tr")).toHaveCount(CATALOGO.length);

    // Ni la página ni ningún contenedor de la tabla se desplaza en horizontal.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    const desbordes = await tabla.evaluate((t: HTMLElement) => {
      const fuera: string[] = [];
      for (let el: HTMLElement | null = t; el; el = el.parentElement) {
        if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "visible") fuera.push(el.tagName);
      }
      return fuera;
    });
    expect(desbordes).toEqual([]);

    // Cada nombre y cada precio, entero dentro de la pantalla y sin cortar.
    const celdas = await tabla.locator("tbody tr").evaluateAll((filas) => filas.map((fila) => {
      const nombre = fila.querySelector("th")!;
      const precio = fila.querySelector("td:last-child") as HTMLElement;
      const r = (el: Element) => el.getBoundingClientRect();
      return {
        nombre: nombre.textContent, precio: precio.textContent,
        dentro: [nombre, precio].every((el) => r(el).left >= 0 && r(el).right <= document.documentElement.clientWidth + 0.5),
        sinCortar: [nombre, precio].every((el) => (el as HTMLElement).scrollWidth <= (el as HTMLElement).clientWidth + 1),
        precioEnUnaLinea: (() => { const rango = document.createRange(); rango.selectNodeContents(precio); return new Set([...rango.getClientRects()].map((x) => Math.round(x.top))).size === 1; })(),
      };
    }));
    for (const c of celdas) expect(c, `${c.nombre} · ${c.precio}`).toMatchObject({ dentro: true, sinCortar: true, precioEnUnaLinea: true });
    expect(celdas.map((c) => c.precio)).toEqual(expect.arrayContaining([expect.stringContaining("Consultar precio")]));

    // Móvil: la denominación va bajo el nombre; escritorio: tres columnas como antes.
    const columnaOrigen = tabla.getByRole("columnheader", { name: "Denominación de origen" });
    if (ancho < 640) await expect(columnaOrigen).toBeHidden();
    else await expect(columnaOrigen).toBeVisible();
    await expect(tabla.getByText("AOC Champagne").filter({ visible: true })).toHaveCount(1);
  });
}
