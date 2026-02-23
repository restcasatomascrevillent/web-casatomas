import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CartaSection from "@/components/CartaSection";

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

const DeferredSection = ({ id, children }: { id: string; children: ReactNode }) => {
  const [isMounted, setIsMounted] = useState(false);
  const placeholderRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isMounted) return;
    const node = placeholderRef.current;
    if (!node) return;

    if (!("IntersectionObserver" in window)) {
      setIsMounted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "500px 0px" }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [isMounted]);

  if (!isMounted) {
    return (
      <section id={id} ref={placeholderRef} className="py-16 px-4 md:px-8 lg:px-16 bg-background">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="h-8 w-44 rounded-full bg-muted/50 animate-pulse" />
          <div className="h-4 w-full max-w-2xl rounded bg-muted/40 animate-pulse" />
          <div className="h-4 w-full max-w-xl rounded bg-muted/40 animate-pulse" />
        </div>
      </section>
    );
  }

  return <>{children}</>;
};

const LazySection = ({ id, children }: { id: string; children: ReactNode }) => (
  <DeferredSection id={id}>
    <Suspense fallback={<SectionPlaceholder id={id} />}>{children}</Suspense>
  </DeferredSection>
);

const Index = () => {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        <Hero />
        <CartaSection />
        <LazySection id="novedades">
          <NovedadesSection />
        </LazySection>
        <LazySection id="espacios">
          <EspaciosSection />
        </LazySection>
        <LazySection id="reservas">
          <ReservasSection />
        </LazySection>
        <LazySection id="reviews">
          <ReviewsSection />
        </LazySection>
        <LazySection id="nosotros">
          <NosotrosSection />
        </LazySection>
        <LazySection id="contacto">
          <ContactoSection />
        </LazySection>
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </div>
    </>
  );
};

export default Index;
