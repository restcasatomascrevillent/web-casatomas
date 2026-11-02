/**
 * Contraste de color (WCAG AA) con axe en portada, carta y vinos, en móvil y
 * escritorio, contra el build SSG real de `dist-e2e/`.
 *
 * Solo la regla `color-contrast`: el resto de reglas de axe y las demás
 * páginas (reservas, regala, novedades, legales) van en la tarea 2/2.
 * Igual que los demás e2e: todo lo que sale del sitio se intercepta y
 * «Supabase» responde `[]`.
 */
import { test, expect, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };

const RUTAS = ["/", "/carta", "/carta/entrantes", "/carta/vinos", "/en/carta/vinos", "/fr"];

test.beforeEach(async ({ context, baseURL }) => {
  const propio = new URL(baseURL!).origin;
  await context.addInitScript(() => {
    window.localStorage.setItem("cookieConsent", JSON.stringify({ maps: false, ts: new Date().toISOString() }));
  });
  await context.route("**/*", async (route: Route) => {
    const url = new URL(route.request().url());
    if (url.origin === propio) return route.continue();
    if (url.origin !== SUPABASE_FALSO) return route.abort("blockedbyclient");
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: "[]" });
  });
});

for (const [nombre, viewport] of [
  ["móvil", { width: 390, height: 844 }],
  ["escritorio", { width: 1440, height: 900 }],
] as const) {
  test.describe(`Contraste AA (${nombre})`, () => {
    test.use({ viewport });

    for (const ruta of RUTAS) {
      test(`${ruta}: ningún texto por debajo de 4,5:1 (3:1 el grande)`, async ({ page }) => {
        await page.goto(ruta);
        await expect(page.locator("footer").last()).toBeAttached();
        // Recorre la página para que se monten las secciones perezosas y las
        // animaciones de entrada terminen (axe mide la opacidad real).
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 400) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 50));
          }
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(800);

        const { violations } = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
        const fallos = violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(" ")} → ${n.any[0]?.message ?? ""}`));
        expect(fallos, "elementos con contraste insuficiente").toEqual([]);
      });
    }
  });
}
