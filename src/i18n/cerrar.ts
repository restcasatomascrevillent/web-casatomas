import { useOptionalTranslations } from "./LanguageProvider";
import type { Language } from "./types";

/** Texto accesible de la «X» que cierra diálogos y paneles. */
export const TEXTO_CERRAR: Record<Language, string> = {
  es: "Cerrar",
  en: "Close",
  fr: "Fermer",
};

/**
 * «Cerrar» en el idioma de la página. Los componentes de `ui/` también se
 * pintan fuera del `LanguageProvider` (pruebas, panel), así que no se exige:
 * sin proveedor se usa el castellano, el idioma por defecto de la web.
 */
export const useTextoCerrar = (): string => {
  const contexto = useOptionalTranslations();
  return TEXTO_CERRAR[contexto?.language ?? "es"];
};
