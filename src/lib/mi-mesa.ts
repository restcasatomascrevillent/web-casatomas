/**
 * "Mi mesa": cálculos puros (sin React, sin `window`) de lo que el visitante
 * prepara en la carta para compartirlo con su grupo y dividir la cuenta.
 *
 * NO es un pedido online: los precios son orientativos y nada se envía al
 * restaurante. Los identificadores internos siguen llamándose "pedido"
 * (`usePedido`, `sessionManager`) para no reescribir media carta.
 */
import type { Language } from "@/i18n/types";

/** Rango del selector de comensales de Mi mesa. */
export const COMENSALES_MIN = 1;
export const COMENSALES_MAX = 30;
export const COMENSALES_DEFECTO = 2;

/**
 * Por encima de este número la reserva web la rechaza con `grupo_grande`
 * (el motor de reservas lo gestiona por teléfono): en vez de rellenar el
 * formulario se enseña el aviso de "llámanos".
 */
export const MAX_COMENSALES_RESERVA_WEB = 12;

/** Parámetro de `/reservas` que rellena el número de comensales. */
export const PARAM_COMENSALES = "comensales";

export type ModoReparto = "igual" | "cadaUno";

export interface EstadoMesa {
  comensales: number;
  modo: ModoReparto;
  /** Nombres editados por el visitante; vacío o ausente → "Persona N". */
  nombres: string[];
  /** Clave de línea (`clavePedido`) → índice de la persona (0-based). Sin clave = para compartir. */
  asignaciones: Record<string, number>;
}

export const ESTADO_MESA_INICIAL: EstadoMesa = {
  comensales: COMENSALES_DEFECTO,
  modo: "igual",
  nombres: [],
  asignaciones: {},
};

/** Entero dentro de [min, max]; cualquier cosa no numérica → `defecto`. */
export const acotarEntero = (valor: unknown, min: number, max: number, defecto: number): number => {
  const n = typeof valor === "number" ? valor : typeof valor === "string" ? Number(valor) : NaN;
  if (!Number.isFinite(n)) return defecto;
  return Math.min(max, Math.max(min, Math.round(n)));
};

export const acotarComensales = (valor: unknown): number =>
  acotarEntero(valor, COMENSALES_MIN, COMENSALES_MAX, COMENSALES_DEFECTO);

/** Estado leído de `sessionStorage` (o de donde sea) saneado: nunca rompe la UI. */
export const normalizarEstadoMesa = (crudo: unknown): EstadoMesa => {
  if (!crudo || typeof crudo !== "object") return { ...ESTADO_MESA_INICIAL };
  const o = crudo as Record<string, unknown>;
  const nombres = Array.isArray(o.nombres)
    ? o.nombres.slice(0, COMENSALES_MAX).map((n) => (typeof n === "string" ? n.slice(0, 40) : ""))
    : [];
  const asignaciones: Record<string, number> = {};
  if (o.asignaciones && typeof o.asignaciones === "object") {
    for (const [clave, persona] of Object.entries(o.asignaciones as Record<string, unknown>)) {
      if (typeof persona === "number" && Number.isInteger(persona) && persona >= 0 && persona < COMENSALES_MAX) {
        asignaciones[clave] = persona;
      }
    }
  }
  return {
    comensales: acotarComensales(o.comensales),
    modo: o.modo === "cadaUno" ? "cadaUno" : "igual",
    nombres,
    asignaciones,
  };
};

// ---------------------------------------------------------------------------
// Líneas e importes
// ---------------------------------------------------------------------------

export interface LineaMesa {
  nombre: string;
  precio_eur: number;
  unidad?: string | null;
  cantidad?: number;
}

export const esPorCienGramos = (unidad?: string | null) => unidad === "100 g" || unidad === "100g";

/** Paso y mínimo de los botones +/- según cómo se vende el producto. */
export const configUnidad = (unidad?: string | null) => {
  if (unidad === "kg") return { defecto: 1, paso: 0.1, minimo: 0.1, decimales: 1 };
  if (esPorCienGramos(unidad)) return { defecto: 100, paso: 50, minimo: 50, decimales: 0 };
  return { defecto: 1, paso: 1, minimo: 1, decimales: 0 };
};

export const cantidadDeLinea = (linea: Pick<LineaMesa, "unidad" | "cantidad">): number =>
  typeof linea.cantidad === "number" && Number.isFinite(linea.cantidad) && linea.cantidad > 0
    ? linea.cantidad
    : configUnidad(linea.unidad).defecto;

/** Importe de una línea: kg × precio/kg, gramos/100 × precio/100 g, o unidades × precio. */
export const importeLinea = (linea: LineaMesa): number => {
  const precio = Number.isFinite(linea.precio_eur) ? linea.precio_eur : 0;
  const cantidad = cantidadDeLinea(linea);
  if (esPorCienGramos(linea.unidad)) return (cantidad / 100) * precio;
  return cantidad * precio;
};

export const totalMesa = (lineas: LineaMesa[]): number =>
  lineas.reduce((suma, linea) => suma + importeLinea(linea), 0);

/** Parte de cada uno a partes iguales. */
export const porPersona = (total: number, comensales: number): number =>
  total / acotarComensales(comensales);

export interface RepartoCadaUno {
  /** Lo que paga cada persona: lo suyo + su parte de lo compartido. */
  porPersona: number[];
  /** Solo lo asignado a cada persona (sin la parte compartida). */
  propio: number[];
  /** Total de las líneas sin asignar (se divide entre todos). */
  compartido: number;
  /** `compartido / comensales`. */
  compartidoPorPersona: number;
}

