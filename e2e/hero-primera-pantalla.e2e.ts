/**
 * Portada: el hero cabe en la primera pantalla en cualquier móvil (dueño, 04/11/2026: «el hero no es
 * responsive al 100 %… revísalo a conciencia en todo tipo de dispositivos móviles»). Se barrieron los
 * 200 móviles y tablets del catálogo de Playwright en es/en/fr; aquí se fijan los que marcan los
 * límites: el móvil más pequeño, los de 640–667 de alto, los habituales, tablets, portátiles bajos,
 * móviles en horizontal (incluido el iPhone SE, de menos de 640 de ancho) y los plegables (pantalla
 * exterior del Z Flip, 360×298, y en horizontal a ≈ 300 de alto).
 *
 * Qué se vigila: sin scroll horizontal; logo, H1, lema y los dos botones dentro del ancho; el logo
 * debajo de la cabecera fija; nada se pisa; los dos botones enteros en la primera pantalla y de
 * 44 px de alto como mínimo; la flecha (si se ve) por debajo de los botones y dentro de la pantalla.
 */
import { test, expect } from "@playwright/test";

const PANTALLAS: [string, number, number][] = [
  ["iPhone SE 1.ª gen.", 320, 568],
  ["Android pequeño", 360, 640],
  ["iPhone SE 2/3", 375, 667],
  ["iPhone 15", 393, 852],
  ["Pixel 7", 412, 915],
  ["Z Flip exterior", 360, 298],
  ["Z Flip exterior apaisado", 322, 308],
  ["iPhone SE apaisado", 568, 320],
  ["Pixel 5 apaisado", 802, 293],
  ["iPhone 15 apaisado", 852, 393],
  ["iPad Mini", 768, 1024],
  ["Portátil bajo", 1366, 650],
  ["Tablet 1024×600", 1024, 600],
];

for (const idioma of ["", "/fr"]) {
  for (const [nombre, ancho, alto] of PANTALLAS) {
    test(`${idioma || "/es"} · ${nombre} (${ancho}×${alto}): todo el hero en la primera pantalla`, async ({ browser, baseURL }) => {
      const contexto = await browser.newContext({ viewport: { width: ancho, height: alto }, isMobile: ancho < 1024, hasTouch: true, locale: "es-ES" });
      await contexto.addInitScript(() => {
        window.localStorage.setItem("cookieConsent", JSON.stringify({ maps: false, ts: new Date().toISOString() }));
      });
      const propio = new URL(baseURL!).origin;
      await contexto.route("**/*", (ruta) =>
        new URL(ruta.request().url()).origin === propio
          ? ruta.continue()
          : ruta.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: "[]" }));
      const page = await contexto.newPage();
      await page.goto(`${idioma}/`);
      await expect(page.locator(".hero-section img")).toBeVisible();

      const problemas = await page.evaluate(() => {
        const vw = innerWidth, vh = innerHeight, out: string[] = [];
        const caja = (e: Element) => e.getBoundingClientRect();
        if (document.documentElement.scrollWidth > vw) out.push("scroll horizontal");
        const hero = document.querySelector(".hero-section")!;
        const cabecera = caja(document.querySelector("header")!);
        const logo = hero.querySelector("img")!, h1 = hero.querySelector("h1")!, lema = hero.querySelector(".hero-lema")!;
        const botones = [...hero.querySelectorAll(".hero-botones a")];
        const visibles = [logo, h1, lema].filter((e) => caja(e).height > 0);
        for (const e of [...visibles, ...botones]) {
          const c = caja(e);
          if (c.left < -0.5 || c.right > vw + 0.5) out.push(`${e.tagName} se sale de lado`);
        }
        if (caja(logo).top < cabecera.bottom - 0.5) out.push("logo bajo la cabecera");
        const orden = [...visibles, ...botones];
        for (let i = 1; i < orden.length; i++) {
          const a = caja(orden[i - 1]), b = caja(orden[i]);
          if (b.top < a.bottom - 0.5 && b.left < a.right && a.left < b.right) out.push(`se pisan ${orden[i - 1].tagName} y ${orden[i].tagName}`);
        }
        for (const a of botones) {
          const c = caja(a);
          if (c.bottom > vh + 0.5) out.push(`«${a.textContent!.trim()}» fuera de la primera pantalla`);
          if (c.height < 43.5) out.push(`«${a.textContent!.trim()}» mide ${Math.round(c.height)} px de alto`);
        }
        const flecha = caja(hero.querySelector(".hero-flecha")!);
        if (flecha.height > 0) {
          if (flecha.top < caja(botones[botones.length - 1]).bottom) out.push("la flecha pisa los botones");
          if (flecha.bottom > vh + 0.5) out.push("la flecha queda fuera");
        }
        return out;
      });
      expect(problemas).toEqual([]);
      await contexto.close();
    });
  }
}
