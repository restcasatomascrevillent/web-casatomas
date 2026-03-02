import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";

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

const DeferredSection = ({
  id,
  enabled,
  children,
}: {
  id: string;
  enabled: boolean;
  children: ReactNode;
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const placeholderRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isMounted || !enabled) return;
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
      { rootMargin: "180px 0px" }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [isMounted, enabled]);

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

const LazySection = ({
  id,
  enabled,
  children,
}: {
  id: string;
  enabled: boolean;
  children: ReactNode;
}) => (
  <DeferredSection id={id} enabled={enabled}>
    <Suspense fallback={<SectionPlaceholder id={id} />}>{children}</Suspense>
  </DeferredSection>
);

const Index = () => {
  const [canLoadDeferredSections, setCanLoadDeferredSections] = useState(false);

  useEffect(() => {
    if (canLoadDeferredSections) return;

    let isCancelled = false;
    const unlockDeferredSections = () => {
      if (!isCancelled) {
        setCanLoadDeferredSections(true);
      }
    };

    const timeoutId = window.setTimeout(unlockDeferredSections, 5000);
    const interactionEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "touchstart",
      "keydown",
      "wheel",
      "scroll",
    ];

    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, unlockDeferredSections, {
        once: true,
        passive: true,
      });
    });

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, unlockDeferredSections);
      });
    };
  }, [canLoadDeferredSections]);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        <Hero />
        <LazySection id="carta" enabled={canLoadDeferredSections}>
          <CartaSection />
        </LazySection>
        <LazySection id="novedades" enabled={canLoadDeferredSections}>
          <NovedadesSection />
        </LazySection>
        <LazySection id="espacios" enabled={canLoadDeferredSections}>
          <EspaciosSection />
        </LazySection>
        <LazySection id="reservas" enabled={canLoadDeferredSections}>
          <ReservasSection />
        </LazySection>
        <LazySection id="reviews" enabled={canLoadDeferredSections}>
          <ReviewsSection />
        </LazySection>
        <LazySection id="nosotros" enabled={canLoadDeferredSections}>
          <NosotrosSection />
        </LazySection>
        <LazySection id="contacto" enabled={canLoadDeferredSections}>
          <ContactoSection />
        </LazySection>
        <LazySection id="footer" enabled={canLoadDeferredSections}>
          <Footer />
        </LazySection>
      </div>
    </>
  );
};

export default Index;
