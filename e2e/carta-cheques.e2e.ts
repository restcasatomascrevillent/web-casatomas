/**
 * E2E de regresión (auditoría 18/10/2026) contra el build SSG real de
 * `dist-e2e/`: carta de vinos, compra de cheques regalo y barrido responsive.
 *
 * Igual que `reserva-condiciones.e2e.ts`: todo lo que sale del propio sitio se
 * intercepta. «Supabase» (el host de mentira del build E2E) responde con un
 * mini-PostgREST en memoria para `Vinos` y con respuestas controladas para
 * `cheques-regalo-web`; lo demás se aborta. Nunca se toca Supabase ni Stripe:
 * la «URL de Stripe» que devuelve la función simulada es una página del propio
 * sitio.
 */
import { test as base, expect, type Page, type Route } from "@playwright/test";
import { translations as es } from "../src/i18n/languages/es";

const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

type Vino = { id: string; nombre: string; categoria: string; precio_eur: number; orden: number; activado: boolean; restaurante: boolean; imagen_url: string | null; denominacion_origen: string; ubicacion_region: string; ubicacion_pais: string; descripcion: string };
const dos = (n: number) => String(n).padStart(2, "0");
const CATALOGO: Vino[] = [
  ...Array.from({ length: 26 }, (_, i) => ({ nombre: `Ribera ${dos(i + 1)}`, categoria: "VINOS TINTOS — RIBERA DEL DUERO", denominacion_origen: "D.O. Ribera del Duero", ubicacion_region: "Castilla y León" })),
  ...Array.from({ length: 6 }, (_, i) => ({ nombre: `Rioja ${dos(i + 1)}`, categoria: "VINOS TINTOS — RIOJA", denominacion_origen: "D.O.Ca. Rioja", ubicacion_region: "La Rioja" })),
  ...Array.from({ length: 6 }, (_, i) => ({ nombre: `Albariño ${dos(i + 1)}`, categoria: "VINOS BLANCOS — RÍAS BAIXAS", denominacion_origen: "D.O. Rías Baixas", ubicacion_region: "Galicia" })),
  ...Array.from({ length: 2 }, (_, i) => ({ nombre: `Champagne ${dos(i + 1)}`, categoria: "VINOS ESPUMOSOS — CHAMPAGNE", denominacion_origen: "AOC Champagne", ubicacion_region: "Champagne" })),
].map((v, i) => ({
  ...v,
  id: `vino-${dos(i + 1)}`,
  precio_eur: 20 + i,
  orden: 0, // como en producción: casi todos empatan en (categoria, orden)
  activado: true,
  restaurante: true,
  ubicacion_pais: v.categoria.includes("CHAMPAGNE") ? "Francia" : "España",
  imagen_url: i === 0 ? `${SUPABASE_FALSO}/storage/v1/object/public/vinos/vino-01.png` : null,
  descripcion: `Descripción de ${v.nombre}`,
}));

/** Mini-PostgREST: filtros eq/is/in, order, offset/limit y select de columnas. */
function consultarVinos(url: URL): Vino[] {
  let filas = [...CATALOGO];
  for (const [clave, valor] of url.searchParams) {
    if (["select", "order", "offset", "limit"].includes(clave)) continue;
    const [op, ...resto] = valor.split(".");
    const crudo = resto.join(".");
    if (op === "eq") filas = filas.filter((f) => String(f[clave as keyof Vino]) === crudo);
    else if (op === "is") filas = filas.filter((f) => String(f[clave as keyof Vino]) === crudo);
    else if (op === "in") {
      const valores = crudo.replace(/^\(|\)$/g, "").match(/("([^"]*)"|[^,]+)/g)?.map((s) => s.replace(/^"|"$/g, "")) ?? [];
      filas = filas.filter((f) => valores.includes(String(f[clave as keyof Vino])));
    }
  }
  const desde = Number(url.searchParams.get("offset") ?? 0);
  const orden = (url.searchParams.get("order") ?? "").split(",").filter(Boolean).map((o) => { const [campo, dir] = o.split("."); return { campo: campo as keyof Vino, asc: dir !== "desc" }; });
  // Los empates salen en otro orden según la página pedida, como puede pasar en Postgres.
  const empate = desde === 0 ? 1 : -1;
  filas.sort((a, b) => {
    for (const { campo, asc } of orden) {
      // Algunas columnas admiten null; se compara como hasta ahora (null vale 0 al comparar en JS).
      const va = a[campo] as string | number, vb = b[campo] as string | number;
      if (va < vb) return asc ? -1 : 1;
      if (va > vb) return asc ? 1 : -1;
    }
    return a.id < b.id ? -empate : empate;
  });
  const limite = Number(url.searchParams.get("limit") ?? 1000);
  return filas.slice(desde, desde + limite);
}

