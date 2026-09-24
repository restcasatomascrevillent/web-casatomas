import { useLocation, useNavigate } from "react-router-dom";
import { Calendar, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/LanguageProvider";
import { PHONE_HREF } from "@/components/TelLink";
import { useEffect, useState } from "react";

// Barra fija de conversión en móvil: llamar o reservar sin hacer scroll.
// Se renderiza también en el HTML del SSG (no depende de efectos ni de scroll
// para EXISTIR en el DOM), pero en la home arranca oculta y solo se muestra
// tras pasar el hero (a pantalla completa) para no taparle sus propios
// botones nada más cargar. En el resto de páginas, sin hero, se ve siempre.
const HIDE_ON_PATHS = ["/reservas", "/404", "/reserva/respuesta", "/newsletter/baja"];
const HOME_PATHS = ["/", "/en", "/fr"];

const MobileReserveCTA = () => {
  const { t } = useTranslations();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = HOME_PATHS.includes(location.pathname);
  const [pastHero, setPastHero] = useState(!isHome);

  useEffect(() => {
    if (!isHome) {
      setPastHero(true);
      return;
    }

    setPastHero(false);
    const handleScroll = () => {
      setPastHero(window.scrollY > window.innerHeight * 0.85);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  if (HIDE_ON_PATHS.includes(location.pathname)) return null;

  return (
    <>
      {/* Reserva espacio al final del documento para que la barra no tape el footer */}
      <div aria-hidden="true" className="h-[4.5rem] lg:hidden" />

      <div
        className={`fixed bottom-0 left-0 right-0 z-40 lg:hidden transition-all duration-300 ease-out ${
          pastHero ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex gap-2 px-3 py-3">
          <Button
            asChild
            size="lg"
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full shadow-lg"
          >
            <a href={PHONE_HREF} aria-label="Llamar a Casa Tomás">
              <Phone className="w-5 h-5 mr-2" />
              {t.mobileCta.call}
            </a>
          </Button>
          <Button
            size="lg"
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-full shadow-lg"
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
