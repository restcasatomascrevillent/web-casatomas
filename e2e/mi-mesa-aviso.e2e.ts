/**
 * «Mi mesa» avisa arriba, a la vista, de que no es un pedido online (CAS-25,
 * 20/11/2026): al pulsar «Añadir» en la carta había clientes que creían haber
 * pedido. Contra el build SSG real de `dist-e2e/` («Carne E2E» en «Carnes»,
 * `scripts/e2e-build.mjs`), en móvil y en escritorio, con la mesa vacía y con
 * un plato.
 */
import { expect, test } from "./novedades-comun";

for (const [nombre, viewport, tactil] of [
  ["móvil", { width: 390, height: 844 }, true],
  ["escritorio", { width: 1280, height: 800 }, false],
] as const) {
  test.describe(`Mi mesa: aviso de que no es un pedido online (${nombre})`, () => {
    test.use({ viewport, hasTouch: tactil, isMobile: tactil });

    test("sale arriba y se lee entero, con la mesa vacía y con un plato", async ({ page, erroresJs: _ }) => {
      await page.goto("/carta/carnes");
      await page.getByRole("button", { name: "Añadir Carne E2E a Mi mesa" }).click();
      await page.getByRole("button", { name: /Abrir Mi mesa/ }).click();

      const aviso = page.getByTestId("aviso-no-pedido");
      await expect(aviso).toBeVisible();
      await expect(aviso).toContainText("No es un pedido online");
      await expect(aviso).toContainText("en el restaurante se lo decís al camarero");
      // El aviso de «Añadido a Mi mesa» se cierra al abrir la hoja: no tapa la cabecera.
      await expect(page.locator('[data-state="open"]').filter({ hasText: "ya está en tu mesa" })).toHaveCount(0);
      // Arriba del todo del panel, sin desplazarse, y antes del ticket.
      await expect(aviso).toBeInViewport({ ratio: 1 });
      const caja = await aviso.boundingBox();
      const ticket = await page.getByText("Carne E2E").last().boundingBox();
      expect(caja && ticket && caja.y < ticket.y).toBe(true);

      // Vaciar la mesa: el aviso sigue ahí.
      await page.getByRole("button", { name: "Vaciar mesa" }).click();
      await page.getByRole("button", { name: "Sí, vaciar" }).click();
      await expect(page.getByText("Añade platos y vinos para preparar tu mesa")).toBeVisible();
      await expect(aviso).toBeVisible();
    });
  });
}
