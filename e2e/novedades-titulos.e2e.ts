/**
 * E2E de los títulos de sección propios del menú de las novedades (historia
 * «Títulos de sección») contra el build SSG real de `dist-e2e/`, a 390 y 1440 px.
 *
 * Contrato del dato: `menu.titulos` en la raíz del menú, con las claves opcionales
 * primero, segundo, postre y bebidas; cada una `{ es, en?, fr? }`. Si `es` falta o
 * está en blanco, la entrada se ignora y sale el título de siempre; si falta `en`
 * o `fr`, sale el castellano. «Cata» no cambia.
 *
 * La novedad «Menú con secciones propias» de `e2e/fixtures/novedades-botones.json`:
 *  - primero: «Selección de entrantes para compartir 40» (40 caracteres) / «Starters to share» / «À partager»
 *  - segundo: solo `es` («Del mar»)
 *  - postre: `es` en blanco, se ignora
 *  - bebidas: solo `es` («Vinos y aguas»)
 */
import type { Locator } from "@playwright/test";
import { translations as es } from "../src/i18n/languages/es";
import { translations as en } from "../src/i18n/languages/en";
import { translations as fr } from "../src/i18n/languages/fr";
import { NOVEDADES, abrirDialogo, caja, esperarDialogoQuieto, expect, tarjeta, test } from "./novedades-comun";

const TEXTOS = { es, en, fr } as const;
type Idioma = keyof typeof TEXTOS;
const RUTA: Record<Idioma, string> = { es: "/", en: "/en", fr: "/fr" };

const TITULO_NOVEDAD: Record<Idioma, string> = {
  es: "Menú con secciones propias",
  en: "Menu with custom sections",
  fr: "Menu aux rubriques personnalisées",
};
const NAVIDAD = "Menú de Navidad";
const LARGO = "Selección de entrantes para compartir 40";

/** Los títulos de sección que debe ver el visitante en cada idioma. */
const ESPERADO: Record<Idioma, string[]> = {
  es: [LARGO, "Del mar", es.espacios.menuLabels.dessert, "Vinos y aguas"],
  en: ["Starters to share", "Del mar", en.espacios.menuLabels.dessert, "Vinos y aguas"],
  fr: ["À partager", "Del mar", fr.espacios.menuLabels.dessert, "Vinos y aguas"],
};

/** Ni la página ni el diálogo se desplazan en horizontal. */
async function sinScrollHorizontal(dialogo: Locator) {
  const page = dialogo.page();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect(await dialogo.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
}

test("la novedad de títulos del e2e cumple el contrato (el nombre largo mide 40 caracteres)", () => {
  const filas = JSON.parse(NOVEDADES) as Array<{ id: string; botones: string[]; menu: { titulos?: Record<string, { es?: string }> } }>;
  const fila = filas.find((f) => f.id === "e2e-menu-titulos");
  expect(fila?.botones).toEqual(["ver_menu"]);
  expect(fila?.menu.titulos?.primero?.es).toBe(LARGO);
  expect(LARGO).toHaveLength(40);
  expect(fila?.menu.titulos?.postre?.es?.trim()).toBe("");
  // El Menú de Navidad no lleva títulos propios.
  expect(filas.find((f) => f.id === "e2e-menu-navidad")?.menu).not.toHaveProperty("titulos");
});

for (const [ancho, alto] of [
  [390, 844],
  [1440, 900],
] as const) {
  test.describe(`${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: alto } });

    for (const idioma of ["es", "en", "fr"] as const) {
      test(`${idioma}: los h4 del menú llevan los nombres propios; el postre en blanco y lo sin traducir caen en el título de siempre o en castellano`, async ({
        page,
        erroresJs: _,
      }) => {
        const textos = TEXTOS[idioma].novedades.botones;
        const titulo = TITULO_NOVEDAD[idioma];
        await page.goto(RUTA[idioma]);
        await page.waitForLoadState("networkidle");
        const boton = tarjeta(page, titulo).getByRole("button", { name: `${textos.verMenu} — ${titulo}` });
        await boton.scrollIntoViewIfNeeded();

        const dialogo = await abrirDialogo(page, boton, titulo);
        await esperarDialogoQuieto(dialogo);
        await expect(dialogo.locator("section > h4")).toHaveText(ESPERADO[idioma]);
        // Los títulos de siempre que se han sustituido ya no salen.
        const etiquetas = TEXTOS[idioma].espacios.menuLabels;
        await expect(dialogo.getByRole("heading", { name: etiquetas.starters, exact: true })).toHaveCount(0);
        await expect(dialogo.getByRole("heading", { name: etiquetas.mains, exact: true })).toHaveCount(0);
        await expect(dialogo.getByRole("heading", { name: textos.bebidas, exact: true })).toHaveCount(0);
        await sinScrollHorizontal(dialogo);
      });
    }

    test("es: el nombre de 40 caracteres sale completo y su caja queda dentro del diálogo", async ({ page, erroresJs: _ }) => {
      const textos = es.novedades.botones;
      const titulo = TITULO_NOVEDAD.es;
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const boton = tarjeta(page, titulo).getByRole("button", { name: `${textos.verMenu} — ${titulo}` });
      await boton.scrollIntoViewIfNeeded();

      const dialogo = await abrirDialogo(page, boton, titulo);
      await esperarDialogoQuieto(dialogo);
      const h4 = dialogo.getByRole("heading", { name: LARGO, exact: true });
      await expect(h4).toHaveCount(1);
      await expect(h4).toBeVisible();
      await expect(h4).toHaveText(LARGO);
      // Completo: sin recortar con puntos suspensivos ni oculto por desbordamiento.
      expect(await h4.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
      const [d, c] = [await caja(dialogo), await caja(h4)];
      expect(c.x).toBeGreaterThanOrEqual(d.x);
      expect(c.x + c.width).toBeLessThanOrEqual(d.x + d.width + 0.5);
      await sinScrollHorizontal(dialogo);
    });

    test("es: el Menú de Navidad (sin titulos) sigue igual que hoy", async ({ page, erroresJs: _ }) => {
      const textos = es.novedades.botones;
      const etiquetas = es.espacios.menuLabels;
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const boton = tarjeta(page, NAVIDAD).getByRole("button", { name: `${textos.verMenu} — ${NAVIDAD}` });
      await boton.scrollIntoViewIfNeeded();

      const dialogo = await abrirDialogo(page, boton, NAVIDAD);
      await esperarDialogoQuieto(dialogo);
      await expect(dialogo.locator("section > h4")).toHaveText([etiquetas.starters, etiquetas.mains, etiquetas.dessert, textos.bebidas]);
      await sinScrollHorizontal(dialogo);
    });
  });
}
