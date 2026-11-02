// ============================================================================
// «Páginas 404 (2/2)», criterio 5: sin errores de hidratación de React en el
// 404 ni en la portada, a 390 y 1440 px.
// ----------------------------------------------------------------------------
// Vercel sirve el MISMO `404.html` (prerenderizado en `/404`, rama en español)
// a cualquier dirección que no exista, con estado 404. `vite preview` no hace
// eso (no tiene el 404 de Vercel), así que aquí se reproduce a mano: la
// dirección rota se responde con el `404.html` de `dist-e2e/` y estado 404, y
// el resto del sitio sale del propio `vite preview`.
//
// El criterio 4 (que `/404` responda 404 y no 200) depende del middleware de
// Vercel (`middleware.ts`), que `vite preview` no ejecuta: se comprueba en la
// demo desplegada y, la pieza, en `src/__tests__/hidratacion-404.test.tsx`.
// ============================================================================
import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page, type Route } from "@playwright/test";
import { translations as es } from "../src/i18n/languages/es";
import { translations as en } from "../src/i18n/languages/en";
import { translations as fr } from "../src/i18n/languages/fr";

const SUPABASE_FALSO = `http://127.0.0.1:${Number(process.env.E2E_SUPABASE_PORT ?? 54329)}`;
const HTML_404 = () => readFileSync(path.resolve(process.cwd(), "dist-e2e/404.html"), "utf8");

/** Errores de hidratación de React (mensajes de desarrollo y códigos minificados). */
const HIDRATACION = /hydrat|did not match|#418|#423|#425/i;

const ROTAS = ["/lo-que-sea", "/carta/no-existe", "/en/lo-que-sea", "/fr/rien", "/404"];
const PORTADAS = ["/", "/en", "/fr"];

/** Abre `ruta` y devuelve los errores de consola y de página. */
async function visitar(page: Page, ruta: string, rota: boolean) {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && HIDRATACION.test(m.text())) errores.push(`console: ${m.text()}`);
  });
  await page.context().route("**/*", async (route: Route) => {
    const url = new URL(route.request().url());
    if (url.origin === SUPABASE_FALSO) {
      return route.fulfill({ status: 200, headers: { "Access-Control-Allow-Origin": "*" }, contentType: "application/json", body: "[]" });
    }
    if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") return route.abort("blockedbyclient");
    if (rota && url.pathname === ruta && route.request().resourceType() === "document") {
      return route.fulfill({ status: 404, contentType: "text/html; charset=utf-8", body: HTML_404() });
    }
    // Los chunks perezosos llegan con retraso, como en un móvil real: así el
    // contenido de la ruta (dentro de un `Suspense`) termina de hidratar DESPUÉS
    // que el resto, que es cuando un cambio de idioma a destiempo rompía (#421).
    if (url.pathname.startsWith("/assets/") && url.pathname.endsWith(".js")) await new Promise((r) => setTimeout(r, 150));
    return route.continue();
  });
  const respuesta = await page.goto(ruta);
  await page.waitForLoadState("networkidle");
  // Margen para los efectos de después de hidratar (idioma, barra del móvil).
  await page.waitForTimeout(500);
  return { errores, estado: respuesta?.status() };
}

for (const ancho of [390, 1440]) {
  test.describe(`${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: 900 } });

    for (const ruta of ROTAS) {
      test(`404 en ${ruta}: se hidrata sin errores`, async ({ page }) => {
        const { errores, estado } = await visitar(page, ruta, true);
        expect(estado).toBe(404);
        expect(errores).toEqual([]);
        await expect(page.locator("[data-pagina-no-encontrada]")).toBeVisible();
        // La barra «Reservar» del móvil no sale en la página no encontrada.
        const idioma = ruta.startsWith("/en/") ? "en" : ruta.startsWith("/fr/") ? "fr" : "es";
        const t = { es, en, fr }[idioma];
        // (La barra es la tira fija de abajo; la cabecera y el pie tienen su propio «Llamar».)
        await expect(page.locator("aside.fixed.bottom-0").getByLabel(t.mobileCta.callAria, { exact: true })).toHaveCount(0);
        // Tras hidratar, el idioma es el de la dirección.
        await expect(page.locator("html")).toHaveAttribute("lang", idioma);
      });
    }

    for (const ruta of PORTADAS) {
      test(`portada ${ruta}: se hidrata sin errores`, async ({ page }) => {
        const { errores, estado } = await visitar(page, ruta, false);
        expect(estado).toBe(200);
        expect(errores).toEqual([]);
      });
    }
  });
}