type ModoCompra = "ok" | "sin_red" | "lento";
interface Backend { compras: Record<string, unknown>[]; modoCompra: ModoCompra; erroresJs: string[]; bloqueadas: string[] }

const test = base.extend<{ backend: Backend }>({
  backend: async ({ page, context, baseURL }, entregar) => {
    const backend: Backend = { compras: [], modoCompra: "ok", erroresJs: [], bloqueadas: [] };
    const propio = new URL(baseURL!).origin;
    await context.addInitScript(() => {
      window.localStorage.setItem("cookieConsent", JSON.stringify({ maps: false, ts: new Date().toISOString() }));
    });
    page.on("pageerror", (error) => backend.erroresJs.push(error.message));

    await context.route("**/*", async (route: Route) => {
      const peticion = route.request();
      const url = new URL(peticion.url());
      if (url.origin === propio) return route.continue();
      if (url.origin !== SUPABASE_FALSO) {
        backend.bloqueadas.push(peticion.url());
        return route.abort("blockedbyclient");
      }
      if (peticion.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      if (url.pathname.startsWith("/storage/v1/object/public/")) return route.fulfill({ status: 200, headers: CORS, contentType: "image/png", body: PNG_1PX });
      if (url.pathname === "/rest/v1/Vinos") {
        return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(consultarVinos(url)) });
      }
      if (url.pathname.endsWith("/cheques-regalo-web/plantilla-vista")) {
        return route.fulfill({ status: 503, headers: CORS, contentType: "application/json", body: JSON.stringify({ mensaje: "sin vista en E2E" }) });
      }
      if (url.pathname.endsWith("/cheques-regalo-web/crear")) {
        const cuerpo = peticion.postDataJSON() as Record<string, unknown>;
        backend.compras.push(cuerpo);
        if (backend.modoCompra === "sin_red") return route.abort("internetdisconnected");
        if (backend.modoCompra === "lento") await new Promise((r) => setTimeout(r, 1500));
        return route.fulfill({
          status: 200, headers: CORS, contentType: "application/json",
          body: JSON.stringify({ url: `${propio}/?cheque_regalo=exito&session_id=cs_test_e2e#contacto`, factura_solicitada: cuerpo.solicita_factura === true, ocultar_importe: cuerpo.ocultar_importe === true }),
        });
      }
      return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: "[]" });
    });

    await entregar(backend);
    expect(backend.erroresJs, "errores JavaScript sin capturar").toEqual([]);
  },
});

