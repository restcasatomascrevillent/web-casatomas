/**
 * Orden de los productos DENTRO de cada categoría según la columna `orden`.
 *
 * Contrato con el panel: al reordenar una categoría, el panel guarda en
 * `orden` enteros consecutivos empezando en 1 (0 = sin ordenar; nulo, al
 * final). En `Platos` y `Vinos` la columna ha sido TEXTO, así que el
 * `order=orden.asc` de PostgREST ordenaba como texto: "1", "10", "11", "2"…
 * A partir de diez platos el orden del panel se rompía. PostgREST no deja
 * convertir a número en el `order`, así que se reordena aquí, después de la
 * consulta (cuando la columna sea entera, esto ya no cambia nada: queda como
 * red de seguridad):
 *
 *  - las categorías conservan el orden en que llegan (ya vienen ordenadas
 *    por la consulta; aquí no se reordenan);
 *  - dentro de cada categoría, `orden` numérico ascendente;
 *  - `orden` nulo, vacío o no numérico, al final de su categoría;
 *  - empates (mismo número, o los dos sin número): el orden en que llegaron
 *    (`Array.prototype.sort` es estable), que es el de la consulta: `id`.
 *
 * No es `Number(orden)` a secas a propósito: `Number(null)` y `Number("")`
 * valen 0 y pondrían los nulos delante en vez de al final.
 *
 * JS plano (no TS) a propósito: lo importa `scripts/carta-ssg.mjs`, que
 * ejecuta Node sin pasar por el bundler. Los tipos están en
 * `orden-carta.d.mts`.
 */

const NUMERO = /^[+-]?\d+(?:[.,]\d+)?$/;

/**
 * `orden` como número, o `null` si no lo es. Acepta el número tal cual o el
 * texto que guarda el panel ("1", " 12 ", "3,5"); cualquier otra cosa
 * ("", "abc", "1º", null) es "sin orden".
 *
 * @param {unknown} valor
 * @returns {number | null}
 */
export function ordenNumerico(valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  if (!NUMERO.test(limpio)) return null;
  return Number(limpio.replace(",", "."));
}

/**
 * Comparador de dos valores de `orden`: numérico ascendente y los que no son
 * número al final. Dos "sin orden" empatan (0).
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {number}
 */
export function compararOrden(a, b) {
  const x = ordenNumerico(a);
  const y = ordenNumerico(b);
  if (x === null && y === null) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  return x - y;
}

/**
 * Devuelve una copia de `filas` ordenada por `orden` numérico dentro de cada
 * categoría, sin mover las categorías y sin perder el orden de llegada en los
 * empates (ver la cabecera). No muta la entrada.
 *
 * @template {{ categoria?: string | null, orden?: unknown }} T
 * @param {readonly T[]} filas
 * @returns {T[]}
 */
export function ordenarPorOrdenEnCategoria(filas) {
  if (!Array.isArray(filas)) return [];
  const posicionCategoria = new Map();
  for (const fila of filas) {
    const clave = fila?.categoria ?? "";
    if (!posicionCategoria.has(clave)) posicionCategoria.set(clave, posicionCategoria.size);
  }
  return filas
    .map((fila, indice) => ({
      fila,
      indice,
      categoria: posicionCategoria.get(fila?.categoria ?? ""),
    }))
    .sort(
      (a, b) =>
        a.categoria - b.categoria ||
        compararOrden(a.fila?.orden, b.fila?.orden) ||
        a.indice - b.indice,
    )
    .map(({ fila }) => fila);
}
