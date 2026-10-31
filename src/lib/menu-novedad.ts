/**
 * Botones y menú de una novedad (`novedades.botones` y `novedades.menu`, jsonb).
 *
 * Contrato (plan técnico de la historia «Botones de acción en las tarjetas de
 * novedades»; el panel escribe y la web lee):
 *
 *  - `botones`: array ordenado de 0 a 2 tipos distintos de `BOTONES_NOVEDAD`.
 *    El orden del array es el de pantalla. Las etiquetas no se guardan: salen
 *    del i18n de la web.
 *  - `menu`: `null` o `{ version: 1, incluye_bebidas, secciones: { primero,
 *    segundo, postre, bebidas } }`. Cada línea es el `ItemMenu` v2 del menú del
 *    día (`@/lib/menu-dia`) más `traducciones: { en?: {nombre, descripcion},
 *    fr?: {…} }`. A diferencia de `menus_diarios` hay UNA fila para los tres
 *    idiomas, así que la traducción se elige aquí al leer.
 *  - Versión 2 (historia «Maridajes y catas en el menú de las novedades»):
 *    `{ version: 2, tipo: "menu", maridaje: true, … }` con un `maridaje` (línea
 *    de bebida) en los platos de primero, segundo y postre, o `{ version: 2,
 *    tipo: "cata", … }` con la lista ordenada en `secciones.cata`. Reglas de
 *    lectura L1–L5 del plan técnico: sin versión o con la 1 todo es un menú sin
 *    maridaje ni cata; una versión mayor que 2 se lee igual que la 2.
 *
 * Todo es tolerante: la web en producción puede leer filas de antes de la
 * migración (sin estas columnas) o un valor raro. Lo que no se entiende se
 * ignora y, si no queda nada pintable, el botón no sale.
 */
import type { Language } from "@/i18n/types";
import {
  SECCIONES_MENU,
  aItemMenu,
  parsearPayloadMenu,
  type ItemMenu,
  type MenuDelDia,
  type SeccionMenu,
} from "@/lib/menu-dia";

export const BOTONES_NOVEDAD = ["llamar", "ver_menu", "ver_plato"] as const;

export type BotonNovedad = (typeof BOTONES_NOVEDAD)[number];

/** Como mucho dos botones por tarjeta (lo garantiza también un CHECK en la BD). */
export const MAX_BOTONES_NOVEDAD = 2;

const esBoton = (valor: unknown): valor is BotonNovedad =>
  typeof valor === "string" && (BOTONES_NOVEDAD as readonly string[]).includes(valor);

/**
 * `novedades.botones` → tipos válidos, sin repetir, en su orden y como mucho
 * dos. Cualquier otra cosa (columna ausente, `null`, texto) es «sin botones».
 */
export function parsearBotonesNovedad(valor: unknown): BotonNovedad[] {
  if (!Array.isArray(valor)) return [];
  const botones: BotonNovedad[] = [];
  for (const entrada of valor) {
    if (esBoton(entrada) && !botones.includes(entrada)) botones.push(entrada);
    if (botones.length === MAX_BOTONES_NOVEDAD) break;
  }
  return botones;
}

/**
 * Una bebida del menú (el maridaje de un plato o una línea de la cata), ya en
 * el idioma pedido. No lleva `refId`: es una copia de la carta, así que se
 * pinta lo copiado aunque el vino o la bebida ya no estén en la carta.
 */
export interface LineaBebida {
  id: string;
  nombre: string;
  descripcion: string | null;
  /** Solo si el panel guardó exactamente `true`. */
  sulfitos: boolean;
}

