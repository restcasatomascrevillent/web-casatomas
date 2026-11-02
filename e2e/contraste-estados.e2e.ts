/**
 * E2E de contraste (historia «Contraste de la web: hover, foco, resto de
 * páginas y axe (2/2)», criterios 1, 3 y 4) contra el build SSG real de
 * `dist-e2e/`, a 390 y 1440 px.
 *
 * axe (`@axe-core/playwright`, regla `color-contrast`, la misma que usa la
 * auditoría de accesibilidad de Lighthouse) en las 7 páginas: portada, carta,
 * vinos, reservas, regala, novedades (la sección de la portada y su diálogo
 * «Ver menú») y legales (aviso legal, privacidad y condiciones).
 *
 * `e2e/contraste.e2e.ts` (la 1/2) mide portada, carta y vinos en reposo; esta
 * amplía a todas las páginas y a los estados hover y foco.
 *
 * Tres pasadas por página:
 *   · en reposo;
 *   · con `:hover` forzado en todos los enlaces y botones;
 *   · con `:focus` y `:focus-visible` forzados en todos.
 * Los estados se fuerzan por CDP (`CSS.forcePseudoState`), que es lo que hace
 * el panel «:hov» de DevTools: así axe mide el color que ve quien pasa el ratón
 * o llega con el tabulador, sin depender de dónde cae el puntero.
 *
 * Fuera de axe (riesgo 1 de la historia): el texto sobre la foto del Hero.
 * axe lo da como «incompleto» (no sabe leer el fondo de una imagen). Se revisa
 * a mano y no se da por bueno aquí: ver `docs/contraste.md`.
 */
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { abrirDialogo, expect, seccion, tarjeta, test } from "./novedades-comun";
import { translations as es } from "../src/i18n/languages/es";

type Estado = "reposo" | "hover" | "foco";

const PAGINAS: { nombre: string; ruta: string; preparar?: (page: Page) => Promise<void> }[] = [
  { nombre: "portada", ruta: "/" },
  { nombre: "carta", ruta: "/carta" },
  { nombre: "vinos", ruta: "/carta/vinos" },
  { nombre: "reservas", ruta: "/reservas" },
  { nombre: "regala", ruta: "/regala" },
  {
    nombre: "novedades (diálogo «Ver menú»)",
    ruta: "/",
    preparar: async (page) => {
      await seccion(page).scrollIntoViewIfNeeded();
      const titulo = "Menú de Navidad";
      const boton = tarjeta(page, titulo).getByRole("button", { name: `${es.novedades.botones.verMenu} — ${titulo}` });
      await abrirDialogo(page, boton, titulo);
      await page.waitForTimeout(400); // animación de entrada del diálogo
    },
  },
  { nombre: "aviso legal", ruta: "/aviso-legal" },
  { nombre: "privacidad", ruta: "/politica-privacidad" },
  { nombre: "condiciones", ruta: "/condiciones" },
  // Las otras dos lenguas en las páginas de esta historia: los textos son más
  // largos y cambian los saltos de línea, no los colores, pero se comprueba.
  { nombre: "reservas (en)", ruta: "/en/reservas" },
  { nombre: "regala (fr)", ruta: "/fr/regala" },
];

/** Baja por la página para que se monte todo lo diferido (secciones con `idleImport`, animaciones de entrada). */
async function recorrer(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 25));
    }
    window.scrollTo(0, 0);
  });
  // Las entradas con fade (opacity) hacen que axe mida colores a medio pintar.
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
}

/** Fuerza `:hover` o `:focus`+`:focus-visible` en todos los enlaces y botones (lo que hace «:hov» en DevTools). */
async function forzar(page: Page, estado: Exclude<Estado, "reposo">) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
  const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "a[href], button, [role=button], summary" });
  const forcedPseudoClasses = estado === "hover" ? ["hover"] : ["focus", "focus-visible"];
  for (const nodeId of nodeIds) await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses });
  // Las transiciones de color (`transition-colors`, 150 ms) tienen que acabar.
  await page.waitForTimeout(400);
  return cdp;
}

for (const [ancho, alto] of [
  [390, 844],
  [1440, 900],
] as const) {
  test.describe(`${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: alto } });

    for (const { nombre, ruta, preparar } of PAGINAS) {
      test(`contraste ≥ 4,5:1 (3:1 grande) en ${nombre}, en reposo, hover y foco`, async ({ page, erroresJs: _ }) => {
        await page.goto(ruta);
        await page.waitForLoadState("networkidle");
        await recorrer(page);
        await preparar?.(page);

        const fallos: string[] = [];
        for (const estado of ["reposo", "hover", "foco"] as const) {
          const cdp = estado === "reposo" ? null : await forzar(page, estado);
          const { violations } = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
          for (const nodo of violations.flatMap((v) => v.nodes)) {
            fallos.push(`[${estado}] ${nodo.target.join(" ")} → ${nodo.any.map((c) => c.message).join(" | ")}`);
          }
          await cdp?.detach(); // al cerrar la sesión CDP se quitan los estados forzados
          if (cdp) await page.waitForTimeout(250);
        }
        expect(fallos, `contraste insuficiente en ${ruta} a ${ancho}px`).toEqual([]);
      });
    }
  });
}
