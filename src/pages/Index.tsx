import { Suspense, lazy, useMemo, type ReactNode } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import { useTranslations } from "@/i18n/LanguageProvider";
import { agruparPorCategoria, cartaSSG, CATEGORIAS_PLATOS } from "@/lib/carta-ssg";
import { menuSchema, restaurantSchema, SITE_URL } from "@/lib/negocio";

const CartaSection = lazy(() => import("@/components/CartaSection"));
const NovedadesSection = lazy(() => import("@/components/NovedadesSection"));
const ReservasSection = lazy(() => import("@/components/ReservasSection"));
const EspaciosSection = lazy(() => import("@/components/EspaciosSection"));
const ReviewsSection = lazy(() => import("@/components/ReviewsSection"));
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
  <Suspense fallback={<SectionPlaceholder id={id} />}>{children}</Suspense>
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
      menu: secciones.length
        ? menuSchema(secciones, language, import.meta.env.VITE_SUPABASE_URL as string | undefined)
        : undefined,
    });
  }, [language]);

  return (
    <>
      <Seo canonical={`${SITE_URL}/`} />
      <JsonLd data={schema} />
      <Header />
      <div className="min-h-screen bg-background">
        <Hero />
        <SectionBoundary id="carta"><CartaSection /></SectionBoundary>
        <SectionBoundary id="novedades"><NovedadesSection /></SectionBoundary>
        <SectionBoundary id="espacios"><EspaciosSection /></SectionBoundary>
        <SectionBoundary id="reservas"><ReservasSection /></SectionBoundary>
        <SectionBoundary id="reviews"><ReviewsSection /></SectionBoundary>
        <SectionBoundary id="nosotros"><NosotrosSection /></SectionBoundary>
        <SectionBoundary id="contacto"><ContactoSection /></SectionBoundary>
        <SectionBoundary id="footer"><Footer /></SectionBoundary>
      </div>
    </>
  );
};

export default Index;
