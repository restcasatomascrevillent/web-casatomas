// ============================================================================
//  «Cómo se hizo la reserva»: lo que el formulario mide y manda en `origen`
//  a reservas-web/crear (pedido del dueño, 10/11/2026: «a qué hora se ha hecho
//  la reserva, cuánto tiempo ha estado rellenando el formulario y toda la info»).
//
//  Qué se manda (y la función vuelve a validar todo, ver
//  admin-casatomas/supabase/functions/reservas-web/origen.ts):
//    · horas: formulario abierto, primer contacto, envío, y la duración;
//    · qué campos tocó (solo el NOMBRE del campo, nunca el valor);
//    · consultas de horas, cuántas sin hueco/error y envíos rechazados antes;
//    · idioma de la web y del navegador;
//    · página de entrada (la de la carga, sin query) y la del formulario;
//    · host del referente (nunca la ruta) y utm_* / ?qr= de la entrada;
//    · tamaño de pantalla y si es táctil.
//  NADA de datos personales extra ni huellas: ni IP (la ve el servidor y
//  guarda solo un HMAC), ni zona horaria, ni fuentes, ni canvas. El dispositivo
//  y el navegador los deduce el servidor del User-Agent.
//  Sin almacenamiento: todo vive en memoria mientras el formulario está abierto.
// ============================================================================
import { useCallback, useRef } from "react";

export interface EstadoOrigen {
  abiertoMs: number;
  primerContactoMs: number | null;
  campos: string[];
  consultas: number;
  consultasSinHueco: number;
  intentosFallidos: number;
}

export interface EntornoNavegador {
  idioma: string;
  idiomaNavegador?: string | null;
  /** URL con la que se cargó la página (la «entrada» de esta visita). */
  urlEntrada?: string | null;
  /** URL actual (la del formulario). */
  urlActual?: string | null;
  referrer?: string | null;
  pantalla?: { ancho: number; alto: number } | null;
  tactil?: boolean | null;
}

export const crearEstadoOrigen = (ahoraMs: number): EstadoOrigen => ({
  abiertoMs: ahoraMs,
  primerContactoMs: null,
  campos: [],
  consultas: 0,
  consultasSinHueco: 0,
  intentosFallidos: 0,
});

/** Segundos entre el primer contacto (o la apertura, si no lo hubo) y el envío. Nunca negativo. */
export function duracionSegundos(estado: Pick<EstadoOrigen, "abiertoMs" | "primerContactoMs">, enviadoMs: number): number {
  const desde = estado.primerContactoMs ?? estado.abiertoMs;
  return Math.max(0, Math.round((enviadoMs - desde) / 1000));
}

const iso = (ms: number | null): string | null => (ms === null ? null : new Date(ms).toISOString());

const rutaDe = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).pathname.slice(0, 200);
  } catch {
    return null;
  }
};

const hostDe = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
};

const CLAVES_CAMPANA = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "qr"] as const;

/** Objeto `origen` listo para el cuerpo de /crear. */
export function construirOrigen(estado: EstadoOrigen, entorno: EntornoNavegador, enviadoMs: number): Record<string, unknown> {
  const campana: Record<string, string> = {};
  try {
    if (entorno.urlEntrada) {
      const q = new URL(entorno.urlEntrada).searchParams;
      for (const clave of CLAVES_CAMPANA) {
        const v = q.get(clave);
        if (v) campana[clave] = v.slice(0, 80);
      }
    }
  } catch {
    // URL ilegible: sin campaña
  }
  return {
    formulario_abierto_at: iso(estado.abiertoMs),
    primer_contacto_at: iso(estado.primerContactoMs),
    enviado_at: iso(enviadoMs),
    duracion_segundos: duracionSegundos(estado, enviadoMs),
    campos_cambiados: estado.campos.slice(0, 20),
    consultas_disponibilidad: estado.consultas,
    consultas_sin_hueco: estado.consultasSinHueco,
    intentos_fallidos: estado.intentosFallidos,
    idioma: entorno.idioma,
    idioma_navegador: entorno.idiomaNavegador?.slice(0, 20) ?? null,
    pagina_entrada: rutaDe(entorno.urlEntrada),
    pagina_formulario: rutaDe(entorno.urlActual),
    referente: hostDe(entorno.referrer),
    ...campana,
    pantalla: entorno.pantalla ?? null,
    tactil: entorno.tactil ?? null,
  };
}

/** Lo que se puede leer del navegador sin huellas. */
export function entornoDelNavegador(idioma: string): EntornoNavegador {
  if (typeof window === "undefined") return { idioma };
  let urlEntrada: string | null = null;
  try {
    // La URL del documento cargado: en una SPA es la página por la que se entró.
    const nav = performance.getEntriesByType?.("navigation")?.[0] as PerformanceNavigationTiming | undefined;
    urlEntrada = nav?.name || null;
  } catch {
    urlEntrada = null;
  }
  return {
    idioma,
    idiomaNavegador: typeof navigator !== "undefined" ? navigator.language ?? null : null,
    urlEntrada: urlEntrada ?? window.location.href,
    urlActual: window.location.href,
    referrer: typeof document !== "undefined" ? document.referrer || null : null,
    pantalla: window.screen ? { ancho: window.screen.width, alto: window.screen.height } : null,
    tactil: typeof navigator !== "undefined" ? (navigator.maxTouchPoints ?? 0) > 0 : null,
  };
}

/**
 * Seguimiento del formulario en memoria. `tocar(campo)` en cada cambio,
 * `consulta(sinHueco)` tras cada consulta de horas, `fallo()` tras un envío
 * rechazado, `reiniciar()` tras una reserva hecha, y `origen()` al enviar.
 */
export function useOrigenReserva(idioma: string) {
  const estado = useRef<EstadoOrigen | null>(null);
  const actual = () => {
    if (!estado.current) estado.current = crearEstadoOrigen(Date.now());
    return estado.current;
  };
  // Se arranca al montar (primer render): esa es la hora de «abrió el formulario».
  actual();

  const tocar = useCallback((campo: string) => {
    const e = actual();
    if (e.primerContactoMs === null) e.primerContactoMs = Date.now();
    if (!e.campos.includes(campo)) e.campos.push(campo);
  }, []);
  const consulta = useCallback((sinHueco: boolean) => {
    const e = actual();
    if (e.primerContactoMs === null) e.primerContactoMs = Date.now();
    e.consultas += 1;
    if (sinHueco) e.consultasSinHueco += 1;
  }, []);
  const fallo = useCallback(() => {
    actual().intentosFallidos += 1;
  }, []);
  const reiniciar = useCallback(() => {
    estado.current = crearEstadoOrigen(Date.now());
  }, []);
  const origen = useCallback(() => construirOrigen(actual(), entornoDelNavegador(idioma), Date.now()), [idioma]);

  return { tocar, consulta, fallo, reiniciar, origen };
}
