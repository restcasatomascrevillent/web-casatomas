/**
 * ¿Lleva este build la estética de Navidad? De momento solo la demo:
 * `vite.config.ts` fija `VITE_NAVIDAD` al construir (`scripts/navidad.mjs`:
 * "false" solo en producción, y ahí se explica cómo encenderla por fechas) y
 * aquí se lee como constante. En producción `NAVIDAD` queda en `false` al
 * compilar, así que los componentes de `components/navidad/` ni llegan al
 * bundle, y sus estilos (`virtual:navidad.css`) resuelven a un CSS vacío.
 *
 * Sin la variable (vitest) vale `true`, como en la demo.
 */
export const navidadActiva = (valor: unknown = import.meta.env.VITE_NAVIDAD): boolean => valor !== "false";

// Comparación directa (no la función): tras el `define` queda `"false" !== "false"`,
// que Rollup resuelve a `false` y con ello elimina las ramas `NAVIDAD && …`.
export const NAVIDAD: boolean = import.meta.env.VITE_NAVIDAD !== "false";
