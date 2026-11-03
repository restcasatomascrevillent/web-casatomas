/**
 * Piezas comunes de los e2e de las novedades (`novedades-*.e2e.ts`) contra el
 * build SSG real de `dist-e2e/`.
 *
 * Las novedades son las de `e2e/fixtures/novedades-botones.json`: el build las
 * prerenderiza (`scripts/e2e-build.mjs`) y aquí «Supabase» devuelve LAS
 * MISMAS al refrescar en vivo, para que las tarjetas no cambien al hidratar.
 * Todo lo demás que sale del sitio se aborta, como en `carta-cheques.e2e.ts`.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { test as base, expect, type Locator, type Page, type Route } from "@playwright/test";

export { expect };

export const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
export const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
export const NOVEDADES = readFileSync(path.resolve(process.cwd(), "e2e/fixtures/novedades-botones.json"), "utf8");
/** La configuración de la tienda que lee el build (`scripts/e2e-build.mjs`): en vivo, la misma. */
export const CONFIG_TIENDA = readFileSync(path.resolve(process.cwd(), "e2e/fixtures/configuracion-tienda.json"), "utf8");

export const test = base.extend<{ erroresJs: string[] }>({
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
      const cuerpo =
        url.pathname === "/rest/v1/novedades" ? NOVEDADES : url.pathname === "/rest/v1/configuracion_tienda" ? CONFIG_TIENDA : "[]";
      return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: cuerpo });
    });
    await entregar(errores);
    expect(errores, "errores JavaScript sin capturar").toEqual([]);
  },
});

export const seccion = (page: Page) => page.locator("section#novedades");

/** El `Card` de la novedad con ese título. */
export const tarjeta = (page: Page, titulo: string) =>
  seccion(page).locator(".rounded-lg").filter({ has: page.getByRole("heading", { name: titulo, exact: true }) });

export const caja = async (locator: Locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error("elemento sin caja (¿oculto?)");
  return box;
};

/**
 * Abre el diálogo «Ver menú» de una novedad. Las novedades se hidratan en
 * diferido (`idleImport`): se reintenta hasta que el botón responde.
 */
export async function abrirDialogo(page: Page, boton: Locator, titulo: string) {
  const dialogo = page.getByRole("dialog", { name: titulo });
  await expect(async () => {
    await boton.click();
    await expect(dialogo).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  return dialogo;
}

/**
 * Espera a que el diálogo termine de entrar. El `Dialog` de Radix
 * (src/components/ui/dialog.tsx) abre con `duration-200`: zoom-in-95 +
 * slide-in-from-top-[48%] + fade. En ese rato mide un 5 % menos, no está
 * centrado (hasta ~4 px de desviación) y su X queda por debajo de 44 px, así que
 * medirlo nada más verlo es intermitente (en CI falló `toBeLessThan(2)` del
 * centrado con 4,1 px y 2,3 px; en local, la X con 43,98 px). `toBeVisible` no
 * espera a la animación: se espera a que terminen las de dentro del diálogo y a
 * que su caja sea idéntica en dos fotogramas seguidos.
 */
export async function esperarDialogoQuieto(dialogo: Locator) {
  await dialogo.evaluate(async (el) => {
    const fotograma = () => new Promise<void>((resolver) => requestAnimationFrame(() => resolver()));
    // Las infinitas (un spinner, por ejemplo) nunca terminan: no se esperan.
    const vivas = () => el.getAnimations({ subtree: true }).filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
    const huella = () => {
      const r = el.getBoundingClientRect();
      return [r.x, r.y, r.width, r.height].join(",");
    };
    let anterior = "";
    for (let intento = 0; intento < 180; intento++) {
      // Tope de ~3 s a 60 fps: la animación dura 0,2 s.
      await Promise.all(vivas().map((a) => a.finished.catch(() => undefined)));
      await fotograma();
      const actual = huella();
      if (actual === anterior && vivas().length === 0) return;
      anterior = actual;
    }
    throw new Error("El diálogo sigue moviéndose tras ~3 s");
  });
}
