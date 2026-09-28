/**
 * Lectura del menú del día (`menus_diarios.menu`, columna `jsonb`).
 *
 * Hay DOS formatos vivos en la misma columna y los dos tienen que pintarse:
 *
 *  - **v1 (heredado)**: `{ primero, segundo, postre }`, donde cada valor es
 *    texto plano con los platos separados por saltos de línea. Quedan filas
 *    así en la base de datos (la última, del 12/03/2026).
 *  - **v2**: `{ v: 2, secciones: { primero: ItemMenu[], ... } }`, con foto y
 *    alérgenos por plato. El panel de administración sigue escribiendo ADEMÁS
 *    el espejo v1 para no romper a ningún consumidor antiguo, así que aquí la
 *    regla es: si hay `secciones` con algún plato, manda `secciones`; si no,
 *    se lee el espejo.
 *
 * Hay una fila por idioma (`idiom`) unidas por `fecha`: el nombre y la
 * descripción llegan YA traducidos. Los alérgenos NO: se guardan siempre en el
 * vocabulario canónico español con acentos ("crustáceos", "frutos de cáscara")
 * en las tres filas, y se traducen al pintar con `etiquetaAlergeno`
 * (`@/lib/alergenos`). Es deliberado: si se tradujeran al guardar, las tres
 * filas se desincronizarían en cuanto cambiara una etiqueta.
 */
import { isValid, parseISO } from "date-fns";

import { datosAlergenos, normalizeAlergenos, type DatosAlergenos } from "@/lib/alergenos";
import { resolverImagen } from "@/lib/carta-ssg";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "");

/** Las tres secciones del menú, en el orden en que se sirven. */
export const SECCIONES_MENU = ["primero", "segundo", "postre"] as const;

export type SeccionMenu = (typeof SECCIONES_MENU)[number];

/** Un plato del menú del día tal y como lo guarda el panel (contrato v2). */
export interface ItemMenu {
  /** Identificador de la línea, estable entre las tres filas de idioma. */
  id: string;
  /** "carta" = elegido de la tabla `Platos`; "libre" = escrito a mano. */
  origen: "carta" | "libre";
  /** `Platos.id` cuando `origen === "carta"`. Solo trazabilidad. */
  platoId: string | null;
  /** Ya en el idioma de la fila. */
  nombre: string;
  /** Ya en el idioma de la fila. */
  descripcion: string | null;
  /** URL absoluta ya resuelta (las rutas de Storage llegan relativas). */
  imagenUrl: string | null;
  /** 0..100 — `object-position` vertical, igual que `Platos.imagen_posicion_y`. */
  imagenPosicionY: number | null;
  /** DECLARADOS por el restaurante. */
  alergenos: string[];
  /** DEDUCIDOS de los ingredientes: menos fiables que los declarados. */
  alergenosInferidos: string[];
  alergenosNotas: string | null;
}

export interface MenuDelDia {
  id: string;
  date: Date;
  /** `true` si la fila traía `secciones` (v2) con algún plato. */
  estructurado: boolean;
  secciones: Record<SeccionMenu, ItemMenu[]>;
}