/**
 * "Cada uno lo suyo": cada línea asignada suma a su persona; las no asignadas
 * (o asignadas a alguien que ya no está porque se bajaron los comensales) se
 * reparten a partes iguales. La suma de `porPersona` es siempre el total.
 */
export const repartoCadaUno = <L extends LineaMesa>(
  lineas: L[],
  claveDe: (linea: L) => string,
  asignaciones: Record<string, number>,
  comensales: number,
): RepartoCadaUno => {
  const n = acotarComensales(comensales);
  const propio = Array.from({ length: n }, () => 0);
  let compartido = 0;
  for (const linea of lineas) {
    const importe = importeLinea(linea);
    const persona = asignaciones[claveDe(linea)];
    if (typeof persona === "number" && persona >= 0 && persona < n) propio[persona] += importe;
    else compartido += importe;
  }
  const compartidoPorPersona = compartido / n;
  return {
    porPersona: propio.map((p) => p + compartidoPorPersona),
    propio,
    compartido,
    compartidoPorPersona,
  };
};

/** Nombre visible de la persona `indice` (0-based). */
export const nombrePersona = (nombres: string[], indice: number, plantilla: string): string => {
  const propio = nombres[indice]?.trim();
  return propio ? propio : plantilla.replace("{n}", String(indice + 1));
};

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

export const LOCALE_POR_IDIOMA: Record<Language, string> = {
  es: "es-ES",
  en: "en-GB",
  fr: "fr-FR",
};

const formateadores = new Map<string, Intl.NumberFormat>();

export const formatearEuros = (valor: number, idioma: Language): string => {
  const locale = LOCALE_POR_IDIOMA[idioma] ?? "es-ES";
  let f = formateadores.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formateadores.set(locale, f);
  }
  return f.format(Number.isFinite(valor) ? valor : 0);
};

/** "2", "1,5 kg", "350 g" — la cantidad tal y como se lee en el ticket. */
export const formatearCantidadLinea = (linea: Pick<LineaMesa, "unidad" | "cantidad">, idioma: Language): string => {
  const cantidad = cantidadDeLinea(linea);
  const locale = LOCALE_POR_IDIOMA[idioma] ?? "es-ES";
  if (linea.unidad === "kg") {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(cantidad)} kg`;
  }
  if (esPorCienGramos(linea.unidad)) return `${Math.round(cantidad)} g`;
  return String(Math.max(1, Math.round(cantidad)));
};

/** Sufijo del precio unitario: "/kg", "/100 g" o nada. */
export const sufijoPrecio = (unidad?: string | null): string =>
  unidad === "kg" ? "/kg" : esPorCienGramos(unidad) ? "/100 g" : "";

// ---------------------------------------------------------------------------
// Reservas
// ---------------------------------------------------------------------------

/** Enlace a reservas con los comensales de la mesa (reservas solo existe en la raíz, en español). */
export const rutaReservaMesa = (comensales: number): string =>
  `/reservas?${PARAM_COMENSALES}=${acotarComensales(comensales)}`;

export interface ComensalesReserva {
  /** Valor para rellenar el formulario, o `null` si no hay que tocarlo. */
  comensales: number | null;
  /** Se pidieron más de `MAX_COMENSALES_RESERVA_WEB`: enseñar el aviso de grupos. */
  grupoGrande: boolean;
}

/**
 * Lee `?comensales=N` de un `location.search`. Valores no enteros o < 1 se
 * ignoran; > 12 no rellenan nada y activan el aviso de grupos grandes.
 */
export const leerComensalesReserva = (search: string): ComensalesReserva => {
  const crudo = new URLSearchParams(search).get(PARAM_COMENSALES);
  if (crudo === null || crudo.trim() === "") return { comensales: null, grupoGrande: false };
  const n = Number(crudo);
  if (!Number.isFinite(n)) return { comensales: null, grupoGrande: false };
  const entero = Math.floor(n);
  if (entero < 1) return { comensales: null, grupoGrande: false };
  if (entero > MAX_COMENSALES_RESERVA_WEB) return { comensales: null, grupoGrande: true };
  return { comensales: entero, grupoGrande: false };
};

// ---------------------------------------------------------------------------
// Compartir
// ---------------------------------------------------------------------------

export const URL_CARTA_FALLBACK = "https://casa-tomas-story.vercel.app/carta";

/**
 * URL de la carta en el origen actual. `ruta` es la carta ya con el prefijo
 * de idioma (`/carta`, `/en/carta`…). Sin origen http(s) válido (tests,
 * SSG) cae en la URL pública.
 */
export const urlCarta = (origen?: string | null, ruta = "/carta"): string =>
  origen && /^https?:\/\//.test(origen) ? `${origen.replace(/\/+$/, "")}${ruta}` : URL_CARTA_FALLBACK;

export interface TextosResumen {
  summaryTitle: string;
  summaryTotal: string;
  summaryPerPerson: string;
  summaryLink: string;
}

/** Texto que acompaña a la imagen (o la sustituye en WhatsApp). */
export const resumenTextoMesa = (
  lineas: LineaMesa[],
  comensales: number,
  idioma: Language,
  textos: TextosResumen,
  url: string,
): string => {
  const total = totalMesa(lineas);
  const n = acotarComensales(comensales);
  const detalle = lineas.map((l) => `• ${formatearCantidadLinea(l, idioma)} × ${l.nombre}`);
  return [
    textos.summaryTitle,
    ...detalle,
    "",
    textos.summaryTotal.replace("{amount}", formatearEuros(total, idioma)),
    textos.summaryPerPerson.replace("{amount}", formatearEuros(porPersona(total, n), idioma)).replace("{n}", String(n)),
    textos.summaryLink.replace("{url}", url),
  ].join("\n");
};
