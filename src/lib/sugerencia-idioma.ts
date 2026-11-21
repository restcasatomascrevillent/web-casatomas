import type { Language } from "@/i18n/types";
import { existeEnTodosLosIdiomas, idiomaDeRuta, quitarPrefijoIdioma } from "@/i18n/routing";

/**
 * «Esta página también está en inglés / en francés».
 *
 * Quien entra en una página en español con el navegador en inglés o en
 * francés solía tirar del traductor del navegador: lee una traducción
 * automática peor que la nuestra («zamburiñas», «pulpo a feira») y, si el
 * traductor cambia el texto antes de que la web arranque, React tiene que
 * volver a pintar la página (un parpadeo; CAS-6/18/19/20). Ahora se le
 * ofrece la versión que escribimos nosotros, con un aviso que puede aceptar
 * o cerrar. NUNCA se le cambia de idioma solo: Google desaconseja redirigir
 * por el idioma del navegador, y en la zona hay muchos residentes con el
 * móvil en inglés que leen español sin problema.
 *
 *  · Solo en páginas en español que existen también en inglés y en francés
 *    (no en las de los correos ni en el 404).
 *  · El idioma sale del traductor si está traduciendo a inglés o francés
 *    (Chrome lo marca en `<html>`) y, si no, del primero de los idiomas
 *    preferidos del navegador que la web tiene: `['de', 'en']` → inglés,
 *    `['es', 'en']` → nada.
 *  · Si lo cierra, o si vuelve al español desde la versión en inglés o en
 *    francés, no se vuelve a ofrecer.
 */

export type IdiomaSugerido = Exclude<Language, "es">;

/** `localStorage`: «cerrada» (cerró el aviso) o «es» (eligió español). */
export const CLAVE_SUGERENCIA_IDIOMA = "ct_sugerencia_idioma";

export const TEXTOS_SUGERENCIA: Record<IdiomaSugerido, { region: string; mensaje: string; ver: string; cerrar: string }> = {
  en: { region: "Language", mensaje: "This page is also available in English.", ver: "View in English", cerrar: "Close" },
  fr: { region: "Langue", mensaje: "Cette page existe aussi en français.", ver: "Voir en français", cerrar: "Fermer" },
};

const IDIOMAS_WEB: readonly Language[] = ["es", "en", "fr"];

/** Primer idioma de la lista (`en-GB`, `fr`…) que la web tiene, o `null`. */
export function idiomaPreferido(idiomas: readonly (string | null | undefined)[]): Language | null {
  for (const idioma of idiomas) {
    const base = (idioma ?? "").toLowerCase().split(/[-_]/)[0] as Language;
    if (IDIOMAS_WEB.includes(base)) return base;
  }
  return null;
}

export interface DatosSugerencia {
  /** `location.pathname`. */
  ruta: string;
  /** `navigator.languages` (o `[navigator.language]`). */
  idiomasNavegador: readonly string[];
  /** Idioma al que está traduciendo el traductor del navegador, si se sabe. */
  idiomaTraductor: string | null;
  /** Lo guardado en `CLAVE_SUGERENCIA_IDIOMA`. */
  guardado: string | null;
}

/** Qué versión ofrecer (o `null`: ninguna). */
export function idiomaASugerir({ ruta, idiomasNavegador, idiomaTraductor, guardado }: DatosSugerencia): IdiomaSugerido | null {
  if (idiomaDeRuta(ruta) !== "es") return null;
  if (!existeEnTodosLosIdiomas(quitarPrefijoIdioma(ruta))) return null;
  if (guardado === "cerrada" || guardado === "es") return null;
  const idioma = idiomaPreferido(idiomaTraductor ? [idiomaTraductor] : []) ?? idiomaPreferido(idiomasNavegador);
  return idioma === "en" || idioma === "fr" ? idioma : null;
}

/**
 * Idioma al que está traduciendo el traductor de Chrome: marca `<html>` con
 * `translated-ltr`/`translated-rtl` y cambia su `lang`. Sin esa marca (otros
 * traductores no dejan rastro fiable) o con `lang` en español, `null`.
 */
export function idiomaDelTraductor(html: Pick<HTMLElement, "className" | "lang">): string | null {
  if (!/\btranslated-(ltr|rtl)\b/.test(String(html.className))) return null;
  const lang = (html.lang || "").toLowerCase();
  return lang && !lang.startsWith("es") ? lang : null;
}

type Almacen = Pick<Storage, "getItem" | "setItem">;

export function leerSugerencia(almacen: Almacen | null): string | null {
  try {
    return almacen?.getItem(CLAVE_SUGERENCIA_IDIOMA) ?? null;
  } catch {
    return null;
  }
}

export function guardarSugerencia(almacen: Almacen | null, valor: "cerrada" | "es"): void {
  try {
    almacen?.setItem(CLAVE_SUGERENCIA_IDIOMA, valor);
  } catch {
    // Sin almacenamiento (modo privado estricto): el aviso se cierra igual, solo que puede volver otro día.
  }
}

/**
 * Idioma de la última rama visitada en esta pestaña. Vive en el módulo (no en
 * el componente) porque cada rama (`/`, `/en`, `/fr`) monta su propio Layout:
 * así se sabe que se pasó de `/en/...` a `/...`, que es elegir el español.
 */
let ramaAnterior: Language | null = null;

/** Apunta la rama actual; `true` si se viene de la inglesa o la francesa a la española. */
export function volvioAlEspanol(ruta: string): boolean {
  const actual = idiomaDeRuta(ruta);
  const volvio = actual === "es" && (ramaAnterior === "en" || ramaAnterior === "fr");
  ramaAnterior = actual;
  return volvio;
}

/** Solo para tests. */
export function _reiniciarSugerenciaIdioma(): void {
  ramaAnterior = null;
}
