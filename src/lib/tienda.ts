/**
 * Tienda de vinos (`/tienda`): un ESCAPARATE. Enseña los vinos de la carta que
 * se venden para llevar, cada uno con su precio de tienda (sin hablar de
 * descuentos ni del precio de carta: lo pidió así el dueño), pero NO se
 * compra por internet: las botellas se compran (y se pagan) en el propio
 * restaurante, o se reservan por teléfono. Aquí está la lógica que no pinta
 * nada (configuración, precios, catálogo y sus lecturas en vivo), para poder
 * probarla sin montar la página.
 *
 * Contrato con el panel (migración de `admin-casatomas`):
 *
 *  - `public.configuracion_tienda`: fila única (`id = true`), legible por
 *    `anon`, con `activa`, `descuento_pct` (30 por defecto), `vinos_excluidos`
 *    (ids de `Vinos` que no se venden), `aviso`, `recogida` (en la web sale
 *    como «Cómo comprar») y `updated_at`.
 *  - Vinos a la venta: los de la carta de vinos (`activado = true`,
 *    `restaurante IS TRUE`, igual que `CartaVinos` y `scripts/carta-ssg.mjs`)
 *    con `precio_eur > 0` y que no estén en `vinos_excluidos`.
 *  - Precio tienda = `round(precio_eur * (1 - descuento_pct / 100), 2)`, el
 *    mismo cálculo que hace la base de datos.
 *
 * Las lecturas van con `fetch` directo a PostgREST, no con
 * `@supabase/supabase-js`: la página no descarga el SDK (~40 KB gzip) para dos
 * lecturas públicas (mismo criterio que `useMostrarFotosPlatos`).
 *
 * Gotcha SSG: a nivel de módulo solo se lee `import.meta.env`.
 */
import { precioConocido } from "@/lib/precios";
import { ordenarPorOrdenEnCategoria } from "@/lib/orden-carta.mjs";
import { functionHeaders } from "@/lib/supabase-functions";
import type { VinoSSG } from "@/lib/carta-ssg-types";

const SUPABASE_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "").replace(/\/+$/, "");

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

export interface ConfigTienda {
  activa: boolean;
  /** 0–100. Solo para calcular el precio de tienda; la web no lo enseña. */
  descuento_pct: number;
  vinos_excluidos: string[];
  aviso: string | null;
  /** Columna `recogida`: en la web es el texto de «Cómo comprar». */
  recogida: string | null;
}

/** Valor por defecto de la migración, para una columna que llegue vacía. */
export const DESCUENTO_POR_DEFECTO = 30;

const textoONulo = (valor: unknown): string | null =>
  typeof valor === "string" && valor.trim() ? valor.trim() : null;

const numero = (valor: unknown): number | null => {
  const n = typeof valor === "string" ? Number(valor.replace(",", ".")) : typeof valor === "number" ? valor : NaN;
  return Number.isFinite(n) ? n : null;
};

/**
 * Una fila de `configuracion_tienda` (de la base o del build) a `ConfigTienda`.
 * `null` si no es una fila. Solo un `activa: true` explícito abre la tienda.
 */
export function normalizarConfigTienda(fila: unknown): ConfigTienda | null {
  if (!fila || typeof fila !== "object" || Array.isArray(fila)) return null;
  const f = fila as Record<string, unknown>;
  return {
    activa: f.activa === true,
    descuento_pct: Math.min(100, Math.max(0, numero(f.descuento_pct) ?? DESCUENTO_POR_DEFECTO)),
    vinos_excluidos: Array.isArray(f.vinos_excluidos) ? f.vinos_excluidos.map(String) : [],
    aviso: textoONulo(f.aviso),
    recogida: textoONulo(f.recogida),
  };
}

// ---------------------------------------------------------------------------
// Precios (en céntimos enteros, para cuadrar al céntimo con la base de datos)
// ---------------------------------------------------------------------------

/** Euros → céntimos. Los precios de la carta llevan como mucho dos decimales. */
export const aCentimos = (euros: number): number => Math.round(euros * 100);

/**
 * Precio tienda EN CÉNTIMOS: `round(precio * (1 - pct / 100), 2)` como lo hace
 * Postgres (`round` de `numeric`: mitad hacia arriba). En coma flotante
 * `47.85 * 0.7` da 33,494999…, que redondeado saldría 33,49 € en la web y 33,50 €
 * en la base; con enteros es exacto: 4785 × 7000 / 10000 = 3349,5 → 3350.
 */
export function centimosTienda(precioCarta: number, descuentoPct: number): number {
  const centimos = aCentimos(precioCarta);
  const factor = 10000 - Math.round(descuentoPct * 100); // 30 % → 7000 (diezmilésimas)
  return Math.floor((centimos * factor + 5000) / 10000);
}

