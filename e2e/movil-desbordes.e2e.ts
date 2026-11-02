/**
 * E2E de maquetación en móvil (auditoría 02/11/2026) contra el build SSG real de
 * `dist-e2e/`: recorre las rutas clave en 320, 375 y 430 px (táctil, vertical) y
 * falla si hay
 *
 *  1. desborde horizontal: contenido o TEXTO que se sale del ancho de la pantalla.
 *     `document.scrollingElement.scrollWidth > innerWidth` NO sirve aquí: `html`,
 *     `body` y `#root` llevan `overflow-x: hidden` (src/index.css) y esconden el
 *     desborde en vez de impedirlo; el contenido que sobra queda recortado. Por
 *     eso se mide lo que hay dentro: cajas y trazos de texto cuyo borde derecho
 *     pasa de `innerWidth` (fuera de carruseles / zonas con scroll propio) y el
 *     `scrollWidth` de `#root`;
 *  2. objetivos táctiles de menos de 24 × 24 px (WCAG 2.5.8, mínimo AA). Quedan
 *     fuera los enlaces en línea dentro de un párrafo (exentos por la propia
 *     norma) y lo que no se ve.
 *
 * Los defectos reales ya conocidos van como `test.fixme` con su ID del informe
 * de auditoría móvil (W-xx): al corregirlos, quitar el `.fixme` (basta con
 * borrar la entrada del mapa de abajo) y el test pasa a vigilar la regresión.
 *
 * Como el resto de e2e: todo lo externo se aborta y «Supabase» es un host local
 * de mentira (ver `novedades-comun.ts`); no se envía nada a ningún sitio.
 */
import type { Page } from "@playwright/test";
import { expect, test } from "./novedades-comun";
import { translations as es } from "../src/i18n/languages/es";

const PANTALLAS = [
  { ancho: 320, alto: 568 },
  { ancho: 375, alto: 812 },
  { ancho: 430, alto: 932 },
] as const;

const RUTAS = [
  "/",
  "/carta",
  "/carta/entrantes",
  "/carta/vinos",
  "/carta/bebidas",
  "/reservas",
  "/regala",
  "/contacto",
  "/el-restaurante",
  "/touza",
  "/politica-privacidad",
  "/condiciones",
  "/aviso-legal",
  "/en",
  "/en/reservas",
  "/fr/carta",
  "/fr/regala",
  "/404",
];

/**
 * Defectos conocidos: «ruta|ancho» (o «ruta|*» para todos los anchos) → ID del
 * informe. Mientras figuren aquí, el test correspondiente es `test.fixme`.
 */
const DESBORDES_CONOCIDOS: Record<string, string> = {
  // «www.restaurantecasatomascrevillente.es» (Aviso legal) sobresale de su caja y 3 px de la pantalla.
  "/aviso-legal|320": "W-13",
};
const OBJETIVOS_CONOCIDOS: Record<string, string> = {
  // Migas «Inicio» / «Carta» y «Volver a la carta» / «Volver a la portada»: 20 px de alto.
  "/carta|*": "W-04",
  "/carta/entrantes|*": "W-04",
  "/carta/vinos|*": "W-04",
  "/carta/bebidas|*": "W-04",
  "/fr/carta|*": "W-04",
  // Enlaces sueltos de teléfono / email (18 px), «Volver al inicio», «Cómo llegar», «Condiciones de…» (20 px).
  "/|*": "W-05",
  "/en|*": "W-05",
  "/contacto|*": "W-05",
  "/aviso-legal|*": "W-05",
  "/condiciones|*": "W-05",
  "/politica-privacidad|*": "W-05",
};

const conocido = (mapa: Record<string, string>, ruta: string, ancho: number) => mapa[`${ruta}|${ancho}`] ?? mapa[`${ruta}|*`];

