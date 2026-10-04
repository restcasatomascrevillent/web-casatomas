/**
 * Página de condiciones (reserva + newsletter), sin prefijo de idioma. La
 * comparten el router, el footer y el formulario de reserva, que enlaza cada
 * casilla a su sección: `/condiciones#reservas` y `/condiciones#newsletter`.
 */
export const CONDICIONES_PATH = "/condiciones";
export const ANCLA_CONDICIONES_RESERVA = "reservas";
export const ANCLA_CONDICIONES_NEWSLETTER = "newsletter";

/**
 * Política de privacidad y formulario de reserva, sin prefijo de idioma. Las
 * dos existen en las tres ramas (`/`, `/en`, `/fr`): quien las enlace las
 * construye con `construirRutaIdioma(RUTA, language)`.
 */
export const POLITICA_PRIVACIDAD_PATH = "/politica-privacidad";
export const RESERVAS_PATH = "/reservas";
