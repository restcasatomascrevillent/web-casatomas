import { Suspense, lazy, useMemo, type ReactNode } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CartaSection from "@/components/CartaSection";
import Footer from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { useTranslations } from "@/i18n/LanguageProvider";
import { agruparPorCategoria, cartaSSG, CATEGORIAS_PLATOS, platosParaJsonLd } from "@/lib/carta-ssg";
import { menuSchema, restaurantSchema, SITE_URL } from "@/lib/negocio";
import { alternatesDePagina, construirRutaIdioma } from "@/i18n/routing";
import { idleImport } from "@/lib/lazyIdle";
import type { Language } from "@/i18n/types";
import { ID_CONTENIDO } from "@/components/SaltarAlContenido";

const SEO_HOME: Record<Language, { title: string; description: string }> = {
  es: {
    title: "Casa Tomás | Restaurante y marisquería en Crevillente",
    description:
      "Cocina gallega y marisco en Crevillente, Alicante, desde 1998. Mariscos, arroces melosos, carnes y vinos, con terraza. Mira la carta y reserva mesa.",
  },
  en: {
    title: "Casa Tomás | Restaurant & Seafood in Crevillente",
    description:
      "Galician cuisine and seafood in Crevillente, Alicante, since 1998. Shellfish, creamy rice dishes, meat and wines, with a terrace. See the menu and book.",
  },
  fr: {
    title: "Casa Tomás | Restaurant et fruits de mer à Crevillente",
    description:
      "Cuisine galicienne et fruits de mer à Crevillente, Alicante, depuis 1998. Fruits de mer, riz crémeux, viandes et vins, avec terrasse. Carte et réservation.",
  },
};

// `idleImport`: mismo `lazy()` de siempre, pero en el navegador el `import()`
// de cada sección espera a que el hilo principal esté libre en vez de
// competir con la cabecera y el hero por la conexión/CPU nada más entrar
// (ver el comentario de `idleImport`). El contenido de estas secciones ya
// está en el HTML del SSG; lo único que se retrasa es cuándo se vuelven
// interactivas.
const NovedadesSection = lazy(idleImport(() => import("@/components/NovedadesSection")));
const EspaciosSection = lazy(idleImport(() => import("@/components/EspaciosSection")));
const NosotrosSection = lazy(idleImport(() => import("@/components/NosotrosSection")));
const ContactoSection = lazy(idleImport(() => import("@/components/ContactoSection")));

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
    const secciones = agruparPorCategoria(platosParaJsonLd(cartaSSG.platos), language, CATEGORIAS_PLATOS);
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
        <main id={ID_CONTENIDO} tabIndex={-1} className="outline-none">
        <Hero />
        <SectionErrorBoundary id="carta"><CartaSection /></SectionErrorBoundary>
        <SectionBoundary id="novedades"><NovedadesSection /></SectionBoundary>
        <SectionBoundary id="espacios"><EspaciosSection /></SectionBoundary>
        <SectionBoundary id="nosotros"><NosotrosSection /></SectionBoundary>
        <SectionBoundary id="contacto"><ContactoSection /></SectionBoundary>
        </main>
        <SectionErrorBoundary id="footer"><Footer /></SectionErrorBoundary>
      </div>
    </>
  );
};

export default Index;

