import { useLocation, useNavigate } from "react-router-dom";
import { Calendar, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/LanguageProvider";
import { PHONE_HREF } from "@/components/TelLink";
import { construirRutaIdioma, quitarPrefijoIdioma } from "@/i18n/routing";
import { RESERVAS_PATH } from "@/lib/condiciones";
import { useEffect, useState } from "react";

// Barra fija de conversión en móvil: llamar o reservar sin hacer scroll.
// Se renderiza también en el HTML del SSG (no depende de efectos ni de scroll
// para EXISTIR en el DOM), pero en la home arranca oculta y solo se muestra
// tras pasar el hero (a pantalla completa) para no taparle sus propios
// botones nada más cargar. En el resto de páginas, sin hero, se ve siempre.
// En cualquier página se vuelve a ocultar al llegar al footer, para no
// tapar sus enlaces/datos de contacto.
const HIDE_ON_PATHS = ["/reservas", "/404", "/reserva/respuesta", "/newsletter/baja"];
// Cualquier página de la carta ("/carta", "/carta/vinos", "/carta/postres",
// "/en/carta"...): el visitante ya está mirando qué pedir, no reservando
// mesa, así que esta barra no debe verse ahí; en vinos y bebidas además
// tapaba la parte de abajo de las tarjetas y el propio botón "Volver
// arriba". Se detecta por segmento de ruta (no por igualdad exacta) para
// cubrir "/carta", "/carta/:categoria", "/carta/vinos" y "/carta/bebidas" en
// las tres ramas de idioma sin listarlas una a una.
const RUTA_CARTA = /^\/(en\/|fr\/)?carta(\/|$)/;
const HOME_PATHS = ["/", "/en", "/fr"];
// Alto de la barra: `py-3` (1.5rem) + botón `size="lg"` (`h-11`, 2.75rem).
const MOBILE_CTA_HEIGHT = "4.25rem";

const MobileReserveCTA = () => {
  const { t, language } = useTranslations();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = HOME_PATHS.includes(location.pathname);
  const [pastHero, setPastHero] = useState(!isHome);
  const [nearFooter, setNearFooter] = useState(false);

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

  useEffect(() => {
    setNearFooter(false);

    let intersectionObserver: IntersectionObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    // El `<footer>` va detrás de un `Suspense` perezoso: en producción (HTML
    // del SSG) ya está en el DOM cuando este efecto corre, pero en dev o tras
    // una navegación por cliente puede tardar unos milisegundos en montarse.
    // Sin este `MutationObserver` de respaldo, buscarlo una sola vez aquí
    // podía no encontrar nada y la barra se quedaba visible para siempre.
    const attach = (footer: Element) => {
      intersectionObserver = new IntersectionObserver(([entry]) => setNearFooter(entry.isIntersecting), {
        rootMargin: "0px 0px -10% 0px",
      });
      intersectionObserver.observe(footer);
    };

    const existing = document.querySelector("footer");
    if (existing) {
      attach(existing);
    } else {
      mutationObserver = new MutationObserver(() => {
        const footer = document.querySelector("footer");
        if (footer) {
          mutationObserver?.disconnect();
          mutationObserver = null;
          attach(footer);
        }
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      intersectionObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [location.pathname]);

  const hiddenOnPath =
    HIDE_ON_PATHS.includes(quitarPrefijoIdioma(location.pathname)) || RUTA_CARTA.test(location.pathname);
  const visible = !hiddenOnPath && pastHero && !nearFooter;

  // Publica la altura que ocupa la barra (0 si está oculta) en
  // `--mobile-cta-offset`, para que los botones flotantes (`FloatingActions`,
  // "Volver arriba") se coloquen justo encima y no la tapen. Solo en el
  // navegador: en el SSG la variable no existe y el `var(..., 0px)` de quien
  // la consume cae a 0. En `lg` la barra no se ve (`lg:hidden`) y los
  // consumidores ignoran la variable con su propia clase `lg:`.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      "--mobile-cta-offset",
      visible ? `calc(${MOBILE_CTA_HEIGHT} + env(safe-area-inset-bottom))` : "0px",
    );
    return () => {
      root.style.removeProperty("--mobile-cta-offset");
    };
  }, [visible]);

  if (hiddenOnPath) {
    return null;
  }

  return (
    <>
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 lg:hidden transition-all duration-300 ease-out ${
          visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        // Oculta (`opacity-0` + fuera de pantalla) seguía recibiendo el foco
        // con Tab: el usuario de teclado caía en dos botones invisibles.
        // `inert` la saca del orden de tabulación y del árbol de
        // accesibilidad mientras no se ve. React 18 no conoce el atributo
        // (ni sus tipos), así que va como cadena vacía, que es como el
        // navegador lo entiende presente; `undefined` lo quita.
        {...({ inert: visible ? undefined : "" } as Record<string, string | undefined>)}
      >
        {/* Siempre en una sola línea (`whitespace-nowrap`, alto fijo `h-11`
            que coincide con `MOBILE_CTA_HEIGHT`). Para que "Reservar mesa"
            con icono quepa en su mitad del `flex-1` incluso a 320px (el
            iPhone SE de 1.ª gen sigue vivo), el `px-8` de `size="lg"` se
            reduce a `px-2` hasta `sm` y el texto baja a 13px por debajo de
            360px;
            `min-w-0` deja que el hijo flex encoja por debajo del ancho de
            su contenido (`min-width: auto` por defecto). */}
        <div className="flex gap-2 px-3 py-3">
          <Button
            asChild
            size="lg"
            className="h-11 min-w-0 flex-1 rounded-full bg-primary px-2 text-[13px] font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 min-[360px]:text-sm sm:px-8"
          >
            <a href={PHONE_HREF} aria-label={t.mobileCta.callAria}>
              <Phone className="w-5 h-5" />
              {t.mobileCta.call}
            </a>
          </Button>
          <Button
            size="lg"
            className="h-11 min-w-0 flex-1 rounded-full bg-accent px-2 text-[13px] font-semibold text-accent-foreground shadow-lg hover:bg-accent/90 min-[360px]:text-sm sm:px-8"
            onClick={() => navigate(construirRutaIdioma(RESERVAS_PATH, language))}
          >
            <Calendar className="w-5 h-5" />
            {t.mobileCta.reserve}
          </Button>
        </div>
      </div>
    </>
  );
};

export default MobileReserveCTA;
