/**
 * Índice de rutas de la carta, DERIVADO DE LOS DATOS DEL BUILD.
 *
 * No hay ninguna lista de categorías escrita a mano: todo sale de
 * `virtual:carta-ssg`, es decir, de lo que había en Supabase cuando se
 * construyó. Si el dueño crea una categoría desde el panel de administración,
 * la renombra o la deja sin platos, el siguiente build refleja el cambio sin
 * que nadie toque código:
 *
 *  - categoría nueva  → aparece en `/carta` y se prerenderiza `/carta/<slug>`
 *  - categoría a cero → deja de tener página (no se emite su `.html`, así que
 *                       Vercel sirve el `404.html` real, no la portada)
 *  - categoría renombrada → cambia el slug; la URL antigua pasa a 404
 *
 * `CATEGORIAS_PLATOS` solo se usa para ORDENAR las conocidas; las que no estén
 * en esa lista no se pierden, van detrás por orden alfabético.
 */
import { cartaSSG, CATEGORIAS_PLATOS } from "./carta-ssg";
import type { PlatoSSG, ResumenCarta } from "./carta-ssg-types";

/**
 * Nombre de categoría → segmento de URL: sin acentos, en minúsculas y sin
 * símbolos. "ENTRANTES FRÍOS" → "entrantes-frios".
 */
export function slugificar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Slugs que ya tienen página propia y que una categoría de platos no puede
 * robar. Si alguien crea una categoría llamada "Vinos", su página será
 * `/carta/vinos-2` y la carta de vinos conserva su URL.
 */
const SLUGS_RESERVADOS = ["vinos", "bebidas"];

/**
 * Nombre legible de una categoría: "ENTRANTES FRÍOS" → "Entrantes fríos".
 *
 * No sale del diccionario de i18n a propósito. Esta pasada es solo en
 * castellano, y `t.categories.platos` se resuelve en el cliente a partir de
 * `localStorage`: si un visitante tuviera el idioma en inglés, el primer render
 * del navegador no coincidiría con el HTML prerenderizado (desajuste de
 * hidratación). Derivarlo del propio dato es determinista y además cubre las
 * categorías nuevas que el diccionario no conoce.
 */
export function etiquetaCategoria(clave: string): string {
  const limpio = clave.trim().toLowerCase();
  return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : clave;
}

export interface CategoriaCarta {
  /** Categoría tal cual está en la BD. Clave estable para filtrar. */
  clave: string;
  /** Segmento de URL, único dentro de `/carta/`. */
  slug: string;
  /** Platos activos en esta categoría en el momento del build. */
  total: number;
}

/**
 * Exportada para poder probar los casos raros sin depender de los datos
 * reales del build: categoría a cero, nombre con acentos, nombre solo de
 * símbolos y colisión de slug. Ver `src/__tests__/carta-rutas.test.ts`.
 */
export function construirIndiceCategorias(
  platos: Pick<PlatoSSG, "categoria">[],
  ordenConocido: readonly string[] = CATEGORIAS_PLATOS,
): CategoriaCarta[] {
  const totales = new Map<string, number>();
  for (const plato of platos) {
    const clave = plato.categoria?.trim();
    if (!clave) continue;
    totales.set(clave, (totales.get(clave) ?? 0) + 1);
  }

  // Orden determinista: primero las categorías conocidas en el orden de la
  // carta, después las nuevas por orden alfabético. Así, añadir una categoría
  // no reordena —ni cambia el slug de— las que ya estaban.
  const conocidas = ordenConocido.filter((clave) => totales.has(clave));
  const nuevas = [...totales.keys()]
    .filter((clave) => !ordenConocido.includes(clave))
    .sort((a, b) => a.localeCompare(b, "es"));

  const usados = new Set(SLUGS_RESERVADOS);
  return [...conocidas, ...nuevas].map((clave, indice) => {
    // Una categoría cuyo nombre son solo símbolos ("★") se quedaría sin slug.
    const base = slugificar(clave) || `categoria-${indice + 1}`;
    let slug = base;
    for (let sufijo = 2; usados.has(slug); sufijo += 1) slug = `${base}-${sufijo}`;
    usados.add(slug);
    return { clave, slug, total: totales.get(clave) ?? 0 };
  });
}

/** Categorías de platos con página propia, en el orden en que se muestran. */
export const CATEGORIAS_CARTA: CategoriaCarta[] = construirIndiceCategorias(cartaSSG.platos);

export const categoriaPorSlug = (slug?: string): CategoriaCarta | undefined =>
  CATEGORIAS_CARTA.find((categoria) => categoria.slug === slug);

export const platosDeCategoria = (clave: string): PlatoSSG[] =>
  cartaSSG.platos.filter((plato) => plato.categoria === clave);

/** Recuentos de vinos y bebidas sin descargar sus filas. */
export const RESUMEN_VINOS: ResumenCarta = cartaSSG.resumen?.vinos ?? { total: 0, categorias: [] };
export const RESUMEN_BEBIDAS: ResumenCarta = cartaSSG.resumen?.bebidas ?? {
  total: 0,
  categorias: [],
};

export const TOTAL_PLATOS = cartaSSG.platos.length;
export const TOTAL_CARTA = TOTAL_PLATOS + RESUMEN_VINOS.total + RESUMEN_BEBIDAS.total;

/** Ruta pública de una categoría. Única fuente de verdad para enlaces y SEO. */
export const rutaCategoria = (slug: string) => `/carta/${slug}`;

/**
 * Rutas que `vite-react-ssg` debe prerenderizar para `/carta/:categoria`.
 *
 * Lo consume `getStaticPaths` en `App.tsx`: sin esto la ruta lleva `:` y el
 * builder la descarta (`DefaultIncludedRoutes`), igual que pasaba con `404`.
 * Si no hay ninguna categoría con platos devuelve `[]` y el build sigue: se
 * generan `/carta`, `/carta/vinos` y `/carta/bebidas` y ninguna de categoría.
 */
export const rutasDeCategorias = (): string[] =>
  CATEGORIAS_CARTA.map((categoria) => rutaCategoria(categoria.slug));
