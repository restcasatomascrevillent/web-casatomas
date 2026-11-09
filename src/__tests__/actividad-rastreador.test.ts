/**
 * Rastreador de actividad (src/lib/actividad): consentimiento, sesión
 * seudónima, orden y sin duplicados, reintentos con los mismos ids,
 * clasificación de clics y procedencia. Sin red: el envío se inyecta.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { CLAVE_ALMACEN, INACTIVIDAD_SESION_MS, Rastreador, type EntornoRastreador, type EventoCliente } from "@/lib/actividad/rastreador";
import { clasificarClic, endpointDe, etiquetaDe, idiomaDeRuta, procedenciaDe } from "@/lib/actividad/clasificar";
import { _reiniciarRegistro, conectarEmisor, registrarActividad } from "@/lib/actividad/registro";

function almacenMemoria() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

function crear(opciones: { consentimiento?: boolean; envios?: Array<boolean | "lanza"> } = {}) {
  let t = Date.parse("2026-11-08T12:00:00Z");
  let n = 0;
  let consentimiento = opciones.consentimiento ?? true;
  const respuestas = [...(opciones.envios ?? [])];
  const lotes: Array<{ cuerpo: { contexto: Record<string, unknown>; eventos: EventoCliente[] }; beacon: boolean }> = [];
  const temporizadores: Array<() => void> = [];
  const almacen = almacenMemoria();
  const e: EntornoRastreador = {
    url: "https://x/functions/v1/registrar-actividad-web",
    ahora: () => t,
    uuid: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
    almacen,
    consentimiento: () => consentimiento,
    enviar: async (cuerpo, beacon) => {
      lotes.push({ cuerpo: JSON.parse(cuerpo), beacon });
      const r = respuestas.shift() ?? true;
      if (r === "lanza") throw new TypeError("Failed to fetch");
      return r;
    },
    rutaActual: () => "/carta",
    contexto: () => ({ version: "0.40", despliegue: "abc", interno: false, prueba: false, tactil: true }),
    temporizador: { set: (fn) => { temporizadores.push(fn); return temporizadores.length; }, clear: () => {} },
  };
  const r = new Rastreador(e);
  return {
    r, lotes, almacen,
    avanzar: (ms: number) => { t += ms; },
    disparar: async () => { const fns = temporizadores.splice(0); for (const f of fns) f(); await Promise.resolve(); await Promise.resolve(); },
    setConsentimiento: (v: boolean) => { consentimiento = v; },
  };
}

describe("consentimiento", () => {
  it("sin consentimiento: ni actividad ni identificadores guardados; los errores sí, con id efímero", async () => {
    const { r, almacen, lotes } = crear({ consentimiento: false });
    expect(r.registrar("clic", { objetivo: "Reservar" })).toBeNull();
    const err = r.registrar("error_js", { error: { mensaje: "boom" } })!;
    expect(err.visitante).toBeNull();
    expect(err.sesion).toMatch(/^00000000/);
    expect(almacen.m.has(CLAVE_ALMACEN)).toBe(false);
    await Promise.resolve();
    expect(lotes[0].cuerpo.contexto).toMatchObject({ consentimiento: false });
  });
  it("al retirar el consentimiento se borran los ids y la actividad pendiente", () => {
    const c = crear();
    c.r.registrar("clic", { objetivo: "a" });
    expect(c.almacen.m.has(CLAVE_ALMACEN)).toBe(true);
    c.setConsentimiento(false);
    c.r.revisarConsentimiento();
    expect(c.almacen.m.has(CLAVE_ALMACEN)).toBe(false);
    expect(c.r.pendientes()).toHaveLength(0);
  });
});

describe("sesión, orden y duplicados", () => {
  it("misma sesión y secuencia creciente; 30 min sin actividad abren otra (mismo visitante)", () => {
    const { r, avanzar } = crear();
    const a = r.registrar("pagina_vista", { ruta: "/" })!;
    avanzar(1000);
    const b = r.registrar("clic", { objetivo: "Carta" })!;
    expect([a.sesion, a.seq, b.seq]).toEqual([b.sesion, 1, 2]);
    avanzar(INACTIVIDAD_SESION_MS + 1);
    expect(r.sesionNueva()).toBe(true);
    const c = r.registrar("pagina_vista", { ruta: "/carta" })!;
    expect(c.sesion).not.toBe(a.sesion);
    expect(c.visitante).toBe(a.visitante);
    expect(c.seq).toBe(1);
    expect(Date.parse(b.t)).toBeGreaterThan(Date.parse(a.t));
  });
  it("el mismo evento dos veces seguidas (doble clic) cuenta una", () => {
    const { r, avanzar } = crear();
    expect(r.registrar("clic", { objetivo: "Reservar" })).not.toBeNull();
    avanzar(100);
    expect(r.registrar("clic", { objetivo: "Reservar" })).toBeNull();
    avanzar(1000);
    expect(r.registrar("clic", { objetivo: "Reservar" })).not.toBeNull();
  });
  it("como mucho 3 repeticiones del mismo error por carga", () => {
    const { r, avanzar } = crear({ consentimiento: false });
    const n = [1, 2, 3, 4, 5].filter(() => { avanzar(1000); return r.registrar("error_js", { error: { mensaje: "x" } }) !== null; }).length;
    expect(n).toBe(3);
  });
});

describe("envío por lotes", () => {
  it("agrupa y manda al vencer el plazo; la conversión sale enseguida", async () => {
    const c = crear();
    c.r.registrar("pagina_vista", { ruta: "/" });
    c.r.registrar("clic", { objetivo: "a" });
    expect(c.lotes).toHaveLength(0);
    await c.disparar();
    expect(c.lotes[0].cuerpo.eventos.map((e) => e.tipo)).toEqual(["pagina_vista", "clic"]);
    c.r.registrar("reserva_solicitada", { accion: "ok" });
    await Promise.resolve();
    expect(c.lotes[1].cuerpo.eventos[0].tipo).toBe("reserva_solicitada");
    expect(c.lotes[1].cuerpo.contexto).toMatchObject({ version: "0.40", consentimiento: true });
  });
  it("si falla, reintenta el MISMO lote (mismos ids) y en orden", async () => {
    const c = crear({ envios: ["lanza", false, true] });
    c.r.registrar("pagina_vista", { ruta: "/" });
    c.r.registrar("clic", { objetivo: "a" });
    await c.disparar(); // falla (red)
    c.r.registrar("clic", { objetivo: "b" });
    await c.disparar(); // falla (503)
    await c.disparar(); // bien
    const ids = c.lotes.map((l) => l.cuerpo.eventos.map((e) => e.id));
    expect(ids[1].slice(0, 2)).toEqual(ids[0]);
    expect(ids[2]).toEqual(ids[1]);
    expect(c.lotes[2].cuerpo.eventos.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(c.r.pendientes()).toHaveLength(0);
  });
  it("al cerrar la página, todo por beacon", async () => {
    const c = crear();
    c.r.registrar("pagina_vista", { ruta: "/" });
    await c.r.vaciar(true);
    expect(c.lotes[0].beacon).toBe(true);
  });
});

describe("registro antes de instalar", () => {
  afterEach(() => _reiniciarRegistro());
  it("encola y entrega en orden al conectar", () => {
    registrarActividad("clic", { objetivo: "1" });
    registrarActividad("clic", { objetivo: "2" });
    const vistos: string[] = [];
    conectarEmisor((_t, d) => vistos.push(String(d.objetivo)));
    registrarActividad("clic", { objetivo: "3" });
    expect(vistos).toEqual(["1", "2", "3"]);
  });
});

describe("clasificación", () => {
  const origen = "https://restaurantecasatomascrevillente.es/carta";
  const el = (html: string) => {
    document.body.innerHTML = html;
    return document.body.querySelector("[data-objetivo]") ?? document.body.firstElementChild!;
  };
  it("teléfono, WhatsApp, mapa y redes son contacto (un clic, no una llamada); la etiqueta nunca lleva el número", () => {
    expect(clasificarClic(el('<a data-objetivo href="tel:+34965400000">Llamar al 965 40 00 00</a>'), origen)).toMatchObject({ tipo: "contacto", accion: "telefono", objetivo: "Llamar al [número]" });
    expect(clasificarClic(el('<a data-objetivo href="https://wa.me/34600000000">WhatsApp</a>'), origen)).toMatchObject({ tipo: "contacto", accion: "whatsapp" });
    expect(clasificarClic(el('<a data-objetivo href="https://maps.app.goo.gl/abc">Cómo llegar</a>'), origen)).toMatchObject({ tipo: "contacto", accion: "mapa" });
    expect(clasificarClic(el('<a data-objetivo href="https://www.google.com/maps/place/x">Mapa</a>'), origen)).toMatchObject({ accion: "mapa" });
    expect(clasificarClic(el('<a data-objetivo href="https://www.instagram.com/casatomas">IG</a>'), origen)).toMatchObject({ tipo: "contacto", accion: "red_social", objetivo: "instagram.com" });
  });
  it("enlaces internos/externos y botones; data-track manda; campos e ignorados fuera", () => {
    expect(clasificarClic(el('<a data-objetivo href="/reservas?x=1">Reservar</a>'), origen)).toEqual({ tipo: "clic", objetivo: "Reservar", props: { destino: "/reservas", elemento: "enlace", zona: undefined } });
    expect(clasificarClic(el('<header><button data-objetivo aria-label="Abrir menú">≡</button></header>'), origen)).toMatchObject({ objetivo: "Abrir menú", props: { elemento: "boton", zona: "cabecera" } });
    expect(clasificarClic(el('<div data-track="cta-reservar-hero"><span data-objetivo>Reserva ya</span></div>'), origen)?.objetivo).toBe("cta-reservar-hero");
    expect(clasificarClic(el('<input data-objetivo name="email" value="a@b.es">'), origen)).toBeNull();
    expect(clasificarClic(el('<div data-track-ignorar><button data-objetivo>x</button></div>'), origen)).toBeNull();
    expect(etiquetaDe(el('<button data-objetivo>  Ver   la carta  </button>'))).toBe("Ver la carta");
  });
  it("procedencia: solo el host del referente y utm/qr de la URL", () => {
    expect(procedenciaDe("https://www.google.es/search?q=casa+tomas", "https://x.es/?utm_source=ig&qr=mesa-3&otra=1")).toEqual({ referente: "www.google.es", utm_source: "ig", qr: "mesa-3" });
    expect(procedenciaDe("", "https://x.es/")).toEqual({});
    expect(idiomaDeRuta("/en/carta")).toBe("en");
    expect(idiomaDeRuta("/carta")).toBe("es");
  });
  it("endpoint de Supabase sin consulta", () => {
    const base = "https://abc.supabase.co/functions/v1";
    expect(endpointDe(`${base}/reservas-web/crear?x=1`, base)).toBe("reservas-web/crear");
    expect(endpointDe("https://abc.supabase.co/rest/v1/configuracion_tienda?select=*", base)).toBe("rest:configuracion_tienda");
    expect(endpointDe("https://api.mapbox.com/x", base)).toBeNull();
  });
});

describe("no sale nada personal desde los componentes", () => {
  it("la API documenta que no se pasan valores de campos (comprobación del contrato)", () => {
    const spy = vi.fn();
    conectarEmisor(spy);
    registrarActividad("reserva_solicitada", { accion: "ok", props: { comensales: 4, dias_antelacion: 3 } });
    expect(JSON.stringify(spy.mock.calls)).not.toMatch(/@|nombre|telefono|email/);
    _reiniciarRegistro();
  });
});
