import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Cookie } from "lucide-react";
import { useTranslations } from "@/i18n/LanguageProvider";
import { construirRutaIdioma } from "@/i18n/routing";
import { POLITICA_PRIVACIDAD_PATH } from "@/lib/condiciones";
import { getStoredConsent, saveConsent, OPEN_PREFERENCES_EVENT } from "@/lib/cookie-consent";

const CookieConsent = () => {
  const { t, language } = useTranslations();
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [mapsDraft, setMapsDraft] = useState(false);

  useEffect(() => {
    setShowBanner(getStoredConsent() === null);
  }, []);

  // El enlace "Configurar cookies" del footer vive fuera de este componente
  // (puede pulsarse mucho después de que el aviso ya se cerrara), así que
  // reabre el diálogo por evento en vez de por una prop que no podría pasarle.
  useEffect(() => {
    const abrir = () => {
      setMapsDraft(getStoredConsent()?.maps === true);
      setShowPreferences(true);
      setShowBanner(false);
    };
    window.addEventListener(OPEN_PREFERENCES_EVENT, abrir);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, abrir);
  }, []);

  const acceptAll = () => {
    saveConsent(true);
    setShowBanner(false);
    setShowPreferences(false);
  };

  const rejectAll = () => {
    saveConsent(false);
    setShowBanner(false);
    setShowPreferences(false);
  };

  /**
   * Esc con el aviso a la vista = «Rechazar» (solo las necesarias): cerrar
   * sin elegir no puede dejar la web sin aviso ni sin preferencia guardada.
   * Se escucha en `window` (fase de burbuja), lo último de la página, y se
   * ignora un Esc ya atendido (`defaultPrevented`): si encima están el chat o
   * el menú móvil, ese Esc los cierra a ellos y el aviso se queda.
   */
  useEffect(() => {
    if (!showBanner || showPreferences) return;
    const alPulsar = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      rejectAll();
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [showBanner, showPreferences]);

  const openPreferences = () => {
    setMapsDraft(getStoredConsent()?.maps === true);
    setShowBanner(false);
    setShowPreferences(true);
  };

  const savePreferences = () => {
    saveConsent(mapsDraft);
    setShowPreferences(false);
  };

  // Si cierra el diálogo (X, Escape, clic fuera) sin guardar y todavía no hay
  // ninguna elección almacenada, el aviso vuelve — cerrar sin elegir nada no
  // puede dejar la web sin aviso NI con una preferencia guardada.
  const onPreferencesOpenChange = (open: boolean) => {
    setShowPreferences(open);
    if (!open && getStoredConsent() === null) setShowBanner(true);
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
                  <a href={`${construirRutaIdioma(POLITICA_PRIVACIDAD_PATH, language)}#cookies`} className="text-primary underline underline-offset-2 hover:decoration-2 font-medium">
                    {t.cookie.link}
                  </a>
                  .
                </p>
              </div>
              <div className="flex flex-row flex-wrap gap-2 w-full md:w-auto">
                <Button onClick={rejectAll} variant="outline" size="sm" className="flex-1 md:flex-none">
                  {t.cookie.reject}
                </Button>
                <Button onClick={openPreferences} variant="outline" size="sm" className="flex-1 md:flex-none">
                  {t.cookie.configure}
                </Button>
                <Button onClick={acceptAll} size="sm" className="flex-1 md:flex-none">
                  {t.cookie.accept}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Dialog open={showPreferences} onOpenChange={onPreferencesOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.cookie.dialogTitle}</DialogTitle>
            <DialogDescription>{t.cookie.dialogDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">{t.cookie.necessaryTitle}</p>
                <p className="text-xs text-muted-foreground">{t.cookie.necessaryDescription}</p>
              </div>
              <Switch checked disabled aria-label={t.cookie.necessaryTitle} />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">{t.cookie.mapsTitle}</p>
                <p className="text-xs text-muted-foreground">{t.cookie.mapsDescription}</p>
              </div>
              <Switch checked={mapsDraft} onCheckedChange={setMapsDraft} aria-label={t.cookie.mapsTitle} />
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <Button onClick={rejectAll} variant="outline" size="sm" className="flex-1 sm:flex-none">
              {t.cookie.reject}
            </Button>
            <Button onClick={savePreferences} size="sm" className="flex-1 sm:flex-none">
              {t.cookie.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieConsent;
