/**
 * Descarga la carta de platos de Supabase EN TIEMPO DE BUILD.
 *
 * Por qué existe:
 * hasta ahora la carta solo se pedía desde el navegador (`CartaPlatos.tsx`,
 * `CartaVinos.tsx`, `CartaBebidas.tsx`), así que el HTML que sirve Vercel no
 * contenía ni un solo nombre de plato. Este módulo lo resuelve en build y el
 * plugin `carta-ssg` de `vite.config.ts` lo expone como `virtual:carta-ssg`.
 *
 * Se usa `fetch` contra PostgREST en vez de `@supabase/supabase-js` a propósito:
 * el cliente de la app arranca temporizadores de refresco de sesión que pueden
 * dejar vivo el proceso de Node y colgar el build.
 *
 * La clave que consume es la anon/publishable (pública y de solo lectura: es su
 * uso previsto). Nunca viaja al navegador desde aquí — solo el resultado.
 */

/**
 * Columnas que se llevan al bundle.
 *
 * `Platos` va con lista explícita (columnas verificadas). `Vinos` y `Bebidas`
 * se piden con `select=*` y se filtran DESPUÉS con `CAMPOS_SALIDA`: sus tablas
 * han ido ganando columnas (`imagen_url`, `nombre_en`…) que no están en
 * `src/integrations/supabase/types.ts` (se mantiene a mano y va desfasado), y
 * pedir por nombre una columna inexistente devuelve un 400 que rompería el
 * build cada vez que alguien toque el esquema. Con `*` el build aguanta la
 * deriva del esquema y aquí se decide qué se publica.
 *
 * Se incluye todo lo que las páginas necesitan para pintar una tarjeta
 * idéntica a la que devuelve Supabase en runtime — incluidos `imagen_posicion_y`
 * (encuadre de la foto) y `expanded` — para que el render del build y el del
 * navegador sean indistinguibles.
 */
const CAMPOS = {
  Platos: [
    'id',
    'nombre', 'nombre_en', 'nombre_fr',
    'categoria', 'categoria_en', 'categoria_fr',
    'descripcion', 'descripcion_en', 'descripcion_fr',
    'precio_eur', 'unidad',
    'imagen_url', 'imagen_posicion_y', 'expanded',
    'ingredientes',
    'alergenos_oficiales', 'alergenos_inferidos', 'alergenos_notas',
    'traducciones',
  ],
  Vinos: '*',
  Bebidas: '*',
};

/** Claves que sobreviven al `select=*`. Todo lo demás se descarta. */
const CAMPOS_SALIDA = {
  Vinos: [
    'id',
    'nombre', 'nombre_en', 'nombre_fr',
    'categoria', 'categoria_en', 'categoria_fr',
    'descripcion', 'descripcion_en', 'descripcion_fr',
    'precio_eur', 'unidad',
    'imagen_url', 'imagen_posicion_y',
    'denominacion_origen', 'ubicacion_region', 'ubicacion_pais',
    'alergenos_oficiales', 'alergenos_inferidos', 'alergenos_notas',
    'traducciones',
  ],
  Bebidas: [
    'id',
    'nombre', 'nombre_en', 'nombre_fr',
    'categoria', 'categoria_en', 'categoria_fr',
    'descripcion', 'descripcion_en', 'descripcion_fr',
    'precio_eur', 'tamano',
    'traducciones',
  ],
};

const ORDEN = 'categoria.asc,orden.asc';

/**
 * `Platos` filtra por `restaurante=true` (`touza=true` es la carta del bar).
 * `Vinos` y `Bebidas` no tienen esa columna: se replica exactamente el filtro
 * que usan `CartaVinos.tsx` y `CartaBebidas.tsx` en runtime (`activado`), para
 * que el HTML del build y lo que ve el visitante sean el mismo conjunto.
 */
const FILTROS = {
  Platos: 'activado=eq.true&restaurante=is.true',
  Vinos: 'activado=eq.true',
  Bebidas: 'activado=eq.true',
};

const vacio = (v) =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

/**
 * Adelgaza cada fila:
 *  - Quita claves vacías (128 platos × ~8 nulls es peso muerto).
 *  - Quita las traducciones IDÉNTICAS al castellano: `resolveTranslatedItem` ya
 *    cae al valor base cuando la columna falta, así que el resultado que ve el
 *    visitante es exactamente el mismo.
 *  - Quita el cache-buster `?t=` de las imágenes de Storage: en el JSON-LD solo
 *    estorba y son ~14 bytes por plato.
 */
