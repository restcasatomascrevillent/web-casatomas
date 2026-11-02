/**
 * Carta de vinos: la foto de la botella va en el LATERAL de la tarjeta (no
 * debajo), de modo que abrirla no alarga la ficha y no hay scroll eterno con
 * ~240 vinos. Contra el build SSG real de `dist-e2e/`; «Supabase» devuelve un
 * catálogo corto con los nombres más largos de la carta real, un vino sin
 * precio, uno sin foto y dos con foto antigua (otras proporciones). Las fotos
 * son SVG de `e2e/fixtures/botellas.ts` (lienzo 3:4 de carta, 900x1200).
 *
 * Qué se vigila, en móvil (375), tablet (768, 2 columnas) y escritorio
 * (1280, 3 columnas): foto a la izquierda y entera, marco 3:4, la ficha casi
 * no crece respecto a la misma sin foto, nada se pisa ni se corta, botones de
 * 44 px y sin scroll horizontal.
 */
import { test as base, expect, type Locator, type Page, type Route } from "@playwright/test";
import { translations as es } from "../src/i18n/languages/es";
import { archivoFoto, svgDeFoto, tipoDeArchivo, type TipoFoto } from "./fixtures/botellas";

const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };

const RIBERA = "Ribera del Duero Reserva";
const SIN_PRECIO = "Castillo de Peñafiel Vendimia Seleccionada";
const ROEDERER = "L. Roederer Brut Vintage Rosé 2012 (Magnum)";
const LARGO = "Château Mouton Rothschild Premier Grand Cru Classé Pauillac 2015 Magnum";
const SIN_ABRIR = "Albariño Rías Baixas";
const SIN_FOTO = "Cava Brut Nature";
const ANTIGUA_OSCURA = "Vino de foto antigua oscura";
const ANTIGUA_APAISADA = "Vino de foto antigua apaisada";

const foto = (tipo: TipoFoto) => `${SUPABASE_FALSO}/storage/v1/object/public/vinos/${archivoFoto(tipo)}`;
const CATALOGO = [
  [RIBERA, "VINOS TINTOS — RIBERA DEL DUERO", "D.O. Ribera del Duero", 24.5, foto("burdeos"), true],
  [SIN_PRECIO, "VINOS TINTOS — RIBERA DEL DUERO", "D.O. Ribera del Duero", 0, foto("borgona"), true],
  [ROEDERER, "VINOS ESPUMOSOS — CHAMPAGNE", "AOC Champagne", 1234.5, foto("champan"), true],
  [LARGO, "VINOS TINTOS — BURDEOS", "AOC Pauillac", 1450, foto("magnum"), true],
  [SIN_ABRIR, "VINOS BLANCOS — RÍAS BAIXAS", "D.O. Rías Baixas", 19, foto("fina"), false],
  [SIN_FOTO, "VINOS ESPUMOSOS — CAVA", "D.O. Cava", 15, null, false],
  [ANTIGUA_OSCURA, "VINOS TINTOS — RIOJA", "D.O.Ca. Rioja", 22, foto("antigua-oscura"), true],
  [ANTIGUA_APAISADA, "VINOS TINTOS — RIOJA", "D.O.Ca. Rioja", 31, foto("antigua-apaisada"), true],
].map(([nombre, categoria, denominacion_origen, precio_eur, imagen_url, expanded], i) => ({
  id: `vino-${i + 1}`, nombre, categoria, denominacion_origen, precio_eur, imagen_url, expanded, orden: i,
  activado: true, restaurante: true, ubicacion_pais: "España", ubicacion_region: "", descripcion: "Descripción de prueba del vino.",
}));

function consultarVinos(url: URL) {
  let filas = [...CATALOGO];
  for (const [clave, valor] of url.searchParams) {
    if (["select", "order", "offset", "limit"].includes(clave)) continue;
    const [op, ...resto] = valor.split(".");
    if (op === "eq") filas = filas.filter((f) => String(f[clave as keyof typeof f]) === resto.join("."));
  }
  const desde = Number(url.searchParams.get("offset") ?? 0);
  return filas.slice(desde, desde + Number(url.searchParams.get("limit") ?? 1000));
}

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
      if (url.pathname.startsWith("/storage/v1/object/public/vinos/")) {
        const tipo = tipoDeArchivo(url.pathname.split("/").pop()!);
        return route.fulfill({ status: 200, headers: CORS, contentType: "image/svg+xml", body: svgDeFoto(tipo!) });
      }
      const cuerpo = url.pathname === "/rest/v1/Vinos" ? consultarVinos(url) : [];
      return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(cuerpo) });
    });
    await entregar(errores);
    expect(errores, "errores JavaScript sin capturar").toEqual([]);
  },
});

async function abrirCarta(page: Page, ancho: number) {
  await page.setViewportSize({ width: ancho, height: 900 });
  await page.goto("/carta/vinos");
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("button", { name: es.vinos.ageCheckConfirm }).click();
  await expect(dialogo).toBeHidden();
  // El catálogo de prueba llega al refrescar (el HTML prerenderizado solo trae «Vino E2E»).
  await expect(page.getByRole("heading", { name: SIN_ABRIR })).toBeVisible();
}

