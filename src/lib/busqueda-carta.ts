/**
 * Buscador de la carta (`/carta`): normalización del texto y búsqueda en
 * platos, vinos y bebidas, con los resultados agrupados por categoría.
 *
 * Todo es puro (sin React ni red) para poder probarlo aparte; el componente
 * (`BuscadorCarta`) solo decide cuándo buscar y cómo pintarlo.
 *
 * Criterio de coincidencia:
 *  - sin mayúsculas ni tildes: «jamon» encuentra «Jamón», «creme» «Crème»;
 *  - cada palabra de la búsqueda tiene que estar al PRINCIPIO de alguna
 *    palabra del producto («bogav» encuentra «bogavante», «ron» no encuentra
 *    «salmón»), y tienen que estar todas («arroz bogavante»);
 *  - se busca en el idioma que ve el visitante (nombre, descripción,
 *    ingredientes y categoría traducidos) y, además, en el nombre y la
 *    categoría en castellano: muchos platos se conocen por su nombre de aquí.
 */
import type { Language } from "@/i18n/types";
import { resolveTranslatedItem, type ItemTraducido } from "./carta-i18n";
import type { BebidaSSG, PlatoSSG, VinoSSG } from "./carta-ssg-types";
import type { CategoriaCarta } from "./carta-rutas";
import { tipoVino, type TipoVino } from "./tipos-vino";

/**
 * Grafías equivalentes, palabra a palabra, después de quitar las tildes. El
 * valenciano «arròs» y el castellano «arroz» son la misma búsqueda.
 */
const EQUIVALENCIAS: Record<string, string> = {
  arros: "arroz",
};

/**
 * Texto → forma comparable: minúsculas, sin tildes ni diéresis (también
 * «ñ» → «n» y «ç» → «c»), ligaduras francesas abiertas («œ» → «oe»), sin
 * apóstrofos ni puntos («D.O.» → «do», «pig's» → «pigs») y cualquier otro
 * signo convertido en espacio. Las palabras quedan separadas por un espacio.
 */
