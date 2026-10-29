import { normalizarUnidadPlato } from "./unidades-platos";
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
import { resolveTranslatedItem, type ItemTraducido } from "./carta-i18n";
import { normalizeAlergenos } from "./alergenos";
import type { Language } from "@/i18n/types";

export const cartaSSG = carta;

/**
 * Interruptor «Fotos de platos en Casa Tomás» del panel, tal y como estaba al
 * construir. Falla abierto: solo un `false` explícito oculta las fotos.
 *
 * Es el valor del HTML prerenderizado y la semilla de `useMostrarFotosPlatos`,
 * que lo vuelve a leer en el navegador al cargar la página (el cambio se nota
 * sin esperar a un deploy). Para el JSON-LD manda este valor del build.
 */
export const MOSTRAR_FOTOS_PLATOS =
  cartaSSG.config?.mostrarFotosPlatos !== false;

/**
 * Los platos tal y como deben ir al JSON-LD (`Menu` de schema.org): con las
 * fotos apagadas, sin `imagen_url` ni encuadre. Los datos estructurados deben
 * describir lo que la página enseña; anunciar a Google una foto que el dueño
 * ha quitado de la web sería contenido marcado que no está a la vista (y la
 * imagen podría acabar en un resultado enriquecido). Solo platos: vinos y
 * bebidas no dependen de este interruptor.
 */
export function platosParaJsonLd<
  T extends { imagen_url?: string; imagen_posicion_y?: number },
>(platos: T[], mostrarFotos: boolean = MOSTRAR_FOTOS_PLATOS): T[] {
  if (mostrarFotos) return platos;
  return platos.map(
    ({ imagen_url: _imagen, imagen_posicion_y: _encuadre, ...resto }) =>
      resto as T,
  );
}

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
      unidad: normalizarUnidadPlato(p.unidad),
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
      grupos.set(clave, {
        clave,
        nombre: item.displayCategoria || clave,
        items: [item],
      });
    }
  }

  const indice = (clave: string) => {
    const i = ordenPreferido.indexOf(clave);
    return i === -1 ? ordenPreferido.length : i;
  };

  return [...grupos.values()].sort(
    (a, b) =>
      indice(a.clave) - indice(b.clave) || a.clave.localeCompare(b.clave),
  );
}

/**
 * Resuelve `imagen_url` a una URL pública absoluta.
 * Mismas reglas que `toPublicImageUrl` en `CartaPlatos.tsx`.
 */
export function resolverImagen(
  valor: string | undefined,
  supabaseUrl?: string,
): string | null {
  if (!valor) return null;
  const trimmed = valor.trim();
  if (!trimmed) return null;
  if (/^(https?:|data:|blob:)/.test(trimmed)) return trimmed;
  const base = supabaseUrl?.replace(/\/+$/, "");
  if (!base) return null;
  if (trimmed.startsWith("/")) return `${base}${trimmed}`;
  if (trimmed.includes("/"))
    return `${base}/storage/v1/object/public/${trimmed.replace(/^\/+/, "")}`;
  return null;
}

/**
 * Hosts de Supabase Storage que acepta el optimizador: los mismos, uno a uno,
 * que `vercel.json` → `images.remotePatterns`. Si se añade un proyecto aquí
 * hay que añadirlo allí, o el optimizador responde 400.
 *   - jeamoczmbfsnwkfjxcyo: proyecto original (cuenta oficiososia).
 *   - haqmmdfdzzatdnrrcgez: producción en la cuenta del restaurante.
 *   - sfonaclosuafvlhutkon: demo/staging en la cuenta del restaurante.
 */
const SUPABASE_STORAGE_HOSTS = new Set([
  "jeamoczmbfsnwkfjxcyo.supabase.co",
  "haqmmdfdzzatdnrrcgez.supabase.co",
  "sfonaclosuafvlhutkon.supabase.co",
]);

/**
 * El panel sube las fotos de platos/vinos tal cual salen del móvil, sin
 * redimensionar ni comprimir — de media medio MB y hasta 3 MB cada una
 * (comprobado en Supabase Storage) para un hueco de card de 192 px de
 * alto. Supabase Storage no transforma imágenes en el plan gratuito del
 * proyecto, así que el redimensionado pasa por el optimizador de Vercel
 * (`images` en `vercel.json`), que sirve AVIF/WebP ya al tamaño real.
 * Solo envuelve fotos del propio Supabase Storage: cualquier otra URL se
 * deja tal cual para no arriesgar un 400 del optimizador con un host que
 * no está en su lista permitida.
 */
export function imagenOptimizada(
  url: string | null,
  ancho: number,
): string | null {
  if (!url) return null;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return url;
  }
  if (!SUPABASE_STORAGE_HOSTS.has(host)) return url;
  return `/_vercel/image?url=${encodeURIComponent(url)}&w=${ancho}&q=75`;
}

/**
 * Las fotos nuevas de la carta son composiciones 4:3 (1200×900, plato al 78 %
 * sobre fondo liso) y su nombre de archivo lleva `-carta`. Se pintan enteras,
 * sin el encuadre vertical guardado (que las recortaría). Las antiguas
 * conservan su comportamiento (object-cover + encuadre).
 */
export function esFotoCarta(url: string | null | undefined): boolean {
  if (!url) return false;
  const limpia = decodeURIComponent(url.split(/[?#]/)[0] ?? "");
  return /-carta\.[a-z0-9]+$/i.test(limpia);
}
