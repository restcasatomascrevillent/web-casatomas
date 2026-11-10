/**
 * E2E: actividad y errores para Super Admin › Logs (src/lib/actividad), contra
 * el build SSG real. La función `registrar-actividad-web` se intercepta: se
 * comprueba LO QUE MANDA el navegador.
 *   · Con «Estadísticas»: recorrido en orden (secuencia), sin ids repetidos,
 *     y la conversión SOLO tras el 201 del servidor (pulsar «Reservar» no basta).
 *   · Sin «Estadísticas»: ninguna actividad; los errores sí, sin visitante.
 *   · Nada de lo que escribe el visitante (nombre, teléfono, email) sale.
 *   · Lotes: pocas peticiones aunque haya muchos eventos.
 */
import { test as base, expect, type Page } from "@playwright/test";
import { translations as es } from "../src/i18n/languages/es";

const SUPABASE_FALSO = `http://127.0.0.1:${process.env.E2E_SUPABASE_PORT ?? 54329}`;
const AHORA = new Date("2026-10-05T10:00:00+02:00");
const HORA = "13:00";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };

interface EventoEnviado { id: string; tipo: string; accion?: string; seq?: number; sesion?: string; visitante?: string | null; ruta?: string; objetivo?: string; t: string; props?: Record<string, unknown> }
interface Lote { contexto: Record<string, unknown>; eventos: EventoEnviado[] }

function disponibilidad(fecha: string) {
  return [
    { kind: "meta", fecha, cerrado: false, aforo_turno: {}, total_periodos: 1, total_ocupacion: 0 },
    { kind: "periodo", fecha, nombre_periodo: "Comida", hora_inicio: "13:00", hora_fin: "16:00", intervalo_base_minutos: 60, umbral_apertura_secundario: 0, dias_semana: [], ocultar_primario_si_secundario: false },
    {
      kind: "hueco", fecha, hora: HORA, turno: "comida", nivel: 0, minutos_nivel: 60, etiqueta_nivel: "hora en punto", umbral_nivel: 0, estado: "libre",
      ofrecido: true, motivo: null, periodo: "Comida", abierto_por: null, abierto_con_porcentaje: null, promovido: false, comensales_hora: 0,
      reservas_hora: 0, porcentaje_hora: 0, porcentaje_para_umbral: 0, capacidad_maxima: 80, capacidad_disponible: 80, porcentaje_ocupacion: 0,
    },
  ];
}

type Opciones = { estadisticas: boolean; respuestaCrear?: { status: number; body: unknown } };
const test = base.extend<{ opciones: Opciones; capturado: { lotes: Lote[]; tiposContenido: string[]; momentoCrear: number[]; momentoLote: number[] } }>({
  opciones: [{ estadisticas: true }, { option: true }],
  capturado: async ({ page, context, baseURL, opciones }, entregar) => {
    const capturado = { lotes: [] as Lote[], tiposContenido: [] as string[], momentoCrear: [] as number[], momentoLote: [] as number[] };
    const propio = new URL(baseURL!).origin;
    await context.addInitScript((estadisticas) => {
      window.localStorage.setItem("cookieConsent", JSON.stringify({ maps: false, estadisticas, ts: new Date().toISOString() }));
      // Un navegador automatizado no manda actividad salvo que lo pida (src/lib/actividad/clasificar.ts, `silenciarPorPrueba`).
      window.localStorage.setItem("ct_actividad_e2e", "1");
    }, opciones.estadisticas);
    await page.clock.setFixedTime(AHORA);
    await context.route("**/*", async (route) => {
      const r = route.request();
      const url = new URL(r.url());
      if (url.origin === propio) return route.continue();
      if (url.origin === SUPABASE_FALSO && r.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      if (url.pathname.endsWith("/functions/v1/registrar-actividad-web")) {
        capturado.tiposContenido.push(r.headers()["content-type"] ?? "");
        capturado.lotes.push(JSON.parse(r.postData() ?? "{}"));
        capturado.momentoLote.push(Date.now());
        return route.fulfill({ status: 202, headers: CORS, contentType: "application/json", body: JSON.stringify({ aceptados: 1 }) });
      }
      if (url.pathname.endsWith("/reservas-web/disponibilidad")) {
        const { fecha } = r.postDataJSON() as { fecha: string };
        return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(disponibilidad(fecha)) });
      }
      if (url.pathname.endsWith("/reservas-web/crear")) {
        capturado.momentoCrear.push(Date.now());
        const resp = opciones.respuestaCrear ?? { status: 201, body: { ok: true, reserva_id: "e2e", estado: "pendiente" } };
        return route.fulfill({ status: resp.status, headers: CORS, contentType: "application/json", body: JSON.stringify(resp.body) });
      }
      if (url.origin === SUPABASE_FALSO) return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: "[]" });
      return route.abort("blockedbyclient");
    });
    await entregar(capturado);
  },
});

