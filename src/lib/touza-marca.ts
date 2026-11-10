/**
 * Colores REALES de la web de Touza (`TOUZA_URL`):
 * fondo casi negro y dorado como color de marca — comprobado con un scrape de
 * su página (tema oscuro, `primary`/`accent` #D4A574, `background` #0A0A0A,
 * botón principal con ese mismo dorado y texto casi negro). Fuera de los
 * tokens de este proyecto (son los colores de OTRO negocio, no los nuestros)
 * a propósito: lo de Touza tiene que leerse como "esto es Touza", no como una
 * sala más de Casa Tomás con una etiqueta distinta. Lo usan la tarjeta de
 * Espacios y la página /touza.
 */
export const TOUZA = {
  bg: "#0A0A0A",
  accent: "#D4A574",
  accentSoft: "rgba(212, 165, 116, 0.16)",
  texto: "#1A1A1A",
} as const;
