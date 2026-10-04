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
 *
 * De quién es la culpa (lo que costó horas de formulario caído): si llega una
 * RESPUESTA HTTP — con `ok` o sin él —, la red del visitante funciona por
 * definición, así que el fallo es NUESTRO y jamás se le pide que compruebe su
 * conexión. Eso incluye TODO `estado: "error"` de `clasificarDisponibilidad`.
 * El único caso en que la culpa puede no ser nuestra es el `catch` del `fetch`
 * (`status` 0), y ahí lo desempata `clasificarFallo`.
 */
import { clasificarFallo, type TipoFallo } from "@/lib/supabase-functions";

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

/**
 * Una hora YA DECIDIDA por el motor de disponibilidad (`_shared/disponibilidad.ts`
 * en adminpanelct, compartido con el panel). Contrato nuevo: el motor decide
 * qué horas se ofrecen y con qué aforo — este frontend deja de recalcularlo.
 *
 * `hora` viene SIN segundos ("HH:MM"), a diferencia de `ocupacion`/`periodo`.
 */
export type DisponibilidadHueco = {
  kind: "hueco";
  fecha: string;
  hora: string;
  turno: "comida" | "cena";
  /** 0 = hora entera, 1 = media, 2 = cuarto… según la escalera configurada. */
  nivel: number;
  minutos_nivel: number;
  etiqueta_nivel: string;
  umbral_nivel: number;
  estado: "libre" | "completo";
  /** `true` si `estado === "libre"`. Comodidad: no aporta dato nuevo. */
  ofrecido: boolean;
  motivo: string | null;
  periodo: string | null;
  abierto_por: string | null;
  abierto_con_porcentaje: number | null;
  promovido: boolean;
  comensales_hora: number;
  reservas_hora: number;
  porcentaje_hora: number;
  porcentaje_para_umbral: number;
  capacidad_maxima: number;
  capacidad_disponible: number;
  porcentaje_ocupacion: number;
};

/**
 * Diagnóstico de por qué una hora NO se ofrece. Se documenta para que quede
 * claro que puede venir en el array; el frontend la ignora por completo.
 */
export type DisponibilidadDescartado = {
  kind: "descartado";
  fecha: string;
  hora: string;
};

export type DisponibilidadElemento =
  | DisponibilidadMeta
  | DisponibilidadPeriodo
  | DisponibilidadOcupacion
  | DisponibilidadHueco
  | DisponibilidadDescartado;

/** Resultado ya clasificado: éxito con datos, día cerrado, o error. */
export type ResultadoDisponibilidad =
  | {
      estado: "ok";
      meta: DisponibilidadMeta;
      periodos: DisponibilidadPeriodo[];
      ocupacion: DisponibilidadOcupacion[];
      /** Lo que hay que pintar. Ya viene decidido por el servidor. */
      huecos: DisponibilidadHueco[];
    }
  | { estado: "cerrado"; meta: DisponibilidadMeta }
  | { estado: "error" };

