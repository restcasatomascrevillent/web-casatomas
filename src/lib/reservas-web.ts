/**
 * Contrato de la Edge Function `reservas-web` y traducción de sus rechazos a
 * algo que el visitante pueda entender y resolver.
 *
 * Sustituye a los dos webhooks de n8n (disponibilidad y crear reserva). Los
 * dos puntos que rompían al repuntar:
 *
 *   1. `/disponibilidad` devuelve un ARRAY PLANO en éxito y un OBJETO en error.
 *      Hay que comprobar `response.ok` ANTES de mapear nada, o salta
 *      `TypeError: x.map is not a function`.
 *   2. `/crear` devuelve 201 solo en éxito. TODO rechazo trae `motivo` +
 *      `mensaje` legible, y `if (!response.ok) throw` los descartaba: el
 *      visitante veía un toast genérico (o peor, el diálogo de éxito) mientras
 *      recibía por email un "solicitud no procesada".
 */

// ---------------------------------------------------------------------------
// POST /disponibilidad — array plano discriminado por `kind`
// ---------------------------------------------------------------------------

export type AforoTurno = {
  capacidad_maxima: number;
  ocupacion: number;
  disponible: number;
};

/**
 * Elemento 0 del array, SIEMPRE presente en éxito.
 *
 * `cerrado: true` + cero elementos `periodo` significa "ese día el restaurante
 * no abre", que NO es lo mismo que un error de red o un 500. Si no llega
 * ningún `meta`, la respuesta está malformada y se trata como error.
 */
export type DisponibilidadMeta = {
  kind: "meta";
  fecha: string;
  cerrado: boolean;
  aforo_turno?: Partial<Record<"comida" | "cena", AforoTurno>>;
  total_periodos?: number;
  total_ocupacion?: number;
};

/** Una fila activa de `configuracion_turnos` para el día de la semana pedido. */
export type DisponibilidadPeriodo = {
  kind: "periodo";
  fecha: string;
  nombre_periodo?: string;
  hora_inicio?: string;
  hora_fin?: string;
  intervalo_base_minutos?: number;
  umbral_apertura_secundario?: number;
  dias_semana?: number[];
  ocultar_primario_si_secundario?: boolean;
  activo?: boolean;
};

/** Una hora con reservas vivas ese día. */
export type DisponibilidadOcupacion = {
  kind: "ocupacion";
  fecha: string;
  hora: string;
  turno?: "comida" | "cena";
  total_reservas?: number;
  total_comensales?: number;
  capacidad_maxima?: number;
  capacidad_disponible?: number;
  porcentaje_ocupacion?: number;
};

export type DisponibilidadElemento =
  | DisponibilidadMeta
  | DisponibilidadPeriodo
  | DisponibilidadOcupacion;

/** Resultado ya clasificado: éxito con datos, día cerrado, o error. */
export type ResultadoDisponibilidad =
  | {
      estado: "ok";
      meta: DisponibilidadMeta;
      periodos: DisponibilidadPeriodo[];
      ocupacion: DisponibilidadOcupacion[];
    }
  | { estado: "cerrado"; meta: DisponibilidadMeta }
  | { estado: "error" };

/**
 * Clasifica la respuesta de `/disponibilidad`.
 *
 * `ok` es el `response.ok` del fetch: en 4xx/5xx el cuerpo es un OBJETO
 * `{ ok:false, error }` y no se puede recorrer como array.
 */
export function clasificarDisponibilidad(ok: boolean, cuerpo: unknown): ResultadoDisponibilidad {
  if (!ok || !Array.isArray(cuerpo)) return { estado: "error" };

  const elementos = cuerpo as DisponibilidadElemento[];
  const meta = elementos.find(
    (elemento): elemento is DisponibilidadMeta =>
      !!elemento && typeof elemento === "object" && elemento.kind === "meta",
  );

  // Sin `meta` la respuesta no cumple el contrato: es un error, no un día
  // cerrado. Confundir los dos es exactamente lo que había que evitar.
  if (!meta) return { estado: "error" };

  const periodos = elementos.filter(
    (elemento): elemento is DisponibilidadPeriodo =>
      !!elemento && typeof elemento === "object" && elemento.kind === "periodo",
  );

  if (meta.cerrado === true || periodos.length === 0) {
    return { estado: "cerrado", meta };
  }

  const ocupacion = elementos.filter(
    (elemento): elemento is DisponibilidadOcupacion =>
      !!elemento && typeof elemento === "object" && elemento.kind === "ocupacion",
  );

  return { estado: "ok", meta, periodos, ocupacion };
}

