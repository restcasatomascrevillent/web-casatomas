/**
 * Tienda de vinos (`/tienda`, escaparate sin compra por internet) contra el
 * build SSG real de `dist-e2e/`.
 *
 * «Supabase» es el host de mentira del build E2E: aquí responde
 * `configuracion_tienda` (la misma fila que leyó el build, de
 * `e2e/fixtures/configuracion-tienda.json`, más un vino excluido; algunos tests
 * la cambian) y un catálogo de `Vinos` con fotos SVG de botella. Todo lo demás
 * se aborta.
 *
 * Recorridos: escritorio y móvil con axe, «Cómo comprar» con el teléfono
 * pulsable, filtros y «Mostrar más», 320 px con letra al 200 % sin desbordes,
 * el enlace del menú, la tienda apagada en el panel y que es indexable (sin
 * `noindex` y en el sitemap en los tres idiomas).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { test as base, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { archivoFoto, svgDeFoto, tipoDeArchivo, type TipoFoto } from "./fixtures/botellas";

const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const CONFIG_BUILD = JSON.parse(readFileSync(path.resolve(process.cwd(), "e2e/fixtures/configuracion-tienda.json"), "utf8"))[0];

const MAS_LARGO = "Château Mouton Rothschild Premier Grand Cru Classé Pauillac 2015 (Magnum)";
const foto = (tipo: TipoFoto) => `${SUPABASE_FALSO}/storage/v1/object/public/vinos/${archivoFoto(tipo)}`;
const dos = (n: number) => String(n).padStart(2, "0");
const CATALOGO = [
  { nombre: "Macán Clásico 2020", categoria: "VINOS TINTOS — RIOJA", precio_eur: 45, imagen_url: foto("burdeos"), ubicacion_region: "Rioja" },
  { nombre: "Pazo de Señoráns", categoria: "VINOS BLANCOS — RÍAS BAIXAS", precio_eur: 22.5, imagen_url: foto("fina"), ubicacion_region: "Galicia" },
  { nombre: MAS_LARGO, categoria: "VINOS TINTOS — PAUILLAC", precio_eur: 1234.5, imagen_url: foto("antigua-oscura"), ubicacion_pais: "Francia" },
  { nombre: "Louis Roederer Cristal", categoria: "VINOS ESPUMOSOS — CHAMPAGNE", precio_eur: 47.85, imagen_url: foto("champan"), ubicacion_pais: "Francia" },
  { nombre: "Vino excluido en el panel", categoria: "VINOS TINTOS — RIOJA", precio_eur: 30 },
  ...Array.from({ length: 24 }, (_, i) => ({ nombre: `Ribera ${dos(i + 1)}`, categoria: "VINOS TINTOS — RIBERA DEL DUERO", precio_eur: 20 + i })),
].map((vino, i) => ({ ubicacion_pais: "España", imagen_url: null, ...vino, id: `t-${dos(i + 1)}`, orden: i }));

interface Supabase {
  errores: string[];
  config: Record<string, unknown>;
}

const test = base.extend<{ supabase: Supabase }>({
  supabase: async ({ page, context, baseURL }, entregar) => {
    const estado: Supabase = { errores: [], config: { ...CONFIG_BUILD, vinos_excluidos: ["t-05"] } };
    const propio = new URL(baseURL!).origin;
    await context.addInitScript(() => {
      window.localStorage.setItem("cookieConsent", JSON.stringify({ maps: false, ts: new Date().toISOString() }));
    });
    page.on("pageerror", (error) => estado.errores.push(error.message));
    await context.route("**/*", async (route: Route) => {
      const url = new URL(route.request().url());
      if (url.origin === propio) return route.continue();
      if (url.origin !== SUPABASE_FALSO) return route.abort("blockedbyclient");
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      if (url.pathname.startsWith("/storage/v1/object/public/vinos/")) {
        const tipo = tipoDeArchivo(url.pathname.split("/").pop()!);
        return route.fulfill({ status: 200, headers: CORS, contentType: "image/svg+xml", body: svgDeFoto(tipo!) });
      }
      const cuerpo =
        url.pathname === "/rest/v1/configuracion_tienda" ? [estado.config] : url.pathname === "/rest/v1/Vinos" ? CATALOGO : [];
      return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(cuerpo) });
    });
    await entregar(estado);
    expect(estado.errores, "errores JavaScript sin capturar (incluida la hidratación)").toEqual([]);
  },
});

/** Reglas de axe: nombres accesibles y etiquetas (como `accesibilidad-axe.e2e.ts`) + estructura y contraste. */
const REGLAS = [
  "label-content-name-mismatch", "button-name", "link-name", "input-button-name", "label", "aria-input-field-name",
  "select-name", "image-alt", "heading-order", "landmark-unique", "list", "listitem", "definition-list", "dlitem",
  "aria-allowed-attr", "aria-valid-attr-value", "aria-required-children", "duplicate-id-aria", "nested-interactive", "color-contrast",
];