/**
 * Clasifica la respuesta de `/disponibilidad`.
 *
 * `ok` es el `response.ok` del fetch: en 4xx/5xx el cuerpo es un OBJETO
 * `{ ok:false, error }` y no se puede recorrer como array.
 *
 * `estado: "error"` SIEMPRE es un fallo NUESTRO: si esta función se ejecuta es
 * porque hubo respuesta HTTP, lo que prueba que la red del visitante funciona.
 * Un 5xx, un cuerpo que no es array o un array sin `meta` son cosas nuestras.
 * El caso `sin_red` no puede aparecer por aquí: solo sale del `catch` del
 * `fetch`, donde no hay respuesta que clasificar.
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

  // `kind:"hueco"` es lo que hay que pintar. `kind:"descartado"` se ignora a
  // propósito: es diagnóstico interno, no algo que el visitante deba ver.
  const huecos = elementos.filter(
    (elemento): elemento is DisponibilidadHueco =>
      !!elemento && typeof elemento === "object" && elemento.kind === "hueco",
  );

  return { estado: "ok", meta, periodos, ocupacion, huecos };
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
  | "retryOrCall"
  | "offline";

export type TextosRechazo = {
  title: string;
  close: string;
  /** 400: entrada malformada, la función NO manda `mensaje`. */
  invalidMessage: string;
  /** Título cuando el visitante no tiene red: el único caso en que el problema NO es nuestro. */
  offlineTitle: string;
  /** Mensaje de ese mismo caso: la solicitud no ha salido del dispositivo. */
  offlineMessage: string;
  /** 5xx o fallo nuestro sin respuesta útil. Dice que la culpa es nuestra. */
  errorMessage: string;
  /** Rechazo sin `mensaje` legible por cualquier otro motivo. */
  fallbackMessage: string;
  exits: Record<SalidaRechazo, string>;
  /**
   * Texto propio de cada motivo, por si el `mensaje` del servidor no sirve: la
   * función `reservas-web` los manda SIEMPRE en español, así que en inglés y
   * francés se sustituyen por estos (en español se queda vacío y se muestra
   * el del servidor, que es el que manda). La clave es el `motivo` del cuerpo
   * (o su `error`, en los 422 que no traen `motivo`). Pueden llevar `{min}`,
   * `{max}` y `{days}`, que se rellenan con `min`, `max` y `dias_max` del
   * cuerpo; si el cuerpo no los trae, ese texto no se usa y vale el del
   * servidor (nunca se muestra una cifra inventada).
   */
  reasons?: Partial<Record<string, string>>;
};

/** Cifras del cuerpo del rechazo que un texto de `reasons` puede pedir. */
const CIFRAS_RECHAZO: Record<string, string> = { "{min}": "min", "{max}": "max", "{days}": "dias_max" };

/**
 * Texto traducido de un rechazo, o `null` si no hay ninguno para ese
 * `motivo`/`error` (o si pide una cifra que el cuerpo no trae).
 */
function textoTraducidoDeRechazo(
  objeto: Record<string, unknown> | null,
  reasons: TextosRechazo["reasons"],
): string | null {
  if (!objeto || !reasons) return null;
  const clave = [objeto.motivo, objeto.error].find(
    (valor): valor is string => typeof valor === "string" && !!valor && !!reasons[valor],
  );
  if (!clave) return null;
  let texto = reasons[clave]!;
  for (const [marcador, campo] of Object.entries(CIFRAS_RECHAZO)) {
    if (!texto.includes(marcador)) continue;
    const valor = objeto[campo];
    if (typeof valor !== "number" && typeof valor !== "string") return null;
    texto = texto.split(marcador).join(String(valor));
  }
  return texto;
}

export type RechazoReserva = {
  /** `motivo` tal cual viene de la función, o `null` si no venía. */
  motivo: string | null;
  /** Título del diálogo: ya no puede ser fijo, el caso sin red necesita otro. */
  titulo: string;
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
 * `fallo` dice de quién es la culpa; por defecto lo deduce `clasificarFallo`.
 */
export function interpretarRechazoReserva(
  status: number,
  cuerpo: unknown,
  textos: TextosRechazo,
  fallo: TipoFallo = clasificarFallo(status),
): RechazoReserva {
  const objeto =
    cuerpo && typeof cuerpo === "object" && !Array.isArray(cuerpo)
      ? (cuerpo as Record<string, unknown>)
      : null;

  const motivo = typeof objeto?.motivo === "string" && objeto.motivo ? objeto.motivo : null;
  const mensajeServidor =
    typeof objeto?.mensaje === "string" && objeto.mensaje.trim() ? objeto.mensaje.trim() : null;

  const salida = (motivo && SALIDA_POR_MOTIVO[motivo]) || salidaPorEstado(status);

  // Sin red: el ÚNICO caso en que la culpa no es nuestra. Con `status === 0`
  // no hay cuerpo del servidor, así que no hay `mensaje` que priorizar.
  if (status === 0 && fallo === "sin_red") {
    return {
      motivo,
      titulo: textos.offlineTitle,
      mensaje: textos.offlineMessage,
      salida: textos.exits.offline,
    };
  }

  let mensaje: string;
  const mensajeTraducido = textoTraducidoDeRechazo(objeto, textos.reasons);
  if (mensajeTraducido) {
    mensaje = mensajeTraducido;
  } else if (mensajeServidor) {
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

  return { motivo, titulo: textos.title, mensaje, salida: textos.exits[salida] };
}
