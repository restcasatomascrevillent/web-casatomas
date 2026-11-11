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
 * Interruptor «Carta de bebidas en la web» del panel (Gestor web › Carta › Bebidas, 11/11/2026),
 * tal y como estaba al construir. Al revés que las fotos, falla CERRADO: solo un `true` explícito
 * enseña la carta de Bebidas (el dueño la quiere apagada por defecto). Semilla de
 * `useMostrarCartaBebidas`, que la vuelve a leer en el navegador.
 */
export const MOSTRAR_CARTA_BEBIDAS = cartaSSG.config?.mostrarCartaBebidas === true;

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
 * Host de Supabase Storage que acepta el optimizador: el del proyecto con el
 * que se construye la web (`VITE_SUPABASE_URL`), así cada build solo lleva su
 * propio proyecto (producción no incluye la dirección de la demo). Tiene que
 * estar también en `vercel.json` → `images.remotePatterns`, o el optimizador
 * responde 400.
 */
function hostSupabaseStorage(): string | null {
  const url = import.meta.env?.VITE_SUPABASE_URL as string | undefined;
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    // Solo Supabase Storage está en `remotePatterns`; con otro host (p. ej. el
    // backend falso del e2e) el optimizador no sirve la foto.
    return host.endsWith(".supabase.co") ? host : null;
  } catch {
    return null;
  }
}

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
  if (host !== hostSupabaseStorage()) return url;
  return `/_vercel/image?url=${encodeURIComponent(url)}&w=${ancho}&q=75`;
}

/** Anchos que permite `images.sizes` de `vercel.json` (cualquier otro da 400). */
export const ANCHOS_IMAGEN = [640, 768, 1024] as const;

/**
 * `srcset` con los anchos del optimizador de Vercel para una foto de Supabase
 * Storage, o `null` si la URL no pasa por él (el `<img>` usa entonces solo
 * `src`). Mismas reglas de host que `imagenOptimizada`.
 */
export function srcSetOptimizada(url: string | null): string | null {
  if (!url) return null;
  const partes = ANCHOS_IMAGEN.map((w) => {
    const u = imagenOptimizada(url, w);
    return u && u !== url ? `${u} ${w}w` : null;
  });
  if (partes.some((p) => p === null)) return null;
  return partes.join(", ");
}

/**
 * Misma regla que el panel (`admin-casatomas/src/components/carta/rutasFotoCarta.ts`,
 * `RE_CARTA`). El panel guarda las fotos ya procesadas con `-carta` antes de la
 * extensión: `<id>-carta.webp` (alta nueva ya compuesta) o
 * `<id>-carta-<ext>.webp` (procesada desde una original ya subida: `-carta-webp`,
 * `-carta-jpg`…). Cualquiera de las dos cuenta.
 */
const RE_FOTO_CARTA = /-carta(?:-([a-z0-9]+))?\.(webp|jpe?g|png)$/i;

/**
 * Las fotos de la carta procesadas por el panel son composiciones sobre fondo
 * liso: los platos en 4:3 (1200×900, plato al 78 %) y los vinos en 3:4
 * (900×1200, botella al 80 % del alto). Se pintan enteras, sin el encuadre
 * vertical guardado (que las recortaría). Las antiguas conservan su
 * comportamiento (object-cover + encuadre).
 */
export function esFotoCarta(url: string | null | undefined): boolean {
  if (!url) return false;
  const sinConsulta = url.split(/[?#]/)[0] ?? "";
  let limpia = sinConsulta;
  try {
    limpia = decodeURIComponent(sinConsulta);
  } catch {
    // Escape `%` mal formado: se prueba la ruta tal cual en vez de romper el render.
  }
  return RE_FOTO_CARTA.test(limpia);
}