async function axe(page: Page, donde: string) {
  // Que termine la animación de entrada de la cabecera (`animate-fade-up`).
  await page.waitForTimeout(900);
  const { violations } = await new AxeBuilder({ page }).withRules(REGLAS).analyze();
  const resumen = violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(" ")} — ${n.failureSummary?.split("\n").slice(1).join(" ").trim()}`));
  expect(resumen, `axe en ${donde}`).toEqual([]);
}

/** Espera a que React haya hidratado y a que haya llegado el catálogo en vivo (el del build solo tiene «Vino E2E»). */
async function abrirTienda(page: Page, ruta = "/tienda") {
  await page.goto(ruta);
  await page.waitForFunction(() => {
    const cabecera = document.querySelector("header.site-header");
    return !!cabecera && Object.keys(cabecera).some((k) => k.startsWith("__reactFiber"));
  }, null, { timeout: 30_000 });
  await expect(page.getByRole("article", { name: "Macán Clásico 2020" })).toBeVisible();
}

const tarjeta = (page: Page, nombre: string) => page.getByRole("article", { name: nombre, exact: true });
const fichas = (page: Page) => page.locator("section[aria-labelledby=tienda-listado] article");

/**
 * Cajas que se salen de la pantalla dentro del contenido (fuera de zonas con
 * scroll propio). Versión corta de `movil-desbordes.e2e.ts`; la cabecera del
 * sitio tiene allí su propio control.
 */
async function desbordes(page: Page) {
  return page.evaluate(() => {
    const ancho = window.innerWidth;
    const recortado = (el: Element) => {
      for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
        if (e === document.body || e.id === "root") continue;
        if (getComputedStyle(e).overflowX !== "visible") return true;
      }
      return false;
    };
    const fuera: string[] = [];
    const raiz = document.querySelector("main")!;
    for (const el of [raiz, ...raiz.querySelectorAll("*")]) {
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1 || r.right < -500 || r.left > ancho + 500) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      if ((r.right > ancho + 1 || r.left < -1) && !recortado(el)) fuera.push(`${el.tagName.toLowerCase()} «${(el.textContent ?? "").trim().slice(0, 40)}» ${Math.round(r.left)}…${Math.round(r.right)}`);
    }
    return fuera.slice(0, 10);
  });
}

test.describe("escritorio 1440 px", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("escaparate: precio de tienda de cada vino, «Cómo comprar», filtros y «Mostrar más», con axe", async ({ page, supabase: _ }) => {
    await abrirTienda(page);
    await expect(page.getByRole("heading", { level: 1, name: "Tienda de vinos" })).toBeVisible();
    // Cabecera solo con el título; cuántos vinos hay, arriba de «Cómo comprar» (dueño, 04/11/2026).
    await expect(page.getByText("Los vinos de nuestra bodega, para llevártelos a casa.")).toHaveCount(0);
    await expect(page.getByText("Se compran en el restaurante", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Cómo comprar" }).getByText(/^\d+ vinos a la venta$/)).toBeVisible();
    // Publicada (dueño, 04/11/2026): sin banda «Maqueta» y abierta a los buscadores.
    await expect(page.getByText(/Maqueta/)).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

    const macan = tarjeta(page, "Macán Clásico 2020");
    // 45 € de carta con el 30 % del panel → 31,50 €, enseñado como un precio normal.
    await expect(macan.getByText("31,50 €")).toBeVisible();
    await expect(macan.getByRole("button")).toHaveCount(0);
    // Ni precio de carta tachado, ni insignia, ni una palabra sobre descuentos.
    await expect(page.locator("main s, main del")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(/descuento|precio de carta|-?\d+\s?%/i);
    // 47,85 € → 33,50 € (redondeo de Postgres, no 33,49 € de la coma flotante).
    await expect(tarjeta(page, "Louis Roederer Cristal").getByText("33,50 €")).toBeVisible();
    await expect(tarjeta(page, "Vino excluido en el panel")).toHaveCount(0);
    // La foto de carta en su marco lateral (aquí, host local: sin optimizador).
    await expect(macan.locator("img")).toHaveJSProperty("complete", true);

    const comoComprar = page.getByRole("region", { name: "Cómo comprar" });
    await expect(comoComprar).toContainText("no vendemos por internet");
    await expect(comoComprar).toContainText(CONFIG_BUILD.recogida);
    await expect(comoComprar).toContainText("Carrer Santa Maria de la Cabeza, 2");
    await expect(comoComprar.getByRole("link", { name: "Llamar para reservar botellas" })).toHaveAttribute("href", "tel:+34966107887");
    // Ningún formulario ni botón de compra en toda la página.
    await expect(page.locator("main form, main input:not([type=search]), main textarea")).toHaveCount(0);

    await expect(fichas(page)).toHaveCount(24);
    await axe(page, "listado (escritorio)");
    await page.getByRole("button", { name: /^Mostrar más vinos \(4\)$/ }).click();
    await expect(fichas(page)).toHaveCount(28);

    await page.getByRole("button", { name: /^Espumosos 1/ }).click();
    await expect(fichas(page)).toHaveCount(1);
    await expect(tarjeta(page, "Louis Roederer Cristal")).toBeVisible();
    await page.getByRole("button", { name: /^Todos \d+/ }).first().click();
    await page.getByRole("searchbox", { name: "Buscar vinos..." }).fill("pazo");
    await expect(fichas(page)).toHaveCount(1);
    await expect(page.getByText("1 vino", { exact: true })).toBeVisible();
    await page.getByRole("searchbox", { name: "Buscar vinos..." }).fill("no existe");
    await page.getByRole("button", { name: "Ver todos los vinos" }).click();
    await expect(fichas(page)).toHaveCount(24);
  });

  test("el menú lleva a la tienda (marcada como página actual)", async ({ page, supabase: _ }) => {
    await page.goto("/carta");
    await page.locator("header.site-header nav").getByRole("link", { name: "Tienda", exact: true }).click();
    await expect(page).toHaveURL(/\/tienda$/);
    await expect(page.getByRole("article", { name: "Macán Clásico 2020" })).toBeVisible();
    await expect(page.locator("header.site-header nav").getByRole("link", { name: "Tienda", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("tienda apagada en el panel: aviso amable y salida a la carta de vinos", async ({ page, supabase }) => {
    supabase.config = { ...supabase.config, activa: false, aviso: "Volvemos el 1 de diciembre." };
    await page.goto("/tienda");
    await expect(page.getByRole("heading", { name: "La tienda no está disponible ahora" })).toBeVisible();
    await expect(page.getByText("Volvemos el 1 de diciembre.")).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Ver la carta de vinos" })).toHaveAttribute("href", "/carta/vinos");
    await axe(page, "tienda no disponible");
  });
});

test.describe("buscadores (tienda publicada, dueño 04/11/2026)", () => {
  /** Origen público de canonical, hreflang y sitemap (`SITE_URL`, como en `reserva-condiciones.e2e.ts`). */
  const URL_SITIO = "https://restaurantecasatomascrevillente.es";

  test("/tienda, /en/tienda y /fr/tienda: HTML prerenderizado sin noindex y en el sitemap con sus alternates", async ({ request }) => {
    for (const ruta of ["/tienda", "/en/tienda", "/fr/tienda"]) {
      const html = await (await request.get(ruta)).text();
      expect(html, ruta).not.toMatch(/name="robots"[^>]*noindex/);
    }
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const ruta of ["/tienda", "/en/tienda", "/fr/tienda"]) {
      expect(sitemap).toContain(`<loc>${URL_SITIO}${ruta}</loc>`);
    }
    const inicio = sitemap.indexOf(`<loc>${URL_SITIO}/fr/tienda</loc>`);
    const bloque = sitemap.slice(inicio, sitemap.indexOf("</url>", inicio));
    for (const [hreflang, ruta] of [["es", "/tienda"], ["en", "/en/tienda"], ["fr", "/fr/tienda"], ["x-default", "/tienda"]]) {
      expect(bloque).toContain(`hreflang="${hreflang}" href="${URL_SITIO}${ruta}"`);
    }
  });
});

test.describe("móvil 390 px", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test("escaparate en inglés, menú móvil y axe", async ({ page, supabase: _ }) => {
    await abrirTienda(page, "/en/tienda");
    await expect(page.getByRole("heading", { level: 1, name: "Wine shop" })).toBeVisible();
    await expect(page.getByRole("region", { name: "How to buy" }).getByRole("link", { name: "Call to reserve bottles" })).toHaveAttribute("href", "tel:+34966107887");
    await expect(tarjeta(page, "Pazo de Señoráns").getByText("15,75 €")).toBeVisible();
    // La barra «Llamar / Reservar» del móvil también está en la tienda.
    await expect(page.getByRole("complementary", { name: "Call or book" })).toBeVisible();
    expect(await desbordes(page)).toEqual([]);
    await axe(page, "listado (móvil)");

    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.locator("#menu-movil").getByRole("link", { name: "Shop", exact: true })).toHaveAttribute("aria-current", "page");
  });
});

test.describe("320 px con la letra al 200 %", () => {
  test.use({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test("ni las fichas ni «Cómo comprar» se salen de la pantalla", async ({ page, supabase: _ }) => {
    await abrirTienda(page);
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await tarjeta(page, MAS_LARGO).scrollIntoViewIfNeeded();
    expect(await desbordes(page)).toEqual([]);
  });
});
