import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Button } from "@/components/ui/button";
import ReservationForm from "@/components/ReservationForm";

type ReservasSectionProps = {
  forceShowForm?: boolean;
  showBackButton?: boolean;
};

const ReservasSection = ({ forceShowForm = false, showBackButton = false }: ReservasSectionProps) => {
  const { elementRef, isVisible } = useScrollReveal();
  const [showForm, setShowForm] = useState(forceShowForm);

  useEffect(() => {
    setShowForm(forceShowForm);
  }, [forceShowForm]);

  const handleSuccessClose = () => setShowForm(false);

  return (
    <>
      <section 
        ref={elementRef as any}
        id="reservas" 
        className={cn(
          "py-16 px-4 bg-gradient-to-br from-background via-background to-muted scroll-reveal-scale",
          "text-foreground",
          isVisible ? "is-visible" : ""
        )}
      >
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-center mb-4 text-foreground">
          Reserva tu Mesa
        </h2>
        <p className="text-center text-muted-foreground/80 text-lg mb-12 max-w-2xl mx-auto">
          Vive una experiencia gastronómica única en Casa Tomás
        </p>

        <div className="text-center mb-10">
          {!showForm && (
            <>
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
                onClick={() => setShowForm(true)}
              >
                Reservar Ahora
              </Button>
              <p className="text-muted-foreground mt-3 text-sm">
                Consulta disponibilidad y confirma en 3 pasos.
              </p>
            </>
          )}
        </div>

        {showForm && (
        <div className="max-w-3xl mx-auto space-y-6">
          <ReservationForm onSuccessClose={handleSuccessClose} />
          {showBackButton && (
            <div className="flex justify-center">
              <Button
                onClick={() => (window.location.href = "/")}
                className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-6 py-3 shadow-md hover:shadow-lg transition-colors"
              >
                Volver a la web
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
