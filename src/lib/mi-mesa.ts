/**
 * "Mi mesa": cálculos puros (sin React, sin `window`) de lo que el visitante
 * prepara en la carta para compartirlo con su grupo y dividir la cuenta.
 *
 * NO es un pedido online: los precios son orientativos y nada se envía al
 * restaurante. Los identificadores internos siguen llamándose "pedido"
 * (`usePedido`, `sessionManager`) para no reescribir media carta.
 */
import type { Language } from "@/i18n/types";
import { construirRutaIdioma } from "@/i18n/routing";
import { RESERVAS_PATH } from "@/lib/condiciones";

/** Rango del selector de comensales de Mi mesa. */
export const COMENSALES_MIN = 1;
export const COMENSALES_MAX = 30;
export const COMENSALES_DEFECTO = 2;

/**
 * Las mesas de 8 o más se reservan SOLO por teléfono (decisión del dueño,
 * 13/10/2026): el formulario web admite como mucho 7: en vez de rellenar el
 * formulario se enseña el aviso de "llámanos".
 */
export const MAX_COMENSALES_RESERVA_WEB = 7;

/** Parámetro de `/reservas` que rellena el número de comensales. */
export const PARAM_COMENSALES = "comensales";

export type ModoReparto = "igual" | "cadaUno";

export interface EstadoMesa {
  comensales: number;
  modo: ModoReparto;
  /** Nombres editados por el visitante; vacío o ausente → "Persona N". */
  nombres: string[];
  /**
   * Clave de línea (`clavePedido`) → índices de las personas que la comparten
   * (0-based). Sin clave, o array vacío, = para compartir entre todos. Una
   * línea con varias personas divide su importe a partes iguales solo entre
   * ellas (p. ej. un plato entre 2 de 3 comensales).
   */
  asignaciones: Record<string, number[]>;
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
  const asignaciones: Record<string, number[]> = {};
  if (o.asignaciones && typeof o.asignaciones === "object") {
    for (const [clave, valor] of Object.entries(o.asignaciones as Record<string, unknown>)) {
      // Compatibilidad con el formato anterior (una persona por línea, sin
      // array): sessionStorage puede traer datos de antes de este cambio.
      const bruto = Array.isArray(valor) ? valor : typeof valor === "number" ? [valor] : [];
      const personas = Array.from(
        new Set(
          bruto.filter(
            (p): p is number => typeof p === "number" && Number.isInteger(p) && p >= 0 && p < COMENSALES_MAX,
          ),
        ),
      ).sort((a, b) => a - b);
      if (personas.length > 0) asignaciones[clave] = personas;
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
 * "Cada uno lo suyo": cada línea asignada divide su importe a partes iguales
 * entre quienes la comparten (una persona sola se lo come entero; dos o más
 * se lo reparten entre ellas, p. ej. un plato entre 2 de 3 comensales). Las
 * líneas sin nadie asignado (o asignadas solo a quien ya no está porque se
 * bajaron los comensales) se reparten entre todos. La suma de `porPersona`
 * es siempre el total.
 */
export const repartoCadaUno = <L extends LineaMesa>(
  lineas: L[],
  claveDe: (linea: L) => string,
  asignaciones: Record<string, number[]>,
  comensales: number,
): RepartoCadaUno => {
  const n = acotarComensales(comensales);
  const propio = Array.from({ length: n }, () => 0);
  let compartido = 0;
  for (const linea of lineas) {
    const importe = importeLinea(linea);
    const personas = (asignaciones[claveDe(linea)] ?? []).filter((p) => p >= 0 && p < n);
    if (personas.length > 0) {
      const parte = importe / personas.length;
      for (const persona of personas) propio[persona] += parte;
    } else {
      compartido += importe;
    }
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

/** Enlace a reservas (en el idioma pedido; español por defecto) con los comensales de la mesa. */
export const rutaReservaMesa = (comensales: number, lang: Language = "es"): string =>
  `${construirRutaIdioma(RESERVAS_PATH, lang)}?${PARAM_COMENSALES}=${acotarComensales(comensales)}`;

export interface ComensalesReserva {
  /** Valor para rellenar el formulario, o `null` si no hay que tocarlo. */
  comensales: number | null;
  /** Se pidieron más de `MAX_COMENSALES_RESERVA_WEB`: enseñar el aviso de grupos. */
  grupoGrande: boolean;
}

/**
 * Lee `?comensales=N` de un `location.search`. Valores no enteros o < 1 se
 * ignoran; > MAX_COMENSALES_RESERVA_WEB no rellenan nada y activan el aviso de grupos grandes.
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

// ---------------------------------------------------------------------------
// Pregunta a Tomy
// ---------------------------------------------------------------------------

/** Máximo de caracteres por mensaje que acepta `chat-web` (`max_chars`, 500 por defecto). */
export const MAX_PREGUNTA_TOMY = 500;

export interface TextosPreguntaTomy {
  /** Plantilla con `{n}` (comensales) e `{items}` (platos). */
  aiQuestion: string;
  /** Cola cuando no caben todos los platos, con `{n}`: "y {n} más". */
  aiQuestionMore: string;
}

/**
 * Mensaje con el que se abre el chat de Tomy desde Mi mesa. Lista los platos
 * como "2× Croquetas, 1 kg× Chuletón" y, si no caben todos en `max`
 * caracteres, incluye los que quepan y termina con "y N más". Siempre
 * devuelve como mucho `max` caracteres (el servidor rechaza los más largos).
 */
export const construirPreguntaTomy = (
  lineas: Pick<LineaMesa, "nombre" | "unidad" | "cantidad">[],
  comensales: number,
  idioma: Language,
  textos: TextosPreguntaTomy,
  max = MAX_PREGUNTA_TOMY,
): string => {
  const plantilla = textos.aiQuestion.replace("{n}", String(acotarComensales(comensales)));
  const montar = (items: string) => plantilla.replace("{items}", items);
  const platos = lineas.map((l) => `${formatearCantidadLinea(l, idioma)}× ${l.nombre.trim()}`);

  const completa = montar(platos.join(", "));
  if (completa.length <= max) return completa;

  for (let incluidos = platos.length - 1; incluidos >= 0; incluidos--) {
    const cola = textos.aiQuestionMore.replace("{n}", String(platos.length - incluidos));
    const items = incluidos > 0 ? `${platos.slice(0, incluidos).join(", ")} ${cola}` : cola;
    const texto = montar(items);
    if (texto.length <= max) return texto;
  }
  // Ni la cola sola cabe (plantilla enorme o `max` minúsculo): se corta en seco.
  return montar(textos.aiQuestionMore.replace("{n}", String(platos.length))).slice(0, max);
};
