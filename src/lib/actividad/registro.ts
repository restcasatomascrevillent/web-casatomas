/**
 * API mínima para que los componentes apunten actividad (Super Admin › Logs).
 *
 *   registrarActividad("vino_abierto", { objetivo: vino.nombre, props: { id: vino.id, modo: "ficha" } });
 *
 * No hace nada en el servidor (SSG) ni sin rastreador instalado: los eventos
 * se guardan en una cola pequeña hasta que `SeguimientoActividad` lo instala
 * (en un momento ocioso, tras hidratar). El rastreador decide si se manda:
 * la actividad solo con el consentimiento «Estadísticas»; los errores, siempre
 * y sin identificadores persistentes.
 *
 * NUNCA pasar aquí valores de campos de formulario, textos que escribe el
 * visitante, nombres, teléfonos o correos: solo nombres de platos, vinos,
 * botones, cifras y códigos.
 */

export type TipoActividad =
  | "clic" | "contacto" | "carta_categoria" | "plato_abierto" | "vino_abierto" | "bebida_abierta" | "busqueda" | "filtro"
  | "mapa_vinos" | "pedido" | "media" | "formulario" | "chat" | "reserva_disponibilidad" | "reserva_solicitada"
  | "reserva_rechazada" | "cheque_checkout" | "cheque_pagado" | "error_react" | "error_404" | "error_js" | "error_promesa" | "error_recurso";

export interface DatosActividad {
  accion?: string;
  objetivo?: string | null;
  valor?: number | null;
  ruta?: string;
  props?: Record<string, string | number | boolean | null | undefined>;
  error?: { mensaje?: string; pila?: string };
}

type Emisor = (tipo: TipoActividad, datos: DatosActividad) => void;

let emisor: Emisor | null = null;
let recargaEnCurso = false;
const pendientes: Array<[TipoActividad, DatosActividad, number]> = [];
const MAX_PENDIENTES = 50;

export function registrarActividad(tipo: TipoActividad, datos: DatosActividad = {}): void {
  if (typeof window === "undefined") return;
  // La página se está recargando sola (versión antigua): sus errores son de esa
  // recarga y el que la provocó sale tras recargar, con `recargado` (recarga-por-version).
  if (recargaEnCurso && tipo.startsWith("error_")) return;
  try {
    if (emisor) emisor(tipo, datos);
    else if (pendientes.length < MAX_PENDIENTES) pendientes.push([tipo, datos, Date.now()]);
  } catch {
    // Registrar nunca rompe la web.
  }
}

/** Lo llama el rastreador al instalarse: vacía la cola (en orden) y queda conectado. */
export function conectarEmisor(e: Emisor | null): void {
  emisor = e;
  if (!e) return;
  for (const [tipo, datos] of pendientes.splice(0)) {
    try {
      e(tipo, datos);
    } catch {
      // ignorado
    }
  }
}

/** Lo llama `recargarUnaVez` justo antes de recargar la página. */
export function marcarRecargaEnCurso(): void {
  recargaEnCurso = true;
}

/**
 * Quien quiera tratar antes ciertos errores sin capturar (la recarga por
 * versión antigua, `recarga-por-version.ts`) los desvía aquí: si devuelve
 * `true`, el error no se apunta ahora (ya se encarga él de mandarlo).
 */
type Desvio = (tipo: TipoActividad, datos: DatosActividad, motivo: unknown) => boolean;
let desvio: Desvio | null = null;
export function fijarDesvioDeErrores(fn: Desvio | null): void {
  desvio = fn;
}

const apuntarError = (tipo: TipoActividad, datos: DatosActividad, motivo: unknown) => {
  try {
    if (desvio?.(tipo, datos, motivo)) return;
  } catch {
    // ignorado: se apunta tal cual
  }
  registrarActividad(tipo, datos);
};

/** Solo para pruebas. */
export function _reiniciarRegistro(): void {
  emisor = null;
  recargaEnCurso = false;
  pendientes.length = 0;
  desvio = null;
}

/**
 * Errores de JavaScript y promesas desde el primer momento (antes de que se
 * instale el rastreador, que llega en un momento ocioso): se encolan aquí y
 * salen cuando se instala. Las imágenes o scripts que no cargan los recoge el
 * rastreador ya instalado. Se llama una vez desde `SeguimientoActividad`.
 */
let capturando = false;
export function capturarErroresTempranos(): void {
  if (typeof window === "undefined" || capturando) return;
  capturando = true;
  window.addEventListener("error", (e) => {
    if (!(e instanceof ErrorEvent) || !e.message) return; // recursos: los recoge el rastreador
    apuntarError("error_js", { error: { mensaje: e.message, pila: e.error instanceof Error ? e.error.stack : `at ${e.filename}:${e.lineno}:${e.colno}` } }, e.error ?? e.message);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const motivo = e.reason;
    const mensaje = motivo instanceof Error ? `${motivo.name}: ${motivo.message}` : typeof motivo === "string" ? motivo : "Promesa rechazada sin motivo";
    apuntarError("error_promesa", { error: { mensaje, pila: motivo instanceof Error ? motivo.stack : undefined } }, motivo);
  });
}
