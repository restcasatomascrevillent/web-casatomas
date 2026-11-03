/**
 * Área pulsable de un enlace suelto de texto sin mover nada: el relleno vertical agranda la zona
 * de toque y el margen negativo devuelve a la línea esos píxeles. `inline-block` para que el
 * relleno cuente en la caja del enlace.
 *
 * - `AREA_TOQUE_ENLACE` (44 px): para un enlace AISLADO («Volver al inicio», «Cómo llegar»…).
 * - `AREA_TOQUE_APILADO` (28 px, cumple WCAG 2.5.8): para enlaces en líneas consecutivas (teléfono
 *   y email, índice de condiciones). Con 44 px las cajas de dos líneas seguidas se pisaban y el
 *   toque iba al enlace de abajo; con 28 px y al menos 8 px entre líneas (`space-y-2`) las cajas
 *   se tocan pero no se solapan.
 */
export const AREA_TOQUE_ENLACE = "inline-block -my-2.5 py-2.5";
export const AREA_TOQUE_APILADO = "inline-block -my-1 py-1";

/** Un email (suele ir apilado con el teléfono): además, si no cabe (texto grande, 320 px), se parte en vez de salirse de la pantalla. */
export const AREA_TOQUE_EMAIL = `${AREA_TOQUE_APILADO} [overflow-wrap:anywhere]`;
