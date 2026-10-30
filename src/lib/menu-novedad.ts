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

/** El menú de una novedad, listo para `CartaDelDia` en el idioma pedido. */
export interface MenuNovedad extends Pick<MenuDelDia, "estructurado" | "secciones"> {
  /** Vacío si el dueño eligió «Solo comida» o no escribió ninguna bebida. */
  bebidas: ItemMenu[];
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

function lineas(crudas: unknown, idioma: Language, prefijo: string): ItemMenu[] {
  if (!Array.isArray(crudas)) return [];
  return crudas
    .map((crudo, indice) => aItemMenu(traducirLinea(crudo, idioma), `${prefijo}-${indice}`))
    .filter((item): item is ItemMenu => item !== null);
}

/**
 * `novedades.menu` → menú pintable, o `null` si no se puede leer o no tiene
 * ningún plato en primero, segundo o postre (en ese caso «Ver menú» no sale).
 *
 * Bebidas solo si `incluye_bebidas` es `true` y hay alguna línea.
 */
export function parsearMenuNovedad(
  valor: unknown,
  idioma: Language,
  idNovedad = "novedad",
): MenuNovedad | null {
  const payload = parsearPayloadMenu(valor);
  const crudas = payload.secciones;
  if (!esObjeto(crudas)) return null;

  const secciones = {} as Record<SeccionMenu, ItemMenu[]>;
  for (const seccion of SECCIONES_MENU) {
    secciones[seccion] = lineas(crudas[seccion], idioma, `${idNovedad}-${seccion}`);
  }
  if (!SECCIONES_MENU.some((seccion) => secciones[seccion].length > 0)) return null;

  const bebidas =
    payload.incluye_bebidas === true ? lineas(crudas.bebidas, idioma, `${idNovedad}-bebidas`) : [];

  return { estructurado: true, secciones, bebidas };
}
