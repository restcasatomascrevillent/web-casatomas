/**
 * Comprueba el HTML prerenderizado de `dist/`: cada página debe tener UN solo
 * elemento `<html` (nada de un segundo `<html>` colado, p. ej. escrito dentro
 * de un comentario de `index.html`, que el prerenderizado conserva) y su `lang`
 * debe ser el del idioma de la ruta: `/en/*` y `en.html` -> en, `/fr/*` y
 * `fr.html` -> fr, el resto -> es. Además, accesibilidad de teclado: un solo
 * `<main>`, con `id="contenido"`, y el enlace «Saltar al contenido»
 * (`href="#contenido"`) como primer elemento enfocable del `<body>`. Y ningún
 * script ejecutable en la línea 1 (ver `problemasDeScriptsEnLinea1`) ni de la
 * línea 100 en adelante (ver `problemasDeScriptsFueraDelHtml`).
 *
 * Se invoca desde `ssgOptions.onFinished` en `vite.config.ts` (build normal y
 * build de los E2E) y lo cubre `src/__tests__/html-prerenderizado.test.ts`.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
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
  problemas.push(...problemasDeAccesibilidad(html, rutaRelativa));
  problemas.push(...problemasDeScriptsEnLinea1(html, rutaRelativa));
  problemas.push(...problemasDeScriptsFueraDelHtml(html, rutaRelativa));
  return problemas;
}

/**
 * Ningún `<script>` ejecutable en la línea 1 del HTML (los JSON-LD no se
 * ejecutan y sí pueden estar). Super Admin › Logs da por «Navegador o
 * extensión» un error cuya pila está entera en la línea 1 de una página
 * (admin-casatomas, logs-web/origen.ts, `pilaSoloDeLaPagina`): son los scripts
 * que meten algunos navegadores (Brave en iPhone, CAS-21..28). Esa regla solo
 * es cierta si nuestro propio código nunca está ahí; si algún cambio del
 * prerenderizado lo moviera a la línea 1, el build se para aquí.
 */
export function problemasDeScriptsEnLinea1(html, rutaRelativa) {
  const linea1 = html.split('\n', 1)[0];
  const ejecutables = [...linea1.matchAll(/<script\b([^>]*)>/gi)].filter(([, attrs]) => {
    const tipo = /\btype="([^"]*)"/i.exec(attrs)?.[1]?.toLowerCase();
    return !tipo || tipo === 'module' || tipo === 'text/javascript' || tipo === 'application/javascript';
  });
  return ejecutables.length
    ? [`${rutaRelativa}: ${ejecutables.length} <script> ejecutable(s) en la línea 1 (Logs daría sus errores por scripts del navegador)`]
    : [];
}

/** Primera línea del HTML en la que Logs ya no espera código nuestro. */
export const LINEA_FUERA_DEL_HTML = 100;

/**
 * Ningún `<script>` ejecutable que empiece o siga en la línea 100 o posterior
 * (los JSON-LD no cuentan). Super Admin › Logs da por «Navegador o extensión»
 * un error cuya pila está entera en líneas de la página de la 100 en adelante
 * (admin-casatomas, logs-web/origen.ts, `pilaFueraDelHtml`): el HTML de la web
 * no llega ahí (unas 25 líneas la página más larga el 24/11/2026), así que es
 * un script que metió el navegador (Chrome en iPhone, CAS-33/34). Si una
 * página creciera tanto que un script nuestro cayera en esas líneas, el build
 * se para aquí: hay que quitar saltos de línea del HTML o subir el límite en
 * los dos repos a la vez.
 */
export function problemasDeScriptsFueraDelHtml(html, rutaRelativa) {
  const lineaDe = (indice) => html.slice(0, indice).split('\n').length;
  const fuera = [...html.matchAll(/<script\b([^>]*)>[\s\S]*?<\/script>/gi)].filter((m) => {
    const tipo = /\btype="([^"]*)"/i.exec(m[1])?.[1]?.toLowerCase();
    const ejecutable = !tipo || tipo === 'module' || tipo === 'text/javascript' || tipo === 'application/javascript';
    return ejecutable && lineaDe(m.index + m[0].length) >= LINEA_FUERA_DEL_HTML;
  });
  return fuera.length
    ? [`${rutaRelativa}: ${fuera.length} <script> ejecutable(s) en la línea ${LINEA_FUERA_DEL_HTML} o posterior (Logs daría sus errores por scripts del navegador)`]
    : [];
}

/** Etiquetas que reciben foco con Tab por sí solas (o por `tabindex`). */
const ENFOCABLE = /<(a\s[^>]*\bhref=|button[\s>]|input(?![^>]*type="hidden")[\s>]|select[\s>]|textarea[\s>]|[a-z]+\s[^>]*\btabindex="(?!-)[^"]*")/i;

/**
 * Un único `<main id="contenido">` y el enlace de saltar al contenido como
 * primer foco. Solo se mira el `<body>`, sin `<script>`/`<style>`/`<template>`.
 */
export function problemasDeAccesibilidad(html, rutaRelativa) {
  const problemas = [];
  const cuerpo = (/<body[\s>][\s\S]*$/i.exec(html)?.[0] ?? html)
    .replace(/<(script|style|template)[\s>][\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const mains = cuerpo.match(/<main[\s>][^>]*/gi) ?? [];
  if (mains.length !== 1) {
    problemas.push(`${rutaRelativa}: ${mains.length} elementos <main> (debe haber exactamente 1)`);
  } else if (!/\bid="contenido"/.test(mains[0])) {
    problemas.push(`${rutaRelativa}: el <main> no tiene id="contenido" (destino de «Saltar al contenido»)`);
  }
  const primero = ENFOCABLE.exec(cuerpo);
  if (!primero || !/^<a\s[^>]*\bhref="#contenido"/i.test(cuerpo.slice(primero.index))) {
    problemas.push(`${rutaRelativa}: el primer elemento enfocable no es el enlace «Saltar al contenido» (href="#contenido")`);
  }
  return problemas;
}

/**
 * `.html` de la carpeta `public/` (rutas relativas a ella, que son las mismas
 * con las que Vite los copia tal cual a `dist/`). No los genera el
 * prerenderizado — p. ej. el fichero de verificación de Google Search Console
 * (`googleXXXX.html`, una sola línea sin `<html>`) — así que no se les puede
 * exigir nada. Lista vacía si la carpeta no existe.
 *
 * @param {string} publicDir
 * @returns {Promise<string[]>}
 */
export async function htmlDePublic(publicDir) {
  const existe = await stat(publicDir).then((s) => s.isDirectory(), () => false);
  return existe ? listarHtml(publicDir) : [];
}

/**
 * Recorre `dir` y lanza un Error si alguna página incumple. Devuelve cuántas
 * revisó. `ignorar`: rutas relativas a `dir` que no salen del prerenderizado
 * (las de `htmlDePublic`) y no se comprueban.
 *
 * @param {string} dir
 * @param {{ ignorar?: string[] }} [opciones]
 * @returns {Promise<number>}
 */
export async function verificarHtmlPrerenderizado(dir, { ignorar = [] } = {}) {
  const omitidas = new Set(ignorar);
  const ficheros = (await listarHtml(dir)).filter((rel) => !omitidas.has(rel));
  const problemas = [];
  for (const rel of ficheros) {
    problemas.push(...problemasDeHtml(await readFile(join(dir, rel), 'utf8'), rel));
  }
  if (problemas.length > 0) {
    throw new Error(`HTML prerenderizado incorrecto:\n  - ${problemas.join('\n  - ')}`);
  }
  return ficheros.length;
}
