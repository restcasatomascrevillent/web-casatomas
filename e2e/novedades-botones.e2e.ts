/**
 * E2E de los botones de las tarjetas de novedades (historia «Botones de acción
 * en las tarjetas de novedades», criterios 2 a 7) contra el build SSG real de
 * `dist-e2e/`, a 390 y 1440 px.
 *
 * Las novedades son las de `e2e/fixtures/novedades-botones.json`: el build las
 * prerenderiza (`scripts/e2e-build.mjs`) y aquí «Supabase» devuelve LAS
 * MISMAS al refrescar en vivo, para que las tarjetas no cambien al hidratar.
 * Todo lo demás que sale del sitio se aborta, como en `carta-cheques.e2e.ts`.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { test as base, expect, type Locator, type Page, type Route } from "@playwright/test";
import { translations as es } from "../src/i18n/languages/es";
import { translations as en } from "../src/i18n/languages/en";

const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const NOVEDADES = readFileSync(path.resolve(process.cwd(), "e2e/fixtures/novedades-botones.json"), "utf8");

const TEL = "tel:+34966107887";
const NUMERO = "966 10 78 87";
const MENU = "Menú de Navidad";
const PLATO = "Nuevo en la carta: Entrante E2E 9";
const RETIRADO = "Un plato que ya no está en la carta";
const SIN_BOTONES = "Una novedad de siempre, sin botones";

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
      const cuerpo = url.pathname === "/rest/v1/novedades" ? NOVEDADES : "[]";
      return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: cuerpo });
    });
    await entregar(errores);
    expect(errores, "errores JavaScript sin capturar").toEqual([]);
  },
});

const seccion = (page: Page) => page.locator("section#novedades");

/** El `Card` de la novedad con ese título. */
const tarjeta = (page: Page, titulo: string) =>
  seccion(page).locator(".rounded-lg").filter({ has: page.getByRole("heading", { name: titulo, exact: true }) });

const caja = async (locator: Locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error("elemento sin caja (¿oculto?)");
  return box;
};

