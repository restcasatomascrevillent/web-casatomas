import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Globe2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rutaEquivalente } from "@/i18n/routing";
import { useEsPaginaNoEncontrada } from "@/lib/hidratacion-404";
import { alCambiarConsentimiento, getStoredConsent } from "@/lib/cookie-consent";
import {
  TEXTOS_SUGERENCIA,
  guardarSugerencia,
  idiomaASugerir,
  idiomaDelTraductor,
  leerSugerencia,
  volvioAlEspanol,
  type IdiomaSugerido,
} from "@/lib/sugerencia-idioma";

const almacen = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const idiomasDelNavegador = (): readonly string[] =>
  navigator.languages?.length ? navigator.languages : [navigator.language];

/**
 * Píldora «🌐 View in English ✕» (o en francés) para quien entra en una página
 * en español con el navegador en ese idioma. Ver `src/lib/sugerencia-idioma.ts`.
 * Nunca cambia de idioma solo.
 *
 * Va arriba de la pila de botones flotantes (`FloatingActions`, abajo a la
 * derecha): no tapa el título de ninguna página (anclada bajo la cabecera,
 * tapaba el de reservas o el de las páginas legales), no choca con «Volver al
 * inicio» (abajo a la izquierda) y sube sola por encima de la barra de
 * reservar del móvil. Sale cuando el visitante ya ha elegido las cookies, para
 * no juntar dos avisos a la vez.
 *
 * No sale en el HTML del SSG ni en el primer render: se decide en un efecto,
 * con el navegador ya disponible, así que no puede romper la hidratación.
 */
const SugerenciaIdioma = () => {
  const location = useLocation();
  const esNoEncontrada = useEsPaginaNoEncontrada();
  const [idioma, setIdioma] = useState<IdiomaSugerido | null>(null);
  const [traductor, setTraductor] = useState<string | null>(null);
  const [cookiesElegidas, setCookiesElegidas] = useState(false);

  // Primero las cookies: hasta que no las elige, el aviso de cookies ya ocupa la pantalla.
  useEffect(() => {
    setCookiesElegidas(getStoredConsent() !== null);
    return alCambiarConsentimiento(() => setCookiesElegidas(true));
  }, []);

  // El traductor de Chrome marca <html> al empezar a traducir: se vuelve a decidir con su idioma.
  useEffect(() => {
    const html = document.documentElement;
    const leer = () => setTraductor(idiomaDelTraductor(html));
    leer();
    const observador = new MutationObserver(leer);
    observador.observe(html, { attributes: true, attributeFilter: ["class", "lang"] });
    return () => observador.disconnect();
  }, []);

  useEffect(() => {
    // Volver al español desde la versión inglesa o francesa es elegirlo: no se insiste.
    if (volvioAlEspanol(location.pathname)) guardarSugerencia(almacen(), "es");
    setIdioma(
      idiomaASugerir({
        ruta: location.pathname,
        idiomasNavegador: idiomasDelNavegador(),
        idiomaTraductor: traductor,
        guardado: leerSugerencia(almacen()),
      }),
    );
  }, [location.pathname, traductor]);

  if (!idioma || !cookiesElegidas || esNoEncontrada) return null;
  const textos = TEXTOS_SUGERENCIA[idioma];
  const destino = rutaEquivalente(location.pathname, idioma, location);

  return (
    <aside
      lang={idioma}
      aria-label={textos.region}
      data-zona="sugerencia_idioma"
      data-testid="sugerencia-idioma"
      className="flex max-w-[calc(100vw-2rem)] items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-3 pr-1 text-sm text-foreground shadow-lg md:gap-2"
    >
      <Globe2 className="h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
      {/* La frase entera desde tableta; en el móvil basta el botón (y la oyen los lectores de pantalla). */}
      <p className="leading-snug max-md:sr-only">{textos.mensaje}</p>
      <Button asChild size="sm" className="flex-shrink-0 rounded-full">
        <Link to={destino}>{textos.ver}</Link>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-11 w-11 flex-shrink-0 rounded-full"
        aria-label={textos.cerrar}
        onClick={() => {
          guardarSugerencia(almacen(), "cerrada");
          setIdioma(null);
        }}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </aside>
  );
};

export default SugerenciaIdioma;
