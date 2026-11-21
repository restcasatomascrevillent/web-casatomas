/**
 * ¿La ha traducido el navegador? Para no confundir sus errores con fallos de la web (CAS-18/19/20).
 *
 * El 19/11/2026 un visitante con Chrome en Android volvió a la portada en una
 * pestaña que Chrome había descargado de memoria (carga «atrás/adelante»), con
 * la traducción automática activada. React hidrata primero la cabecera, el hero
 * y la carta; las secciones de abajo (novedades, espacios, nosotros, contacto)
 * llegan después, cuando el navegador está ocioso (`idleImport`). En ese hueco
 * el traductor ya había cambiado cada texto por
 * `<font><font>texto traducido</font></font>`, así que el HTML ya no era el que
 * React esperaba: «Text content does not match server-rendered HTML» (#425),
 * «Hydration failed» (#418) y «Switched to client rendering» (#422), una tanda
 * por sección.
 *
 * No es un fallo de la web y no tiene arreglo en React (facebook/react#11538):
 * React lo recupera solo volviendo a pintar esa sección en el navegador, y el
 * traductor la vuelve a traducir. Lo que fallaba era el informe: esos errores
 * llegaban a Super Admin › Logs como «Fallo de la web» y abrían tickets.
 * Ahora salen con `accion: "pagina_traducida"` y el panel los clasifica como
 * «Navegador o extensión» (sin ticket). Un error de hidratación SIN traductor
 * sigue llegando como fallo de la web.
 *
 * Reproducido el 20/11/2026 en producción (Playwright, Pixel 7): cambiando los
 * textos como el traductor después de hidratar la raíz y antes de que lleguen
 * las secciones, salen exactamente #425 → #418 → #422 por sección; sin
 * traductor, la misma carga «atrás/adelante» no da ningún error.
 */

/** Errores de React al hidratar (producción minificada y desarrollo). */
const PATRON_HIDRATACION =
  /Minified React error #(418|421|422|423|425)[;\s]|Hydration failed because|There was an error while hydrating|Text content does not match server-rendered HTML|did not match\. Server:/i;

export function esErrorDeHidratacion(mensaje: string | null | undefined): boolean {
  return PATRON_HIDRATACION.test(mensaje ?? "");
}

export type Traductor = "google" | "microsoft";

/**
 * Rastro que dejan los traductores en el documento, o `null` si no hay:
 *   · Chrome / Google Translate: clase `translated-ltr`/`translated-rtl` en
 *     `<html>` y cada texto envuelto en `<font>`. La web nunca pinta `<font>`
 *     (ni HTML en crudo: ver `TextoRico`), así que uno dentro de la app es suyo.
 *   · Edge (Microsoft Translator): atributos `_msttexthash` / `_msthash`.
 */
export function traductorDeLaPagina(doc: Document | undefined = typeof document === "undefined" ? undefined : document): Traductor | null {
  if (!doc?.documentElement) return null;
  try {
    const clases = doc.documentElement.classList;
    if (clases.contains("translated-ltr") || clases.contains("translated-rtl")) return "google";
    if (doc.querySelector("[_msttexthash], [_msthash]")) return "microsoft";
    if (doc.querySelector("#root font")) return "google";
  } catch {
    // Un selector no admitido en un navegador raro: sin rastro.
  }
  return null;
}

/** ¿Es un error de hidratación provocado por el traductor del navegador? */
export function esHidratacionDePaginaTraducida(mensaje: string | null | undefined, doc?: Document): boolean {
  return esErrorDeHidratacion(mensaje) && traductorDeLaPagina(doc) !== null;
}
