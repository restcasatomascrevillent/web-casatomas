/**
 * Área pulsable de al menos 44 px de alto para un enlace suelto de texto
 * (teléfono, email, «Volver al inicio»…) sin mover nada: el relleno vertical
 * agranda la zona de toque y el margen negativo devuelve a la línea esos
 * 10 px de arriba y de abajo (WCAG 2.5.8 pide 24 px; 44 px es lo cómodo con el
 * pulgar). `inline-block` para que el relleno cuente en la caja del enlace.
 */
export const AREA_TOQUE_ENLACE = "inline-block -my-2.5 py-2.5";

/** Lo mismo para un email: además, si no cabe (texto grande, 320 px), se parte en vez de salirse de la pantalla. */
export const AREA_TOQUE_EMAIL = `${AREA_TOQUE_ENLACE} [overflow-wrap:anywhere]`;
