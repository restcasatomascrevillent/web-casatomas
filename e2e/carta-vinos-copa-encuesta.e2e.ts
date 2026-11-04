/**
 * Carta de vinos (04/11/2026, peticiones del dueño): botón de la copa con el
 * precio por copa, icono con la puntuación Parker y «Vota tu vino favorito»
 * (aviso de 3 segundos al entrar + formulario). Contra el build SSG real de
 * `dist-e2e/`; «Supabase» devuelve un catálogo corto con nombres largos, la
 * votación abierta y acepta el voto.
 *
 * Se vigila en móvil (320 y 375) y escritorio (1280): que el aviso sale tras
 * confirmar la edad y se va solo en unos 3 s, que la tarjeta con tres botones
 * no pisa el título ni desborda, que la copa cambia el precio, y el voto.
 */
import { test as base, expect, type Locator, type Page, type Route } from "@playwright/test";
import { translations as es } from "../src/i18n/languages/es";

const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };

const COPA = "Château Mouton Rothschild Premier Grand Cru Classé Pauillac 2015 Magnum";
const SIN_COPA = "Albariño Rías Baixas";
const CATALOGO = [
  { id: "v-copa", nombre: COPA, categoria: "VINOS TINTOS — BURDEOS", precio_eur: 1450, copeo: true, precio_copa_eur: 7.5, puntuacion_parker: 98, puntuacion_parker_anada: 2015 },
  { id: "v-sin", nombre: SIN_COPA, categoria: "VINOS BLANCOS — RÍAS BAIXAS", precio_eur: 19, copeo: false, precio_copa_eur: null, puntuacion_parker: null },
].map((v, i) => ({ ...v, orden: i, activado: true, restaurante: true, ubicacion_pais: "España", ubicacion_region: "", denominacion_origen: "", descripcion: "", imagen_url: null }));

const test = base.extend<{ red: { votos: unknown[] } }>({
  red: async ({ page, context, baseURL }, entregar) => {
    const errores: string[] = [];
    const red = { votos: [] as unknown[] };
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
      let cuerpo: unknown = [];
      if (url.pathname === "/rest/v1/Vinos") cuerpo = CATALOGO;
      if (url.pathname === "/rest/v1/configuracion_web") cuerpo = [{ id: true, encuesta_vinos_activa: true }];
      if (url.pathname === "/rest/v1/rpc/votar_vino_favorito") {
        red.votos.push(route.request().postDataJSON());
        cuerpo = { ok: true, vino: COPA };
      }
      return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(cuerpo) });
    });
    await entregar(red);
    expect(errores, "errores JavaScript sin capturar").toEqual([]);
  },
});

async function abrirCarta(page: Page, ancho: number) {
  await page.setViewportSize({ width: ancho, height: 900 });
  await page.goto("/carta/vinos");
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("button", { name: es.vinos.ageCheckConfirm }).click();
  await expect(dialogo).toBeHidden();
  await expect(page.getByRole("heading", { name: SIN_COPA })).toBeVisible();
}

const tarjeta = (page: Page, nombre: string) =>
  page.getByRole("heading", { name: nombre, exact: true }).locator("xpath=ancestor::div[contains(@class,'shadow-sm')][1]");

const caja = async (l: Locator) => {
  const b = await l.boundingBox();
  if (!b) throw new Error("elemento sin caja");
  return b;
};

for (const ancho of [320, 375, 1280]) {
  test.describe(`${ancho}px`, () => {
    test("el aviso de votar sale al entrar y se va solo en unos 3 segundos", async ({ page, red: _ }) => {
      await abrirCarta(page, ancho);
      // Radix pinta el toast y además una copia oculta para lectores de pantalla (otro «status»).
      const aviso = page.getByRole("status").filter({ hasText: "Vota tu vino favorito" }).filter({ has: page.getByRole("button", { name: "Votar" }) });
      await expect(aviso).toBeVisible();
      await expect(aviso.getByRole("button", { name: "Votar" })).toBeVisible();
      const inicio = Date.now();
      await expect(aviso).toBeHidden({ timeout: 6000 });
      expect(Date.now() - inicio, "dura unos 3 s").toBeGreaterThan(1500);
      // El botón para votar se queda.
      await expect(page.getByRole("button", { name: /Vota tu vino favorito y gana un sorteo/ })).toBeVisible();
    });

    test("copa y Parker: tres botones sin pisar el título ni desbordar, y la copa cambia el precio", async ({ page, red: _ }) => {
      await abrirCarta(page, ancho);
      const tarj = tarjeta(page, COPA);
      const titulo = await caja(tarj.getByRole("heading", { name: COPA }));
      const botones = tarj.getByRole("button", { name: /— / }).filter({ hasNot: page.getByText(es.vinos.add) });
      const copa = tarj.getByRole("button", { name: /Ver precio por copa/ });
      await expect(copa).toBeVisible();
      for (const boton of await botones.all()) {
        const b = await caja(boton);
        if ((await boton.getAttribute("aria-label"))?.startsWith(es.vinos.add)) continue;
        expect(b.width).toBeGreaterThanOrEqual(44);
        expect(b.x, "los botones van a la derecha del título").toBeGreaterThanOrEqual(titulo.x + titulo.width - 0.5);
      }
      const parker = tarj.getByRole("img", { name: "Puntuación Parker: 98 puntos (añada 2015)" });
      await expect(parker).toBeVisible();
      const card = await caja(tarj);
      const p = await caja(parker);
      expect(p.x + p.width, "el icono Parker cabe en la ficha").toBeLessThanOrEqual(card.x + card.width + 0.5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), "sin scroll horizontal").toBeLessThanOrEqual(0);

      await expect(tarj).toContainText(/1\.?450,00\s*€/);
      await copa.click();
      await expect(tarj).toContainText(/Copa\s*7,50\s*€/);
      await expect(tarj.getByRole("button", { name: /Ver precio de la botella/ })).toHaveAttribute("aria-pressed", "true");
      await expect(tarjeta(page, SIN_COPA).getByRole("button", { name: /copa/ })).toHaveCount(0);
    });

    test("se vota desde el botón y da las gracias", async ({ page, red }) => {
      await abrirCarta(page, ancho);
      await page.getByRole("button", { name: /Vota tu vino favorito y gana un sorteo/ }).click();
      const dialogo = page.getByRole("dialog");
      await dialogo.getByLabel("Tu vino favorito").selectOption({ label: COPA });
      await dialogo.getByLabel("Tu nombre").fill("Ana");
      await dialogo.getByLabel("Email o teléfono").fill("ana@example.com");
      await dialogo.getByRole("checkbox").check();
      const d = await caja(dialogo);
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x + d.width).toBeLessThanOrEqual(ancho + 0.5);
      await dialogo.getByRole("button", { name: "Enviar mi voto" }).click();
      await expect(dialogo.getByRole("status")).toContainText("¡Gracias! Tu voto por");
      expect(red.votos).toEqual([{ p_vino_id: "v-copa", p_nombre: "Ana", p_contacto: "ana@example.com", p_acepta_bases: true, p_idioma: "es" }]);
      // El primero es el nuestro; el segundo, la X del diálogo (también «Cerrar»).
      await dialogo.getByRole("button", { name: "Cerrar" }).first().click();
      await expect(page.getByText(/Ya has votado tu vino favorito/)).toBeVisible();
    });
  });
}
