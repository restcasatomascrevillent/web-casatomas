/**
 * Aviso «This page is also available in English» (o en francés) contra el
 * build SSG real de `dist-e2e/` (pedido por el dueño el 21/11/2026).
 *
 * - Con el navegador en inglés o francés, en una página en español se ofrece
 *   la misma página en ese idioma; un toque lleva a ella. Nunca salta solo.
 * - No sale con el navegador en español.
 * - No mueve la página, va con los botones flotantes (abajo a la derecha),
 *   no tapa el título ni la barra de reservar del móvil, cabe a 320 px y
 *   espera a que se elijan las cookies.
 * - Cerrar se recuerda; volver al español desde la versión inglesa, también.
 * - Sin errores de JavaScript (hidratación incluida) y sin fallos de axe.
 *
 * Igual que los demás e2e: todo lo que sale del sitio se intercepta y
 * «Supabase» responde `[]`.
 */
import { test as base, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const MOVIL = { width: 390, height: 844 };
const ESCRITORIO = { width: 1440, height: 900 };

const test = base.extend<{ erroresJs: string[]; conCookies: boolean }>({
  conCookies: [true, { option: true }],
  erroresJs: async ({ page, context, baseURL, conCookies }, entregar) => {
    const errores: string[] = [];
    const propio = new URL(baseURL!).origin;
    if (conCookies) {
      await context.addInitScript(() => {
        window.localStorage.setItem("cookieConsent", JSON.stringify({ maps: false, ts: new Date().toISOString() }));
      });
    }
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

const aviso = (page: Page) => page.getByTestId("sugerencia-idioma");

test.describe("navegador en inglés", () => {
  test.use({ locale: "en-GB" });

  for (const pantalla of [{ width: 320, height: 640 }, MOVIL, ESCRITORIO]) {
    test(`${pantalla.width}px: /carta ofrece la carta en inglés, sin mover la página, y lleva a ella`, async ({ page, erroresJs }) => {
      void erroresJs;
      await page.setViewportSize(pantalla);
      await page.goto("/carta");
      await expect(aviso(page)).toBeVisible();
      await expect(aviso(page)).toHaveAttribute("lang", "en");
      await expect(aviso(page)).toContainText("This page is also available in English.");

      // No empuja el contenido: con el aviso o sin él, el h1 está en el mismo sitio.
      // (Se compara ocultándolo un instante: la carta tiene su propia animación de entrada.)
      await page.waitForTimeout(1200);
      const h1 = await page.evaluate(() => {
        const aviso = document.querySelector<HTMLElement>('[data-testid="sugerencia-idioma"]')!;
        const con = document.querySelector("h1")!.getBoundingClientRect().top;
        aviso.style.display = "none";
        const sin = document.querySelector("h1")!.getBoundingClientRect().top;
        aviso.style.display = "";
        return { con, sin };
      });
      expect(h1.con).toBe(h1.sin);

      // Dentro de la pantalla, abajo a la derecha (pila de botones flotantes), sin tapar el título.
      const caja = (await aviso(page).boundingBox())!;
      expect(caja.x).toBeGreaterThanOrEqual(0);
      expect(caja.x + caja.width).toBeLessThanOrEqual(pantalla.width);
      expect(caja.y + caja.height).toBeLessThanOrEqual(pantalla.height);
      expect(caja.y).toBeGreaterThan(pantalla.height / 2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(pantalla.width);
      const titulo = (await page.locator("h1").first().boundingBox())!;
      const pisa = caja.x < titulo.x + titulo.width && titulo.x < caja.x + caja.width && caja.y < titulo.y + titulo.height && titulo.y < caja.y + caja.height;
      expect(pisa, `el aviso ${JSON.stringify(caja)} tapa el título ${JSON.stringify(titulo)}`).toBe(false);

      // Accesible (nombres, contraste, objetivos táctiles…).
      const { violations } = await new AxeBuilder({ page }).include('[data-testid="sugerencia-idioma"]').withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);

      await aviso(page).getByRole("link", { name: "View in English" }).click();
      await expect(page).toHaveURL(/\/en\/carta$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(aviso(page)).toHaveCount(0);
    });
  }

  test("390px: con la barra «Reservar» del móvil a la vista, el aviso queda encima, sin pisarla", async ({ page, erroresJs }) => {
    void erroresJs;
    await page.setViewportSize(MOVIL);
    await page.goto("/");
    await expect(aviso(page)).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5));
    const barra = page.locator("aside.fixed.bottom-0");
    await expect(barra).toHaveClass(/translate-y-0/);
    await page.waitForTimeout(500); // la pila sube con una transición
    const a = (await aviso(page).boundingBox())!;
    const b = (await barra.boundingBox())!;
    expect(a.y + a.height).toBeLessThanOrEqual(b.y);
  });

  test("cerrar se recuerda (también al recargar y en otras páginas)", async ({ page, erroresJs }) => {
    void erroresJs;
    await page.goto("/carta");
    await aviso(page).getByRole("button", { name: "Close" }).click();
    await expect(aviso(page)).toHaveCount(0);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(aviso(page)).toHaveCount(0);
    await page.goto("/reservas");
    await page.waitForLoadState("networkidle");
    await expect(aviso(page)).toHaveCount(0);
  });

  test("volver al español desde la versión inglesa con el selector: no insiste", async ({ page, erroresJs }) => {
    void erroresJs;
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/carta");
    await aviso(page).getByRole("link", { name: "View in English" }).click();
    await expect(page).toHaveURL(/\/en\/carta$/);
    await page.getByRole("button", { name: /Change language/i }).filter({ visible: true }).first().click();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(page).toHaveURL(/\/carta$/);
    await page.waitForTimeout(300);
    await expect(aviso(page)).toHaveCount(0);
  });

  test("no sale en páginas que solo están en español (404)", async ({ page, erroresJs }) => {
    void erroresJs;
    await page.goto("/404");
    await page.waitForLoadState("networkidle");
    await expect(aviso(page)).toHaveCount(0);
  });
});

test.describe("navegador en francés", () => {
  test.use({ locale: "fr-FR" });

  test("/reservas ofrece la página en francés, con su búsqueda", async ({ page, erroresJs }) => {
    void erroresJs;
    await page.goto("/reservas?comensales=4");
    await expect(aviso(page)).toContainText("Cette page existe aussi en français.");
    await aviso(page).getByRole("link", { name: "Voir en français" }).click();
    await expect(page).toHaveURL(/\/fr\/reservas\?comensales=4$/);
  });

  test.describe("sin elegir aún las cookies", () => {
    test.use({ conCookies: false });

    test("390px: primero el aviso de cookies; el de idioma sale al elegirlas", async ({ page, erroresJs }) => {
      void erroresJs;
      await page.setViewportSize(MOVIL);
      await page.goto("/");
      const cookies = page.getByRole("region", { name: /cookies/i });
      await expect(cookies).toBeVisible();
      await page.waitForTimeout(800);
      await expect(aviso(page)).toHaveCount(0);
      await cookies.getByRole("button", { name: "Rechazar" }).click();
      await expect(aviso(page)).toBeVisible();
      await expect(aviso(page).getByRole("link", { name: "Voir en français" })).toBeVisible();
    });
  });
});

test.describe("navegador en español", () => {
  test.use({ locale: "es-ES" });

  for (const ruta of ["/", "/carta", "/reservas"]) {
    test(`${ruta}: no sale el aviso`, async ({ page, erroresJs }) => {
      void erroresJs;
      await page.goto(ruta);
      await page.waitForLoadState("networkidle");
      await expect(aviso(page)).toHaveCount(0);
    });
  }
});
