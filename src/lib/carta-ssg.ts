/**
 * La carta de platos tal y como la descargó el build (`virtual:carta-ssg`).
 *
 * Tiene dos consumidores, y ninguno pinta nada que el visitante no pueda ver:
 *  1. `CartaSection` la pasa a `CartaPlatos` como estado inicial, de modo que el
 *     HTML que sirve Vercel ya trae las tarjetas reales de la categoría que se
 *     abre por defecto. Son los MISMOS nodos que el visitante destapa al pulsar
 *     "Carta de platos": no hay copia paralela para el buscador.
 *  2. `Index` construye con ella el `Menu` de schema.org.
 *
 * Es un snapshot del deploy; al abrir la sección, `CartaPlatos` refresca contra
 * Supabase igual que hacía antes.
 */
import carta from "virtual:carta-ssg";
import type { PlatoSSG } from "./carta-ssg-types";
import { normalizeAlergenos, resolveTranslatedItem, type ItemTraducido } from "./carta-i18n";
import type { Language } from "@/i18n/types";

export const cartaSSG = carta;

/** Categoría que `CartaPlatos` selecciona al montarse (`CartaPlatos.tsx`). */
export const CATEGORIA_INICIAL = "NOVEDADES DEL DÍA";

/** Mismo orden que `CATEGORY_ORDER` en `CartaPlatos.tsx`, sin `TODOS`. */
export const CATEGORIAS_PLATOS = [
  CATEGORIA_INICIAL,
  "SNACK",
  "ENTRANTES FRÍOS",
  "ENTRANTES CALIENTES",
  "ENSALADAS",
  "SALAZONES",
  "MARISCOS",
  "PESCADOS",
  "CARNES",
  "ARROCES",
  "POSTRES",
] as const;

/**
 * Semilla para `CartaPlatos`: SOLO la categoría inicial.
 *
 * Las demás se siguen pidiendo a Supabase al cambiar de categoría, exactamente
 * como antes — si se sembraran todas, el desplegable dejaría de refrescar y la
 * carta se quedaría congelada en la foto del build.
 *
 * `alergenos_*` se normaliza aquí porque es lo que hace `fetchPlatosByCategory`
 * con la respuesta de Supabase; así la semilla y el refresco tienen la misma forma.
 */
export function semillaCategoriaInicial(): Record<string, PlatoSSG[]> {
  const items = cartaSSG.platos
    .filter((p) => p.categoria === CATEGORIA_INICIAL)
    .map((p) => ({
      ...p,
      alergenos_oficiales: normalizeAlergenos(p.alergenos_oficiales),
      alergenos_inferidos: normalizeAlergenos(p.alergenos_inferidos),
      expanded: Boolean(p.expanded),
    }));

  return items.length ? { [CATEGORIA_INICIAL]: items } : {};
}

// Genérico porque lo usan también vinos y bebidas (`/carta/vinos`,
// `/carta/bebidas`), cuyas filas tienen columnas propias pero el mismo
// `categoria` + `nombre` + `precio_eur` que necesita el agrupador.
export interface SeccionCarta<T = PlatoSSG> {
  /** Categoría en castellano — clave estable, la que usa la BD. */
  clave: string;
  /** Categoría en el idioma activo. */
  nombre: string;
  items: ItemTraducido<T>[];
}

/** Agrupa por categoría respetando el orden de la carta. Lo usa el JSON-LD. */
export function agruparPorCategoria<T extends { categoria?: string }>(
  filas: T[],
  language: Language,
  ordenPreferido: readonly string[] = [],
): SeccionCarta<T>[] {
  const grupos = new Map<string, SeccionCarta<T>>();

  for (const fila of filas) {
    const clave = fila.categoria ?? "";
    if (!clave) continue;
    const item = resolveTranslatedItem(fila, language);
    const grupo = grupos.get(clave);
    if (grupo) {
      grupo.items.push(item);
    } else {
      grupos.set(clave, { clave, nombre: item.displayCategoria || clave, items: [item] });
    }
  }

  const indice = (clave: string) => {
    const i = ordenPreferido.indexOf(clave);
    return i === -1 ? ordenPreferido.length : i;
  };

  return [...grupos.values()].sort(
    (a, b) => indice(a.clave) - indice(b.clave) || a.clave.localeCompare(b.clave),
  );
}

/**
 * Resuelve `imagen_url` a una URL pública absoluta.
 * Mismas reglas que `toPublicImageUrl` en `CartaPlatos.tsx`.
 */
export function resolverImagen(valor: string | undefined, supabaseUrl?: string): string | null {
  if (!valor) return null;
  const trimmed = valor.trim();
  if (!trimmed) return null;
  if (/^(https?:|data:|blob:)/.test(trimmed)) return trimmed;
  const base = supabaseUrl?.replace(/\/+$/, "");
  if (!base) return null;
  if (trimmed.startsWith("/")) return `${base}${trimmed}`;
  if (trimmed.includes("/")) return `${base}/storage/v1/object/public/${trimmed.replace(/^\/+/, "")}`;
  return null;
}