const sinDesbordeHorizontal = async (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

const fichas = (page: Page) => page.getByRole("button", { name: /^Ver información — / });

async function abrirCartaVinos(page: Page) {
  await page.goto("/carta/vinos");
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toBeVisible();
  // El aviso de edad no se cierra con Escape: hay que contestar.
  await page.keyboard.press("Escape");
  await expect(dialogo).toBeVisible();
  await dialogo.getByRole("button", { name: es.vinos.ageCheckConfirm }).click();
  await expect(dialogo).toBeHidden();
  await expect(fichas(page)).toHaveCount(24);
}

test.describe("Carta de vinos con el catálogo completo", () => {
  test("Todos por defecto, «Mostrar más» sin duplicados y buscador sobre las 40 referencias", async ({ page, backend: _ }) => {
    await abrirCartaVinos(page);
    const tipos = page.getByRole("group", { name: "Filtrar vinos por tipo" });
    await expect(tipos.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: es.map.showMore }).click();
    await expect(fichas(page)).toHaveCount(40);
    const nombres = await fichas(page).evaluateAll((botones) => botones.map((b) => b.getAttribute("aria-label")));
    expect(new Set(nombres).size).toBe(40);

    await page.reload();
    await expect(fichas(page)).toHaveCount(24);
    await page.getByRole("searchbox", { name: es.vinos.searchPlaceholder }).fill("albariño 05");
    await expect(page.getByRole("heading", { name: "Albariño 05", exact: true })).toBeVisible();
    await expect(fichas(page)).toHaveCount(1);
    await expect(page.getByText(es.vinos.empty)).toBeHidden();
  });

  test("tipo y denominación: segundo nivel, filtro combinado y cambio de tipo sin arrastrar la D.O.", async ({ page, backend: _ }) => {
    await abrirCartaVinos(page);
    const tipos = page.getByRole("group", { name: "Filtrar vinos por tipo" });
    await expect(page.getByRole("group", { name: "Filtrar vinos por denominación" })).toHaveCount(0);
    await tipos.getByRole("button", { name: "Tintos" }).click();
    const dos = page.getByRole("group", { name: "Filtrar vinos por denominación" });
    await expect(dos.getByRole("button", { name: "Todas" })).toHaveAttribute("aria-pressed", "true");
    await dos.getByRole("button", { name: "Rioja" }).click();
    await expect(fichas(page)).toHaveCount(6);
    await expect(page.getByRole("heading", { name: "Ribera 01", exact: true })).toBeHidden();
    await tipos.getByRole("button", { name: "Blancos" }).click();
    await expect(dos.getByRole("button", { name: "Todas" })).toHaveAttribute("aria-pressed", "true");
    await expect(dos.getByRole("button", { name: "Rioja" })).toHaveCount(0);
    await expect(fichas(page)).toHaveCount(6);
    await page.getByRole("searchbox", { name: es.vinos.searchPlaceholder }).fill("03");
    await expect(fichas(page)).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Albariño 03", exact: true })).toBeVisible();
  });

  test("foto e información son excluyentes y la foto carga", async ({ page, backend: _ }) => {
    await abrirCartaVinos(page);
    const ojo = page.getByRole("button", { name: `${es.vinos.viewPhoto} — Ribera 01` });
    await ojo.click();
    const foto = page.getByRole("img", { name: "Ribera 01" });
    await expect(foto).toBeVisible();
    expect(await foto.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.getByRole("button", { name: "Ver información — Ribera 01" }).click();
    await expect(foto).toBeHidden();
    await expect(page.getByText("Descripción de Ribera 01")).toBeVisible();
    // Sin foto, el ojo está deshabilitado.
    await expect(page.getByRole("button", { name: `${es.vinos.viewPhoto} — Ribera 02` })).toBeDisabled();
  });

  test("móvil: filtros y fichas sin desbordamiento horizontal", async ({ page, backend: _ }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await abrirCartaVinos(page);
    expect(await sinDesbordeHorizontal(page)).toBeLessThanOrEqual(1);
    await page.getByRole("group", { name: "Filtrar vinos por tipo" }).getByRole("button", { name: "Tintos" }).click();
    await expect(page.getByRole("group", { name: "Filtrar vinos por denominación" })).toBeVisible();
    expect(await sinDesbordeHorizontal(page)).toBeLessThanOrEqual(1);
  });
});

test.describe("Compra de cheque regalo (Stripe simulado)", () => {
  async function abrirCompra(page: Page, importe: string) {
    await page.goto("/#contacto");
    // Hasta que React hidrata, el input es HTML estático y lo tecleado se pierde.
    await page.waitForLoadState("networkidle");
    const seccion = page.locator("section#contacto");
    const campo = seccion.getByPlaceholder(es.contacto.giftPlaceholder);
    await expect(async () => {
      await campo.fill(importe);
      await expect(campo).toHaveValue(importe, { timeout: 500 });
    }).toPass();
    await seccion.getByRole("button", { name: es.contacto.giftButton }).click();
  }

  async function rellenarHastaElPago(page: Page) {
    const dialogo = page.getByRole("dialog");
    await expect(dialogo).toBeVisible();
    const siguiente = dialogo.getByRole("button", { name: "Continuar" });
    await dialogo.locator("textarea:visible").fill("Ana Prueba");
    await siguiente.click();
    await dialogo.locator("textarea:visible").fill("ana@example.com");
    await siguiente.click();
    for (let paso = 0; paso < 6; paso++) await siguiente.click(); // teléfono, destinatario, dedicatoria, fecha, factura, resumen
    await expect(dialogo.getByRole("button", { name: es.contacto.giftFormSubmit })).toBeVisible();
    return dialogo;
  }

  test("un importe fuera de 10–1000 € se avisa antes de abrir el formulario", async ({ page, backend }) => {
    await abrirCompra(page, "5");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText(/10\s?€.*1000\s?€|10.*1\.?000/).first()).toBeVisible();
    await abrirCompra(page, "1500");
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(backend.compras).toEqual([]);
  });

  test("pago correcto: un solo envío con los datos y vuelta con el aviso de éxito", async ({ page, backend }) => {
    await abrirCompra(page, "50");
    const dialogo = await rellenarHastaElPago(page);
    await dialogo.getByRole("button", { name: es.contacto.giftFormSubmit }).click();
    await page.waitForURL(/\/#contacto$|\/\?#contacto$|\/$/);
    await expect(page.getByText(es.contacto.toasts.giftSuccessTitle).first()).toBeVisible();
    expect(page.url()).not.toContain("cheque_regalo");
    expect(backend.compras).toHaveLength(1);
    expect(backend.compras[0]).toMatchObject({ importe_eur: 50, comprador_nombre: "Ana Prueba", comprador_email: "ana@example.com", solicita_factura: false });
  });

  test("doble clic en «Ir al pago seguro» no crea dos cheques", async ({ page, backend }) => {
    backend.modoCompra = "lento";
    await abrirCompra(page, "40");
    const dialogo = await rellenarHastaElPago(page);
    await dialogo.getByRole("button", { name: es.contacto.giftFormSubmit }).evaluate((boton: HTMLButtonElement) => { boton.click(); boton.click(); });
    // Espera a la primera petición y deja margen de sobra para que llegara una segunda.
    await expect.poll(() => backend.compras.length).toBeGreaterThan(0);
    await page.waitForTimeout(2000);
    expect(backend.compras).toHaveLength(1);
  });

  test("sin conexión: mensaje en el idioma del visitante y se puede reintentar", async ({ page, backend }) => {
    backend.modoCompra = "sin_red";
    await abrirCompra(page, "60");
    const dialogo = await rellenarHastaElPago(page);
    await dialogo.getByRole("button", { name: es.contacto.giftFormSubmit }).click();
    const alerta = dialogo.getByRole("alert");
    await expect(alerta).toContainText(es.contacto.toasts.giftPaymentErrorTitle);
    await expect(alerta).not.toContainText(/failed to fetch|load failed|networkerror/i);
    backend.modoCompra = "ok";
    await dialogo.getByRole("button", { name: es.contacto.giftFormSubmit }).click();
    await expect(page.getByText(es.contacto.toasts.giftSuccessTitle).first()).toBeVisible();
    expect(backend.compras).toHaveLength(2);
  });

  test("pago cancelado en Stripe: aviso de que no se ha cobrado y URL limpia", async ({ page, backend: _ }) => {
    await page.goto("/?cheque_regalo=cancelado#contacto");
    await expect(page.getByText(es.contacto.toasts.giftCancelTitle).first()).toBeVisible();
    expect(page.url()).not.toContain("cheque_regalo");
  });
});

const RUTAS = ["/", "/carta", "/carta/vinos", "/carta/bebidas", "/carta/entrantes", "/reservas", "/condiciones", "/politica-privacidad", "/en", "/en/carta/vinos", "/fr", "/fr/reservas", "/404"];

test.describe("Barrido responsive y errores JavaScript", () => {
  for (const ancho of [375, 768, 1280]) {
    test(`${ancho}px: ninguna ruta desborda en horizontal ni lanza errores`, async ({ page, backend: _ }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      const desbordes: string[] = [];
      for (const ruta of RUTAS) {
        const respuesta = await page.goto(ruta);
        expect(respuesta?.status(), `estado HTTP de ${ruta}`).toBeLessThan(ruta === "/404" ? 500 : 400);
        await page.waitForLoadState("networkidle");
        const exceso = await sinDesbordeHorizontal(page);
        if (exceso > 1) desbordes.push(`${ruta}: +${exceso}px`);
      }
      expect(desbordes).toEqual([]);
    });
  }
});
