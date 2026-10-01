import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cookie } from "lucide-react";
import { useTranslations } from "@/i18n/LanguageProvider";

const CookieConsent = () => {
  const { t } = useTranslations();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setShowBanner(false);
  };

  const handleReject = () => {
    localStorage.setItem("cookieConsent", "rejected");
    setShowBanner(false);
  };

  return (
    <>
      {showBanner && (
        <div
          /* En móvil se ancla por encima de la barra fija de CTA (MobileReserveCTA)
             SOLO cuando esa barra está realmente visible: `--mobile-cta-offset`
             (la publica MobileReserveCTA) vale su alto ahí y 0px en cualquier
             página donde está oculta (toda la carta, reservas...) — un hueco
             fijo de 4.5rem dejaba el aviso flotando muy arriba, sin nada debajo,
             en esas páginas. Sin relleno abajo (`pb-0`): la tarjeta queda pegada
             a ese borde, sin el hueco que dejaba `p-2`/`p-6` a los cuatro lados. */
          className="fixed bottom-[var(--mobile-cta-offset,0px)] lg:bottom-0 left-0 right-0 z-50 pt-2 px-2 pb-0 md:pt-6 md:px-6 md:pb-0 transition-[bottom] duration-300"
        >
          <Card className="max-w-4xl mx-auto p-3 md:p-6 shadow-2xl border-2 border-primary/20 bg-background">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
              <div className="flex-shrink-0 hidden md:block">
                <Cookie className="w-8 h-8 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm md:text-lg font-bold mb-1 md:mb-2">{t.cookie.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {t.cookie.message}{" "}
                  <a href="/politica-privacidad" className="text-primary hover:underline font-medium">
                    {t.cookie.link}
                  </a>
                  .
                </p>
              </div>
              <div className="flex flex-row gap-2 w-full md:w-auto">
                <Button
                  onClick={handleReject}
                  variant="outline"
                  size="sm"
                  className="flex-1 md:flex-none"
                >
                  {t.cookie.reject}
                </Button>
                <Button
                  onClick={handleAccept}
                  size="sm"
                  className="flex-1 md:flex-none"
                >
                  {t.cookie.accept}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default CookieConsent;