// ---------------------------------------------------------------------------
// POST /crear — 201 en éxito, y rechazos con `motivo` + `mensaje`
// ---------------------------------------------------------------------------

/** Nombre de la salida que se le ofrece al visitante tras un rechazo. */
export type SalidaRechazo =
  | "call"
  | "otherTime"
  | "otherTimeOrCall"
  | "otherDate"
  | "guests"
  | "checkForm"
  | "retryOrCall";

export type TextosRechazo = {
  title: string;
  close: string;
  /** 400: entrada malformada, la función NO manda `mensaje`. */
  invalidMessage: string;
  /** 5xx o fallo de red. */
  errorMessage: string;
  /** Rechazo sin `mensaje` legible por cualquier otro motivo. */
  fallbackMessage: string;
  exits: Record<SalidaRechazo, string>;
};

export type RechazoReserva = {
  /** `motivo` tal cual viene de la función, o `null` si no venía. */
  motivo: string | null;
  /** Lo que se le enseña al visitante. Se prioriza el `mensaje` del servidor. */
  mensaje: string;
  /** Qué puede hacer a continuación. Puede contener el marcador `{phone}`. */
  salida: string;
};

/**
 * Salida por `motivo`. Los motivos son los del contrato cerrado de la función;
 * ninguna regla de negocio se reimplementa aquí — el texto de "por qué" lo pone
 * siempre el servidor, esto solo añade el "y ahora qué".
 */
const SALIDA_POR_MOTIVO: Record<string, SalidaRechazo> = {
  // 403 — blacklist. El servidor manda un mensaje NEUTRO a propósito, que no
  // revela que existe una lista. No se enriquece ni se matiza: se muestra tal
  // cual y se ofrece el teléfono, que es igual de neutro.
  no_disponible: "call",
  // 422 — el visitante puede corregirlo desde el formulario.
  grupo_grande: "guests",
  numero_comensales_fuera_de_rango: "guests",
  reserva_hoy: "call",
  corte_horario: "otherTimeOrCall",
  fecha_pasada: "otherDate",
  fecha_demasiado_lejana: "otherDate",
  // 409 — conflicto con el estado actual, no lo arregla reenviando igual.
  max_reservas_telefono: "call",
  max_reservas_email: "call",
  sin_disponibilidad: "otherTime",
};

/** Salida de reserva cuando no hay `motivo` reconocible. */
function salidaPorEstado(status: number): SalidaRechazo {
  if (status === 400 || status === 422) return "checkForm";
  if (status === 403 || status === 409) return "call";
  return "retryOrCall";
}

/**
 * Traduce una respuesta no-201 de `/crear` a título + mensaje + salida.
 *
 * `status` 0 representa "ni siquiera hubo respuesta" (fallo de red o de CORS).
 */
export function interpretarRechazoReserva(
  status: number,
  cuerpo: unknown,
  textos: TextosRechazo,
): RechazoReserva {
  const objeto =
    cuerpo && typeof cuerpo === "object" && !Array.isArray(cuerpo)
      ? (cuerpo as Record<string, unknown>)
      : null;

  const motivo = typeof objeto?.motivo === "string" && objeto.motivo ? objeto.motivo : null;
  const mensajeServidor =
    typeof objeto?.mensaje === "string" && objeto.mensaje.trim() ? objeto.mensaje.trim() : null;

  const salida = (motivo && SALIDA_POR_MOTIVO[motivo]) || salidaPorEstado(status);

  let mensaje: string;
  if (mensajeServidor) {
    mensaje = mensajeServidor;
  } else if (status === 400) {
    // Los 400 son los únicos rechazos SIN `mensaje`: el cuerpo trae `error`
    // (`nombre_requerido`, `fecha_invalida`…), que es un código para el log, no
    // un texto para enseñar.
    mensaje = textos.invalidMessage;
  } else if (status === 0 || status >= 500) {
    mensaje = textos.errorMessage;
  } else {
    mensaje = textos.fallbackMessage;
  }

  return { motivo, mensaje, salida: textos.exits[salida] };
}
