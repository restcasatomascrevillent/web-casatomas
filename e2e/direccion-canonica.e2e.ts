// ============================================================================
// Direcciones con mayúsculas o barras dobles (`/Carta`, `/carta//vinos`).
// ----------------------------------------------------------------------------
// Vercel distingue mayúsculas: a `/Carta` le sirve el `404.html` con estado
// 404. El router del navegador no las distingue y montaba la carta encima de
// ese HTML: errores de hidratación #418/#422/#423 (visto apretando la web en
// producción el 21/11/2026). Ahora la web se va a la dirección canónica antes
// de montar React (`src/lib/direccion-canonica.ts`).
//
// Como en `pagina-404.e2e.ts`, el 404 de Vercel se reproduce a mano: la
// dirección con mayúsculas se responde con el `404.html` de `dist-e2e/`.
// ============================================================================
import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page, type Route } from "@playwright/test";

const SUPABASE_FALSO = `http://127.0.0.1:${Number(process.env.E2E_SUPABASE_PORT ?? 54329)}`;
const HTML = (fichero: string) => readFileSync(path.resolve(process.cwd(), "dist-e2e", fichero), "utf8");
const HIDRATACION = /hydrat|did not match|#418|#422|#423|#425/i;

async function abrir(page: Page, direccion: string) {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && HIDRATACION.test(m.text())) errores.push(`console: ${m.text()}`);
  });
  const servidas404: string[] = [];
  await page.context().route("**/*", async (route: Route) => {
    const url = new URL(route.request().url());
    if (url.origin === SUPABASE_FALSO) {
      return route.fulfill({ status: 200, headers: { "Access-Control-Allow-Origin": "*" }, contentType: "application/json", body: "[]" });
    }
    if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") return route.abort("blockedbyclient");
    if (route.request().resourceType() === "document") {
      // Como Vercel: con mayúsculas (o inexistente) no es ningún fichero del build → `404.html` con estado 404.
      if (/[A-Z]/.test(url.pathname) || url.pathname === "/no-existe") {
        servidas404.push(url.pathname);
        return route.fulfill({ status: 404, contentType: "text/html; charset=utf-8", body: HTML("404.html") });
      }
      // Con barras dobles, Vercel (en el navegador) sirve la página con 200 y el router pintaba el 404.
      if (url.pathname.includes("//")) {
        return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: HTML(`${url.pathname.replace(/\/{2,}/g, "/").slice(1)}.html`) });
      }
    }
    // Chunks con algo de retraso, como en un móvil: si React llegara a hidratar el 404, le daría tiempo.
    if (url.pathname.startsWith("/assets/") && url.pathname.endsWith(".js")) await new Promise((r) => setTimeout(r, 150));
    return route.continue();
  });
  await page.goto(direccion);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  return { errores, servidas404 };
}

const CASOS: Array<[string, string]> = [
  ["/Carta", "/carta"],
  ["/carta/Vinos", "/carta/vinos"],
  ["/En/carta", "/en/carta"],
  ["/Reservas?origen=AbC#Formulario", "/reservas?origen=AbC#Formulario"],
  ["/carta//carnes", "/carta/carnes"],
];

for (const ancho of [390, 1440]) {
  test.describe(`${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: 900 } });

    for (const [direccion, canonica] of CASOS) {
      test(`${direccion} → ${canonica}, sin errores de hidratación y sin pintar el 404`, async ({ page }) => {
        const { errores } = await abrir(page, direccion);
        const url = new URL(page.url());
        expect(`${url.pathname}${url.search}${url.hash}`).toBe(canonica);
        expect(errores).toEqual([]);
        await expect(page.locator("[data-pagina-no-encontrada]")).toHaveCount(0);
        await expect(page.locator("h1").first()).toBeVisible();
        await expect(page.locator("html")).not.toHaveAttribute("style", /visibility:\s*hidden/);
        // Atrás no vuelve a la dirección mala (es un `replace`): sale de la web.
        await page.goBack().catch(() => null);
        expect(page.url()).not.toContain(direccion.split(/[?#]/)[0]);
      });
    }

    test("una dirección rota con mayúsculas acaba en el 404 de su dirección canónica, sin errores", async ({ page }) => {
      const { errores } = await abrir(page, "/No-Existe");
      expect(new URL(page.url()).pathname).toBe("/no-existe");
      expect(errores).toEqual([]);
      await expect(page.locator("[data-pagina-no-encontrada]")).toBeVisible();
    });
  });
}
