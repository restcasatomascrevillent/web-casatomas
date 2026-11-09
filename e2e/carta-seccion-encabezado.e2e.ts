/**
 * Encabezado de las secciones de la carta (08/11/2026, petición del dueño con
 * la captura de `/carta/carnes`) contra el build SSG real de `dist-e2e/`:
 *
 *  - el único `h1` es el nombre de la sección («Carnes»), con migas y
 *    contador; en vinos, «Carta de vinos» (decisión del dueño, 09/11/2026);
 *  - los filtros y el primer plato quedan pegados al encabezado, en la primera
 *    pantalla, sin párrafos ni subtítulos en medio (el `h2` de la sección va
 *    dentro del desplegable del pie, 09/11/2026);
 *  - el texto descriptivo va al pie, en un `<details>` cerrado que se abre y se
 *    cierra con teclado (Enter / Espacio) y con el dedo;
 *  - `title`, `description` y `canonical` siguen siendo los de la sección.
 *
 * Datos: «Carne E2E» en «Carnes» (`scripts/e2e-build.mjs`), que tiene SEO
 * propio en `src/lib/carta-seo.ts`. Todo lo externo se aborta, como en el
 * resto de e2e (`novedades-comun.ts`).
 */
import { expect, test } from "./novedades-comun";
import { SEO_CATEGORIA } from "../src/lib/carta-seo";

const SEO = SEO_CATEGORIA.carnes.es;

for (const [nombre, viewport, tactil] of [
  ["móvil", { width: 390, height: 844 }, true],
  ["escritorio", { width: 1280, height: 800 }, false],
] as const) {
  test.describe(`Sección de la carta (${nombre})`, () => {
    test.use({ viewport, hasTouch: tactil, isMobile: tactil });

    test("h1 con el nombre de la sección y los platos justo debajo", async ({ page, erroresJs: _ }) => {
      await page.goto("/carta/carnes");
      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText("Carnes");
      await expect(page.getByRole("navigation", { name: "breadcrumb" })).toContainText("Carnes");
      await expect(page.getByText("1 plato", { exact: true })).toBeVisible();

      // Nada de párrafos entre la cabecera y los platos: el primero se ve sin
      // desplazarse y los filtros quedan a menos de 120 px del `h1`. El `h2`
      // de la sección («chuleta») va dentro del desplegable cerrado del pie.
      await expect(page.locator("#plato-20")).toBeInViewport();
      const finH1 = (await h1.boundingBox())!.y + (await h1.boundingBox())!.height;
      const filtros = (await page.locator("main details").first().boundingBox())!.y;
      expect(filtros - finH1).toBeLessThan(120);
      await expect(page.getByText(SEO.intro[0])).toBeHidden();
      await expect(page.getByText(SEO.h2!, { exact: true })).toBeHidden();
      await expect(page.getByText(SEO.h2!, { exact: true })).toHaveCount(1);

      // Metadatos propios de la sección, distintos del nombre visible.
      await expect(page).toHaveTitle(SEO.title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", SEO.description);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/carta\/carnes$/);
    });

    test("el texto ampliado está al pie, cerrado, y se abre y se cierra", async ({ page, erroresJs: _ }) => {
      await page.goto("/carta/carnes");
      const resumen = page.locator("summary", { hasText: SEO.masSobre });
      const desplegable = page.locator("details", { has: resumen });
      const parrafo = desplegable.getByText(SEO.intro[0]);

      await expect(desplegable).not.toHaveAttribute("open");
      await expect(parrafo).toBeHidden();
      // Al pie: después del último plato y antes de «Otras secciones».
      const yPlato = (await page.locator("#plato-20").boundingBox())!.y;
      const yDesplegable = (await desplegable.boundingBox())!.y;
      const yOtras = (await page.getByRole("navigation", { name: "Otras secciones" }).boundingBox())!.y;
      expect(yDesplegable).toBeGreaterThan(yPlato);
      expect(yOtras).toBeGreaterThan(yDesplegable);

      if (tactil) {
        // `<details>` nativo: responde aunque la página aún no se haya hidratado.
        await resumen.tap();
        await expect(desplegable).toHaveAttribute("open", "");
        await expect(parrafo).toBeVisible();
        expect((await resumen.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        expect(await page.evaluate(() => document.getElementById("root")!.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
        await resumen.tap();
        await expect(desplegable).not.toHaveAttribute("open");
      } else {
        await resumen.focus();
        await page.keyboard.press("Enter");
        await expect(desplegable).toHaveAttribute("open", "");
        await expect(parrafo).toBeVisible();
        await page.keyboard.press("Space");
        await expect(desplegable).not.toHaveAttribute("open");
        await expect(parrafo).toBeHidden();
      }
    });
  });
}

test("la carta de vinos se titula «Carta de vinos», con la miga «Vinos»", async ({ page, erroresJs: _ }) => {
  await page.goto("/carta/vinos");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText("Carta de vinos");
  await expect(page.getByRole("navigation", { name: "breadcrumb" })).toContainText("Vinos");
  await expect(page).toHaveTitle("Carta de vinos | Casa Tomás Crevillente");
});