/** Las novedades se hidratan en diferido (`idleImport`): se reintenta hasta que el botón responde. */
async function abrirMenu(page: Page, boton: Locator) {
  const dialogo = page.getByRole("dialog", { name: MENU });
  await expect(async () => {
    await boton.click();
    await expect(dialogo).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  return dialogo;
}

for (const [ancho, alto] of [
  [390, 844],
  [1440, 900],
] as const) {
  test.describe(`${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: alto } });

    test("los tres botones, al pie de su tarjeta, de 44 px y con foco visible", async ({ page, erroresJs: _ }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await seccion(page).scrollIntoViewIfNeeded();

      // Llamar + Ver menú, en el orden del dueño.
      const navidad = tarjeta(page, MENU);
      const llamar = navidad.getByRole("link", { name: new RegExp(`^${es.novedades.botones.llamar}`) });
      const verMenu = navidad.getByRole("button", { name: `${es.novedades.botones.verMenu} — ${MENU}` });
      await expect(llamar).toHaveAttribute("href", TEL);
      await expect(verMenu).toBeVisible();
      // El número solo en escritorio (muchos ordenadores no pueden llamar).
      if (ancho >= 1024) await expect(llamar.getByText(NUMERO)).toBeVisible();
      else await expect(llamar.getByText(NUMERO)).toBeHidden();

      // Échale un vistazo: a la categoría del plato, con su ancla.
      const verPlato = tarjeta(page, PLATO).getByRole("link", { name: new RegExp(`^${es.novedades.botones.verPlato}`) });
      await expect(verPlato).toHaveAttribute("href", "/carta/entrantes#plato-9");

      // Plato que ya no está: sin ese botón y sin enlaces rotos; Llamar sigue.
      const retirado = tarjeta(page, RETIRADO);
      await expect(retirado.getByRole("link")).toHaveCount(1);
      await expect(retirado.getByRole("link")).toHaveAttribute("href", TEL);

      // La novedad de siempre: sin pie.
      await expect(tarjeta(page, SIN_BOTONES).getByRole("link")).toHaveCount(0);
      await expect(tarjeta(page, SIN_BOTONES).getByRole("button")).toHaveCount(0);

      // Todos miden al menos 44 px de alto y ninguno se sale de su tarjeta.
      const botones = [llamar, verMenu, verPlato, retirado.getByRole("link")];
      for (const boton of botones) {
        const b = await caja(boton);
        expect(b.height).toBeGreaterThanOrEqual(44);
      }

      // Dos botones: uno al lado del otro si caben; si no, cada uno a todo el ancho.
      const [bLlamar, bMenu] = [await caja(llamar), await caja(verMenu)];
      const pie = await caja(llamar.locator(".."));
      if (Math.abs(bLlamar.y - bMenu.y) < 1) {
        expect(bLlamar.x + bLlamar.width).toBeLessThanOrEqual(bMenu.x);
      } else {
        for (const b of [bLlamar, bMenu]) expect(Math.abs(b.width - (pie.width - 48))).toBeLessThan(1);
      }

      if (ancho >= 1024) {
        // Las tres primeras tarjetas van en la misma fila: sus botones acaban a
        // la misma altura aunque los textos midan distinto.
        const bases = await Promise.all(
          [verMenu, verPlato, retirado.getByRole("link")].map(async (boton) => {
            const b = await caja(boton);
            return b.y + b.height;
          }),
        );
        for (const y of bases) expect(Math.abs(y - bases[0])).toBeLessThan(1);
      }

      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

      // Teclado: del primer botón se llega al segundo con Tab y el foco se ve.
      await llamar.focus();
      await page.keyboard.press("Tab");
      await expect(verMenu).toBeFocused();
      const foco = await verMenu.evaluate((el) => ({ visible: el.matches(":focus-visible"), sombra: getComputedStyle(el).boxShadow }));
      expect(foco.visible).toBe(true);
      expect(foco.sombra).not.toBe("none");
    });

    test("Ver menú: modal con secciones y Bebidas; se cierra con X, Esc y pulsando fuera, y el foco vuelve", async ({ page, erroresJs: _ }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const boton = tarjeta(page, MENU).getByRole("button", { name: new RegExp(`^${es.novedades.botones.verMenu}`) });
      await boton.scrollIntoViewIfNeeded();

      let dialogo = await abrirMenu(page, boton);
      const etiquetas = es.espacios.menuLabels;
      for (const rotulo of [etiquetas.starters, etiquetas.mains, etiquetas.dessert, es.novedades.botones.bebidas]) {
        await expect(dialogo.getByRole("heading", { name: rotulo, exact: true })).toHaveCount(1);
      }
      await expect(dialogo.getByText("Vino tinto de la casa", { exact: true })).toBeAttached();

      const d = await caja(dialogo);
      if (ancho < 640) {
        // Casi todo el ancho y, como no cabe, se desplaza por dentro (no la página).
        expect(d.width).toBeGreaterThan(ancho * 0.9);
        expect(d.x).toBeGreaterThanOrEqual(0);
        expect(d.x + d.width).toBeLessThanOrEqual(ancho);
        const scrollPagina = await page.evaluate(() => window.scrollY);
        const desplazado = await dialogo.evaluate((el) => {
          const cabe = el.scrollHeight <= el.clientHeight;
          el.scrollTop = el.scrollHeight;
          return { cabe, scrollTop: el.scrollTop, overflow: getComputedStyle(el).overflowY };
        });
        expect(desplazado).toMatchObject({ cabe: false, overflow: "auto" });
        expect(desplazado.scrollTop).toBeGreaterThan(0);
        await expect(dialogo.getByText("Agua y refrescos", { exact: true })).toBeInViewport();
        expect(await page.evaluate(() => window.scrollY)).toBe(scrollPagina);
      } else {
        // Centrado.
        expect(Math.abs(d.x + d.width / 2 - ancho / 2)).toBeLessThan(2);
        expect(Math.abs(d.y + d.height / 2 - alto / 2)).toBeLessThan(2);
        expect(d.height).toBeLessThanOrEqual(alto);
      }

      // X (44 px, con nombre)
      const cerrar = dialogo.getByRole("button", { name: es.novedades.botones.cerrar });
      expect((await caja(cerrar)).height).toBeGreaterThanOrEqual(44);
      await cerrar.click();
      await expect(dialogo).toBeHidden();
      await expect(boton).toBeFocused();

      // Esc
      dialogo = await abrirMenu(page, boton);
      await page.keyboard.press("Escape");
      await expect(dialogo).toBeHidden();
      await expect(boton).toBeFocused();

      // Pulsando fuera (el fondo oscuro, en la esquina)
      dialogo = await abrirMenu(page, boton);
      await page.mouse.click(4, alto - 4);
      await expect(dialogo).toBeHidden();
      await expect(boton).toBeFocused();
    });

    test("Échale un vistazo: baja hasta el plato sin que lo tape la cabecera y lo resalta", async ({ page, erroresJs: _ }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const enlace = tarjeta(page, PLATO).getByRole("link", { name: new RegExp(`^${es.novedades.botones.verPlato}`) });
      await enlace.scrollIntoViewIfNeeded();
      await enlace.click();

      await expect(page).toHaveURL(/\/carta\/entrantes#plato-9$/);
      const plato = page.locator("#plato-9");
      await expect(plato).toHaveAttribute("data-resaltado", "true");
      // `.first()`: la cara de delante (la de detrás, girada, repite el nombre).
      await expect(plato.getByRole("heading", { name: "Entrante E2E 9" }).first()).toBeVisible();

      // El desplazamiento termina con el plato a la vista y por debajo de la cabecera fija.
      const cabecera = page.locator("header.site-header");
      await expect(async () => {
        const [p, c] = [await caja(plato), await caja(cabecera)];
        expect(p.y).toBeGreaterThanOrEqual(c.y + c.height);
        expect(p.y).toBeLessThan(alto);
      }).toPass({ timeout: 5_000 });
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

      // El resaltado es un momento, no se queda.
      await expect(plato).not.toHaveAttribute("data-resaltado", "true", { timeout: 6_000 });
    });

    test("en inglés: etiquetas, ruta con /en y modal con los platos traducidos (o en castellano si no hay traducción)", async ({ page, erroresJs: _ }) => {
      await page.goto("/en");
      await page.waitForLoadState("networkidle");
      const navidad = tarjeta(page, "Christmas menu");
      await expect(navidad.getByRole("link", { name: new RegExp(`^${en.novedades.botones.llamar}`) })).toHaveAttribute("href", TEL);
      await expect(
        tarjeta(page, "New on the menu: E2E starter 9").getByRole("link", { name: new RegExp(`^${en.novedades.botones.verPlato}`) }),
      ).toHaveAttribute("href", "/en/carta/entrantes#plato-9");

      const boton = navidad.getByRole("button", { name: new RegExp(`^${en.novedades.botones.verMenu}`) });
      await boton.scrollIntoViewIfNeeded();
      const dialogo = page.getByRole("dialog", { name: "Christmas menu" });
      await expect(async () => {
        await boton.click();
        await expect(dialogo).toBeVisible({ timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
      await expect(dialogo.getByText("Octopus Russian salad", { exact: true })).toBeAttached();
      await expect(dialogo.getByText("Sopa de picadillo de la casa", { exact: true })).toBeAttached();
      await expect(dialogo.getByRole("heading", { name: en.novedades.botones.bebidas, exact: true })).toHaveCount(1);
      await expect(dialogo.getByText("House red wine", { exact: true })).toBeAttached();
    });
  });
}

test("los botones ya vienen en el HTML prerenderizado de la portada (es, en y fr)", async ({ request }) => {
  for (const [ruta, etiquetas] of [
    ["/", ["Llamar", "Ver menú", "Échale un vistazo"]],
    ["/en", ["Call", "View menu", "Take a look"]],
    ["/fr", ["Appeler", "Voir le menu", "Jetez un œil"]],
  ] as const) {
    const html = await (await request.get(ruta)).text();
    const inicio = html.indexOf('id="novedades"');
    expect(inicio, `sección de novedades en ${ruta}`).toBeGreaterThan(0);
    // Solo la sección: el pie de página también lleva un `tel:`.
    const novedades = html.slice(inicio, html.indexOf("</section>", inicio));
    expect(novedades, `tel: en ${ruta}`).toContain(`href="${TEL}"`);
    expect(novedades).toContain(`href="${ruta === "/" ? "" : ruta}/carta/entrantes#plato-9"`);
    for (const etiqueta of etiquetas) expect(novedades, `${etiqueta} en ${ruta}`).toContain(etiqueta);
    // El plato que no existe no deja ningún enlace a una página sin él.
    expect(novedades).not.toContain("#plato-999");
  }
});
