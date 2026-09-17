import { Suspense, lazy, type ReactNode } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import { Seo } from "@/components/Seo";
import cartaCompleta from "@/data/carta_completa.json";

// URL real de Google Maps del local (reutilizada de ReviewsSection.tsx)
const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/place/Casa+Tom%C3%A1s+Restaurante/@38.2489234,-0.8107264,17z/data=!4m8!3m7!1s0xd6382b8f8f8f8f8f:0x1234567890abcdef!8m2!3d38.2489234!4d-0.8085377!9m1!1b1!16s%2Fg%2F11c0qw0qw0?entry=ttu";

type CartaItem = { name?: string; price_eur?: number | null };
type CartaCategory = { category?: string; items?: CartaItem[] };

// Menú schema.org generado a partir de carta_completa.json
const hasMenu = {
  "@type": "Menu",
  "name": "Carta Casa Tomás",
  "inLanguage": "es",
  "hasMenuSection": (cartaCompleta.menu as CartaCategory[])
    .filter((section) => section.category && Array.isArray(section.items))
    .map((section) => ({
      "@type": "MenuSection",
      "name": section.category,
      "hasMenuItem": (section.items ?? [])
        .filter((item) => item.name)
        .map((item) => ({
          "@type": "MenuItem",
          "name": item.name,
          ...(typeof item.price_eur === "number"
            ? {
                "offers": {
                  "@type": "Offer",
                  "price": item.price_eur,
                  "priceCurrency": "EUR",
                },
              }
            : {}),
        })),
    })),
};

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
  return (
    <>
      <Seo
        schema={{
          "@context": "https://schema.org",
          "@type": "Restaurant",
          "name": "Casa Tomás Restaurante",
          "image": "https://restaurantecasatomascrevillente.es/og-image.jpg",
          "telephone": "+34966107887",
          "email": "casatomascrevillent@gmail.com",
          "url": "https://restaurantecasatomascrevillente.es/",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Carrer Santa Maria de la Cabeza, 2",
            "addressLocality": "Crevillent",
            "addressRegion": "Alicante",
            "postalCode": "03330",
            "addressCountry": "ES"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": 38.2494,
            "longitude": -0.8138
          },
          "openingHoursSpecification": [
            {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
              "opens": "13:00",
              "closes": "16:00"
            },
            {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Saturday","Sunday"],
              "opens": "13:00",
              "closes": "16:30"
            }
          ],
          "servesCuisine": ["Cocina tradicional española", "Gastronomía alicantina"],
          "priceRange": "€€",
          "currenciesAccepted": "EUR",
          "paymentAccepted": "Cash, Credit Card",
          "hasMap": GOOGLE_MAPS_URL,
          "hasMenu": hasMenu
        }}
      />
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