async function abrir(page: Page, ruta: string) {
  await page.goto(ruta);
  await page.waitForLoadState("networkidle");
  if (ruta.endsWith("/carta/vinos")) {
    // El aviso de edad es un diálogo modal que tapa la página hasta que se contesta.
    await page.getByRole("button", { name: es.vinos.ageCheckConfirm }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  }
  // Las secciones de la portada se hidratan en diferido (`idleImport`): se recorre
  // la página para que todas estén montadas antes de medir.
  const alto = await page.evaluate(() => document.documentElement.scrollHeight);
  const paso = Math.max(200, Math.round((page.viewportSize()?.height ?? 600) * 0.7));
  for (let y = 0; y < alto + paso; y += paso) {
    await page.evaluate((arriba) => window.scrollTo(0, arriba), y);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
}

/** Cajas y trazos de texto que se salen del ancho de la pantalla. */
async function medirDesborde(page: Page) {
  return page.evaluate(() => {
    const ancho = window.innerWidth;
    const visible = (el: Element) => {
      for (let e: Element | null = el; e && e !== document.documentElement; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0 || cs.contentVisibility === "hidden") return false;
        if (cs.backfaceVisibility === "hidden" && /^matrix3d\(-/.test(cs.transform)) return false; // cara trasera de una tarjeta que gira
        if (e.parentElement?.tagName === "DETAILS" && !(e.parentElement as HTMLDetailsElement).open && e.tagName !== "SUMMARY") return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const srOnly = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width <= 1 && r.height <= 1;
    };
    // Dentro de un carrusel / zona con scroll propio (o recortada a propósito) no desborda la página.
    // `html`, `body` y `#root` llevan `overflow-x: hidden` y no cuentan: ocultan el desborde, no lo evitan.
    const recortado = (el: Element) => {
      for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
        if (e === document.body || e.id === "root") continue;
        if (getComputedStyle(e).overflowX !== "visible") return true;
      }
      return false;
    };
    // Fuera de pantalla a propósito (p. ej. el ticket que se captura como imagen, a -10000 px).
    const aPropositoFuera = (r: DOMRect) => r.right < -500 || r.left > ancho + 500;
    const descripcion = (el: Element) => {
      const texto = ((el as HTMLElement).innerText ?? el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
      const clases = [...el.classList].filter((c) => !/[:[\]/]/.test(c)).slice(0, 2).join(".");
      return `${el.tagName.toLowerCase()}${clases ? "." + clases : ""}${texto ? ` «${texto}»` : ""}`;
    };

    const fallos: string[] = [];
    for (const el of document.body.querySelectorAll("*")) {
      if (!visible(el) || srOnly(el)) continue;
      const r = el.getBoundingClientRect();
      if ((r.right > ancho + 1 || r.left < -1) && !aPropositoFuera(r) && !recortado(el)) {
        fallos.push(`caja ${descripcion(el)} x=${Math.round(r.left)}…${Math.round(r.right)} (pantalla ${ancho})`);
      }
    }
    const rango = document.createRange();
    const texto = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = texto.nextNode(); n; n = texto.nextNode()) {
      const padre = n.parentElement;
      if (!padre || !n.textContent?.trim() || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(padre.tagName)) continue;
      if (!visible(padre) || srOnly(padre) || recortado(padre)) continue;
      rango.selectNodeContents(n);
      for (const r of rango.getClientRects()) {
        if (r.width > 0 && (r.right > ancho + 0.5 || r.left < -0.5) && !aPropositoFuera(r)) {
          fallos.push(`texto «${n.textContent.trim().slice(0, 40)}» en ${descripcion(padre)} hasta x=${Math.round(r.right)} (pantalla ${ancho})`);
          break;
        }
      }
    }
    const raiz = document.getElementById("root");
    if (raiz && raiz.scrollWidth > raiz.clientWidth + 1 && !fallos.length) {
      fallos.push(`#root scrollWidth ${raiz.scrollWidth} > ${raiz.clientWidth}`);
    }
    return [...new Set(fallos)].slice(0, 12);
  });
}

/** Controles táctiles de menos de 24 × 24 px. */
async function medirObjetivosPequenos(page: Page) {
  return page.evaluate(() => {
    const INTERACTIVO =
      'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=tab], [role=menuitem], [role=checkbox], [role=switch], [role=radio], [role=option], [role=combobox]';
    const visible = (el: Element) => {
      for (let e: Element | null = el; e && e !== document.documentElement; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0 || cs.contentVisibility === "hidden") return false;
        if (cs.backfaceVisibility === "hidden" && /^matrix3d\(-/.test(cs.transform)) return false;
        if (e.hasAttribute("inert") || e.getAttribute("aria-hidden") === "true") return false;
        if (e.parentElement?.tagName === "DETAILS" && !(e.parentElement as HTMLDetailsElement).open && e.tagName !== "SUMMARY") return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const fallos: string[] = [];
    for (const el of document.querySelectorAll(INTERACTIVO)) {
      if (!visible(el)) continue;
      if (el.getAttribute("aria-disabled") === "true" || el.getAttribute("aria-current") === "page") continue; // miga actual: no es un control
      const propio = el.getBoundingClientRect();
      if (propio.width <= 1 && propio.height <= 1) continue; // sr-only («Saltar al contenido» hasta recibir foco)
      // Casillas, radios e interruptores: el área pulsable es la etiqueta que los envuelve.
      let caja = propio;
      if (el.matches("input[type=checkbox], input[type=radio], [role=checkbox], [role=switch], [role=radio]")) {
        const etiqueta = el.closest("label") ?? (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null);
        if (etiqueta) caja = etiqueta.getBoundingClientRect();
      }
      // Un enlace en línea dentro de un párrafo está exento (WCAG 2.5.8, excepción «En línea»).
      if (el.tagName === "A" && getComputedStyle(el).display === "inline") {
        const resto = (el.parentElement?.textContent ?? "").replace(el.textContent ?? "", "").trim();
        if (resto.length > 8) continue;
      }
      if (caja.width < 24 || caja.height < 24) {
        const texto = ((el as HTMLElement).innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 40);
        fallos.push(`${el.tagName.toLowerCase()}${texto ? ` «${texto}»` : ""} ${Math.round(caja.width)}×${Math.round(caja.height)} px`);
      }
    }
    return [...new Set(fallos)].slice(0, 12);
  });
}

for (const { ancho, alto } of PANTALLAS) {
  test.describe(`móvil ${ancho}×${alto}`, () => {
    test.use({ viewport: { width: ancho, height: alto }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

    for (const ruta of RUTAS) {
      const idDesborde = conocido(DESBORDES_CONOCIDOS, ruta, ancho);
      const probarDesborde = idDesborde ? test.fixme : test;
      probarDesborde(`${idDesborde ? `${idDesborde} · ` : ""}${ruta}: sin desborde horizontal`, async ({ page, erroresJs }) => {
        void erroresJs;
        await abrir(page, ruta);
        expect(await medirDesborde(page), `contenido fuera de la pantalla en ${ruta} a ${ancho} px`).toEqual([]);
      });

      const idObjetivos = conocido(OBJETIVOS_CONOCIDOS, ruta, ancho);
      const probarObjetivos = idObjetivos ? test.fixme : test;
      probarObjetivos(`${idObjetivos ? `${idObjetivos} · ` : ""}${ruta}: sin objetivos táctiles de menos de 24 px`, async ({ page, erroresJs }) => {
        void erroresJs;
        await abrir(page, ruta);
        expect(await medirObjetivosPequenos(page), `controles menores de 24×24 px en ${ruta} a ${ancho} px`).toEqual([]);
      });
    }
  });
}
