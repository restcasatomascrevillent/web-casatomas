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
 * Las TRES tablas se piden con `select=*` y se filtran DESPUÉS con
 * `CAMPOS_SALIDA`: han ido ganando columnas (`imagen_url`, `nombre_en`,
 * `alergenos_en`…) que no están en `src/integrations/supabase/types.ts` (se
 * mantiene a mano y va desfasado), y pedir por nombre una columna inexistente
 * devuelve un 400 que rompería el build cada vez que alguien toque el esquema.
 * `Platos` iba con lista explícita y por eso añadir aquí un campo nuevo era
 * jugarse el despliegue; con `*` el build aguanta la deriva del esquema y es
 * este fichero el que decide qué se publica.
 *
 * Se incluye todo lo que las páginas necesitan para pintar una tarjeta
 * idéntica a la que devuelve Supabase en runtime — incluidos `imagen_posicion_y`
 * (encuadre de la foto) y `expanded` — para que el render del build y el del
 * navegador sean indistinguibles.
 */
const CAMPOS = {
  Platos: '*',
  Vinos: '*',
  Bebidas: '*',
};

/**
 * Claves que sobreviven al `select=*`. Todo lo demás se descarta.
 *
 * `alergenos_en` / `alergenos_fr` son la traducción de los alérgenos: UNA
 * columna de texto separado por comas, no un array (lo desmenuza
 * `normalizeAlergenos` en `src/lib/alergenos.ts`). Sin ellas el HTML estático
 * enseñaba los alérgenos en castellano aunque el visitante navegara en inglés.
 */
const CAMPOS_SALIDA = {
  Platos: [
    'id',
    'nombre', 'nombre_en', 'nombre_fr',
    'categoria', 'categoria_en', 'categoria_fr',
    'descripcion', 'descripcion_en', 'descripcion_fr',
    'precio_eur', 'unidad',
    'imagen_url', 'imagen_posicion_y', 'expanded',
    'ingredientes', 'sin_gluten_disponible',
    'etiquetas_dieteticas',
    'alergenos_oficiales', 'alergenos_inferidos', 'alergenos_notas',
    'alergenos_en', 'alergenos_fr',
    'traducciones',
  ],
  Vinos: [
    'id',
    'nombre', 'nombre_en', 'nombre_fr',
    'categoria', 'categoria_en', 'categoria_fr',
    'descripcion', 'descripcion_en', 'descripcion_fr',
    'precio_eur', 'unidad',
    'imagen_url', 'imagen_posicion_y',
    'denominacion_origen', 'ubicacion_region', 'ubicacion_pais',
    'alergenos_oficiales', 'alergenos_inferidos', 'alergenos_notas',
    'alergenos_en', 'alergenos_fr',
    'traducciones',
  ],
  Bebidas: [
    'id',
    'nombre', 'nombre_en', 'nombre_fr',
    'categoria', 'categoria_en', 'categoria_fr',
    'descripcion', 'descripcion_en', 'descripcion_fr',
    'precio_eur', 'tamano',
    // Las bebidas SÍ tienen foto en la BD y no llegaba al HTML estático.
    'imagen_url',
    'traducciones',
  ],
};

const ORDEN = 'categoria.asc,orden.asc';

/**
 * El MISMO filtro en las tres tablas y en los dos caminos.
 *
 * `restaurante=true` es la carta de Casa Tomás; `touza=true` es la del bar. Las
 * tres tablas tienen esa columna, pero hasta ahora solo `Platos` la filtraba
 * aquí y ningún componente la filtraba en runtime. No se notaba porque todas
 * las filas están marcadas, pero en cuanto el dueño desmarcara algo el plato
 * habría desaparecido del HTML estático y habría vuelto a aparecer al hidratar.
 * `CartaPlatos.tsx`, `CartaVinos.tsx` y `CartaBebidas.tsx` aplican ahora
 * `.eq('activado', true).is('restaurante', true)`, que es exactamente esto.
 */
