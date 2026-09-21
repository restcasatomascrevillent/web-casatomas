/**
 * Idioma <-> URL, en un solo sitio.
 *
 * Estructura elegida (subcarpeta): español en la raíz (`/carta`), inglés en
 * `/en/...`, francés en `/fr/...`. El slug de cada página (p. ej.
 * `entrantes-frios`) NO se traduce — es un identificador estable derivado de
 * la categoría en castellano (`carta-rutas.ts`), igual en los tres idiomas.
 * Lo único que cambia es el prefijo.
 *
 * Todo aquí son funciones puras (nada de `window`/`location`): el mismo
 * cálculo sirve para el prerenderizado (Node) y para el navegador.
 */
import type { Language } from "./types";

export const LANGUAGES: readonly Language[] = ["es", "en", "fr"];

/** Prefijo de carpeta por idioma. Español no lleva ninguno: vive en la raíz. */
export const LANGUAGE_PREFIXES: Record<Language, string> = {
  es: "",
  en: "/en",
  fr: "/fr",
};

export const prefijoIdioma = (lang: Language): string => LANGUAGE_PREFIXES[lang];

/**
 * Idioma de una URL a partir de su pathname. Compara el primer segmento
 * completo (`/en`, `/en/...`) para que `/entrantes-frios` (si existiera) no
 * se confunda con `/en...`.
 */
export function idiomaDeRuta(pathname: string): Language {
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  if (pathname === "/fr" || pathname.startsWith("/fr/")) return "fr";
  return "es";
}

/** Quita el prefijo de idioma si lo hay. Devuelve la ruta "en español". */
export function quitarPrefijoIdioma(pathname: string): string {
  const lang = idiomaDeRuta(pathname);
  if (lang === "es") return pathname || "/";
  const resto = pathname.slice(prefijoIdioma(lang).length);
  return resto === "" ? "/" : resto;
}

/**
 * Construye la URL de `pathRelativoEs` (ruta SIN prefijo, tal y como se
 * escribe en español: "/", "/carta", "/carta/vinos"…) en el idioma pedido.
 */
export function construirRutaIdioma(pathRelativoEs: string, lang: Language): string {
  const limpio = pathRelativoEs === "/" ? "" : pathRelativoEs;
  return `${prefijoIdioma(lang)}${limpio}` || "/";
}

/**
 * La "página equivalente" en otro idioma a partir de la URL actual: quita el
 * prefijo que tenga (si tiene) y pone el nuevo. Es lo que usa el selector de
 * idioma del header para no mandar siempre a la portada.
 */
export function rutaEquivalente(pathnameActual: string, lang: Language): string {
  return construirRutaIdioma(quitarPrefijoIdioma(pathnameActual), lang);
}

export interface AlternateIdioma {
  hrefLang: string;
  href: string;
}

/**
 * Las etiquetas `hreflang` de una página: las tres versiones (autorreferencia
 * incluida, como pide Google) más `x-default` apuntando al español.
 */
export function alternatesDePagina(pathRelativoEs: string, siteUrl: string): AlternateIdioma[] {
  const base = siteUrl.replace(/\/+$/, "");
  const entradas = LANGUAGES.map((lang) => ({
    hrefLang: lang,
    href: `${base}${construirRutaIdioma(pathRelativoEs, lang)}`,
  }));
  return [...entradas, { hrefLang: "x-default", href: `${base}${construirRutaIdioma(pathRelativoEs, "es")}` }];
}
