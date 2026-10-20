/**
 * Genera `sitemap.xml` y `robots.txt` A PARTIR DEL BUILD REAL.
 *
 * Antes vivían escritos a mano en `public/`: el sitemap listaba 2 URLs sin
 * `lastmod` y no reflejaba las rutas que el SSG emite de verdad. Se invoca desde
 * `ssgOptions.onFinished(dir)` en `vite.config.ts`, cuando `dist/` ya tiene
 * todos los `.html`.
 *
 * Reglas:
 *  - Se recorre `dist/` buscando `.html`.
 *  - Solo entran páginas PRERENDERIZADAS: los `.html` que Vite copia tal cual
 *    de `public/` (p. ej. la verificación de Search Console) llegan en
 *    `ignorar` y no son páginas del sitio.
 *  - Se excluye `404.html` y cualquier página que declare `noindex`
 *    (política de privacidad y condiciones en los tres idiomas, las páginas
 *    de los enlaces de los correos, la redirección de Touza, el propio 404).
 *  - `vercel.json` usa `cleanUrls: true`, así que la URL pública no lleva `.html`
 *    y `index.html` es la raíz.
 *  - Cada URL con versión en otro idioma lleva sus `<xhtml:link>` de `hreflang`
 *    (las tres versiones, autorreferencia incluida, más `x-default` al
 *    español) — mismo cálculo de prefijo que `src/i18n/routing.ts`, duplicado
 *    aquí a propósito: este script es Node puro sin acceso a `src/` en build.
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

// `/carta` y sus hijas son la razón de ser del sitio para un buscador (388
// productos con precio), así que van por encima del 0.8 por defecto. La
// frecuencia es semanal porque la carta se edita desde el panel de
// administración y cada guardado dispara un rebuild. Las claves son SIEMPRE
// la ruta "en español" (sin prefijo de idioma): `/en/carta` y `/fr/carta`
// comparten la prioridad de `/carta`.
const PRIORIDADES = { '/': '1.0', '/carta': '0.9' };
const FRECUENCIAS = { '/': 'weekly' };
const esCarta = (rutaEs) => rutaEs === '/carta' || rutaEs.startsWith('/carta/');

const PREFIJOS_IDIOMA = { en: '/en', fr: '/fr' };
const IDIOMAS = ['es', 'en', 'fr'];

/** Idioma de una ruta pública, a partir de su primer segmento. */
function idiomaDeRuta(ruta) {
  if (ruta === '/en' || ruta.startsWith('/en/')) return 'en';
  if (ruta === '/fr' || ruta.startsWith('/fr/')) return 'fr';
  return 'es';
}

/** Quita el prefijo de idioma. `/en/carta/vinos` -> `/carta/vinos`. */
function rutaSinPrefijo(ruta) {
  const lang = idiomaDeRuta(ruta);
  if (lang === 'es') return ruta;
  const resto = ruta.slice(PREFIJOS_IDIOMA[lang].length);
  return resto === '' ? '/' : resto;
}

/** `/carta/vinos` + "en" -> `/en/carta/vinos`. `/` + "en" -> `/en`. */
function conPrefijo(rutaEs, lang) {
  if (lang === 'es') return rutaEs;
  const limpio = rutaEs === '/' ? '' : rutaEs;
  return `${PREFIJOS_IDIOMA[lang]}${limpio}` || PREFIJOS_IDIOMA[lang];
}

async function listarHtml(dir, raiz = dir, salida = []) {
  for (const entrada of await readdir(dir)) {
    const ruta = join(dir, entrada);
    const info = await stat(ruta);
    if (info.isDirectory()) {
      // `assets/` y `static-loader-data/` no contienen páginas.
      if (entrada === 'assets' || entrada === 'static-loader-data' || entrada === '.vite') continue;
      await listarHtml(ruta, raiz, salida);
    } else if (entrada.endsWith('.html')) {
      salida.push(relative(raiz, ruta).split(sep).join('/'));
    }
  }
  return salida;
}

