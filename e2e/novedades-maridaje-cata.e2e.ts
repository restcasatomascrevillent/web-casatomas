/**
 * E2E de los maridajes y las catas en el menú de las novedades (historia
 * «Maridajes y catas en el menú de las novedades») contra el build SSG real de
 * `dist-e2e/`, a 390 y 1440 px, en castellano y en otro idioma.
 *
 * Las dos novedades nuevas de `e2e/fixtures/novedades-botones.json` llevan
 * tal cual los fixtures canónicos de `src/__tests__/fixtures/` (el primer test
 * lo comprueba):
 *  - «Menú maridaje de otoño»: v2 con maridaje en la gamba (cava) y en el
 *    turrón (Fondillón, un vino), los dos con sulfitos; el arroz y el agua, sin.
 *    Lleva traducción al francés, así que se prueba en /fr.
 *  - «Cata de destilados»: v2 de tipo cata, tres bebidas y ningún plato. Lleva
 *    traducción al inglés, así que se prueba en /en.
 * El Menú de Navidad sigue en v1 y no debe enseñar ninguna línea de bebida.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Locator } from "@playwright/test";
import { translations as es } from "../src/i18n/languages/es";
import { translations as en } from "../src/i18n/languages/en";
import { translations as fr } from "../src/i18n/languages/fr";
import { NOVEDADES, abrirDialogo, caja, esperarDialogoQuieto, expect, tarjeta, test } from "./novedades-comun";

const TEXTOS = { es, en, fr } as const;
type Idioma = keyof typeof TEXTOS;
const RUTA: Record<Idioma, string> = { es: "/", en: "/en", fr: "/fr" };

const NAVIDAD = "Menú de Navidad";

/** El menú con maridaje, plato a plato, como debe verlo el visitante en cada idioma. */
const MARIDAJE = {
  es: {
    titulo: "Menú maridaje de otoño",
    platos: [
      { plato: "Gamba roja de Santa Pola", bebida: "Cava brut nature", descripcion: "Bien frío" },
      { plato: "Arroz a banda", bebida: null },
      { plato: "Turrón de Jijona", bebida: "Fondillón", descripcion: null },
      { plato: "Agua mineral", bebida: null },
    ],
  },
  fr: {
    titulo: "Menu accords mets et vins",
    platos: [
      { plato: "Crevette rouge de Santa Pola", bebida: "Cava brut nature", descripcion: "Bien frais" },
      // Sin traducción: el castellano de respaldo.
      { plato: "Arroz a banda", bebida: null },
      { plato: "Turrón de Jijona", bebida: "Fondillón", descripcion: null },
      { plato: "Agua mineral", bebida: null },
    ],
  },
} as const;

/** La cata, en el orden en que se sirve. */
const CATA = {
  es: { titulo: "Cata de destilados", bebidas: ["Whisky de malta 12 años", "Fondillón", "Ginebra de Mahón"] },
  en: { titulo: "Spirits tasting", bebidas: ["12-year-old malt whisky", "Fondillón", "Ginebra de Mahón"] },
} as const;

/** El `<li>` de un plato del diálogo, por el nombre que se ve. */
const plato = (dialogo: Locator, nombre: string) =>
  dialogo.locator("li").filter({ has: dialogo.page().getByText(nombre, { exact: true }) });

