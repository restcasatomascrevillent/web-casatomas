import { useState, useEffect, useRef } from "react";
import { Menu, X, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { LOGO_HEIGHT, LOGO_WIDTH, logoSmall } from "@/assets/logo";
import { useTranslations } from "@/i18n/LanguageProvider";
import { useLocation, useNavigate } from "react-router-dom";
import { construirRutaIdioma, rutaEquivalente } from "@/i18n/routing";
import type { Language } from "@/i18n/types";
import { RESERVAS_PATH } from "@/lib/condiciones";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Solo etiquetas de accesibilidad (lector de pantalla, nunca visibles en
// pantalla): no están en `t.` porque son de este componente únicamente.
const ARIA: Record<"cambiarIdioma" | "cerrarMenu" | "abrirMenu", Record<Language, string>> = {
  cambiarIdioma: { es: "Cambiar idioma", en: "Change language", fr: "Changer de langue" },
  cerrarMenu: { es: "Cerrar menú", en: "Close menu", fr: "Fermer le menu" },
  abrirMenu: { es: "Abrir menú", en: "Open menu", fr: "Ouvrir le menu" },
};


/**
 * `scrollY` que deja `el` arriba del todo, respetando su `scroll-margin-top`
 * (el hueco para la cabecera fija), como `scrollIntoView`, pero midiendo
 * con `offsetTop`, que no cuenta las transformaciones. `scrollIntoView` y
 * `getBoundingClientRect` sí las cuentan: la rejilla de platos de la carta
 * entra con `animate-fade-up` (sube 30 px en 0,6 s), y al llegar con
 * «Échale un vistazo» el plato se medía todavía 30 px más abajo, así que
 * acababa 30 px más arriba de lo previsto, con el aro bajo la cabecera.
 */
const destinoAncla = (el: HTMLElement) => {
  let top = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
    top += n.offsetTop + (n.offsetParent instanceof HTMLElement ? n.offsetParent.clientTop : 0);
  }
  return top - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
};

const Header = () => {
  const { t, language, languages } = useTranslations();
  const location = useLocation();
  const navigate = useNavigate();
  // Portada DE ESTE idioma: "/", "/en" o "/fr" — no siempre "/". La usan el
  // logo y la navegación por anclas para saber si ya están en casa.
  const home = construirRutaIdioma("/", language);
  const reservasPath = construirRutaIdioma(RESERVAS_PATH, language);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const botonMenuRef = useRef<HTMLButtonElement>(null);

  /**
   * Esc cierra el menú móvil y devuelve el foco al botón que lo abre. Se
   * escucha en `document` (fase de burbuja) y se ignora un Esc ya atendido
   * (`defaultPrevented`): el chat y los desplegables de Radix van antes y lo
   * marcan, y el aviso de cookies escucha en `window`, que va después, así
   * que con todo abierto cada Esc cierra solo lo de más arriba.
   */
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const alPulsar = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      setIsMobileMenuOpen(false);
      botonMenuRef.current?.focus();
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!location.hash) {
      return;
    }
    const sectionId = location.hash.replace("#", "");
    const timer = window.setTimeout(() => {
      scrollToSection(sectionId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  // Corrección en marcha (si la hay) de una llamada anterior a
  // `scrollToSection`: se cancela al empezar una nueva, para que dos clics
  // seguidos no acaben tirando cada uno hacia su sección a la vez.
  const detenerCorreccionRef = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => detenerCorreccionRef.current?.(), []);

  /**
   * Lleva la vista hasta `sectionId` y la mantiene ahí mientras la página
   * siga cambiando de alto.
   *
   * Las secciones de la portada se cargan en diferido (`idleImport`, ver
   * `lib/lazyIdle.ts`): el esqueleto de `Suspense` nace con el mismo `id`,
   * así que el primer `scrollIntoView` ya encuentra dónde ir, pero en
   * cuanto cada sección resuelve sustituye su esqueleto (bajito) por el
   * contenido real (mucho más alto), lo que empuja hacia abajo todo lo que
   * hay debajo — si eso pasa justo después de llegar, el ancla se queda
   * desalineada. Se nota sobre todo en Chrome (Windows y Android):
   * `requestIdleCallback` puede tardar bastante si el hilo principal está
   * ocupado (p. ej. con la propia animación de abrir el menú), así que las
   * secciones no siempre han cargado ya cuando se pulsa un enlace.
   *
   * Se corrige con un `ResizeObserver` sobre `<body>` durante unos segundos
   * — sin volver a animar el scroll, para no repetirlo cada vez — y se para
   * en cuanto el visitante toca la rueda o la pantalla: seguir tirando de
   * la vista por encima de lo que esté haciendo sería peor que dejar el
   * desajuste.
   */
  const scrollToSection = (sectionId: string) => {
    const elemento = document.getElementById(sectionId);
    if (!elemento) return;

    detenerCorreccionRef.current?.();
    setIsMobileMenuOpen(false);

    let primeraVez = true;
    let ultimoDestino: number | undefined;
    const alinear = () => {
      const el = document.getElementById(sectionId);
      if (!el) return;
      const destino = destinoAncla(el);
      // ResizeObserver fires once on observe. Do not interrupt the first
      // smooth scroll unless the destination actually moved during loading.
      if (ultimoDestino !== undefined && Math.abs(destino - ultimoDestino) < 1) return;
      ultimoDestino = destino;
      const smooth = primeraVez && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: destino, behavior: smooth ? "smooth" : "instant" });
      primeraVez = false;
    };

    alinear();
    const observador = new ResizeObserver(alinear);
    observador.observe(document.body);

    const detener = () => {
      observador.disconnect();
      window.clearTimeout(limite);
      window.removeEventListener("wheel", detener);
      window.removeEventListener("touchmove", detener);
      if (detenerCorreccionRef.current === detener) detenerCorreccionRef.current = undefined;
    };
    const limite = window.setTimeout(detener, 5000);
    window.addEventListener("wheel", detener, { passive: true, once: true });
    window.addEventListener("touchmove", detener, { passive: true, once: true });
    detenerCorreccionRef.current = detener;
  };

  const handleNavClick = (sectionId: string) => {
    if (document.getElementById(sectionId)) {
      scrollToSection(sectionId);
      return;
    }
    if (location.pathname !== home) {
      navigate(`${home}#${sectionId}`);
      setIsMobileMenuOpen(false);
      return;
    }
    scrollToSection(sectionId);
  };

  const navItems = [
    { id: "carta", label: t.header.nav.carta },
    { id: "novedades", label: t.header.nav.novedades },
    { id: "espacios", label: t.header.nav.espacios },
    { id: "nosotros", label: t.header.nav.nosotros },
    { id: "contacto", label: t.header.nav.contacto },
  ];

  return (
    <header
      className={`site-header fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${
        isScrolled
          ? "bg-background lg:bg-background/95 lg:backdrop-blur-md shadow-sm border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <button
            onClick={() => {
              if (location.pathname !== home) {
                navigate(home);
                return;
              }
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <img
              src={logoSmall.src}
              srcSet={logoSmall.srcSet}
              sizes="(min-width: 768px) 70px, 59px"
              alt={t.hero.logoAlt}
              // aspect-ratio explícito: las variantes pequeñas redondean el alto
              // (70×48) y sin él el ancho variaría unas décimas de píxel.
              className="h-10 md:h-12 w-auto aspect-[800/550]"
              width={LOGO_WIDTH}
              height={LOGO_HEIGHT}
              decoding="async"
            />
          </button>

          {/* Desktop Navigation: con justify-between en la fila, el hueco al
              logo y el hueco al icono del planeta quedan siempre iguales,
              sin importar que el bloque de la derecha sea más ancho. */}
          <nav className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                to={`${home}#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.id);
                }}
                className="text-foreground/80 hover:text-foreground font-medium transition-colors px-3 py-2"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* CTA Button Desktop */}
          <div className="hidden lg:flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={ARIA.cambiarIdioma[language]}>
                  <Globe2 className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {languages.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => navigate(rutaEquivalente(location.pathname, option.value, location))}
                    className={language === option.value ? "font-semibold text-primary" : ""}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-full"
              onClick={() => {
                navigate(reservasPath);
              }}
            >
              {t.header.cta}
            </Button>
          </div>

          {/* Mobile Language + Menu */}
          <div className="flex items-center gap-1 lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={ARIA.cambiarIdioma[language]}>
                  <Globe2 className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {languages.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => navigate(rutaEquivalente(location.pathname, option.value, location))}
                    className={language === option.value ? "font-semibold text-primary" : ""}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              ref={botonMenuRef}
              variant="ghost"
              size="icon"
              aria-expanded={isMobileMenuOpen}
              aria-controls="menu-movil"
              aria-label={isMobileMenuOpen ? ARIA.cerrarMenu[language] : ARIA.abrirMenu[language]}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <>
        {isMobileMenuOpen && (
          <div
            id="menu-movil"
            className="lg:hidden bg-background border-t border-border"
          >
            <nav className="flex flex-col p-4 space-y-2">
              {navItems.map((item) => (
                <div
                  key={item.id}
                >
                  <NavLink
                    to={`${home}#${item.id}`}
                    onClick={(event) => { event.preventDefault(); handleNavClick(item.id); }}
                    className="block w-full text-left px-4 py-3 text-lg font-medium rounded-lg hover:bg-accent/10 transition-colors"
                  >
                    {item.label}
                  </NavLink>
                </div>
              ))}
              <div
                className="pt-2"
              >
                <Button
                  size="lg"
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-full"
                  onClick={() => {
                    navigate(reservasPath);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  {t.header.cta}
                </Button>
              </div>
            </nav>
          </div>
        )}
      </>
    </header>
  );
};

export default Header;

