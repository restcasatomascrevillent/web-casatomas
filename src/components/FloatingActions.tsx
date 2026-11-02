import { Suspense, lazy, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/LanguageProvider";
import { usePedido } from "@/hooks/usePedido";
import { useChatbotVisible } from "@/hooks/useChatbotVisible";

const PreviewPedido = lazy(() => import("./carta/PreviewPedido"));
const AIChatbot = lazy(() => import("./AIChatbot"));

const precargarChatbot = () => {
  import("./AIChatbot");
};

// Páginas a las que se llega desde un enlace de correo y que tienen su propio
// flujo: ni ticket ni chatbot por encima.
const OCULTAR_EN = ["/reserva/respuesta", "/newsletter/baja"];

/**
 * Pila de botones flotantes, abajo a la derecha, en todo el sitio:
 *
 * - "Pregunta a Tomy": abre el chatbot sin ticket. Es la entrada al chatbot
 *   independiente del pedido (el botón del hero se quitó en 650ccd9 y el
 *   chatbot se quedó sin ningún acceso visible).
 * - "Mi mesa · N" (`PreviewPedido`), en cuanto hay ≥1 línea. Una vez
 *   montado se queda montado aunque se vacíe la mesa, para que el panel
 *   abierto pase al estado vacío ("Añade platos y vinos…") en vez de
 *   desaparecer; el botón flotante solo se pinta si hay líneas.
 *
 * Una sola columna `fixed` para que no se pisen entre sí, y con el fondo
 * subido por `--mobile-cta-offset` (lo publica `MobileReserveCTA`) para no
 * tapar la barra móvil de llamar/reservar, y por `--cookie-banner-offset` (lo
 * publica `CookieConsent`) mientras el aviso de cookies sigue sin resolver. `z-40`, por debajo de los
 * diálogos y del aviso de cookies.
 *
 * SSG: el botón de Tomy va en el HTML (no toca `window` al renderizar); el
 * del ticket aparece al hidratar, cuando `usePedido` lee `sessionStorage`.
 * `PreviewPedido` y `AIChatbot` siguen siendo perezosos: no se descargan
 * hasta que hay pedido o se pulsa el botón.
 *
 * Chatbot tras feature flag: el botón de Tomy solo existe si
 * `VITE_CHATBOT_PUBLICO="true"` o con la puerta de QA `?tomy=1`
 * (`useChatbotVisible`, `src/lib/featureFlags.ts`). Sin eso no se pinta el
 * botón y el chunk de `AIChatbot` nunca se pide.
 */
const FloatingActions = () => {
  const { t } = useTranslations();
  const location = useLocation();
  const { total } = usePedido();
  const chatbotVisible = useChatbotVisible();
  const [chatAbierto, setChatAbierto] = useState(false);
  const [mesaMontada, setMesaMontada] = useState(false);

  useEffect(() => {
    if (total > 0) setMesaMontada(true);
  }, [total]);

  if (OCULTAR_EN.some((ruta) => location.pathname.endsWith(ruta))) {
    return null;
  }

  return (
    <>
      <div className="fixed right-4 md:right-6 bottom-[calc(1.25rem+var(--mobile-cta-offset,0px)+var(--cookie-banner-offset,0px))] lg:bottom-[calc(1.5rem+var(--cookie-banner-offset,0px))] xl:bottom-6 z-40 flex flex-col items-end gap-3 pointer-events-none transition-[bottom] duration-300 [&>*]:pointer-events-auto">
        {chatbotVisible && (
          <Button
            type="button"
            onClick={() => setChatAbierto(true)}
            onMouseEnter={precargarChatbot}
            onFocus={precargarChatbot}
            onTouchStart={precargarChatbot}
            aria-label={t.tomy.aria}
            aria-haspopup="dialog"
            className="h-11 rounded-full pl-2 pr-4 gap-2 shadow-lg hover:shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300"
          >
            <span className="flex items-center justify-center h-7 w-7 rounded-full bg-accent text-accent-foreground">
              <Bot className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold">{t.tomy.cta}</span>
          </Button>
        )}

        {(total > 0 || mesaMontada) && (
          <Suspense fallback={null}>
            <PreviewPedido />
          </Suspense>
        )}
      </div>

      {chatbotVisible && chatAbierto && (
        <Suspense fallback={null}>
          <AIChatbot isOpen={chatAbierto} onClose={() => setChatAbierto(false)} />
        </Suspense>
      )}
    </>
  );
};

export default FloatingActions;
