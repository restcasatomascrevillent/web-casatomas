import type { Language } from "@/i18n/types";

/**
 * Textos del aviso «hay una versión nueva» y de las páginas que no cargan.
 * Van aquí y no en los diccionarios de `src/i18n/languages`: tienen que poder
 * pintarse aunque la pestaña tenga una versión antigua y React no haya llegado
 * a montarse (el aviso flotante es DOM puro), igual que los de
 * `SectionErrorBoundary`. El idioma sale de la URL (`idiomaDeRuta`).
 */
export const TEXTOS_VERSION_NUEVA: Record<
  Language,
  { aviso: string; boton: string; comprobando: string; actualizando: string; falloPagina: string; recargar: string }
> = {
  es: {
    aviso: "Hay una versión nueva de la web",
    boton: "Toca para actualizar",
    comprobando: "Cargando…",
    actualizando: "Cargando la versión nueva…",
    falloPagina: "No se pudo cargar esta página.",
    recargar: "Recargar página",
  },
  en: {
    aviso: "There's a new version of the website",
    boton: "Tap to update",
    comprobando: "Loading…",
    actualizando: "Loading the new version…",
    falloPagina: "This page couldn't load.",
    recargar: "Reload page",
  },
  fr: {
    aviso: "Une nouvelle version du site est disponible",
    boton: "Touchez pour mettre à jour",
    comprobando: "Chargement…",
    actualizando: "Chargement de la nouvelle version…",
    falloPagina: "Cette page n'a pas pu être chargée.",
    recargar: "Recharger la page",
  },
};