function compactar(fila, permitidas) {
  const salida = {};
  for (const [clave, valor] of Object.entries(fila)) {
    if (permitidas && !permitidas.has(clave)) continue;
    if (vacio(valor)) continue;
    if (Array.isArray(valor) && valor.length === 0) continue;
    if (valor === '[]') continue; // algún `alergenos_*` llega como el string "[]"
    if (typeof valor === 'object' && !Array.isArray(valor) && Object.keys(valor).length === 0) continue;

    const traducida = clave.match(/^(.+)_(en|fr)$/);
    if (traducida && fila[traducida[1]] === valor) continue;

    salida[clave] = clave === 'imagen_url' ? String(valor).replace(/\?t=\d+$/, '') : valor;
  }
  return salida;
}

async function descargarTabla(baseUrl, key, tabla) {
  const select = Array.isArray(CAMPOS[tabla]) ? CAMPOS[tabla].join(',') : CAMPOS[tabla];
  const url =
    `${baseUrl}/rest/v1/${tabla}` +
    `?select=${encodeURIComponent(select)}` +
    `&${FILTROS[tabla]}` +
    `&order=${ORDEN}` +
    `&limit=2000`;

  let respuesta;
  try {
    respuesta = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
    });
  } catch (causa) {
    throw new Error(
      `[carta-ssg] No se pudo contactar con Supabase para la tabla "${tabla}": ${causa.message}`,
      { cause: causa },
    );
  }

  if (!respuesta.ok) {
    throw new Error(
      `[carta-ssg] Supabase devolvió HTTP ${respuesta.status} para la tabla "${tabla}": ` +
      `${(await respuesta.text()).slice(0, 400)}`,
    );
  }

  const filas = await respuesta.json();
  if (!Array.isArray(filas) || filas.length === 0) {
    // Romper el build es deliberado: publicar una carta vacía y que Google la
    // indexe así es peor que no desplegar.
    throw new Error(
      `[carta-ssg] La tabla "${tabla}" devolvió 0 filas. Se aborta el build en vez de ` +
      `publicar una carta vacía. Revisa RLS, los filtros (${FILTROS[tabla]}) y los datos.`,
    );
  }
  const permitidas = CAMPOS_SALIDA[tabla] ? new Set(CAMPOS_SALIDA[tabla]) : null;
  return filas.map((fila) => compactar(fila, permitidas));
}

/**
 * Recuento por categoría, en el orden en que llegaron las filas.
 *
 * Es lo único que la portada y `/carta` necesitan saber de vinos y bebidas, así
 * que viaja en el módulo principal (unos cientos de bytes) mientras que las
 * 185 + 75 filas completas quedan en sus propios módulos virtuales, que solo
 * descarga quien abre esas páginas.
 */
function resumirPorCategoria(filas) {
  const porCategoria = new Map();
  for (const fila of filas) {
    const clave = fila.categoria ?? '';
    if (!clave) continue;
    porCategoria.set(clave, (porCategoria.get(clave) ?? 0) + 1);
  }
  return {
    total: filas.length,
    categorias: [...porCategoria].map(([nombre, total]) => ({ nombre, total })),
  };
}

/**
 * @param {{ url?: string, key?: string }} config
 * @returns {Promise<{generadoEn: string, platos: object[], vinos: object[], bebidas: object[], resumen: object}>}
 */
export async function fetchCartaSSG({ url, key }) {
  if (!url || !key) {
    throw new Error(
      '[carta-ssg] Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_PUBLISHABLE_KEY ' +
      '(o VITE_SUPABASE_ANON_KEY) al construir. Sin ellas la carta no puede prerenderizarse.',
    );
  }

  const baseUrl = url.replace(/\/+$/, '');
  const [platos, vinos, bebidas] = await Promise.all([
    descargarTabla(baseUrl, key, 'Platos'),
    descargarTabla(baseUrl, key, 'Vinos'),
    descargarTabla(baseUrl, key, 'Bebidas'),
  ]);

  return {
    generadoEn: new Date().toISOString(),
    platos,
    vinos,
    bebidas,
    resumen: { vinos: resumirPorCategoria(vinos), bebidas: resumirPorCategoria(bebidas) },
  };
}

const RESUMEN_VACIO = { total: 0, categorias: [] };

/** Payloads vacíos para entornos sin red (vitest). Nunca se usan en `build`. */
export const CARTA_SSG_VACIA = {
  generadoEn: '',
  platos: [],
  resumen: { vinos: RESUMEN_VACIO, bebidas: RESUMEN_VACIO },
};
export const VINOS_SSG_VACIOS = { generadoEn: '', vinos: [] };
export const BEBIDAS_SSG_VACIAS = { generadoEn: '', bebidas: [] };