const FILTROS = {
  Platos: 'activado=eq.true&restaurante=is.true',
  Vinos: 'activado=eq.true&restaurante=is.true',
  Bebidas: 'activado=eq.true&restaurante=is.true',
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
 * Interruptor «Fotos de platos en Casa Tomás» del panel (Gestor Web → Carta).
 *
 * Vive en `configuracion_web.mostrar_fotos_platos_casa_tomas` (fila única,
 * legible con la anon key; migración 20261001113700 de adminpanelct). Se lee
 * en build para que el HTML (botón de la foto, JSON-LD) salga ya con el valor
 * bueno, y el navegador lo vuelve a leer al cargar la página
 * (`useMostrarFotosPlatos`): así el interruptor se nota sin esperar a un
 * deploy (hoy `rebuild-webs` no llega a lanzarlos).
 *
 * FALLA ABIERTO: cualquier problema leyéndolo (tabla aún sin crear → 404
 * PGRST205, red, fila ausente, valor raro) deja las fotos VISIBLES, que es lo
 * de siempre. Solo un `false` explícito las oculta. Al contrario que la carta,
 * esto nunca rompe el build: no poder leer un ajuste cosmético no justifica
 * dejar de desplegar.
 *
 * @returns {Promise<boolean>}
 */
export async function leerMostrarFotosPlatos(baseUrl, key) {
  const url = `${baseUrl}/rest/v1/configuracion_web?select=mostrar_fotos_platos_casa_tomas&id=eq.true&limit=1`;
  try {
    const respuesta = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
    });
    if (!respuesta.ok) {
      console.warn(
        `[carta-ssg] No se pudo leer configuracion_web (HTTP ${respuesta.status}); ` +
        'se publican las fotos de los platos (comportamiento por defecto).',
      );
      return true;
    }
    const filas = await respuesta.json();
    return !(Array.isArray(filas) && filas[0]?.mostrar_fotos_platos_casa_tomas === false);
  } catch (causa) {
    console.warn(
      `[carta-ssg] No se pudo leer configuracion_web (${causa?.message ?? causa}); ` +
      'se publican las fotos de los platos (comportamiento por defecto).',
    );
    return true;
  }
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
 * @returns {Promise<{generadoEn: string, platos: object[], vinos: object[], bebidas: object[], resumen: object, config: {mostrarFotosPlatos: boolean}}>}
 */
export async function fetchCartaSSG({ url, key }) {
  if (!url || !key) {
    throw new Error(
      '[carta-ssg] Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_PUBLISHABLE_KEY ' +
      '(o VITE_SUPABASE_ANON_KEY) al construir. Sin ellas la carta no puede prerenderizarse.',
    );
  }

  const baseUrl = url.replace(/\/+$/, '');
  const [platos, vinos, bebidas, mostrarFotosPlatos] = await Promise.all([
    descargarTabla(baseUrl, key, 'Platos'),
    descargarTabla(baseUrl, key, 'Vinos'),
    descargarTabla(baseUrl, key, 'Bebidas'),
    leerMostrarFotosPlatos(baseUrl, key),
  ]);

  return {
    generadoEn: new Date().toISOString(),
    // `imagen_url` se conserva aunque las fotos estén apagadas: si el dueño
    // las vuelve a encender, el navegador las enseña sin esperar a un deploy.
    // El JSON-LD sí las omite (`platosParaJsonLd` en src/lib/carta-ssg.ts).
    platos,
    vinos,
    bebidas,
    resumen: { vinos: resumirPorCategoria(vinos), bebidas: resumirPorCategoria(bebidas) },
    config: { mostrarFotosPlatos },
  };
}

const RESUMEN_VACIO = { total: 0, categorias: [] };

/** Payloads vacíos para entornos sin red (vitest). Nunca se usan en `build`. */
export const CARTA_SSG_VACIA = {
  generadoEn: '',
  platos: [],
  resumen: { vinos: RESUMEN_VACIO, bebidas: RESUMEN_VACIO },
  config: { mostrarFotosPlatos: true },
};
export const VINOS_SSG_VACIOS = { generadoEn: '', vinos: [] };
export const BEBIDAS_SSG_VACIAS = { generadoEn: '', bebidas: [] };

