/**
 * ¿Existe la tienda de vinos en este build? La tienda es una maqueta que solo
 * se publica en la demo: `vite.config.ts` fija `VITE_TIENDA_VISIBLE` al
 * construir (`scripts/tienda-maqueta.mjs`: "false" solo en producción) y aquí
 * se lee como constante, así que en producción el enlace del menú y del pie y
 * la ruta (con su chunk) ni siquiera llegan al bundle.
 *
 * Sin la variable (vitest) vale `true`, como en la demo.
 */
export const tiendaVisible = (valor: unknown = import.meta.env.VITE_TIENDA_VISIBLE): boolean => valor !== "false";

export const TIENDA_VISIBLE = tiendaVisible();
