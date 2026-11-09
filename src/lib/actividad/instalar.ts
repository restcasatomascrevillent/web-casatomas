/**
 * Instala el rastreador en el navegador (lo llama `SeguimientoActividad` en un
 * momento ocioso tras hidratar). Escuchas pasivas y delegadas, una sola vez:
 *   · páginas vistas y fin de página (tiempo activo visible y scroll máximo);
 *   · clics en botones, enlaces y contacto (teléfono, WhatsApp, mapa, redes);
 *   · formularios marcados con `data-track-form`: inicio, avance (n.º de
 *     campos), envío, error de validación y abandono estimado — NUNCA valores;
 *   · vídeos (reproducir, pausa, fin);
 *   · peticiones a Supabase (endpoint, código y duración) y sus fallos;
 *   · errores de JavaScript, promesas y recursos que no cargan;
 *   · tiempos de carga de la página.
 * Nada de grabación de pantalla ni de pulsaciones de teclado.
 */

import { alCambiarConsentimiento, estadisticasAceptadas } from "@/lib/cookie-consent";
import { FUNCTIONS_BASE_URL } from "@/lib/supabase-functions";
import { clasificarClic, endpointDe, idiomaDeRuta, procedenciaDe } from "./clasificar";
import { conectarEmisor, type DatosActividad } from "./registro";
import { Rastreador } from "./rastreador";

export const URL_INGESTA = `${FUNCTIONS_BASE_URL}/registrar-actividad-web`;
const INACTIVO_MS = 60_000;

const uuid = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));

const almacenSeguro = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** ?ct_interno=1 marca este navegador como del personal (se excluye de las estadísticas); ?ct_interno=0 lo desmarca. */
function esInterno(): boolean {
  const a = almacenSeguro();
  try {
    const p = new URLSearchParams(window.location.search).get("ct_interno");
    if (p === "1") a?.setItem("ct_interno", "1");
    if (p === "0") a?.removeItem("ct_interno");
    return a?.getItem("ct_interno") === "1";
  } catch {
    return false;
  }
}

async function enviar(cuerpo: string, beacon: boolean): Promise<boolean> {
  if (!FUNCTIONS_BASE_URL.startsWith("http")) return false;
  if (beacon && typeof navigator.sendBeacon === "function") {
    // text/plain: petición «simple», sin preflight CORS.
    return navigator.sendBeacon(URL_INGESTA, new Blob([cuerpo], { type: "text/plain;charset=UTF-8" }));
  }
  const res = await fetchOriginal(URL_INGESTA, {
    method: "POST",
    body: cuerpo,
    keepalive: cuerpo.length < 60_000,
    credentials: "omit",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
  });
  // 4xx (cuerpo no válido, origen no permitido): reintentar no lo arregla.
  return res.ok || (res.status >= 400 && res.status < 500);
}

let fetchOriginal: typeof fetch = (entrada, init) => fetch(entrada, init);

export interface Seguimiento {
  cambioDeRuta: (ruta: string) => void;
  desinstalar: () => void;
  rastreador: Rastreador;
}

let instalado: Seguimiento | null = null;

