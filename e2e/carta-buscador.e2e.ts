/**
 * Buscador de `/carta` contra el build SSG real de `dist-e2e/`.
 *
 * Datos: las filas de prueba de `scripts/e2e-build.mjs` (platos «Plato E2E» y
 * «Entrante E2E 2…9» en «Entrantes», «Vino E2E» en «Tintos», «Bebida E2E» en
 * «Refrescos»). Igual que los demás e2e: todo lo que sale del sitio se
 * intercepta y «Supabase» responde `[]`. Un error de hidratación de React
 * llega como `pageerror` y hace fallar el test.
 */
import { test as base, expect, type Page, type Route } from "@playwright/test";

const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };

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
      return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: "[]" });
    });
    await entregar(errores);
    expect(errores, "errores JavaScript sin capturar (incluida la hidratación)").toEqual([]);
  },
});

const campo = (page: Page) => page.getByRole("searchbox", { name: "Buscar en la carta" });
const recuento = (page: Page) => page.locator("#buscador-carta-estado");
/** El `h2` «Platos» del índice de categorías (solo existe sin búsqueda). */
const indice = (page: Page) => page.locator("#platos");

/** El campo responde cuando la página ya está hidratada: se reintenta hasta entonces. */
async function buscar(page: Page, texto: string) {
  await expect(async () => {
    await campo(page).fill(texto);
    await expect(recuento(page)).toContainText(texto, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

for (const [nombre, viewport] of [
  ["móvil", { width: 390, height: 844 }],
  ["escritorio", { width: 1280, height: 900 }],
] as const) {
  test.describe(`Buscador de la carta (${nombre})`, () => {
    test.use({ viewport });

    test("sin búsqueda: el índice de siempre; al buscar, resultados por categoría", async ({ page, erroresJs: _ }) => {
      await page.goto("/carta");
      await expect(campo(page)).toBeVisible();
      await expect(campo(page)).toHaveAttribute("type", "search");
      await expect(indice(page)).toBeVisible();
      await expect(page.getByRole("link", { name: /Entrantes/ }).first()).toBeVisible();

      await buscar(page, "ENTRANTE e2e 9");
      const platos = page.getByRole("region", { name: "Platos" });
      await expect(platos.getByRole("heading", { level: 3 })).toHaveText(["Entrantes 1"]);
      await expect(platos.getByRole("link", { name: /Entrante E2E 9/ })).toHaveAttribute("href", "/carta/entrantes#plato-9");
      await expect(indice(page)).toHaveCount(0);
      await expect(recuento(page)).toHaveText("1 resultado para «ENTRANTE e2e 9».");

      // Descripción, y la bodega (se carga al entrar en el campo).
      await buscar(page, "fila");
      await expect(page.getByRole("link", { name: /Plato E2E/ })).toBeVisible();
      await buscar(page, "vino");
      const bodega = page.getByRole("region", { name: "Bodega y bebidas" });
      await expect(bodega.getByRole("heading", { level: 3 })).toHaveText(["Vinos tintos 1"]);
      await expect(bodega.getByText("Vino E2E")).toBeVisible();

      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

      // Sin resultados → mensaje y vuelta a la carta entera.
      await buscar(page, "xyzzy");
      await expect(page.getByText("No hemos encontrado nada con «xyzzy».")).toBeVisible();
      await page.getByRole("button", { name: "Ver toda la carta" }).click();
      await expect(campo(page)).toHaveValue("");
      await expect(indice(page)).toBeVisible();
    });

    test("tocar un plato lleva a su tarjeta resaltada y «atrás» conserva la búsqueda", async ({ page, erroresJs: _ }) => {
      await page.goto("/carta");
      await buscar(page, "entrante 9");
      await page.getByRole("link", { name: /Entrante E2E 9/ }).click();
      await expect(page).toHaveURL(/\/carta\/entrantes#plato-9$/);
      await expect(page.locator("#plato-9")).toHaveAttribute("data-resaltado", "true");

      await page.goBack();
      await expect(page).toHaveURL(/\/carta$/);
      await expect(campo(page)).toHaveValue("entrante 9");
      await expect(page.getByRole("link", { name: /Entrante E2E 9/ })).toBeVisible();
    });
  });
}