const eventos = (lotes: Lote[]) => lotes.flatMap((l) => l.eventos);
const tipos = (lotes: Lote[]) => eventos(lotes).map((e) => `${e.tipo}${e.accion ? `:${e.accion}` : ""}`);

/** Fuerza el envío de lo pendiente como al cambiar de pestaña (visibilitychange → hidden). */
async function vaciar(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

async function hacerReserva(page: Page) {
  const f = es.reservationForm;
  await page.goto("/");
  await page.waitForFunction(() => window.localStorage.getItem("language") !== null);
  // Rastreador instalado (en un momento ocioso tras hidratar).
  await expect.poll(() => page.evaluate(() => !!window.localStorage.getItem("ct_actividad")), { timeout: 15_000 }).toBe(true);
  // Navegación dentro de la web (react-router), como un visitante: clic en «Reservar».
  await page.getByRole("link", { name: /reservar/i }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/reservas$/);
  const form = page.locator("section#reservas form");
  await expect(form).toBeVisible();
  await form.locator("button", { hasText: f.datePlaceholder }).click();
  await page.locator('button[name="day"]:not([disabled])').last().click();
  await form.getByRole("button", { name: f.checkAvailability }).click();
  await form.getByRole("button", { name: HORA, exact: true }).click();
  await form.getByRole("textbox", { name: f.nameLabel }).fill("Marta Ruiz");
  await form.getByPlaceholder("+34 612345678").fill("+34 612345678");
  await form.getByRole("textbox", { name: f.emailLabel }).fill("marta@example.com");
  await form.getByRole("checkbox", { name: new RegExp(f.termsLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }).check();
  await form.getByRole("button", { name: f.submit, exact: true }).click();
}

test.describe("actividad con «Estadísticas» aceptado", () => {
  test("recorrido en orden, sin duplicados, sin datos personales y la reserva solo tras el 201", async ({ page, capturado }) => {
    await hacerReserva(page);
    await expect(page.getByText(es.reservationForm.successTitle)).toBeVisible();
    await vaciar(page);
    await expect.poll(() => tipos(capturado.lotes), { timeout: 15_000 }).toContain("reserva_solicitada:ok");

    const todos = eventos(capturado.lotes);
    // Sin ids repetidos (cada evento una vez aunque haya varios lotes).
    expect(new Set(todos.map((e) => e.id)).size).toBe(todos.length);
    // Una sola sesión seudónima y visitante, y la secuencia estrictamente creciente.
    const conSesion = todos.filter((e) => e.visitante);
    expect(new Set(conSesion.map((e) => e.sesion)).size).toBe(1);
    const seqs = conSesion.map((e) => e.seq!);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);

    const t = tipos(capturado.lotes);
    const pos = (x: string) => t.indexOf(x);
    expect(todos.filter((e) => e.tipo === "pagina_vista").map((e) => e.ruta)).toEqual(["/", "/reservas"]);
    // Fin de la portada al navegar, con su tiempo activo y scroll; y el clic en «Reservar» registrado como clic.
    expect(todos.find((e) => e.tipo === "pagina_salida" && e.ruta === "/")).toMatchObject({ accion: "navegacion" });
    expect(todos.some((e) => e.tipo === "clic" && /reserv/i.test(String(e.objetivo)))).toBe(true);
    expect(todos.find((e) => e.tipo === "pagina_vista")?.props).toMatchObject({ navegacion: "inicial", idioma: "es" });
    expect(pos("formulario:inicio")).toBeGreaterThan(-1);
    expect(pos("reserva_disponibilidad:con_huecos")).toBeGreaterThan(pos("formulario:inicio"));
    expect(pos("formulario:envio")).toBeGreaterThan(pos("reserva_disponibilidad:con_huecos"));
    expect(pos("reserva_solicitada:ok")).toBeGreaterThan(pos("formulario:envio"));
    // La conversión se apunta DESPUÉS de que el servidor contestara 201.
    // (Se compara con la hora real del lado de Playwright: en el navegador el reloj está simulado.)
    const loteReserva = capturado.lotes.findIndex((l) => l.eventos.some((e) => e.tipo === "reserva_solicitada"));
    expect(capturado.momentoLote[loteReserva]).toBeGreaterThanOrEqual(capturado.momentoCrear[0]);

    // Nada de lo escrito en el formulario.
    const crudo = JSON.stringify(capturado.lotes);
    for (const prohibido of ["Marta", "Ruiz", "612345678", "marta@example.com"]) expect(crudo).not.toContain(prohibido);
    // text/plain: sin preflight CORS; y pocos envíos para todos esos eventos.
    expect(capturado.tiposContenido.every((c) => c.startsWith("text/plain"))).toBe(true);
    expect(capturado.lotes.length).toBeLessThanOrEqual(Math.ceil(todos.length / 5) + 3);
    // Playwright se marca como prueba automática (las estadísticas la excluyen).
    expect(capturado.lotes[0].contexto).toMatchObject({ consentimiento: true, prueba: true });
  });

  test.describe("rechazo del servidor", () => {
    test.use({ opciones: { estadisticas: true, respuestaCrear: { status: 409, body: { ok: false, motivo: "hora_completa", mensaje: "Hora completa" } } } });
    test("pulsar «Reservar» con rechazo NO cuenta como conversión", async ({ page, capturado }) => {
      await hacerReserva(page);
      await vaciar(page);
      await expect.poll(() => tipos(capturado.lotes), { timeout: 15_000 }).toContain("reserva_rechazada:hora_completa");
      expect(tipos(capturado.lotes)).not.toContain("reserva_solicitada:ok");
      expect(tipos(capturado.lotes)).toContain("formulario:envio");
    });
  });
});

test.describe("sin «Estadísticas»", () => {
  test.use({ opciones: { estadisticas: false } });
  test("no se manda actividad ni se guarda identificador; un error sí, sin visitante", async ({ page, capturado }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.localStorage.getItem("language") !== null);
    // Un <script> que lanza: el navegador emite el evento «error» de verdad (el reloj
    // simulado de Playwright se queda con las excepciones de los temporizadores).
    await page.addScriptTag({ content: 'throw new Error("Fallo controlado E2E");' }).catch(() => {});
    await expect.poll(() => tipos(capturado.lotes), { timeout: 15_000 }).toContain("error_js");
    await vaciar(page);
    const todos = eventos(capturado.lotes);
    expect(todos.every((e) => e.tipo.startsWith("error_"))).toBe(true);
    expect(todos.every((e) => !e.visitante)).toBe(true);
    expect(capturado.lotes.every((l) => l.contexto.consentimiento === false)).toBe(true);
    expect(await page.evaluate(() => window.localStorage.getItem("ct_actividad"))).toBeNull();
  });
});
