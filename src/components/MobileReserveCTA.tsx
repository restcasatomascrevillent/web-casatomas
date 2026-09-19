import { useLocation, useNavigate } from "react-router-dom";
import { Calendar, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/LanguageProvider";
import { PHONE_HREF } from "@/components/TelLink";

// Barra fija de conversión en móvil: llamar o reservar sin hacer scroll.
// Se renderiza también en el HTML del SSG (no depende de efectos ni de scroll).
const HIDE_ON_PATHS = ["/reservas", "/404"];

const MobileReserveCTA = () => {
  const { t } = useTranslations();
  const navigate = useNavigate();
  const location = useLocation();

  if (HIDE_ON_PATHS.includes(location.pathname)) return null;

  return (
    <>
      {/* Reserva espacio al final del documento para que la barra no tape el footer */}
      <div aria-hidden="true" className="h-[4.5rem] lg:hidden" />

      <div
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border bg-background/95 backdrop-blur-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex gap-2 px-3 py-3">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="flex-1 border-2 border-primary/30 font-semibold rounded-full"
          >
            <a href={PHONE_HREF} aria-label="Llamar a Casa Tomás">
              <Phone className="w-5 h-5 mr-2" />
              {t.mobileCta.call}
            </a>
          </Button>
          <Button
            size="lg"
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-full"
            onClick={() => navigate("/reservas")}
          >
            <Calendar className="w-5 h-5 mr-2" />
            {t.mobileCta.reserve}
          </Button>
        </div>
      </div>
    </>
  );
};

export default MobileReserveCTA;
