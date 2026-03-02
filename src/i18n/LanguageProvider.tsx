import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Locale } from "date-fns";
import { languageOptions, type Language } from "@/i18n/types";
import type { LanguagePack, Translations } from "@/i18n/languages/es";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translations;
  dateLocale: Locale;
  languages: typeof languageOptions;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
const languagePackCache: Partial<Record<Language, LanguagePack>> = {};
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

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [languagePack, setLanguagePack] = useState<LanguagePack | null>(() => {
    return languagePackCache[language] ?? null;
  });

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
      if ("requestIdleCallback" in window) {
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

export const useTranslations = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslations must be used within a LanguageProvider");
  }
  return context;
};
