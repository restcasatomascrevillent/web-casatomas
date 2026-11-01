/**
 * Tarjeta de plato que gira (la «i» de `/carta/:categoria`) contra el build
 * SSG real de `dist-e2e/`: el tabulador solo recorre la cara que se ve.
 *
 * Datos: «Plato E2E» en «Entrantes» (`scripts/e2e-build.mjs`). Igual que los
 * demás e2e, todo lo de fuera se intercepta y «Supabase» responde `[]`.
 */
import { test as base, expect, type Locator, type Page, type Route } from "@playwright/test";

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

const tarjeta = (page: Page) =>
  page.locator("[data-tarjeta-giro]").filter({ hasText: "Plato E2E" }).first();
const cara = (t: Locator, cual: "delantera" | "trasera") => t.locator(`[data-cara="${cual}"]`);
const botonInfo = (t: Locator, cual: "delantera" | "trasera") =>
  cara(t, cual).locator("[data-boton-giro]");

/** ¿El elemento con el foco está dentro de esta cara? */
const focoEn = (c: Locator) => c.evaluate((el) => el.contains(document.activeElement));

/** Tabula hasta `destino` (máx. `pasos`) y apunta por qué caras pasa el foco. */
async function tabularHasta(page: Page, t: Locator, destino: Locator, pasos = 40) {
  const caras: string[] = [];
  for (let i = 0; i < pasos; i++) {
    await page.keyboard.press("Tab");
    if (await focoEn(cara(t, "delantera"))) caras.push("delantera");
    if (await focoEn(cara(t, "trasera"))) caras.push("trasera");
    if (await destino.evaluate((el) => el === document.activeElement)) return caras;
  }
  throw new Error("el tabulador no llegó al botón esperado");
}

for (const [nombre, viewport] of [
  ["móvil", { width: 390, height: 844 }],
  ["escritorio", { width: 1440, height: 900 }],
] as const) {
  test.describe(`Giro de la tarjeta y tabulador (${nombre})`, () => {
    test.use({ viewport });

    test("sin girar el Tab no entra en la trasera; girada recorre la trasera y no la delantera", async ({ page, erroresJs: _ }) => {
      await page.goto("/carta/entrantes");
      const t = tarjeta(page);
      await expect(t).toBeVisible();

      // HTML del SSG (antes de hidratar ya viene así): trasera fuera del árbol.
      await expect(cara(t, "trasera")).toHaveAttribute("inert", "");
      await expect(cara(t, "trasera")).toHaveAttribute("aria-hidden", "true");
      await expect(cara(t, "delantera")).not.toHaveAttribute("inert");

      // 1 · Sin girar: del principio de la página al botón «i» de delante, y
      // un paso más, sin pisar nunca la trasera.
      const recorrido = await tabularHasta(page, t, botonInfo(t, "delantera"));
      expect(recorrido).not.toContain("trasera");
      await page.keyboard.press("Tab");
      expect(await focoEn(cara(t, "trasera"))).toBe(false);

      // 2 · Girada (con teclado): el foco pasa al botón de volver de la trasera.
      await botonInfo(t, "delantera").focus();
      await expect(async () => {
        await page.keyboard.press("Enter");
        await expect(cara(t, "delantera")).toHaveAttribute("inert", "", { timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
      await expect(cara(t, "trasera")).not.toHaveAttribute("inert");
      await expect(botonInfo(t, "trasera")).toBeFocused();
      await expect(botonInfo(t, "trasera")).toHaveAttribute("aria-expanded", "true");

      // Con Tab y Mayús+Tab el foco sale de la trasera sin entrar en la delantera.
      await page.keyboard.press("Shift+Tab");
      expect(await focoEn(cara(t, "delantera"))).toBe(false);
      await botonInfo(t, "trasera").focus();
      await page.keyboard.press("Tab");
      expect(await focoEn(cara(t, "delantera"))).toBe(false);

      // 3 · Lector de pantalla: solo se expone el botón de la cara visible.
      await expect(t.getByRole("button", { name: /ingredientes y alérgenos/i })).toHaveCount(1);

      // Volver: el foco regresa a la delantera y la trasera vuelve a inert.
      await botonInfo(t, "trasera").press("Enter");
      await expect(cara(t, "trasera")).toHaveAttribute("inert", "");
      await expect(botonInfo(t, "delantera")).toBeFocused();
    });

    test("4 · con toque (móvil) la tarjeta sigue girando como antes", async ({ page, erroresJs: _ }) => {
      await page.goto("/carta/entrantes");
      const t = tarjeta(page);
      await expect(async () => {
        await botonInfo(t, "delantera").click();
        await expect(cara(t, "trasera")).not.toHaveAttribute("inert", { timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
      await expect(t.locator("> div").first()).toHaveClass(/rotateY\(180deg\)/);
      await expect(cara(t, "trasera")).toBeVisible();
      await botonInfo(t, "trasera").click();
      await expect(t.locator("> div").first()).not.toHaveClass(/rotateY\(180deg\)/);
    });
  });
}
