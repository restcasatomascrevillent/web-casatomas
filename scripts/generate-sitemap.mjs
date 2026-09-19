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
 *  - Se excluye `404.html` y cualquier página que declare `noindex`
 *    (política de privacidad, la redirección de Touza, el propio 404).
 *  - `vercel.json` usa `cleanUrls: true`, así que la URL pública no lleva `.html`
 *    y `index.html` es la raíz.
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

// `/carta` y sus hijas son la razón de ser del sitio para un buscador (388
// productos con precio), así que van por encima del 0.8 por defecto. La
// frecuencia es semanal porque la carta se edita desde el panel de
// administración y cada guardado dispara un rebuild.
const PRIORIDADES = { '/': '1.0', '/carta': '0.9' };
const FRECUENCIAS = { '/': 'weekly' };
const esCarta = (ruta) => ruta === '/carta' || ruta.startsWith('/carta/');

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

export async function generarSitemapYRobots(dir, siteUrl) {
  const base = siteUrl.replace(/\/+$/, '');
  const archivos = await listarHtml(dir);

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

  const lastmod = new Date().toISOString().slice(0, 10);
  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    rutas
      .map(
        (ruta) =>
          `  <url>\n` +
          `    <loc>${base}${ruta}</loc>\n` +
          `    <lastmod>${lastmod}</lastmod>\n` +
          `    <changefreq>${FRECUENCIAS[ruta] ?? (esCarta(ruta) ? 'weekly' : 'monthly')}</changefreq>\n` +
          `    <priority>${PRIORIDADES[ruta] ?? (esCarta(ruta) ? '0.85' : '0.8')}</priority>\n` +
          `  </url>\n`,
      )
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