/** Fila cruda de `menus_diarios`. */
export interface MenuDiarioRow {
  id: string;
  fecha: string;
  menu: unknown;
  idiom?: string | null;
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

/** El `jsonb` llega como objeto, pero alguna fila antigua es texto JSON. */
export const parsearPayloadMenu = (valor: unknown): Record<string, unknown> => {
  if (esObjeto(valor)) return valor;

  if (typeof valor === "string") {
    const limpio = valor.trim();
    if (!limpio) return {};
    try {
      const parsed: unknown = JSON.parse(limpio);
      return esObjeto(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
};

/**
 * Texto del espejo v1 → una línea por plato.
 *
 * ESTE es el arreglo del fallo que tenía `normalizeMenuItems`: ante
 * "Ensalada\nSopa" devolvía `["Ensalada\nSopa"]`, así que un "Primero" con dos
 * platos se pintaba como un único bloque de texto con un salto dentro.
 */
export const lineasDeTexto = (valor: unknown): string[] => {
  if (valor === null || valor === undefined) return [];
  if (Array.isArray(valor)) return valor.flatMap((entrada) => lineasDeTexto(entrada));
  if (typeof valor === "object") return [];

  const limpio = String(valor).trim();
  if (!limpio) return [];

  // Alguna fila guarda el array serializado dentro del texto.
  if ((limpio.startsWith("[") && limpio.endsWith("]")) || (limpio.startsWith("{") && limpio.endsWith("}"))) {
    try {
      return lineasDeTexto(JSON.parse(limpio));
    } catch {
      // No era JSON: sigue tratándose como texto plano.
    }
  }

  return limpio
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);
};

const textoOpcional = (valor: unknown): string | null => {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio || null;
};

/** 0..100, recortado. Fuera de rango el encuadre se iría a un borde. */
const porcentajeOpcional = (valor: unknown): number | null => {
  const numero =
    typeof valor === "number" ? valor : typeof valor === "string" ? Number(valor) : Number.NaN;
  if (!Number.isFinite(numero)) return null;
  return Math.min(100, Math.max(0, numero));
};

/** Plato sin nada más que su nombre: lo único que da el espejo v1. */
const itemLibre = (id: string, nombre: string): ItemMenu => ({
  id,
  origen: "libre",
  platoId: null,
  nombre,
  descripcion: null,
  imagenUrl: null,
  imagenPosicionY: null,
  alergenos: [],
  alergenosInferidos: [],
  alergenosNotas: null,
});

const aItemMenu = (crudo: unknown, claveFallback: string): ItemMenu | null => {
  if (!esObjeto(crudo)) {
    // Una entrada suelta que no es objeto se trata como un nombre a pelo.
    const nombre = lineasDeTexto(crudo)[0];
    return nombre ? itemLibre(claveFallback, nombre) : null;
  }

  const nombre = textoOpcional(crudo.nombre);
  // Sin nombre no hay plato: se descarta la línea en vez de pintar un hueco.
  if (!nombre) return null;

  return {
    id: textoOpcional(crudo.id) ?? claveFallback,
    origen: crudo.origen === "carta" ? "carta" : "libre",
    platoId: textoOpcional(crudo.platoId),
    nombre,
    descripcion: textoOpcional(crudo.descripcion),
    imagenUrl: resolverImagen(textoOpcional(crudo.imagenUrl) ?? undefined, SUPABASE_URL),
    imagenPosicionY: porcentajeOpcional(crudo.imagenPosicionY),
    alergenos: normalizeAlergenos(crudo.alergenos),
    alergenosInferidos: normalizeAlergenos(crudo.alergenosInferidos),
    alergenosNotas: textoOpcional(crudo.alergenosNotas),
  };
};

const seccionesVacias = (): Record<SeccionMenu, ItemMenu[]> => ({
  primero: [],
  segundo: [],
  postre: [],
});

const hayPlatos = (secciones: Record<SeccionMenu, ItemMenu[]>): boolean =>
  SECCIONES_MENU.some((seccion) => secciones[seccion].length > 0);

/** Camino v2. Devuelve `null` si no hay `secciones` utilizables. */
const seccionesEstructuradas = (
  payload: Record<string, unknown>,
  idFila: string,
): Record<SeccionMenu, ItemMenu[]> | null => {
  const crudas = payload.secciones;
  if (!esObjeto(crudas)) return null;

  const secciones = seccionesVacias();
  for (const seccion of SECCIONES_MENU) {
    const lista = crudas[seccion] ?? crudas[`${seccion}s`];
    if (!Array.isArray(lista)) continue;
    secciones[seccion] = lista
      .map((crudo, indice) => aItemMenu(crudo, `${idFila}-${seccion}-${indice}`))
      .filter((item): item is ItemMenu => item !== null);
  }

  // `secciones` presente pero vacío se trata como si no estuviera: mejor caer
  // al espejo v1 que dejar al visitante sin menú.
  return hayPlatos(secciones) ? secciones : null;
};

/** Camino v1: `primero` / `segundo` / `postre` en texto, una línea por plato. */
const seccionesEspejo = (
  payload: Record<string, unknown>,
  idFila: string,
): Record<SeccionMenu, ItemMenu[]> => {
  const secciones = seccionesVacias();
  for (const seccion of SECCIONES_MENU) {
    secciones[seccion] = lineasDeTexto(payload[seccion] ?? payload[`${seccion}s`]).map(
      (nombre, indice) => itemLibre(`${idFila}-${seccion}-${indice}`, nombre),
    );
  }
  return secciones;
};

/** Fila de `menus_diarios` → menú pintable, o `null` si no hay nada que pintar. */
export const parsearMenuDiario = (row: MenuDiarioRow): MenuDelDia | null => {
  const fecha = parseISO(row.fecha);
  if (!isValid(fecha)) return null;

  const payload = parsearPayloadMenu(row.menu);
  const estructuradas = seccionesEstructuradas(payload, row.id);
  const secciones = estructuradas ?? seccionesEspejo(payload, row.id);

  if (!hayPlatos(secciones)) return null;

  return {
    id: row.id,
    date: fecha,
    estructurado: estructuradas !== null,
    secciones,
  };
};

/**
 * Alérgenos de un plato en la forma que entiende `@/lib/alergenos`.
 *
 * Se pasa por `datosAlergenos` a propósito: es quien quita repetidos y junta
 * las notas con el mismo criterio que ya usa la carta.
 */
export const alergenosDeItem = (item: ItemMenu): DatosAlergenos =>
  datosAlergenos({
    alergenos_oficiales: item.alergenos,
    alergenos_inferidos: item.alergenosInferidos,
    alergenos_notas: item.alergenosNotas,
  });
