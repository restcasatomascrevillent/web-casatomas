import { Suspense, lazy, useMemo, type ReactNode } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { useTranslations } from "@/i18n/LanguageProvider";
import { agruparPorCategoria, cartaSSG, CATEGORIAS_PLATOS } from "@/lib/carta-ssg";
import { menuSchema, restaurantSchema, SITE_URL } from "@/lib/negocio";
import { alternatesDePagina, construirRutaIdioma } from "@/i18n/routing";
import type { Language } from "@/i18n/types";

const SEO_HOME: Record<Language, { title: string; description: string }> = {
  es: {
    title: "Casa Tomás Restaurante - Tradición y Calidad en Crevillent",
    description:
      "Casa Tomás Restaurante en Crevillent, Alicante. Más de 30 años de tradición culinaria. Cocina de calidad con productos frescos y ambiente familiar. Reserva tu mesa.",
  },
  en: {
    title: "Casa Tomás Restaurant – Traditional Spanish Cuisine in Crevillent",
    description:
      "Casa Tomás Restaurant in Crevillent, Alicante (Spain). Over 30 years of traditional cooking with fresh, local ingredients and a family atmosphere. Book your table today.",
  },
  fr: {
    title: "Restaurant Casa Tomás – Cuisine traditionnelle à Crevillent",
    description:
      "Restaurant Casa Tomás à Crevillent (Alicante, Espagne). Plus de 30 ans de tradition culinaire, des produits frais et une ambiance familiale. Réservez votre table.",
  },
};

const CartaSection = lazy(() => import("@/components/CartaSection"));
const NovedadesSection = lazy(() => import("@/components/NovedadesSection"));
const EspaciosSection = lazy(() => import("@/components/EspaciosSection"));
const NosotrosSection = lazy(() => import("@/components/NosotrosSection"));
const ContactoSection = lazy(() => import("@/components/ContactoSection"));
const Footer = lazy(() => import("@/components/Footer"));

const SectionPlaceholder = ({ id }: { id: string }) => (
  <section id={id} className="py-16 px-4 md:px-8 lg:px-16 bg-background">
    <div className="max-w-7xl mx-auto space-y-3">
      <div className="h-8 w-44 rounded-full bg-muted/50 animate-pulse" />
      <div className="h-4 w-full max-w-2xl rounded bg-muted/40 animate-pulse" />
      <div className="h-4 w-full max-w-xl rounded bg-muted/40 animate-pulse" />
    </div>
  </section>
);

const SectionBoundary = ({ id, children }: { id: string; children: ReactNode }) => (
  <SectionErrorBoundary id={id}>
    <Suspense fallback={<SectionPlaceholder id={id} />}>{children}</Suspense>
  </SectionErrorBoundary>
);

const Index = () => {
  const { language } = useTranslations();

  // El `Menu` sale ahora de los datos reales que el build descargó de Supabase
  // (`virtual:carta-ssg`), no del scrape congelado de casatomas.buenacarta.com
  // de noviembre de 2025 que se estaba publicando a Google con 129 precios.
  const schema = useMemo(() => {
    const secciones = agruparPorCategoria(cartaSSG.platos, language, CATEGORIAS_PLATOS);
    return restaurantSchema({
      lang: language,
      // `url` es obligatorio aquí: sin ella, Google no tiene un enlace real
      // para el "Ver carta" de la ficha y cae al `@id` (`SITE_URL/#carta`),
      // que NO es una URL para navegar sino solo un identificador interno
      // del nodo. Si Google la usa igualmente, un visitante que llega por
      // primera vez desde la búsqueda/Maps aterriza directo en `/#carta`:
      // el ancla salta el Hero antes de que nadie lo vea (Header.tsx hace
      // scroll a cualquier hash de la URL nada más cargar). Se enlaza a
      // `/carta`, la página dedicada de la carta, no a este ancla.
      menu: secciones.length
        ? menuSchema(secciones, language, import.meta.env.VITE_SUPABASE_URL as string | undefined, {
            url: `${SITE_URL}${construirRutaIdioma("/carta", language)}`,
          })
        : undefined,
    });
  }, [language]);

  return (
    <>
      <Seo
        title={SEO_HOME[language].title}
        description={SEO_HOME[language].description}
        canonical={`${SITE_URL}${construirRutaIdioma("/", language)}`}
        lang={language}
        languageAlternates={alternatesDePagina("/", SITE_URL)}
      />
      <JsonLd data={schema} />
      <Header />
      <div className="min-h-screen bg-background">
        <Hero />
        <SectionBoundary id="carta"><CartaSection /></SectionBoundary>
        <SectionBoundary id="novedades"><NovedadesSection /></SectionBoundary>
        <SectionBoundary id="espacios"><EspaciosSection /></SectionBoundary>
        <SectionBoundary id="nosotros"><NosotrosSection /></SectionBoundary>
        <SectionBoundary id="contacto"><ContactoSection /></SectionBoundary>
        <SectionBoundary id="footer"><Footer /></SectionBoundary>
      </div>
    </>
  );
};

export default Index;