export function normalizarBusqueda(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’‘`´.·]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((palabra) => EQUIVALENCIAS[palabra] ?? palabra)
    .join(" ");
}

/** Palabras de la búsqueda, normalizadas y sin repetir. */
export function terminosDeBusqueda(consulta: string): string[] {
  const normalizada = normalizarBusqueda(consulta);
  return normalizada ? [...new Set(normalizada.split(" "))] : [];
}

/** Une varios campos en un solo texto ya normalizado (con espacio delante). */
export function textoBuscable(campos: readonly unknown[]): string {
  const partes: string[] = [];
  for (const campo of campos) {
    if (Array.isArray(campo)) partes.push(...campo.map(normalizarBusqueda));
    else partes.push(normalizarBusqueda(campo));
  }
  // El espacio inicial permite buscar " termino" = principio de palabra.
  return ` ${partes.filter(Boolean).join(" ")}`;
}

/** Todas las palabras de la búsqueda empiezan alguna palabra del texto. */
export function coincide(texto: string, terminos: readonly string[]): boolean {
  return terminos.length > 0 && terminos.every((termino) => texto.includes(` ${termino}`));
}

/**
 * La primera frase de `texto` que contiene alguna palabra de la búsqueda, o
 * `undefined`. Para enseñar POR QUÉ sale un vino cuya nota de cata es larga
 * («… Encaja con carnes asadas y un arroz de setas.»).
 */
export function fraseCoincidente(texto: string | null | undefined, terminos: readonly string[]): string | undefined {
  if (!texto || !terminos.length) return undefined;
  // Sin lookbehind (`(?<=…)`): Safari anterior a 16.4 no lo entiende y el
  // módulo entero dejaría de cargar en esos iPhone.
  return (texto.match(/[^.!?…]+[.!?…]*/g) ?? [])
    .map((frase) => frase.trim())
    .find((frase) => {
      const normalizada = textoBuscable([frase]);
      return terminos.some((termino) => normalizada.includes(` ${termino}`));
    });
}

export interface EntradaIndice<T> {
  item: ItemTraducido<T>;
  /** Todo lo buscable. */
  texto: string;
  /** Solo nombre, categoría y origen: sin descripción ni ingredientes. */
  principal: string;
}

/**
 * Producto ya traducido + su texto de búsqueda. Se calcula una vez por idioma.
 * `principales` son los campos que identifican el producto; `secundarios`, los
 * que lo describen (descripción, ingredientes): un vino puede salir por su
 * maridaje («… con arroces») y entonces conviene enseñar por qué.
 */
function indexar<T extends Record<string, unknown>>(
  filas: readonly T[],
  language: Language,
  principales: (item: ItemTraducido<T>) => unknown[],
  secundarios: (item: ItemTraducido<T>) => unknown[],
): EntradaIndice<T>[] {
  return filas.map((fila) => {
    const item = resolveTranslatedItem(fila, language);
    const principal = textoBuscable(principales(item));
    return { item, principal, texto: `${principal}${textoBuscable(secundarios(item))}` };
  });
}

export const indexarPlatos = (platos: readonly PlatoSSG[], language: Language) =>
  indexar(
    platos as (PlatoSSG & Record<string, unknown>)[],
    language,
    (plato) => [plato.displayNombre, plato.nombre, plato.displayCategoria, plato.categoria],
    (plato) => [plato.displayDescripcion, plato.displayIngredientes],
  );

export const indexarVinos = (vinos: readonly VinoSSG[], language: Language) =>
  indexar(
    vinos as (VinoSSG & Record<string, unknown>)[],
    language,
    (vino) => [
      vino.displayNombre,
      vino.nombre,
      vino.displayCategoria,
      vino.categoria,
      vino.denominacion_origen,
      vino.ubicacion_region,
      vino.ubicacion_pais,
    ],
    (vino) => [vino.displayDescripcion],
  );

export const indexarBebidas = (bebidas: readonly BebidaSSG[], language: Language) =>
  indexar(
    bebidas as (BebidaSSG & Record<string, unknown>)[],
    language,
    (bebida) => [bebida.displayNombre, bebida.nombre, bebida.displayCategoria, bebida.categoria, bebida.tamano],
    (bebida) => [bebida.displayDescripcion],
  );

export interface GrupoResultados<T> {
  /** Clave estable (categoría de la BD o tipo de vino). */
  clave: string;
  items: ItemTraducido<T>[];
  /**
   * Alineado con `items`: `true` si el producto solo coincide por su
   * descripción o ingredientes (no por nombre, categoría u origen).
   */
  porDescripcion: boolean[];
}

/**
 * Filtra el índice y agrupa en el orden de `claves` (el de la carta). Dentro
 * de cada grupo se respeta el orden de la carta (el de las filas).
 */
function agrupar<T>(
  indice: readonly EntradaIndice<T>[],
  terminos: readonly string[],
  claveDe: (item: ItemTraducido<T>) => string | undefined,
  claves: readonly string[],
): GrupoResultados<T>[] {
  if (!terminos.length) return [];
  const grupos = new Map<string, GrupoResultados<T>>();
  for (const { item, texto, principal } of indice) {
    const clave = claveDe(item);
    if (clave === undefined || !coincide(texto, terminos)) continue;
    const grupo = grupos.get(clave) ?? { clave, items: [], porDescripcion: [] };
    grupo.items.push(item);
    grupo.porDescripcion.push(!coincide(principal, terminos));
    grupos.set(clave, grupo);
  }
  const posicion = (clave: string) => {
    const i = claves.indexOf(clave);
    return i === -1 ? claves.length : i;
  };
  return [...grupos.values()].sort((a, b) => posicion(a.clave) - posicion(b.clave));
}

/**
 * Platos que coinciden, por categoría de la carta (`CATEGORIAS_CARTA`). Un
 * plato cuya categoría no tiene página propia no sale: tampoco se ve en
 * ninguna página de la carta.
 */
export function buscarPlatos(
  indice: readonly EntradaIndice<PlatoSSG>[],
  terminos: readonly string[],
  categorias: readonly CategoriaCarta[],
): GrupoResultados<PlatoSSG>[] {
  const claves = categorias.map((categoria) => categoria.clave);
  return agrupar(
    indice,
    terminos,
    (plato) => (plato.categoria && claves.includes(plato.categoria) ? plato.categoria : undefined),
    claves,
  );
}

/** Mismo orden que los filtros de `/carta/vinos` (`TIPOS_VINO`). */
export const ORDEN_TIPOS_VINO: Exclude<TipoVino, "todos">[] = ["tinto", "blanco", "espumoso", "rosado", "otro"];

/** Vinos que coinciden, por tipo (tintos, blancos…): hay decenas de denominaciones. */
export function buscarVinos(
  indice: readonly EntradaIndice<VinoSSG>[],
  terminos: readonly string[],
): GrupoResultados<VinoSSG>[] {
  return agrupar(indice, terminos, (vino) => tipoVino(vino.categoria), ORDEN_TIPOS_VINO);
}

/** Bebidas que coinciden, por su categoría, en el orden de `/carta/bebidas`. */
export function buscarBebidas(
  indice: readonly EntradaIndice<BebidaSSG>[],
  terminos: readonly string[],
  ordenCategorias: readonly string[],
): GrupoResultados<BebidaSSG>[] {
  return agrupar(indice, terminos, (bebida) => bebida.categoria || undefined, ordenCategorias);
}
