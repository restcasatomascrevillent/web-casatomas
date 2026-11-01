// Tipos de `orden-carta.mjs` (JS plano porque también lo usa `scripts/carta-ssg.mjs`).

/** `orden` como número, o `null` si no lo es ("", "abc", null…). */
export function ordenNumerico(valor: unknown): number | null;

/** Numérico ascendente; los que no son número, al final; dos "sin orden" empatan. */
export function compararOrden(a: unknown, b: unknown): number;

/**
 * Copia ordenada por `orden` numérico dentro de cada categoría: las categorías
 * no se mueven y los empates conservan el orden de llegada.
 */
export function ordenarPorOrdenEnCategoria<T extends { categoria?: string | null; orden?: unknown }>(
  filas: readonly T[],
): T[];