/** Precio tienda en euros (ver `centimosTienda`). */
export const precioTienda = (precioCarta: number, descuentoPct: number): number =>
  centimosTienda(precioCarta, descuentoPct) / 100;

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

/** Lo que la tienda necesita de cada vino (mismas columnas que la carta). */
export type VinoTienda = Pick<
  VinoSSG,
  | "id"
  | "nombre"
  | "nombre_en"
  | "nombre_fr"
  | "categoria"
  | "precio_eur"
  | "orden"
  | "imagen_url"
  | "denominacion_origen"
  | "ubicacion_region"
  | "ubicacion_pais"
>;

/** Los vinos de la carta que se venden en la tienda, en el orden de la carta. */
export function vinosALaVenta<T extends Pick<VinoTienda, "id" | "precio_eur">>(vinos: readonly T[], config: ConfigTienda): T[] {
  const excluidos = new Set(config.vinos_excluidos);
  return vinos.filter((vino) => !!vino.id && precioConocido(vino.precio_eur) && !excluidos.has(String(vino.id)));
}

// ---------------------------------------------------------------------------
// Lecturas en vivo (PostgREST)
// ---------------------------------------------------------------------------

const cabecerasLectura = (): Record<string, string> => {
  const { "Content-Type": _tipo, ...resto } = functionHeaders();
  return { ...resto, Accept: "application/json" };
};

/**
 * `configuracion_tienda` en vivo. `null` = no hay tienda (la tabla aún no
 * existe en ese entorno —PostgREST responde 404— o no tiene su fila). Otro
 * fallo (red, 5xx) lanza, para que React Query conserve lo que ya había.
 */
export async function consultarConfigTienda(): Promise<ConfigTienda | null> {
  if (!SUPABASE_URL) throw new Error("Supabase sin configurar");
  const respuesta = await fetch(`${SUPABASE_URL}/rest/v1/configuracion_tienda?select=*&id=eq.true&limit=1`, {
    headers: cabecerasLectura(),
  });
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error(`configuracion_tienda: HTTP ${respuesta.status}`);
  const filas = (await respuesta.json()) as unknown;
  return Array.isArray(filas) ? normalizarConfigTienda(filas[0]) : null;
}

/** Columnas que pinta la tienda (todas existen en `Vinos`; ver `VinoTienda`). */
export const COLUMNAS_VINOS_TIENDA =
  "id,nombre,nombre_en,nombre_fr,categoria,precio_eur,orden,imagen_url,denominacion_origen,ubicacion_region,ubicacion_pais";

/**
 * Vinos a la venta en vivo, con el MISMO filtro y orden que la carta
 * (`activado`, `restaurante`, categoría → `orden` numérico → `id`) más
 * `precio_eur > 0`. Los precios del HTML son los del último build; esta
 * lectura los pone al día. Una lista vacía o un fallo lanzan: la página se
 * queda con los del build (como `carta-ssg`, que nunca publica una carta vacía).
 *
 * `?t=` (el cache-buster de Storage) se quita como en el build, para que la foto
 * tenga la misma URL antes y después de refrescar y no se descargue dos veces.
 */
export async function consultarVinosTienda(): Promise<VinoTienda[]> {
  if (!SUPABASE_URL) throw new Error("Supabase sin configurar");
  const url =
    `${SUPABASE_URL}/rest/v1/Vinos?select=${COLUMNAS_VINOS_TIENDA}` +
    "&activado=eq.true&restaurante=is.true&precio_eur=gt.0&order=categoria.asc,orden.asc,id.asc&limit=2000";
  const respuesta = await fetch(url, { headers: cabecerasLectura() });
  if (!respuesta.ok) throw new Error(`Vinos: HTTP ${respuesta.status}`);
  const filas = (await respuesta.json()) as unknown;
  if (!Array.isArray(filas) || filas.length === 0) throw new Error("Vinos: 0 filas");
  const vinos = filas
    .filter((fila): fila is Record<string, unknown> => !!fila && typeof fila === "object")
    .map((fila) => {
      const vino: Record<string, unknown> = {};
      for (const [clave, valor] of Object.entries(fila)) {
        if (valor === null || valor === undefined || valor === "") continue;
        vino[clave] = clave === "imagen_url" ? String(valor).replace(/\?t=\d+$/, "") : valor;
      }
      vino.id = String(fila.id);
      vino.precio_eur = Number(fila.precio_eur);
      return vino as unknown as VinoTienda;
    });
  return ordenarPorOrdenEnCategoria(vinos);
}
