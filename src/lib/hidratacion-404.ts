import { useContext, useState } from "react";
import { UNSAFE_DataRouterStateContext, useLocation } from "react-router-dom";
import type { Language } from "@/i18n/types";

/**
 * Hidratación del `404.html` cuando se sirve en OTRA dirección.
 *
 * El SSG prerenderiza UN solo `404.html`, con la ruta "404" de la rama en
 * español (`src/App.tsx`). Vercel sirve ese mismo fichero a cualquier URL que
 * no exista (`/lo-que-sea`, `/en/lo-que-sea`, `/fr/...`). Al hidratar, el
 * router del cliente casa la URL real con la ruta `*` de su rama, y todo lo
 * que dependa de la dirección tiene que pintar en el PRIMER render lo mismo
 * que el HTML; si no, React avisa de que la hidratación no coincide
 * (errores #418/#423 en consola), tira el HTML y vuelve a pintar la página
 * entera. Dos cosas lo rompían:
 *
 *  · el idioma: `/en/lo-que-sea` monta la rama inglesa, pero el HTML servido
 *    está en español → ver `idiomaParaHidratar` (lo usa `LanguageProvider`);
 *  · la barra «Reservar» del móvil, que se ocultaba solo si la dirección era
 *    literalmente `/404` → ver `useEsPaginaNoEncontrada`;
 *  · `/carta/<categoría que no existe>`, que en el cliente casa con
 *    `carta/:categoria` y pintaba su propio aviso → ver `useMontadoSobreEl404`.
 */

/** Atributo que pone `NotFound` en su raíz: si está en el HTML recién cargado, es el `404.html`. */
export const MARCA_PAGINA_NO_ENCONTRADA = "data-pagina-no-encontrada";

const IDIOMAS: readonly Language[] = ["es", "en", "fr"];

/**
 * Idioma en que está escrito el `404.html` que se va a hidratar, o `null` si
 * esta carga no es la del `404.html`. Se lee UNA vez, al evaluar el módulo:
 * los scripts del bundle son módulos (diferidos), así que el HTML del SSG ya
 * está en el DOM y React aún no lo ha tocado.
 */
const leerIdiomaDel404 = (): Language | null => {
  if (typeof document === "undefined") return null;
  if (!document.querySelector(`[${MARCA_PAGINA_NO_ENCONTRADA}]`)) return null;
  const lang = document.documentElement.lang as Language;
  return IDIOMAS.includes(lang) ? lang : null;
};

let idiomaDel404: Language | null = leerIdiomaDel404();
/** Dirección en la que se cargó el `404.html` (o `null`); se queda fija toda la visita. */
let direccionDel404: string | null = idiomaDel404 ? window.location.pathname : null;

/**
 * Idioma con el que tiene que hacer su primer render un `LanguageProvider`
 * para que coincida con el HTML: el del `404.html` mientras se hidrata, y
 * `null` (manda el de la URL) en cualquier otro caso y después de hidratar.
 */
export const idiomaParaHidratar = (): Language | null => idiomaDel404;

/**
 * Da la hidratación por terminada (la llama `LanguageProvider` tras su primer
 * render). Devuelve `true` si hasta ahora se estaba usando el idioma del
 * `404.html`: entonces hay que pasar ya al idioma de la URL. Las montadas
 * posteriores (navegar a otra rama) no vuelven a pasar por aquí.
 */
export const terminarHidratacion404 = (): boolean => {
  const estaba = idiomaDel404 !== null;
  idiomaDel404 = null;
  return estaba;
};

/**
 * ¿Este componente se montó hidratando el `404.html`? Se fija en el primer
 * render y ya no cambia: una página que en el navegador casa con una ruta
 * propia pero que en el servidor no existe (`/carta/no-existe` casa con
 * `carta/:categoria`) tiene que seguir pintando `NotFound`, que es lo que
 * llegó en el HTML. Si se llega a ella navegando dentro de la web, `false`.
 *
 * No usa `idiomaParaHidratar`: el contenido de la ruta va dentro de un
 * `Suspense` (`Layout` en `App.tsx`), y React lo hidrata DESPUÉS de que el
 * `LanguageProvider` haya dado la hidratación por terminada. Por eso compara
 * con la dirección en la que se cargó el `404.html`, que no se borra.
 */
export const useMontadoSobreEl404 = (): boolean => {
  const { pathname } = useLocation();
  return useState(() => direccionDel404 !== null && pathname === direccionDel404)[0];
};

/** Solo para tests: vuelve a leer el DOM como si la página acabase de cargar. */
export const reiniciarHidratacion404ParaTests = () => {
  idiomaDel404 = leerIdiomaDel404();
  direccionDel404 = idiomaDel404 ? window.location.pathname : null;
};

/** `handle` de las rutas que pintan `NotFound` ("404" y `*` de cada rama). */
export const HANDLE_PAGINA_NO_ENCONTRADA = { paginaNoEncontrada: true } as const;

/**
 * ¿La ruta que se está pintando es la página no encontrada? Mira las rutas
 * casadas por el router (su `handle`), no la dirección, así que da lo mismo en
 * el SSG (`/404`) que en el navegador (`/lo-que-sea`, `/en/...`).
 *
 * Usa el contexto de estado del router de datos (`RouterProvider` en el
 * navegador, `StaticRouterProvider` en el SSG) en vez de `useMatches`, que
 * lanza un error fuera de un router de datos: los tests montan los componentes
 * con `MemoryRouter`, y ahí esto devuelve simplemente `false`.
 */
export const useEsPaginaNoEncontrada = (): boolean => {
  const estado = useContext(UNSAFE_DataRouterStateContext);
  return (
    estado?.matches.some(
      (m) => (m.route.handle as { paginaNoEncontrada?: boolean } | undefined)?.paginaNoEncontrada === true,
    ) ?? false
  );
};