export function instalarSeguimiento(): Seguimiento | null {
  if (typeof window === "undefined") return null;
  if (instalado) return instalado;
  fetchOriginal = window.fetch.bind(window);
  const interno = esInterno();
  const prueba = navigator.webdriver === true;
  const version = (import.meta.env.VITE_VERSION_WEB as string | undefined) || null;
  const despliegue = (import.meta.env.VITE_COMMIT_WEB as string | undefined) || null;
  const tactil = (navigator.maxTouchPoints ?? 0) > 1;

  const r = new Rastreador({
    url: URL_INGESTA,
    ahora: () => (typeof performance !== "undefined" && performance.timeOrigin ? Math.round(performance.timeOrigin + performance.now()) : Date.now()),
    uuid,
    almacen: almacenSeguro(),
    consentimiento: estadisticasAceptadas,
    enviar,
    rutaActual: () => window.location.pathname,
    contexto: () => ({ version, despliegue, interno, prueba, tactil }),
  });
  const deshacer: Array<() => void> = [];
  const escuchar = <K extends keyof WindowEventMap>(destino: Window | Document, tipo: K | string, fn: (e: Event) => void, opciones: AddEventListenerOptions = { passive: true, capture: true }) => {
    destino.addEventListener(tipo, fn, opciones);
    deshacer.push(() => destino.removeEventListener(tipo, fn, opciones));
  };

  // ─── Página actual: tiempo activo visible y scroll ──────────────────────────
  let vista: { id: string; ruta: string; scrollMax: number; hitos: Set<number>; activoMs: number; desde: number | null; ultimaInteraccion: number } | null = null;
  const ahora = () => Date.now();
  const contarActivo = () => {
    if (!vista || vista.desde === null) return;
    const t = ahora();
    // Sin interacción en 60 s: ese rato no cuenta (pestaña abierta y olvidada).
    const hasta = Math.min(t, vista.ultimaInteraccion + INACTIVO_MS);
    if (hasta > vista.desde) vista.activoMs += hasta - vista.desde;
    vista.desde = document.visibilityState === "visible" ? t : null;
  };
  const cerrarVista = (accion: "navegacion" | "oculta" | "cierre") => {
    if (!vista) return;
    contarActivo();
    if (vista.activoMs > 0 || accion === "navegacion") {
      r.registrar("pagina_salida", { accion, ruta: vista.ruta, valor: Math.round(vista.activoMs), props: { scroll_max: Math.round(vista.scrollMax), vista_id: vista.id } });
    }
    vista.activoMs = 0; // lo siguiente se cuenta aparte (delta), para no sumar dos veces
  };
  const medirScroll = () => {
    if (!vista) return;
    const doc = document.documentElement;
    const alto = Math.max(doc.scrollHeight, document.body?.scrollHeight ?? 0);
    const pct = alto <= window.innerHeight ? 100 : Math.min(100, ((window.scrollY + window.innerHeight) / alto) * 100);
    vista.scrollMax = Math.max(vista.scrollMax, pct);
    for (const hito of [25, 50, 75, 100]) {
      if (vista.scrollMax >= hito && !vista.hitos.has(hito)) {
        vista.hitos.add(hito);
        if (hito > 0 && alto > window.innerHeight * 1.2) r.registrar("scroll", { valor: hito, ruta: vista.ruta, props: { vista_id: vista.id } });
      }
    }
  };
  let primera = true;
  const cambioDeRuta = (ruta: string) => {
    if (vista && vista.ruta === ruta) return;
    if (vista) {
      cerrarVista("navegacion");
      formularios.forEach((f, nombre) => abandono(nombre, f));
    }
    vista = { id: uuid(), ruta, scrollMax: 0, hitos: new Set(), activoMs: 0, desde: document.visibilityState === "visible" ? ahora() : null, ultimaInteraccion: ahora() };
    const props: Record<string, string> = { vista_id: vista.id, idioma: idiomaDeRuta(ruta), navegacion: primera ? "inicial" : "cliente" };
    // La procedencia va con la primera página de la carga (y de una sesión nueva tras 30 min).
    if (primera || r.sesionNueva()) Object.assign(props, procedenciaDe(primera ? document.referrer : "", window.location.href));
    primera = false;
    r.registrar("pagina_vista", { ruta, props });
    requestAnimationFrame(medirScroll);
  };

  let pendienteScroll = false;
  escuchar(window, "scroll", () => {
    if (vista) vista.ultimaInteraccion = ahora();
    if (pendienteScroll) return;
    pendienteScroll = true;
    requestAnimationFrame(() => {
      pendienteScroll = false;
      medirScroll();
    });
  });
  for (const tipo of ["pointerdown", "keydown", "touchstart"]) {
    escuchar(window, tipo, () => {
      if (!vista) return;
      if (vista.desde !== null && ahora() - vista.ultimaInteraccion > INACTIVO_MS) {
        contarActivo();
        vista.desde = ahora();
      }
      vista.ultimaInteraccion = ahora();
    });
  }
  escuchar(document, "visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      cerrarVista("oculta");
      enviarCarga();
      void r.vaciar(true);
    } else if (vista) {
      vista.desde = ahora();
      vista.ultimaInteraccion = ahora();
    }
  });
  escuchar(window, "pagehide", () => {
    cerrarVista("cierre");
    formularios.forEach((f, nombre) => abandono(nombre, f));
    enviarCarga();
    void r.vaciar(true);
  });

  // ─── Clics ──────────────────────────────────────────────────────────────────
  escuchar(document, "click", (e) => {
    const c = clasificarClic(e.target, window.location.href);
    if (c) r.registrar(c.tipo, { accion: c.accion, objetivo: c.objetivo, props: c.props });
  });

  // ─── Formularios (data-track-form="reserva" | "cheque" | …) ────────────────
  const formularios = new Map<string, { campos: Set<string>; total: number; enviado: boolean; avisados: number }>();
  const formDe = (t: EventTarget | null) => (t instanceof Element ? t.closest<HTMLFormElement>("form[data-track-form]") : null);
  const nombreCampo = (el: Element) => (el.getAttribute("name") || el.getAttribute("id") || el.getAttribute("aria-label") || "campo").replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "campo";
  const abandono = (nombre: string, f: { campos: Set<string>; total: number; enviado: boolean }) => {
    if (!f.enviado) r.registrar("formulario", { accion: "abandono", objetivo: nombre, props: { campos: f.campos.size, total: f.total } });
    formularios.delete(nombre);
  };
  escuchar(document, "focusin", (e) => {
    const form = formDe(e.target);
    // Cualquier control del formulario cuenta como empezar (el calendario de la reserva es un botón).
    if (!form || !(e.target instanceof Element) || !e.target.matches("input, select, textarea, button, [role=combobox], [tabindex]")) return;
    const nombre = form.dataset.trackForm!;
    if (!formularios.has(nombre)) {
      const total = form.querySelectorAll("input:not([type=hidden]):not([type=checkbox]), select, textarea").length;
      formularios.set(nombre, { campos: new Set(), total, enviado: false, avisados: 0 });
      r.registrar("formulario", { accion: "inicio", objetivo: nombre, props: { total } });
    }
  });
  escuchar(document, "change", (e) => {
    const form = formDe(e.target);
    if (!form || !(e.target instanceof Element)) return;
    const f = formularios.get(form.dataset.trackForm!);
    if (!f) return;
    f.campos.add(nombreCampo(e.target));
    // Avance cada 2 campos nuevos (solo cuántos, nunca qué se escribió).
    if (f.campos.size - f.avisados >= 2) {
      f.avisados = f.campos.size;
      r.registrar("formulario", { accion: "avance", objetivo: form.dataset.trackForm, props: { campos: f.campos.size, total: f.total } });
    }
  });
  escuchar(document, "submit", (e) => {
    const form = formDe(e.target);
    if (!form) return;
    const nombre = form.dataset.trackForm!;
    const f = formularios.get(nombre) ?? { campos: new Set<string>(), total: 0, enviado: false, avisados: 0 };
    f.enviado = true;
    formularios.set(nombre, f);
    r.registrar("formulario", { accion: "envio", objetivo: nombre, props: { campos: f.campos.size, total: f.total } });
  });
  escuchar(document, "invalid", (e) => {
    const form = formDe(e.target);
    if (form && e.target instanceof Element) r.registrar("formulario", { accion: "error_validacion", objetivo: form.dataset.trackForm, props: { campo: nombreCampo(e.target) } });
  });

  // ─── Vídeos ─────────────────────────────────────────────────────────────────
  const accionMedia: Record<string, string> = { play: "reproducir", pause: "pausa", ended: "fin" };
  for (const tipo of Object.keys(accionMedia)) {
    escuchar(document, tipo, (e) => {
      const v = e.target;
      if (!(v instanceof HTMLVideoElement) || (tipo === "pause" && v.ended)) return;
      // Vídeos de fondo en bucle y silenciados: no son una interacción.
      if (v.autoplay && v.muted && v.loop) return;
      const nombre = v.getAttribute("aria-label") || v.getAttribute("title") || (v.currentSrc || "").split(/[?#]/)[0].split("/").pop() || "vídeo";
      r.registrar("media", { accion: accionMedia[tipo], objetivo: nombre, valor: Math.round(v.currentTime), props: { medio: "video" } });
    });
  }

  // ─── Errores ────────────────────────────────────────────────────────────────
  // JS y promesas: `capturarErroresTempranos` (registro.ts), desde el arranque.
  // Aquí, los recursos que no cargan (el evento no burbujea: fase de captura).
  escuchar(window, "error", (e) => {
    const destino = e.target;
    if (destino instanceof HTMLImageElement || destino instanceof HTMLScriptElement || destino instanceof HTMLLinkElement || destino instanceof HTMLVideoElement) {
      const src = (destino as HTMLImageElement).currentSrc || (destino as HTMLImageElement).src || (destino as HTMLLinkElement).href || "";
      if (!src || src.startsWith("data:") || src.startsWith("blob:")) return;
      r.registrar("error_recurso", { objetivo: src.split(/[?#]/)[0].slice(0, 200), props: { etiqueta: destino.tagName.toLowerCase() } });
    }
  }, { capture: true, passive: true });

  // ─── Peticiones a Supabase ──────────────────────────────────────────────────
  const fetchAnterior = window.fetch;
  const fetchMedido: typeof fetch = async (entrada, init) => {
    const url = typeof entrada === "string" ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    const endpoint = url.startsWith(URL_INGESTA) ? null : endpointDe(url, FUNCTIONS_BASE_URL);
    if (!endpoint) return fetchAnterior(entrada, init);
    const metodo = (init?.method ?? (entrada instanceof Request ? entrada.method : "GET")).toUpperCase();
    const t0 = performance.now();
    try {
      const res = await fetchAnterior(entrada, init);
      const ms = Math.round(performance.now() - t0);
      r.registrar("peticion", { valor: ms, props: { endpoint, metodo, status: res.status } });
      if (res.status >= 500) r.registrar("error_peticion", { objetivo: endpoint, valor: ms, props: { endpoint, metodo, status: res.status }, error: { mensaje: `HTTP ${res.status} en ${endpoint}` } });
      return res;
    } catch (err) {
      const ms = Math.round(performance.now() - t0);
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        r.registrar("error_peticion", { objetivo: endpoint, valor: ms, props: { endpoint, metodo, status: 0 }, error: { mensaje: `Sin respuesta de ${endpoint}${navigator.onLine === false ? " (sin conexión)" : ""}` } });
      }
      throw err;
    }
  };
  window.fetch = fetchMedido;
  deshacer.push(() => {
    if (window.fetch === fetchMedido) window.fetch = fetchAnterior;
  });

  // ─── Tiempos de carga (una vez por documento) ───────────────────────────────
  let lcp: number | null = null;
  let cargaEnviada = false;
  try {
    const po = new PerformanceObserver((lista) => {
      const ultima = lista.getEntries().at(-1);
      if (ultima) lcp = Math.round(ultima.startTime);
    });
    po.observe({ type: "largest-contentful-paint", buffered: true });
    deshacer.push(() => po.disconnect());
  } catch {
    // navegador sin LCP
  }
  const enviarCarga = () => {
    if (cargaEnviada) return;
    const nav = performance.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (!nav || !nav.loadEventEnd) return;
    cargaEnviada = true;
    r.registrar("carga_pagina", { props: { ttfb: Math.round(nav.responseStart), dom: Math.round(nav.domContentLoadedEventEnd), carga: Math.round(nav.loadEventEnd), lcp: lcp ?? undefined, navegacion: nav.type } });
  };
  const tCarga = setTimeout(enviarCarga, 10_000);
  deshacer.push(() => clearTimeout(tCarga));

  // ─── Consentimiento ─────────────────────────────────────────────────────────
  deshacer.push(alCambiarConsentimiento(() => {
    r.revisarConsentimiento();
    // Al aceptar a mitad de visita, la página actual cuenta como entrada de la sesión.
    if (estadisticasAceptadas() && vista) {
      const ruta = vista.ruta;
      vista = null;
      primera = true;
      cambioDeRuta(ruta);
    }
  }));

  conectarEmisor((tipo, datos: DatosActividad) => {
    r.registrar(tipo, datos);
  });

  instalado = {
    rastreador: r,
    cambioDeRuta,
    desinstalar: () => {
      conectarEmisor(null);
      deshacer.splice(0).forEach((f) => f());
      instalado = null;
    },
  };
  return instalado;
}
