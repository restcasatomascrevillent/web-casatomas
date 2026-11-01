import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Locale } from "date-fns";
import { languageOptions, type Language } from "@/i18n/types";
import esLanguagePack, { type LanguagePack, type Translations } from "@/i18n/languages/es";
import enLanguagePack from "@/i18n/languages/en";
import frLanguagePack from "@/i18n/languages/fr";
import { idiomaParaHidratar, terminarHidratacion404 } from "@/lib/hidratacion-404";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translations;
  dateLocale: Locale;
  languages: typeof languageOptions;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
/**
 * Los TRES packs se importan de forma síncrona.
 *
 * Antes solo 'es' era síncrono ("es el idioma por defecto, imprescindible
 * para el SSG") y 'en'/'fr' se cargaban en un efecto — que nunca se ejecuta
 * en Node. Mientras solo existía la rama "/" (siempre en español) no se
 * notaba; en cuanto `App.tsx` empezó a montar `LanguageProvider` con
 * `initialLanguage="en"`/`"fr"` para las ramas `/en` y `/fr`, ese efecto
 * seguía sin correr en el prerenderizado y `languagePack` se quedaba en
 * `null` para siempre: el HTML de esas 15 páginas era el placeholder
 * "Cargando..." (1,4 KB, comprobado en `dist/en.html`), no la página real.
 * Los tres diccionarios pesan ~20 KB de código fuente cada uno — nada
 * comparado con el resto del bundle — y de todas formas ya se precargaban
 * los dos que faltaban a los 3,5 s de cualquier visita (más abajo).
 */
const languagePackCache: Record<Language, LanguagePack> = {
  es: esLanguagePack,
  en: enLanguagePack,
  fr: frLanguagePack,
};
let hasPreloadedSecondaryLanguagePacks = false;
const languageLoaders: Record<Language, () => Promise<{ default: LanguagePack }>> = {
  es: () => import("@/i18n/languages/es"),
  en: () => import("@/i18n/languages/en"),
  fr: () => import("@/i18n/languages/fr"),
};

const getInitialLanguage = (): Language => {
  if (typeof window === "undefined") {
    return "es";
  }

  const stored = window.localStorage.getItem("language");
  if (stored === "es" || stored === "en" || stored === "fr") {
    return stored;
  }

  const browserLanguage = window.navigator.language.toLowerCase();
  if (browserLanguage.startsWith("fr")) {
    return "fr";
  }
  if (browserLanguage.startsWith("es")) {
    return "es";
  }

  return "es";
};

interface LanguageProviderProps {
  children: React.ReactNode;
  /**
   * Idioma que manda la URL (rama `/`, `/en` o `/fr` de `App.tsx`). Cuando se
   * pasa, gana siempre sobre `localStorage`/`navigator`: la URL es la fuente
   * de verdad del idioma, tanto en el HTML del SSG (Node, sin `window`) como
   * en la hidratación (mismo valor, cero desajuste). Si se omite (los tests
   * de este componente no la pasan), se conserva la detección de siempre.
   */
  initialLanguage?: Language;
}

export const LanguageProvider = ({ children, initialLanguage }: LanguageProviderProps) => {
  // `idiomaParaHidratar()`: al hidratar el `404.html` servido en `/en/...` o
  // `/fr/...`, el primer render va en el idioma del HTML (español) y el efecto
  // de abajo pasa al de la URL justo después; si no, la hidratación no casa
  // (ver `src/lib/hidratacion-404.ts`). En cualquier otra página es `null`.
  const [language, setLanguage] = useState<Language>(
    () => idiomaParaHidratar() ?? initialLanguage ?? getInitialLanguage(),
  );
  const [languagePack, setLanguagePack] = useState<LanguagePack | null>(() => {
    return languagePackCache[language] ?? null;
  });

  useEffect(() => {
    if (terminarHidratacion404() && initialLanguage) setLanguage(initialLanguage);
    // Solo tras el primer render: después manda `setLanguage` (o `key={lang}`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("language", language);
  }, [language]);

  useEffect(() => {
    let isCancelled = false;
    const cachedPack = languagePackCache[language];
    if (cachedPack) {
      setLanguagePack(cachedPack);
      return;
    }

    const loadLanguagePack = async () => {
      try {
        const module = await languageLoaders[language]();
        if (isCancelled) return;
        languagePackCache[language] = module.default;
        setLanguagePack(module.default);
      } catch (error) {
        console.error("Error loading language pack:", error);
      }
    };

    void loadLanguagePack();

    return () => {
      isCancelled = true;
    };
  }, [language]);

  useEffect(() => {
    if (!languagePack || hasPreloadedSecondaryLanguagePacks) return;

    const preloadRemainingLanguages = () => {
      const targets = (Object.keys(languageLoaders) as Language[]).filter((lang) => lang !== language);
      targets.forEach((lang) => {
        if (languagePackCache[lang]) return;
        void languageLoaders[lang]().then((module) => {
          languagePackCache[lang] = module.default;
        });
      });
      hasPreloadedSecondaryLanguagePacks = true;
    };

    const delayedPreload = () => {
      if (typeof window.requestIdleCallback === "function") {
        const idleId = window.requestIdleCallback(preloadRemainingLanguages);
        return () => window.cancelIdleCallback(idleId);
      }

      const timeoutId = window.setTimeout(preloadRemainingLanguages, 0);
      return () => window.clearTimeout(timeoutId);
    };

    let cancelDeferredPreload: (() => void) | undefined;
    const startId = window.setTimeout(() => {
      cancelDeferredPreload = delayedPreload();
    }, 3500);

    return () => {
      window.clearTimeout(startId);
      cancelDeferredPreload?.();
    };
  }, [language, languagePack]);

  const value = useMemo(() => {
    if (!languagePack) {
      return null;
    }

    return {
      language,
      setLanguage,
      t: languagePack.translations,
      dateLocale: languagePack.dateLocale,
      languages: languageOptions,
    };
  }, [language, languagePack]);

  if (!value) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Cargando...
      </div>
    );
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

/**
 * Como `useTranslations`, pero devuelve `undefined` en vez de lanzar si no hay
 * `LanguageProvider` por encima. Para piezas sueltas (p. ej. `TelLink`) que
 * también se montan sin él en los tests y deben seguir funcionando.
 */
export const useOptionalTranslations = () => useContext(LanguageContext);

export const useTranslations = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslations must be used within a LanguageProvider");
  }
  return context;
};
