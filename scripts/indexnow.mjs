#!/usr/bin/env node
/**
 * Avisa por IndexNow (https://www.indexnow.org) de todas las URLs del sitemap
 * de producción. IndexNow lo usan Bing —de donde sacan sus resultados Copilot
 * y buena parte de las búsquedas de ChatGPT—, Yandex, Seznam y Naver: en vez de
 * esperar a que vuelvan a rastrear, se enteran en minutos de que la web cambió.
 *
 * Lo lanza el workflow «Release · publicar» (`.github/workflows/release.yml`)
 * cuando producción ya sirve la versión nueva. A mano:
 *
 *   node scripts/indexnow.mjs [https://restaurantecasatomascrevillente.es] [--simular]
 *
 * La clave NO es un secreto: IndexNow comprueba que el sitio es tuyo pidiendo
 * `https://<dominio>/<clave>.txt`, que está en `public/`. Si se cambia, hay que
 * renombrar ese fichero a la vez (un test lo comprueba).
 *
 * Nunca falla el workflow por su cuenta: devuelve 1 si IndexNow no acepta el
 * aviso, y el paso del workflow lleva `continue-on-error`.
 */

export const CLAVE_INDEXNOW = '01faf93c104db699a0b7db2022b25066';
export const SITIO_POR_DEFECTO = 'https://restaurantecasatomascrevillente.es';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
/** Límite del protocolo por petición. */
const MAX_URLS = 10000;

/** Las `<loc>` de página del sitemap (no las `<image:loc>`), sin repetir. */
export function urlsDelSitemap(xml) {
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  return [...new Set(urls)];
}

/** Cuerpo JSON que pide IndexNow. Solo URLs del mismo dominio. */
export function cuerpoIndexNow(sitio, urls, clave = CLAVE_INDEXNOW) {
  const base = new URL(sitio);
  return {
    host: base.host,
    key: clave,
    keyLocation: `${base.origin}/${clave}.txt`,
    urlList: urls.filter((u) => new URL(u).host === base.host).slice(0, MAX_URLS),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const simular = args.includes('--simular');
  const sitio = (args.find((a) => /^https?:\/\//.test(a)) ?? SITIO_POR_DEFECTO).replace(/\/+$/, '');

  const clave = await fetch(`${sitio}/${CLAVE_INDEXNOW}.txt`);
  const textoClave = clave.ok ? (await clave.text()).trim() : '';
  if (textoClave !== CLAVE_INDEXNOW) {
    console.error(`[indexnow] ${sitio}/${CLAVE_INDEXNOW}.txt no devuelve la clave (HTTP ${clave.status}). ¿Está publicada esta versión?`);
    return 1;
  }

  const sitemap = await fetch(`${sitio}/sitemap.xml`);
  if (!sitemap.ok) {
    console.error(`[indexnow] No se pudo leer ${sitio}/sitemap.xml (HTTP ${sitemap.status}).`);
    return 1;
  }
  const cuerpo = cuerpoIndexNow(sitio, urlsDelSitemap(await sitemap.text()));
  if (cuerpo.urlList.length === 0) {
    console.error('[indexnow] El sitemap no tiene URLs de este dominio.');
    return 1;
  }
  if (simular) {
    console.log(`[indexnow] (simulación) se avisaría de ${cuerpo.urlList.length} URLs de ${cuerpo.host}.`);
    return 0;
  }

  const respuesta = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(cuerpo),
  });
  // 200 = recibido y validado; 202 = recibido, la clave se validará después.
  if (respuesta.status === 200 || respuesta.status === 202) {
    console.log(`[indexnow] Aviso enviado: ${cuerpo.urlList.length} URLs de ${cuerpo.host} (HTTP ${respuesta.status}).`);
    return 0;
  }
  console.error(`[indexnow] IndexNow respondió HTTP ${respuesta.status}: ${(await respuesta.text()).slice(0, 300)}`);
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(
    (codigo) => process.exit(codigo),
    (error) => {
      console.error(`[indexnow] ${error?.message ?? error}`);
      process.exit(1);
    },
  );
}
