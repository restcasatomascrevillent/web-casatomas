import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Button } from "@/components/ui/button";
import ReservationForm from "@/components/ReservationForm";
import { useTranslations } from "@/i18n/LanguageProvider";
import { TelLink } from "@/components/TelLink";
import { construirRutaIdioma } from "@/i18n/routing";

type ReservasSectionProps = {
  forceShowForm?: boolean;
  showBackButton?: boolean;
  headingLevel?: "h1" | "h2";
};

const ReservasSection = ({ forceShowForm = false, showBackButton = false, headingLevel: Heading = "h2" }: ReservasSectionProps) => {
  const { t, language } = useTranslations();
  const navigate = useNavigate();
  const { elementRef, isVisible } = useScrollReveal();
  const [showForm, setShowForm] = useState(forceShowForm);

  useEffect(() => {
    setShowForm(forceShowForm);
  }, [forceShowForm]);

  const handleSuccessClose = () => setShowForm(false);

  return (
    <>
      <section
        ref={elementRef}
        id="reservas"
        className={cn(
          "py-16 px-4 bg-gradient-to-br from-background via-background to-muted scroll-reveal-scale",
          "text-foreground",
          isVisible ? "is-visible" : ""
        )}
      >
        <div className="container mx-auto max-w-5xl">
          <Heading className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-4 text-foreground">
            {t.reservas.title}
          </Heading>
          <p className="text-center text-muted-foreground/80 text-lg mb-12 max-w-2xl mx-auto">
            {t.reservas.subtitle}
          </p>

          <div className="text-center mb-10">
            {!showForm && (
              <>
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent-hover text-accent-foreground px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
                  onClick={() => setShowForm(true)}
                >
                  {t.reservas.cta}
                </Button>
                <p className="text-muted-foreground mt-3 text-sm">
                  {t.reservas.hint}
                </p>
              </>
            )}
          </div>

          {showForm && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="rounded-2xl border border-destructive/60 bg-destructive/10 backdrop-blur-sm p-6 shadow-sm text-left">
                <p className="text-sm text-primary">
                  <strong className="text-primary font-semibold">{t.reservas.disclaimer.title}</strong>{" "}
                  {t.reservas.disclaimer.note}
                </p>
                <p className="text-sm text-primary mt-2">
                  <strong>{t.reservas.disclaimer.callUs}</strong>{" "}
                  <TelLink className="font-semibold text-accent underline underline-offset-4" />
                </p>
                <div className="mt-4 grid gap-2 text-sm text-primary">
                  {t.reservas.disclaimer.steps.map((step, index) => (
                    <div key={index}>{`${index + 1}) ${step}`}</div>
                  ))}
                </div>
              </div>
              <ReservationForm onSuccessClose={handleSuccessClose} />
              {showBackButton && (
                <div className="flex justify-center">
                  <Button
                    onClick={() => navigate(construirRutaIdioma("/", language))}
                    className="bg-accent hover:bg-accent-hover text-accent-foreground rounded-full px-6 py-3 shadow-md hover:shadow-lg transition-colors"
                  >
                    {t.reservas.backToSite}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default ReservasSection;
