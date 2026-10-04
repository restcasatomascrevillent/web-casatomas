/**
 * Comprueba el HTML prerenderizado de `dist/`: cada página debe tener UN solo
 * elemento `<html` (nada de un segundo `<html>` colado, p. ej. escrito dentro
 * de un comentario de `index.html`, que el prerenderizado conserva) y su `lang`
 * debe ser el del idioma de la ruta: `/en/*` y `en.html` -> en, `/fr/*` y
 * `fr.html` -> fr, el resto -> es.
 *
 * Se invoca desde `ssgOptions.onFinished` en `vite.config.ts` (build normal y
 * build de los E2E) y lo cubre `src/__tests__/html-prerenderizado.test.ts`.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

async function listarHtml(dir, raiz = dir, salida = []) {
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) await listarHtml(ruta, raiz, salida);
    else if (entrada.name.endsWith('.html')) salida.push(relative(raiz, ruta).split(sep).join('/'));
  }
  return salida;
}

/** Idioma esperado de un `.html` de `dist/` según su ruta relativa. */
export function idiomaEsperado(rutaRelativa) {
  if (/^(en|fr)(\.html$|\/)/.test(rutaRelativa)) return rutaRelativa.slice(0, 2);
  return 'es';
}

/** Problemas de UN documento HTML (lista vacía = correcto). */
export function problemasDeHtml(html, rutaRelativa) {
  const problemas = [];
  const etiquetas = html.match(/<html[\s>]/gi) ?? [];
  if (etiquetas.length !== 1) {
    problemas.push(`${rutaRelativa}: ${etiquetas.length} apariciones de "<html" (debe haber exactamente 1)`);
  }
  const lang = /<html\s[^>]*\blang="([^"]*)"/i.exec(html)?.[1];
  const esperado = idiomaEsperado(rutaRelativa);
  if (lang !== esperado) {
    problemas.push(`${rutaRelativa}: lang="${lang ?? '(ninguno)'}" y se esperaba "${esperado}"`);
  }
  return problemas;
}

/** Recorre `dir` y lanza un Error si alguna página incumple. Devuelve cuántas revisó. */
export async function verificarHtmlPrerenderizado(dir) {
  const ficheros = await listarHtml(dir);
  const problemas = [];
  for (const rel of ficheros) {
    problemas.push(...problemasDeHtml(await readFile(join(dir, rel), 'utf8'), rel));
  }
  if (problemas.length > 0) {
    throw new Error(`HTML prerenderizado incorrecto:\n  - ${problemas.join('\n  - ')}`);
  }
  return ficheros.length;
}
