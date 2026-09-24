/**
 * Página de los enlaces de los correos de reserva (aceptar / rechazar una
 * propuesta del restaurante): contrato con la Edge Function `emails-reserva`
 * y textos de cada estado.
 *
 * Por qué vive en la web: Supabase fuerza `Content-Type: text/plain` en las
 * respuestas de `*.supabase.co/functions/v1/...`, así que las páginas HTML que
 * servía la función le llegaban al cliente como código fuente. Ahora el correo
 * enlaza a `/reserva/respuesta?token=...` de la web del negocio y esta página
 * habla con la función en JSON:
 *   POST /emails-reserva/enlace/consultar { token } -> estado + datos (no muta)
 *   POST /emails-reserva/enlace/ejecutar  { token } -> acepta / rechaza
 * La acción solo ocurre con el clic del cliente (POST): los escáneres de
 * enlaces de los clientes de correo solo hacen GET de la página.
 *
 * MISMO fichero en casa-tomas-story y touza-restaurant-website (misma función,
 * dos webs). Contrato: adminpanelct/supabase/functions/emails-reserva/enlaces-web.ts.
 *
 * Gotcha SSG: nada de `window` a nivel de módulo (se importa en el prerender).
 */
import { FUNCTIONS_BASE_URL, leerCuerpo } from "@/lib/supabase-functions";

export const ENLACE_CONSULTAR_URL = `${FUNCTIONS_BASE_URL}/emails-reserva/enlace/consultar`;
export const ENLACE_EJECUTAR_URL = `${FUNCTIONS_BASE_URL}/emails-reserva/enlace/ejecutar`;

export type EstadoEnlace =
  | "pendiente"
  | "hecho"
  | "recibida"
  | "ya_hecho"
  | "invalido"
  | "sin_aforo"
  | "fecha_pasada"
  | "error";

export type TipoEnlace = "contraoferta" | "propuesta";
export type AccionWeb = "aceptar" | "rechazar";

export interface NegocioEnlace {
  marca: string;
  nombre: string;
  telefonoTexto: string;
  telefonoDigits: string;
  web: string;
}

export interface DetallesEnlace {
  nombre: string;
  fecha: string;
  hora: string;
  comensales: number;
  espacio: string | null;
}

export interface RespuestaEnlace {
  ok: boolean;
  estado: EstadoEnlace;
  tipo: TipoEnlace | null;
  accion: AccionWeb | null;
  negocio: NegocioEnlace | null;
  detalles: DetallesEnlace | null;
}

const ESTADOS: readonly EstadoEnlace[] = [
  "pendiente",
  "hecho",
  "recibida",
  "ya_hecho",
  "invalido",
  "sin_aforo",
  "fecha_pasada",
  "error",
];

const MAX_TOKEN = 2048;

/** `?token=...` de la URL de la página (o null si falta / es absurdo). */
export function leerToken(search: string): string | null {
  const token = new URLSearchParams(search).get("token")?.trim() ?? "";
  return token && token.length <= MAX_TOKEN ? token : null;
}

