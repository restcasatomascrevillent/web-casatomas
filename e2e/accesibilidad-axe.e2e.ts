/**
 * axe (accesibilidad de teclado 3/3) contra el build SSG real de `dist-e2e/`:
 * portada, carta, reservas y regala, en móvil (390 px) y escritorio (1440 px).
 *
 * Solo se miran las reglas de esta historia (nombres accesibles y etiquetas),
 * no una auditoría WCAG completa. Todo lo externo se aborta y «Supabase»
 * responde `[]`: nunca se habla con el backend real ni con Stripe.
 */
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };

/** Nombres accesibles (WCAG 2.5.3, 4.1.2) y etiquetas de formulario (1.3.1, 3.3.2). */
const REGLAS = [
  "label-content-name-mismatch",
  "button-name",
  "link-name",
  "input-button-name",
  "label",
  "aria-input-field-name",
  "select-name",
  "image-alt",
];

const PAGINAS = [
  { nombre: "portada", ruta: "/" },
  { nombre: "carta", ruta: "/carta" },
  { nombre: "reservas", ruta: "/reservas" },
  { nombre: "regala", ruta: "/regala" },
];

const PANTALLAS = [
  { nombre: "móvil", width: 390, height: 844 },
  { nombre: "escritorio", width: 1440, height: 900 },
];

async function preparar(page: Page, baseURL: string) {
  const propio = new URL(baseURL).origin;
  await page.context().addInitScript(() => {
    window.localStorage.setItem("cookieConsent", JSON.stringify({ maps: false, ts: new Date().toISOString() }));
  });
  await page.context().route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === propio) return route.continue();
    if (url.origin !== SUPABASE_FALSO) return route.abort("blockedbyclient");
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: "[]" });
  });
}

for (const pantalla of PANTALLAS) {
  test.describe(`axe · ${pantalla.nombre}`, () => {
    for (const pagina of PAGINAS) {
      test(`${pagina.nombre} sin errores de nombre accesible ni etiquetas`, async ({ page, baseURL }) => {
        await page.setViewportSize({ width: pantalla.width, height: pantalla.height });
        await preparar(page, baseURL!);
        await page.goto(pagina.ruta);
        await page.waitForLoadState("networkidle");
        const { violations } = await new AxeBuilder({ page }).withRules(REGLAS).analyze();
        const resumen = violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(" ")} — ${n.failureSummary?.split("\n").slice(1).join(" ").trim()}`));
        expect(resumen, `axe en ${pagina.ruta} (${pantalla.width} px)`).toEqual([]);
      });
    }
  });
}