/** Ni la página ni el diálogo se desplazan en horizontal, y nada se sale del diálogo. */
async function sinScrollHorizontal(dialogo: Locator, contenido: Locator) {
  const page = dialogo.page();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  expect(await dialogo.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
  const d = await caja(dialogo);
  for (const elemento of await contenido.all()) {
    const c = await caja(elemento);
    expect(c.x).toBeGreaterThanOrEqual(d.x);
    expect(c.x + c.width).toBeLessThanOrEqual(d.x + d.width + 0.5);
  }
}

test("las novedades de maridaje y cata del e2e llevan los fixtures canónicos tal cual", () => {
  const filas = JSON.parse(NOVEDADES) as Array<{ id: string; menu: unknown }>;
  const canonico = (nombre: string) =>
    JSON.parse(readFileSync(path.resolve(process.cwd(), "src/__tests__/fixtures", nombre), "utf8")) as unknown;
  expect(filas.find((fila) => fila.id === "e2e-menu-maridaje")?.menu).toEqual(canonico("menu-novedad-v2-maridaje.json"));
  expect(filas.find((fila) => fila.id === "e2e-cata")?.menu).toEqual(canonico("menu-novedad-v2-cata.json"));
});

for (const [ancho, alto] of [
  [390, 844],
  [1440, 900],
] as const) {
  test.describe(`${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: alto } });

    for (const idioma of ["es", "fr"] as const) {
      test(`${idioma}: maridaje bajo cada plato que lo lleva, alineado con su nombre y con sulfitos`, async ({ page, erroresJs: _ }) => {
        const textos = TEXTOS[idioma].novedades.botones;
        const { titulo, platos } = MARIDAJE[idioma];
        await page.goto(RUTA[idioma]);
        await page.waitForLoadState("networkidle");
        const boton = tarjeta(page, titulo).getByRole("button", { name: `${textos.verMenu} — ${titulo}` });
        await boton.scrollIntoViewIfNeeded();

        const dialogo = await abrirDialogo(page, boton, titulo);
        await esperarDialogoQuieto(dialogo);
        await expect(dialogo.locator('[data-linea-bebida="maridaje"]')).toHaveCount(2);
        await expect(dialogo.locator('[data-linea-bebida="cata"]')).toHaveCount(0);

        for (const esperado of platos) {
          const li = plato(dialogo, esperado.plato);
          await expect(li).toHaveCount(1);
          const linea = li.locator('[data-linea-bebida="maridaje"]');
          if (esperado.bebida === null) {
            // Un plato sin maridaje se ve como siempre: sin línea de bebida.
            await expect(linea).toHaveCount(0);
            continue;
          }

          await expect(linea.locator("p").first()).toHaveText(`${textos.prefijoMaridaje} ${esperado.bebida}`);
          if (esperado.descripcion) await expect(linea.getByText(esperado.descripcion, { exact: true })).toBeVisible();
          // Los dos van con sulfitos (el Fondillón del turrón es un vino de la carta).
          await expect(linea.getByText(textos.contieneSulfitos, { exact: true })).toBeVisible();

          // Debajo del plato y con el borde izquierdo en el de su nombre.
          const [nombre, bebida] = [await caja(li.getByText(esperado.plato, { exact: true })), await caja(linea)];
          expect(Math.abs(bebida.x - nombre.x)).toBeLessThan(1);
          expect(bebida.y).toBeGreaterThanOrEqual(nombre.y + nombre.height - 0.5);
        }

        await sinScrollHorizontal(dialogo, dialogo.locator("[data-linea-bebida]"));
      });
    }

    for (const idioma of ["es", "en"] as const) {
      test(`${idioma}: la cata tiene «Ver menú»; el modal enseña solo la sección de cata, en orden y sin platos, y se cierra con Esc`, async ({
        page,
        erroresJs: _,
      }) => {
        const textos = TEXTOS[idioma].novedades.botones;
        const { titulo, bebidas } = CATA[idioma];
        await page.goto(RUTA[idioma]);
        await page.waitForLoadState("networkidle");
        const boton = tarjeta(page, titulo).getByRole("button", { name: `${textos.verMenu} — ${titulo}` });
        await boton.scrollIntoViewIfNeeded();
        await expect(boton).toBeVisible();
        expect((await caja(boton)).height).toBeGreaterThanOrEqual(44);

        const dialogo = await abrirDialogo(page, boton, titulo);
        await esperarDialogoQuieto(dialogo);

        // Una sola sección, la de la cata: ni primeros, ni segundos, ni postre, ni bebidas.
        await expect(dialogo.locator("section > h4")).toHaveText([textos.cata]);
        // Las bebidas, en una lista ordenada y en el orden en que se sirven.
        const lineas = dialogo.locator('ol > li > [data-linea-bebida="cata"]');
        await expect(lineas.locator("> div > p:first-child")).toHaveText([...bebidas]);
        // Sin platos (la carta los pinta en `<ul>`) ni maridajes.
        await expect(dialogo.locator("ul > li")).toHaveCount(0);
        await expect(dialogo.locator('[data-linea-bebida="maridaje"]')).toHaveCount(0);
        await expect(dialogo.getByText(textos.prefijoMaridaje)).toHaveCount(0);
        // El Fondillón, con su descripción y sus sulfitos; los destilados, sin.
        await expect(lineas.nth(1).getByText("Alicante, dulce", { exact: true })).toBeVisible();
        await expect(lineas.nth(1).getByText(textos.contieneSulfitos, { exact: true })).toBeVisible();
        await expect(dialogo.getByText(textos.contieneSulfitos, { exact: true })).toHaveCount(1);

        await sinScrollHorizontal(dialogo, lineas);

        await page.keyboard.press("Escape");
        await expect(dialogo).toBeHidden();
        await expect(boton).toBeFocused();
      });
    }

    test("es: una novedad v1 (Menú de Navidad) sigue igual, sin líneas de bebida", async ({ page, erroresJs: _ }) => {
      const textos = es.novedades.botones;
      const etiquetas = es.espacios.menuLabels;
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const boton = tarjeta(page, NAVIDAD).getByRole("button", { name: `${textos.verMenu} — ${NAVIDAD}` });
      await boton.scrollIntoViewIfNeeded();

      const dialogo = await abrirDialogo(page, boton, NAVIDAD);
      await esperarDialogoQuieto(dialogo);
      await expect(dialogo.locator("section > h4")).toHaveText([etiquetas.starters, etiquetas.mains, etiquetas.dessert, textos.bebidas]);
      await expect(plato(dialogo, "Vino tinto de la casa")).toHaveCount(1);
      await expect(dialogo.locator("[data-linea-bebida]")).toHaveCount(0);
      await expect(dialogo.locator("ol")).toHaveCount(0);
      await expect(dialogo.getByText(textos.prefijoMaridaje)).toHaveCount(0);
      await expect(dialogo.getByText(textos.contieneSulfitos, { exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    });
  });
}
