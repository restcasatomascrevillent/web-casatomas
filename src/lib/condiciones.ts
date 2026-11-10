/**
 * Página de condiciones (reserva, cheques regalo, newsletter y bases del
 * sorteo), sin prefijo de idioma. La comparten el router, el footer, el
 * formulario de reserva (cada casilla enlaza a su sección: `#reservas` y
 * `#newsletter`), la compra de cheques regalo (`#cheques-regalo`) y la
 * votación del vino favorito (`#sorteo`).
 */
export const CONDICIONES_PATH = "/condiciones";
export const ANCLA_CONDICIONES_RESERVA = "reservas";
export const ANCLA_CONDICIONES_CHEQUES = "cheques-regalo";
export const ANCLA_CONDICIONES_NEWSLETTER = "newsletter";
export const ANCLA_CONDICIONES_SORTEO = "sorteo";

/**
 * Política de privacidad y formulario de reserva, sin prefijo de idioma. Las
 * dos existen en las tres ramas (`/`, `/en`, `/fr`): quien las enlace las
 * construye con `construirRutaIdioma(RUTA, language)`.
 */
export const POLITICA_PRIVACIDAD_PATH = "/politica-privacidad";
export const RESERVAS_PATH = "/reservas";

/**
 * Aviso legal (LSSI-CE, art. 10). Solo en español: es el texto vigente que
 * firma el titular y no hay versión traducida aprobada. El pie de las tres ramas enlaza a esta misma ruta.
 */
export const AVISO_LEGAL_PATH = "/aviso-legal";

/** Tienda de vinos, sin prefijo de idioma (existe en las tres ramas). La enlazan el menú y el pie. */
export const TIENDA_PATH = "/tienda";
