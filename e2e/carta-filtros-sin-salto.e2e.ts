/**
 * Filtros de la carta (Celíaco · Vegetariano · Sin lactosa): pulsarlos NO sube la página al hero
 * (dueño, 04/11/2026: «cuando pulsas los filtros de la carta te mueve al hero»). Cambian `?dietas=`
 * en la misma página y `ScrollToTop` lo trataba como una página nueva.
 */
import { test, expect, type Page } from "@playwright/test";

async function preparar(page: Page, baseURL: string) {
  await page.context().addInitScript(() => {
    window.localStorage.setItem("cookieConsent", JSON.stringify({ maps: false, ts: new Date().toISOString() }));
  });
  const propio = new URL(baseURL).origin;
  await page.context().route("**/*", (ruta) =>
    new URL(ruta.request().url()).origin === propio
      ? ruta.continue()
      : ruta.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: "[]" }));
}

for (const [nombre, ancho, alto] of [["móvil", 390, 844], ["escritorio", 1280, 800]] as const) {
  test(`${nombre}: en la portada, filtrar la carta deja la página donde estaba`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    await preparar(page, baseURL!);
    await page.goto("/");
    const grupo = page.getByRole("group", { name: "Filtrar platos" }).first();
    await grupo.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 120);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400);
    const antes = await page.evaluate(() => window.scrollY);
    await grupo.getByRole("button", { name: "Vegetariano" }).click();
    await expect(page).toHaveURL(/dietas=vegetariano/);
    await grupo.getByRole("button", { name: "Celíaco" }).click();
    await expect(page).toHaveURL(/dietas=celiaquia%2Cvegetariano|dietas=vegetariano%2Cceliaquia|dietas=celiaquia,vegetariano|dietas=vegetariano,celiaquia/);
    await page.waitForTimeout(300);
    const despues = await page.evaluate(() => window.scrollY);
    expect(Math.abs(despues - antes), "la página no se ha movido").toBeLessThan(40);
    // Los filtros siguen a la vista (antes la página saltaba arriba del todo, al hero).
    await expect(grupo).toBeInViewport();
  });
}
