/**
 * Descarga "novedades" de Supabase EN TIEMPO DE BUILD.
 *
 * Por qué existe:
 * `NovedadesSection.tsx` solo pedía estas filas desde el navegador
 * (`useQuery` + `supabase.from("novedades")`), así que el HTML que sirve
 * Vercel no traía ni un título ni una descripción — solo el esqueleto de
 * carga (`animate-pulse`) mientras el JS no hubiera hidratado y la consulta
 * no hubiera vuelto. Mismo problema que ya se resolvió para la carta en
 * `carta-ssg.mjs`: este módulo lo trae en build y el plugin `novedades-ssg`
 * de `vite.config.ts` lo expone como `virtual:novedades-ssg`.
 *
 * Igual que en `carta-ssg.mjs`, se usa `fetch` contra PostgREST en vez de
 * `@supabase/supabase-js` a propósito: el cliente de la app arranca
 * temporizadores de refresco de sesión que pueden dejar vivo el proceso de
 * Node y colgar el build. La clave es la anon/publishable (pública y de
 * solo lectura). Nunca viaja al navegador desde aquí — solo el resultado.
 *
 * A diferencia de la carta, una tabla "novedades" vacía NO rompe el build:
 * `NovedadesSection` ya tiene un estado vacío diseñado (`t.novedades.empty`)
 * para "hoy no hay novedades", así que 0 filas es un resultado válido. Lo
 * que sí rompe el build (si `requerido`) es que la petición a Supabase
 * falle de verdad (red, HTTP, credenciales) — eso no se enmascara nunca en
 * build, solo en dev/test (ver `vite.config.ts`).
 */

/**
 * Claves que sobreviven al `select=*`, igual que `CAMPOS_SALIDA` en
 * `carta-ssg.mjs`: lo que `NovedadesSection.tsx` (interfaz `Novedad`)
 * realmente pinta, ni una columna más.
 */
const CAMPOS_SALIDA = new Set([
  'id',
  'titulo', 'titulo_en', 'titulo_fr',
  'descripcion', 'descripcion_en', 'descripcion_fr',
  'badge_text', 'badge_text_en', 'badge_text_fr',
  'icono',
  'imagen_url', 'imagen_posicion_y',
  'bullets', 'bullets_en', 'bullets_fr',
  'tags', 'tags_en', 'tags_fr',
  'destacado', 'orden',
  // Botones del pie de la tarjeta (`@/lib/menu-novedad`). Un `botones: []`
  // se compacta fuera y se lee igual: «sin botones».
  'botones', 'menu', 'plato_id',
]);

const vacio = (v) =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

/** Mismo adelgazado que `compactar` en `carta-ssg.mjs`: sin nulls, sin arrays
 * vacíos, sin traducciones idénticas al castellano. */
function compactar(fila) {
  const salida = {};
  for (const [clave, valor] of Object.entries(fila)) {
    if (!CAMPOS_SALIDA.has(clave)) continue;
    if (vacio(valor)) continue;
    if (Array.isArray(valor) && valor.length === 0) continue;

    const traducida = clave.match(/^(.+)_(en|fr)$/);
    if (traducida && fila[traducida[1]] === valor) continue;

    salida[clave] = valor;
  }
  return salida;
}

/**
 * @param {{ url?: string, key?: string }} config
 * @returns {Promise<{generadoEn: string, novedades: object[]}>}
 */
export async function fetchNovedadesSSG({ url, key }) {
  if (!url || !key) {
    throw new Error(
      '[novedades-ssg] Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_PUBLISHABLE_KEY ' +
      '(o VITE_SUPABASE_ANON_KEY) al construir. Sin ellas "novedades" no puede prerenderizarse.',
    );
  }

  const baseUrl = url.replace(/\/+$/, '');
  // Mismo orden que el `useQuery` de `NovedadesSection.tsx`:
  // `.order("destacado", { ascending: false }).order("orden", { ascending: true })`.
  const endpoint =
    `${baseUrl}/rest/v1/novedades?select=*&order=destacado.desc,orden.asc&limit=200`;

  let respuesta;
  try {
    respuesta = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
    });
  } catch (causa) {
    throw new Error(
      `[novedades-ssg] No se pudo contactar con Supabase: ${causa.message}`,
      { cause: causa },
    );
  }

  if (!respuesta.ok) {
    throw new Error(
      `[novedades-ssg] Supabase devolvió HTTP ${respuesta.status}: ` +
      `${(await respuesta.text()).slice(0, 400)}`,
    );
  }

  const filas = await respuesta.json();
  if (!Array.isArray(filas)) {
    throw new Error('[novedades-ssg] Respuesta inesperada de Supabase (no es un array de filas).');
  }

  // A propósito NO se rompe el build si `filas.length === 0`: a diferencia
  // de la carta, "hoy no hay novedades" es un estado real y ya contemplado.
  return {
    generadoEn: new Date().toISOString(),
    novedades: filas.map(compactar),
  };
}

/** Payload vacío para entornos sin red (dev/vitest). Nunca se usa en `build`. */
export const NOVEDADES_SSG_VACIA = { generadoEn: '', novedades: [] };