/** El menú de una novedad, listo para `CartaDelDia` en el idioma pedido. */
export interface MenuNovedad extends Pick<MenuDelDia, "estructurado" | "secciones"> {
  tipo: "menu" | "cata";
  /** Vacío si el dueño eligió «Solo comida» o no escribió ninguna bebida. */
  bebidas: ItemMenu[];
  /** Bebida de cada plato, por el `id` del `ItemMenu` de `secciones`. Solo en un menú con maridaje. */
  maridajes: Record<string, LineaBebida>;
  /** Lista ordenada de la cata. Vacía en un menú. */
  cata: LineaBebida[];
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

const textoNoVacio = (valor: unknown): string | undefined =>
  typeof valor === "string" && valor.trim() ? valor : undefined;

/**
 * Nombre y descripción en el idioma del visitante, campo a campo, con el
 * castellano de respaldo: el mismo criterio que el resto de textos de la
 * novedad (`titulo_en || titulo`).
 */
function traducirLinea(crudo: unknown, idioma: Language): unknown {
  if (idioma === "es" || !esObjeto(crudo) || !esObjeto(crudo.traducciones)) return crudo;
  const variante = crudo.traducciones[idioma];
  if (!esObjeto(variante)) return crudo;
  return {
    ...crudo,
    nombre: textoNoVacio(variante.nombre) ?? crudo.nombre,
    descripcion: textoNoVacio(variante.descripcion) ?? crudo.descripcion,
  };
}

const textoRecortado = (valor: unknown): string | null =>
  typeof valor === "string" && valor.trim() ? valor.trim() : null;

/**
 * Una línea de bebida cruda → `LineaBebida`, o `null` si no es un objeto con
 * nombre en castellano (L2). Nombre y descripción en el idioma pedido, campo a
 * campo, con el castellano de respaldo (L4).
 */
function aLineaBebida(crudo: unknown, idioma: Language, claveFallback: string): LineaBebida | null {
  if (!esObjeto(crudo)) return null;
  const nombre = textoRecortado(crudo.nombre);
  if (!nombre) return null;
  const traducida = traducirLinea(crudo, idioma) as Record<string, unknown>;
  return {
    id: textoRecortado(crudo.id) ?? claveFallback,
    nombre: textoRecortado(traducida.nombre) ?? nombre,
    descripcion: textoRecortado(traducida.descripcion),
    sulfitos: crudo.sulfitos === true,
  };
}

function lineasBebida(crudas: unknown, idioma: Language, prefijo: string): LineaBebida[] {
  if (!Array.isArray(crudas)) return [];
  return crudas
    .map((crudo, indice) => aLineaBebida(crudo, idioma, `${prefijo}-${indice}`))
    .filter((linea): linea is LineaBebida => linea !== null);
}

/**
 * Platos de una sección. Con `maridajes`, en la misma pasada se guarda la
 * bebida de cada plato con la clave del `id` que acaba de recibir, para que el
 * componente la encuentre con `maridajes[plato.id]`.
 */
function lineas(
  crudas: unknown,
  idioma: Language,
  prefijo: string,
  maridajes?: Record<string, LineaBebida>,
): ItemMenu[] {
  if (!Array.isArray(crudas)) return [];
  const items: ItemMenu[] = [];
  crudas.forEach((crudo, indice) => {
    const item = aItemMenu(traducirLinea(crudo, idioma), `${prefijo}-${indice}`);
    if (!item) return;
    items.push(item);
    if (!maridajes || !esObjeto(crudo)) return;
    const maridaje = aLineaBebida(crudo.maridaje, idioma, `${item.id}-maridaje`);
    if (maridaje) maridajes[item.id] = maridaje;
  });
  return items;
}

const seccionesVacias = (): Record<SeccionMenu, ItemMenu[]> => ({ primero: [], segundo: [], postre: [] });

/**
 * `novedades.menu` → menú pintable, o `null` si no se puede leer o no hay nada
 * que pintar (en ese caso «Ver menú» no sale, L3):
 *
 *  - Menú: hace falta algún plato en primero, segundo o postre. Bebidas solo si
 *    `incluye_bebidas` es `true`; maridajes solo en la v2 con `maridaje: true`.
 *  - Cata (v2 con `tipo: "cata"`): hace falta alguna línea en `secciones.cata`.
 *    No lleva comida: primero, segundo, postre y bebidas no se miran (L5).
 */
export function parsearMenuNovedad(
  valor: unknown,
  idioma: Language,
  idNovedad = "novedad",
): MenuNovedad | null {
  const payload = parsearPayloadMenu(valor);
  const crudas = payload.secciones;
  if (!esObjeto(crudas)) return null;

  // L1: sin versión o con la 1, tipo Menú sin maridaje ni cata.
  const v2 = typeof payload.version === "number" && payload.version >= 2;

  if (v2 && payload.tipo === "cata") {
    const cata = lineasBebida(crudas.cata, idioma, `${idNovedad}-cata`);
    if (cata.length === 0) return null;
    return { estructurado: true, tipo: "cata", secciones: seccionesVacias(), bebidas: [], maridajes: {}, cata };
  }

  const maridajes: Record<string, LineaBebida> = {};
  const conMaridaje = v2 && payload.maridaje === true;
  const secciones = seccionesVacias();
  for (const seccion of SECCIONES_MENU) {
    secciones[seccion] = lineas(
      crudas[seccion],
      idioma,
      `${idNovedad}-${seccion}`,
      conMaridaje ? maridajes : undefined,
    );
  }
  if (!SECCIONES_MENU.some((seccion) => secciones[seccion].length > 0)) return null;

  const bebidas =
    payload.incluye_bebidas === true ? lineas(crudas.bebidas, idioma, `${idNovedad}-bebidas`) : [];

  return { estructurado: true, tipo: "menu", secciones, bebidas, maridajes, cata: [] };
}
