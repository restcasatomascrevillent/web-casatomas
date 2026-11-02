/**
 * Inicio y navegación contra el build SSG real de `dist-e2e/`.
 *
 * - «Contacto» del menú desde /carta deja `#contacto` justo bajo la cabecera
 *   fija (su `scroll-margin-top` = alto de la cabecera), a 390 y 1440 px.
 * - Enlaces y botones de la cabecera y del pie miden al menos 24×24 px a 390.
 * - El enlace a Touza va a la web documentada.
 * - La cabecera y el pie son los mismos en la portada, /carta, /touza y
 *   /reservas a 1440; las páginas legales, que no llevan la cabecera del
 *   sitio, tienen el mismo pie.
 *
 * Igual que los demás e2e: todo lo que sale del sitio se intercepta y
 * «Supabase» responde `[]`.
 */
import { test as base, expect, type Page, type Route } from "@playwright/test";

const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const TOUZA = "https://touza-casatomas.vercel.app";

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
      return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: "[]" });
    });
    await entregar(errores);
    expect(errores, "errores JavaScript sin capturar (incluida la hidratación)").toEqual([]);
  },
});

const MOVIL = { width: 390, height: 844 };
const ESCRITORIO = { width: 1440, height: 900 };

/** Distancia entre el borde inferior de la cabecera y el borde superior de la sección. */
async function huecoBajoCabecera(page: Page, id: string) {
  return page.evaluate((id) => {
    const cabecera = document.querySelector("header.site-header")!.getBoundingClientRect();
    const seccion = document.getElementById(id)!.getBoundingClientRect();
    return Math.round(seccion.top - cabecera.bottom);
  }, id);
}

/**
 * Espera a que React haya hidratado la cabecera: hasta entonces el HTML del
 * SSG no tiene manejadores, «Abrir menú» no hace nada y «Contacto» es un
 * enlace normal que recarga la página entera (y se pierde lo que el test
 * haya puesto en ella). React deja una clave `__reactFiber…` en los nodos
 * que ya ha hidratado.
 */
async function esperarHidratacion(page: Page) {
  await page.waitForFunction(() => {
    const cabecera = document.querySelector("header.site-header");
    return !!cabecera && Object.keys(cabecera).some((k) => k.startsWith("__reactFiber"));
  }, null, { timeout: 30_000 });
}

/**
 * Espera a que el scroll se quede quieto: misma posición durante 600 ms
 * seguidos. La cabecera corrige el ancla mientras cargan las secciones
 * diferidas (ver `scrollToSection` en Header.tsx), así que medir antes daría
 * una posición intermedia. Sin plazo fijo para el destino: lo que se espera
 * es que termine, no un número concreto.
 */
async function esperarScrollQuieto(page: Page) {
  await page.waitForFunction(() => {
    const w = window as unknown as { __scroll?: { y: number; desde: number } };
    const ahora = performance.now();
    if (!w.__scroll || w.__scroll.y !== window.scrollY) {
      w.__scroll = { y: window.scrollY, desde: ahora };
      return false;
    }
    return ahora - w.__scroll.desde >= 600;
  }, null, { timeout: 30_000, polling: 100 });
}

for (const [nombre, viewport] of [["móvil", MOVIL], ["escritorio", ESCRITORIO]] as const) {
  test.describe(`Ancla de Contacto desde /carta (${nombre})`, () => {
    test.use({ viewport });

    test("deja #contacto justo bajo la cabecera", async ({ page, erroresJs: _ }) => {
      await page.goto("/carta");
      await esperarHidratacion(page);
      await page.evaluate(() => { (window as unknown as { __sinRecarga: boolean }).__sinRecarga = true; });
      if (viewport.width < 1024) {
        await page.getByRole("button", { name: "Abrir menú" }).click();
      }
      await page.locator("header.site-header nav").getByRole("link", { name: "Contacto" }).first().click();
      await expect(page).toHaveURL(/\/#contacto$/);
      expect(await page.evaluate(() => (window as unknown as { __sinRecarga?: boolean }).__sinRecarga), "navegación sin recargar").toBe(true);
      await expect(page.locator("#contacto")).toBeAttached();
      // Como en producción: la página crece DESPUÉS de llegar (las secciones
      // de debajo terminan de cargar). Con el Supabase falso son cortas y
      // #contacto no puede subir hasta la cabecera, así que el navegador
      // recorta el scroll al máximo; al crecer, la cabecera tiene que volver
      // a pedir el destino (QA-PROD: se quedaba 222 px por debajo a 1440).
      await page.waitForTimeout(300);
      await page.addStyleTag({ content: "body { padding-bottom: 100vh; }" });
      await esperarScrollQuieto(page);
      expect(Math.abs(await huecoBajoCabecera(page, "contacto"))).toBeLessThanOrEqual(1);
    });
  });
}

test.describe("Zonas de toque a 390 px", () => {
  test.use({ viewport: MOVIL });

  test("enlaces y botones de la cabecera y el pie miden al menos 24×24 px", async ({ page, erroresJs: _ }) => {
    await page.goto("/");
    await page.locator("footer").scrollIntoViewIfNeeded();
    const pequenos = await page.evaluate(() => {
      const fuera: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>("header.site-header a, header.site-header button, footer a, footer button")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue; // oculto a este ancho
        if (r.width < 24 || r.height < 24) fuera.push(`${el.textContent?.trim() || el.getAttribute("aria-label")} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
      return fuera;
    });
    expect(pequenos).toEqual([]);
  });
});

test.describe("Enlace de Touza", () => {
  for (const ruta of ["/touza", "/#espacios"]) {
    test(`${ruta} enlaza a la web documentada`, async ({ page, erroresJs: _ }) => {
      await page.goto(ruta);
      const enlace = page.locator(`a[href^="${TOUZA}"]`).first();
      await enlace.scrollIntoViewIfNeeded();
      await expect(enlace).toBeVisible();
      await expect(enlace).toHaveAttribute("target", "_blank");
      await expect(page.locator('a[href*="touza-restaurant-website"]')).toHaveCount(0);
    });
  }
});

test.describe("Cabecera y pie a 1440 px", () => {
  test.use({ viewport: ESCRITORIO });

  test("son los mismos en todas las páginas", async ({ page, erroresJs: _ }) => {
    const huella = async (ruta: string) => {
      await page.goto(ruta);
      await page.waitForLoadState("networkidle");
      return page.evaluate(() => {
        const enlaces = (sel: string) =>
          [...document.querySelectorAll<HTMLElement>(`${sel} a, ${sel} button`)]
            .map((el) => `${el.textContent?.trim() || el.getAttribute("aria-label")}→${el.getAttribute("href") ?? ""}`);
        const footer = document.querySelector("footer")!;
        return {
          cabecera: document.querySelector("header.site-header") ? enlaces("header.site-header").map((e) => e.replace(/#.*$/, "")) : null,
          pie: enlaces("footer"),
          altoPie: Math.round(footer.getBoundingClientRect().height),
        };
      });
    };
    const portada = await huella("/");
    expect(portada.pie.length).toBeGreaterThan(5);
    for (const ruta of ["/carta", "/touza", "/reservas"]) {
      expect(await huella(ruta), ruta).toEqual(portada);
    }
    // Las páginas legales no llevan la cabecera del sitio (tienen la suya,
    // sin menú), pero sí el mismo pie.
    for (const ruta of ["/politica-privacidad", "/condiciones", "/aviso-legal"]) {
      const { pie, altoPie } = await huella(ruta);
      expect({ pie, altoPie }, ruta).toEqual({ pie: portada.pie, altoPie: portada.altoPie });
    }
  });
});