const tarjeta = (page: Page, nombre: string) =>
  page.getByRole("heading", { name: nombre, exact: true }).locator("xpath=ancestor::div[contains(@class,'shadow-sm')][1]");

interface Caja { x: number; y: number; w: number; h: number }
const caja = async (l: Locator): Promise<Caja> => {
  const b = await l.boundingBox();
  if (!b) throw new Error("elemento sin caja (¿oculto?)");
  return { x: b.x, y: b.y, w: b.width, h: b.height };
};
const seSolapan = (a: Caja, b: Caja) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
const dentro = (a: Caja, marco: Caja) => a.x >= marco.x - 0.5 && a.y >= marco.y - 0.5 && a.x + a.w <= marco.x + marco.w + 0.5 && a.y + a.h <= marco.y + marco.h + 0.5;

/** Foto cargada de verdad (no el icono de imagen rota). */
const fotoCargada = (tarj: Locator) =>
  expect.poll(() => tarj.locator("img").evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);

for (const ancho of [375, 768, 1280]) {
  test.describe(`${ancho}px`, () => {
    test("la foto sale en el lateral, entera y en marco 3:4, y la ficha casi no crece", async ({ page, erroresJs: _ }) => {
      await abrirCarta(page, ancho);
      const tarj = tarjeta(page, RIBERA);
      const marco = tarj.locator("[id^='foto-vino-']");
      await expect(marco).toBeVisible();
      await fotoCargada(tarj);

      const card = await caja(tarj);
      const m = await caja(marco);
      const img = await caja(tarj.locator("img"));
      const titulo = await caja(tarj.getByRole("heading", { name: RIBERA }));

      // Lateral: a la izquierda del texto, pegada al borde de la ficha y a todo su alto.
      expect(m.x + m.w, "la foto queda a la izquierda del título").toBeLessThanOrEqual(titulo.x);
      expect(m.x - card.x, "pegada al borde izquierdo").toBeLessThanOrEqual(2);
      expect(Math.abs(m.y - card.y), "arranca arriba").toBeLessThanOrEqual(2);
      expect(m.h, "ocupa el alto de la ficha").toBeGreaterThanOrEqual(card.h - 3);
      // Marco 3:4 (solo un pelo más alto si el texto pidiera más sitio) y más estrecho que la mitad de la ficha.
      expect(m.h / m.w).toBeGreaterThanOrEqual(1.3);
      expect(m.h / m.w).toBeLessThanOrEqual(1.4);
      expect(m.w).toBeLessThan(card.w / 2);
      expect(m.w).toBeGreaterThanOrEqual(80);

      // La botella entera: la imagen cabe en el marco, sin recortes (`contain`) y con su proporción 3:4.
      expect(dentro(img, m)).toBe(true);
      expect(await tarj.locator("img").evaluate((i) => getComputedStyle(i).objectFit)).toBe("contain");
      expect(await tarj.locator("img").evaluate((i) => [i.getAttribute("width"), i.getAttribute("height"), i.getAttribute("loading"), i.getAttribute("decoding")])).toEqual(["900", "1200", "lazy", "async"]);
      const natural = await tarj.locator("img").evaluate((i: HTMLImageElement) => i.naturalHeight / i.naturalWidth);
      expect(natural).toBeCloseTo(4 / 3, 2);
      // Fondo del marco: la cartulina kraft de las fotos de carta, no el marrón oscuro de antes.
      expect(await marco.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe("rgb(205, 174, 119)");

      // La ficha no se alarga al abrir la foto: se compara con la misma ficha con la foto oculta.
      await tarj.getByRole("button", { name: new RegExp(`${es.vinos.hidePhoto}.*${RIBERA}`, "i") }).click();
      await expect(marco).toHaveCount(0);
      const sinFoto = await caja(tarj);
      expect(card.h - sinFoto.h, `con foto ${card.h}px, sin foto ${sinFoto.h}px`).toBeLessThanOrEqual(24);
      // Antes la foto añadía 320-384 px.
      expect(card.h).toBeLessThan(sinFoto.h + 100);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });

    test("el ojo muestra y oculta la foto con aria coherente; la información («i») sigue sustituyéndola", async ({ page, erroresJs: _ }) => {
      await abrirCarta(page, ancho);
      const tarj = tarjeta(page, RIBERA);
      const ojo = tarj.getByRole("button", { name: new RegExp(`${es.vinos.hidePhoto}|${es.vinos.viewPhoto}`, "i") });
      const info = tarj.getByRole("button", { name: /información/i });
      const marco = tarj.locator("[id^='foto-vino-']");

      // Arranca abierta (el panel marca `expanded`) y el ojo apunta al marco.
      await expect(ojo).toHaveAttribute("aria-expanded", "true");
      await expect(ojo).toHaveAttribute("aria-controls", (await marco.getAttribute("id"))!);
      await ojo.click();
      await expect(ojo).toHaveAttribute("aria-expanded", "false");
      await expect(marco).toHaveCount(0);
      await ojo.click();
      await expect(ojo).toHaveAttribute("aria-expanded", "true");
      await expect(marco).toBeVisible();

      // La información cierra la foto (excluyentes) y ocupa todo el ancho de la ficha.
      await info.click();
      await expect(marco).toHaveCount(0);
      const descripcion = tarj.getByText("Descripción de prueba del vino.");
      await expect(descripcion).toBeVisible();
      expect((await caja(descripcion)).w).toBeGreaterThan((await caja(tarj)).w * 0.7);
      await info.click();
      await ojo.click();
      await expect(marco).toBeVisible();

      // Sin foto no hay ojo que valga; una ficha cerrada sigue pudiéndose abrir.
      await expect(tarjeta(page, SIN_FOTO).getByRole("button", { name: new RegExp(es.vinos.viewPhoto, "i") })).toBeDisabled();
      const cerrada = tarjeta(page, SIN_ABRIR);
      await expect(cerrada.locator("[id^='foto-vino-']")).toHaveCount(0);
      await cerrada.getByRole("button", { name: new RegExp(es.vinos.viewPhoto, "i") }).click();
      await expect(cerrada.locator("[id^='foto-vino-']")).toBeVisible();
    });

    for (const nombre of [RIBERA, SIN_PRECIO, ROEDERER, LARGO, ANTIGUA_OSCURA, ANTIGUA_APAISADA]) {
      test(`${nombre}: nada se pisa ni se corta, botones de 44 px y la botella entera`, async ({ page, erroresJs: _ }) => {
        await abrirCarta(page, ancho);
        const tarj = tarjeta(page, nombre);
        const marco = tarj.locator("[id^='foto-vino-']");
        await expect(marco).toBeVisible();
        await fotoCargada(tarj);

        const card = await caja(tarj);
        const m = await caja(marco);
        const titulo = tarj.getByRole("heading", { name: nombre, exact: true });
        const ojo = tarj.getByRole("button", { name: new RegExp(`${es.vinos.hidePhoto}`, "i") });
        const info = tarj.getByRole("button", { name: /información/i });
        const precio = tarj.locator("span.font-bold").first();
        const anadir = tarj.getByRole("button", { name: new RegExp(`${es.vinos.add} —`) });
        const tipo = tarj.locator("p.text-xs").first();

        const piezas = { titulo: await caja(titulo), ojo: await caja(ojo), info: await caja(info), precio: await caja(precio), anadir: await caja(anadir), tipo: await caja(tipo) };
        // Todo dentro de la ficha y fuera de la foto.
        for (const [clave, c] of Object.entries(piezas)) {
          expect(dentro(c, card), `${clave} dentro de la ficha`).toBe(true);
          expect(seSolapan(c, m), `${clave} no pisa la foto`).toBe(false);
        }
        // Sin pisarse entre sí.
        const claves = Object.keys(piezas) as (keyof typeof piezas)[];
        for (let i = 0; i < claves.length; i++) {
          for (let j = i + 1; j < claves.length; j++) {
            expect(seSolapan(piezas[claves[i]], piezas[claves[j]]), `${claves[i]} y ${claves[j]} se pisan`).toBe(false);
          }
        }
        // Objetivos táctiles de 44 px (el «Añadir» conserva sus 40 px de siempre).
        expect(piezas.ojo.w).toBeGreaterThanOrEqual(44);
        expect(piezas.ojo.h).toBeGreaterThanOrEqual(44);
        expect(piezas.info.w).toBeGreaterThanOrEqual(44);
        expect(piezas.info.h).toBeGreaterThanOrEqual(44);
        expect(piezas.anadir.h).toBeGreaterThanOrEqual(40);
        // Nombre y precio enteros, sin recortar.
        for (const l of [titulo, precio, tipo]) {
          expect(await l.evaluate((e: HTMLElement) => e.scrollWidth <= e.clientWidth + 1), "texto sin cortar").toBe(true);
        }
        // La botella entera: `contain`, dentro del marco, el marco nunca más ancho que alto (nada de bandas laterales).
        const imagen = tarj.locator("img");
        expect(dentro(await caja(imagen), m)).toBe(true);
        expect(await imagen.evaluate((i) => getComputedStyle(i).objectFit)).toBe("contain");
        expect(m.h).toBeGreaterThanOrEqual(m.w * 1.3);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      });
    }

    test("las fotos antiguas (sin «-carta») conservan su fondo oscuro y se ven enteras", async ({ page, erroresJs: _ }) => {
      await abrirCarta(page, ancho);
      for (const nombre of [ANTIGUA_OSCURA, ANTIGUA_APAISADA]) {
        const marco = tarjeta(page, nombre).locator("[id^='foto-vino-']");
        await expect(marco).toBeVisible();
        expect(await marco.evaluate((e) => getComputedStyle(e).backgroundColor), nombre).toBe("rgb(26, 22, 18)");
        expect(await tarjeta(page, nombre).locator("img").evaluate((i) => getComputedStyle(i).objectFit), nombre).toBe("contain");
      }
    });
  });
}
