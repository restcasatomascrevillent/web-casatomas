/**
 * E2E de accesibilidad de teclado (1/3) contra el build SSG real de `dist-e2e/`:
 *
 *  - «Saltar al contenido» es el primer foco de cada página, se ve al
 *    enfocarlo y con Intro lleva el foco al único `<main id="contenido">`.
 *  - Mover el `<main>` no rompe la hidratación (sin errores #418/#423/#425).
 *  - La barra fija «Llamar / Reservar» (móvil) no recibe foco mientras está
 *    oculta (portada antes de pasar el hero) y sí cuando se ve.
 *
 * El HTML de TODAS las páginas lo revisa además el build
 * (`scripts/verificar-html.mjs`): un `<main>` y el enlace como primer foco.
 */
import type { Page } from "@playwright/test";
import { expect, test } from "./novedades-comun";

const TEXTO = { es: "Saltar al contenido", en: "Skip to content", fr: "Aller au contenu" } as const;

const PAGINAS: { ruta: string; idioma: keyof typeof TEXTO }[] = [
  { ruta: "/", idioma: "es" },
  { ruta: "/en", idioma: "en" },
  { ruta: "/fr/carta", idioma: "fr" },
  { ruta: "/carta/bebidas", idioma: "es" },
  { ruta: "/reservas", idioma: "es" },
  { ruta: "/en/contacto", idioma: "en" },
  { ruta: "/politica-privacidad", idioma: "es" },
  { ruta: "/fr/condiciones", idioma: "fr" },
  { ruta: "/aviso-legal", idioma: "es" },
  // `/404` y no una URL inventada: con una inventada, el HTML de `404.html`
  // no coincide con lo que pinta el cliente (error #418 que ya existía; lo
  // arregla «Páginas 404: código 404 real y errores de hidratación»).
  // `/carta/vinos` tampoco: antes abre el diálogo modal de la edad.
  { ruta: "/404", idioma: "es" },
];

/** Errores de hidratación de React 18 (en producción salen minificados). */
function vigilarHidratacion(page: Page) {
  const errores: string[] = [];
  page.on("console", (mensaje) => {
    if (mensaje.type() !== "error") return;
    const texto = mensaje.text();
    if (/hydrat|#418|#423|#425/i.test(texto)) errores.push(texto);
  });
  return errores;
}

for (const { ruta, idioma } of PAGINAS) {
  test(`${ruta}: «${TEXTO[idioma]}» es el primer foco y lleva al único <main>`, async ({ page, erroresJs }) => {
    void erroresJs;
    const hidratacion = vigilarHidratacion(page);
    await page.goto(ruta);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("main#contenido")).toHaveCount(1);

    const enlace = page.getByRole("link", { name: TEXTO[idioma], exact: true });
    await page.keyboard.press("Tab");
    await expect(enlace).toBeFocused();
    // Visible solo con foco: deja de ser `sr-only` (1×1 px).
    const caja = await enlace.boundingBox();
    expect(caja && caja.width > 40 && caja.height > 20, "el enlace se ve al enfocarlo").toBe(true);

    await page.keyboard.press("Enter");
    await expect(page.locator("main#contenido")).toBeFocused();
    expect(new URL(page.url()).hash, "no deja #contenido en la URL").toBe("");

    expect(hidratacion, "errores de hidratación").toEqual([]);
  });
}

test.describe("barra «Llamar / Reservar» a 390 px", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  const barra = (page: Page) => page.locator("div.fixed.bottom-0.lg\\:hidden");

  test("en la portada, oculta tras el hero: inert y sin foco; al bajar, enfocable", async ({ page, erroresJs }) => {
    void erroresJs;
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(barra(page)).toHaveAttribute("inert", "");
    const llamar = barra(page).getByRole("link");
    await llamar.focus();
    await expect(llamar).not.toBeFocused();

    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.2));
    await expect(barra(page)).not.toHaveAttribute("inert", /.*/);
    await llamar.focus();
    await expect(llamar).toBeFocused();
  });

  test("en una página sin hero se ve desde el principio y no es inert", async ({ page, erroresJs }) => {
    void erroresJs;
    await page.goto("/en/contacto");
    await page.waitForLoadState("networkidle");
    await expect(barra(page)).not.toHaveAttribute("inert", /.*/);
  });
});