const aRutaPublica = (archivo) =>
  archivo === 'index.html' ? '/' : `/${archivo.replace(/\.html$/, '').replace(/\/index$/, '')}`;

/**
 * @param {string} dir
 * @param {string} siteUrl
 * @param {{ ignorar?: string[] }} [opciones] `ignorar`: `.html` relativos a
 *   `dir` que no salen del prerenderizado (los de `public/`, ver
 *   `htmlDePublic` en `verificar-html.mjs`).
 * @returns {Promise<string[]>}
 */
export async function generarSitemapYRobots(dir, siteUrl, { ignorar = [] } = {}) {
  const base = siteUrl.replace(/\/+$/, '');
  const omitidos = new Set(ignorar);
  const archivos = (await listarHtml(dir)).filter((archivo) => !omitidos.has(archivo));

  const rutas = [];
  for (const archivo of archivos) {
    if (archivo === '404.html') continue;
    const html = await readFile(join(dir, archivo), 'utf8');
    // Una página con `noindex` en el sitemap es una señal contradictoria.
    if (/name="robots"[^>]*content="[^"]*noindex/i.test(html)) continue;
    rutas.push(aRutaPublica(archivo));
  }
  rutas.sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));

  if (rutas.length === 0) {
    throw new Error('[sitemap] No se encontró ninguna página indexable en el build.');
  }

  // Qué idiomas tiene realmente cada página (grupo = misma ruta sin prefijo).
  // Una página sin hermanas indexables en otro idioma no lleva bloque
  // `hreflang`: con un solo idioma esa etiqueta no aporta nada. Hoy llevan
  // bloque la portada, la carta y /reservas (las tres versiones de cada una).
  const rutasPorGrupo = new Map();
  for (const ruta of rutas) {
    const clave = rutaSinPrefijo(ruta);
    if (!rutasPorGrupo.has(clave)) rutasPorGrupo.set(clave, new Set());
    rutasPorGrupo.get(clave).add(idiomaDeRuta(ruta));
  }

  const lastmod = new Date().toISOString().slice(0, 10);
  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    rutas
      .map((ruta) => {
        const rutaEs = rutaSinPrefijo(ruta);
        const idiomasHermanos = rutasPorGrupo.get(rutaEs);
        const alternates =
          idiomasHermanos.size > 1
            ? [
                ...IDIOMAS.filter((lang) => idiomasHermanos.has(lang)).map(
                  (lang) =>
                    `    <xhtml:link rel="alternate" hreflang="${lang}" href="${base}${conPrefijo(rutaEs, lang)}"/>\n`,
                ),
                `    <xhtml:link rel="alternate" hreflang="x-default" href="${base}${rutaEs}"/>\n`,
              ].join('')
            : '';
        return (
          `  <url>\n` +
          `    <loc>${base}${ruta}</loc>\n` +
          `    <lastmod>${lastmod}</lastmod>\n` +
          `    <changefreq>${FRECUENCIAS[rutaEs] ?? (esCarta(rutaEs) ? 'weekly' : 'monthly')}</changefreq>\n` +
          `    <priority>${PRIORIDADES[rutaEs] ?? (esCarta(rutaEs) ? '0.85' : '0.8')}</priority>\n` +
          alternates +
          `  </url>\n`
        );
      })
      .join('') +
    `</urlset>\n`;

  // Los bots de IA se permiten a propósito: queremos que nos citen cuando
  // alguien pregunta "¿dónde comer arroz en Crevillente?".
  const robots =
    `User-agent: *\n` +
    `Allow: /\n\n` +
    `# Buscadores con IA — permitidos a propósito\n` +
    ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended']
      .map((bot) => `User-agent: ${bot}\nAllow: /\n`)
      .join('') +
    `\nSitemap: ${base}/sitemap.xml\n`;

  await writeFile(join(dir, 'sitemap.xml'), sitemap, 'utf8');
  await writeFile(join(dir, 'robots.txt'), robots, 'utf8');

  return rutas;
}
