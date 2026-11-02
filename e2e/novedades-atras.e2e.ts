/**
 * E2E de «atrás» en Novedades (historia «Navegación de Novedades: «atrás» y
 * volver a Novedades (1/2)», criterios 1, 2 y 5) contra el build SSG real de
 * `dist-e2e/`, a 390 y 1440 px. `page.goBack()` hace lo mismo que el botón de
 * atrás del navegador y el gesto de atrás del móvil; el de iOS Safari se
 * comprueba además en un iPhone real.
 */
import { translations as es } from "../src/i18n/languages/es";
import { abrirDialogo, caja, expect, seccion, tarjeta, test } from "./novedades-comun";

const MENU = "Menú de Navidad";
const PLATO = "Nuevo en la carta: Entrante E2E 9";

for (const [ancho, alto] of [
  [390, 844],
  [1440, 900],
] as const) {
  test.describe(`${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: alto } });

    test("con «Ver menú» abierto, «atrás» cierra el diálogo y la portada no se mueve", async ({ page, erroresJs: _ }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const boton = tarjeta(page, MENU).getByRole("button", { name: new RegExp(`^${es.novedades.botones.verMenu}`) });
      await boton.scrollIntoViewIfNeeded();

      const dialogo = await abrirDialogo(page, boton, MENU);
      const scrollAntes = await page.evaluate(() => window.scrollY);
      expect(scrollAntes).toBeGreaterThan(0);

      await page.goBack();
      await expect(dialogo).toBeHidden();
      await expect(page).toHaveURL(/\/$/);
      await page.waitForTimeout(300);
      expect(Math.abs((await page.evaluate(() => window.scrollY)) - scrollAntes)).toBeLessThanOrEqual(2);
      await expect(boton).toBeInViewport();

      // Se vuelve a abrir y se cierra con la X: la entrada extra del historial
      // se quita, así que no queda un «atrás» que no hace nada.
      const otra = await abrirDialogo(page, boton, MENU);
      await otra.getByRole("button", { name: es.novedades.botones.cerrar }).click();
      await expect(otra).toBeHidden();
      await expect.poll(() => page.evaluate(() => window.history.state?.menuNovedad ?? null)).toBeNull();
      expect(Math.abs((await page.evaluate(() => window.scrollY)) - scrollAntes)).toBeLessThanOrEqual(2);
    });

    test("al volver del detalle de una novedad, la página queda en Novedades", async ({ page, erroresJs: _ }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const enlace = tarjeta(page, PLATO).getByRole("link", { name: new RegExp(`^${es.novedades.botones.verPlato}`) });
      await enlace.scrollIntoViewIfNeeded();
      // Que la navegación sea la de React Router (hidratado), no una carga nueva.
      await expect(async () => {
        await enlace.click();
        await expect(page).toHaveURL(/\/carta\/entrantes#plato-9$/, { timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
      await expect(page.locator("#plato-9")).toBeVisible();

      await page.goBack();
      await expect(page).toHaveURL(/\/$/);
      await expect(async () => {
        await expect(enlace).toBeInViewport();
        const s = await caja(seccion(page));
        // La sección ocupa la pantalla: ni arriba del todo ni pasada.
        expect(s.y).toBeLessThan(alto);
        expect(s.y + s.height).toBeGreaterThan(0);
        expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      }).toPass({ timeout: 5_000 });
    });
  });
}