function esObjeto(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/** Valida el JSON de la función sin fiarse de su forma. */
export function normalizarRespuesta(x: unknown): RespuestaEnlace | null {
  if (!esObjeto(x) || !ESTADOS.includes(x.estado as EstadoEnlace)) return null;
  const n = esObjeto(x.negocio) ? x.negocio : null;
  const d = esObjeto(x.detalles) ? x.detalles : null;
  return {
    ok: x.ok === true,
    estado: x.estado as EstadoEnlace,
    tipo: x.tipo === "contraoferta" || x.tipo === "propuesta" ? x.tipo : null,
    accion: x.accion === "aceptar" || x.accion === "rechazar" ? x.accion : null,
    negocio:
      n && typeof n.nombre === "string"
        ? {
            marca: String(n.marca ?? ""),
            nombre: n.nombre,
            telefonoTexto: String(n.telefonoTexto ?? ""),
            telefonoDigits: String(n.telefonoDigits ?? "").replace(/\D/g, ""),
            web: String(n.web ?? ""),
          }
        : null,
    detalles:
      d && typeof d.fecha === "string"
        ? {
            nombre: String(d.nombre ?? ""),
            fecha: d.fecha,
            hora: String(d.hora ?? ""),
            comensales: Number(d.comensales) || 0,
            espacio: typeof d.espacio === "string" && d.espacio ? d.espacio : null,
          }
        : null,
  };
}

export class ErrorConexion extends Error {}

/**
 * Llama a la función. Lanza `ErrorConexion` si no hay respuesta útil (red
 * caída, 5xx sin cuerpo...), para que la página ofrezca reintentar.
 */
export async function llamarEnlace(
  modo: "consultar" | "ejecutar",
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RespuestaEnlace> {
  let response: Response;
  try {
    response = await fetchImpl(modo === "consultar" ? ENLACE_CONSULTAR_URL : ENLACE_EJECUTAR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
  } catch {
    throw new ErrorConexion("sin_conexion");
  }
  const respuesta = normalizarRespuesta(await leerCuerpo(response));
  if (!respuesta) throw new ErrorConexion(`respuesta_invalida_${response.status}`);
  return respuesta;
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "2026-10-04" -> "sábado, 4 de octubre de 2026" (sin zona horaria: es una fecha de calendario). */
export function formatearFecha(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [a, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const fecha = new Date(Date.UTC(a, mes - 1, dia));
  if (Number.isNaN(fecha.getTime()) || fecha.getUTCMonth() !== mes - 1) return iso;
  return `${DIAS[fecha.getUTCDay()]}, ${dia} de ${MESES[mes - 1]} de ${a}`;
}

export type Tono = "neutro" | "exito" | "aviso" | "peligro";

export interface TextosEstado {
  titulo: string;
  parrafos: string[];
  tono: Tono;
  /** Texto del botón de acción (solo en `pendiente`). */
  boton?: string;
  /** Mostrar los datos de la reserva. */
  conDetalles: boolean;
}

/** Textos de cada estado. `negocio` = nombre ("Casa Tomás", "Touza"). */
export function textosEstado(r: Pick<RespuestaEnlace, "estado" | "tipo" | "accion" | "detalles">, negocio: string): TextosEstado {
  const aceptar = r.accion !== "rechazar";
  const contraoferta = r.tipo === "contraoferta";
  const nombre = r.detalles?.nombre?.trim();
  const saludo = nombre ? `Hola, ${nombre}. ` : "";
  switch (r.estado) {
    case "pendiente":
      return aceptar
        ? {
            titulo: "Confirma tu reserva",
            parrafos: [`${saludo}Esta es la propuesta de ${negocio}. Revisa los datos y pulsa el botón para confirmarla.`],
            tono: "exito",
            boton: "Sí, confirmo la reserva",
            conDetalles: true,
          }
        : {
            titulo: "¿No te viene bien esta propuesta?",
            parrafos: [
              contraoferta
                ? `${saludo}Si la rechazas, la reserva quedará cancelada.`
                : `${saludo}Si la rechazas, no se creará la reserva. El restaurante verá tu respuesta.`,
            ],
            tono: "peligro",
            boton: "Sí, rechazar la propuesta",
            conDetalles: true,
          };
    case "hecho":
      return aceptar
        ? {
            titulo: "¡Reserva confirmada!",
            parrafos: [`Gracias${nombre ? `, ${nombre}` : ""}. Te esperamos en ${negocio}.`],
            tono: "exito",
            conDetalles: true,
          }
        : {
            titulo: contraoferta ? "Reserva cancelada" : "Gracias por avisarnos",
            parrafos: [
              contraoferta ? "La reserva ha quedado cancelada. Gracias por avisarnos." : "Hemos registrado que no te viene bien la propuesta.",
              `Esperamos verte en otra ocasión en ${negocio}.`,
            ],
            tono: "neutro",
            conDetalles: false,
          };
    case "recibida":
      return {
        titulo: "Hemos recibido tu respuesta",
        parrafos: ["El restaurante revisará la reserva y te la confirmará en breve."],
        tono: "neutro",
        conDetalles: true,
      };
    case "ya_hecho":
      return aceptar
        ? {
            titulo: "Tu reserva ya está confirmada",
            parrafos: ["No hace falta que hagas nada más. ¡Te esperamos!"],
            tono: "exito",
            conDetalles: true,
          }
        : {
            titulo: contraoferta ? "Esta reserva ya estaba cancelada" : "Ya nos lo habías dicho",
            parrafos: [contraoferta ? "No hace falta que hagas nada más." : "Tenemos registrado que no te viene bien esta propuesta."],
            tono: "neutro",
            conDetalles: false,
          };
    case "sin_aforo":
      return {
        titulo: "No hemos podido confirmar la reserva",
        parrafos: [
          "Lo sentimos: mientras respondías se ha completado el aforo de ese turno.",
          "El restaurante ya está avisado y te llamará para buscar otra opción.",
        ],
        tono: "aviso",
        conDetalles: true,
      };
    case "fecha_pasada":
      return {
        titulo: "Esta propuesta ha caducado",
        parrafos: ["El día propuesto ya ha pasado."],
        tono: "aviso",
        conDetalles: false,
      };
    case "invalido":
      return {
        titulo: "Este enlace ya no es válido",
        parrafos: ["Puede que ya se haya usado, que haya caducado o que la propuesta haya cambiado."],
        tono: "neutro",
        conDetalles: false,
      };
    case "error":
    default:
      return {
        titulo: "No hemos podido completar tu respuesta",
        parrafos: ["Ha ocurrido un problema al registrarla. Llámanos y lo resolvemos enseguida."],
        tono: "aviso",
        conDetalles: false,
      };
  }
}
