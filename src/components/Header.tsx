import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { LOGO_HEIGHT, LOGO_WIDTH, logoSmall } from "@/assets/logo";
import { useTranslations } from "@/i18n/LanguageProvider";
import { useLocation, useNavigate } from "react-router-dom";
import { construirRutaIdioma, rutaEquivalente } from "@/i18n/routing";
import type { Language } from "@/i18n/types";
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

const Header = () => {
  const { t, language, languages } = useTranslations();
  const location = useLocation();
  const navigate = useNavigate();
  // Portada DE ESTE idioma: "/", "/en" o "/fr" — no siempre "/". La usan el
  // logo y la navegación por anclas para saber si ya están en casa.
  const home = construirRutaIdioma("/", language);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
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
    const alinear = () => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: primeraVez ? "smooth" : "auto" });
      primeraVez = false;
    };

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

  // `initial={false}`: sin esto, Framer Motion deja el header prerenderizado
  // con `transform: translateY(-100px)` (fuera de pantalla) hasta que el JS
  // hidrata y lo anima — en una conexión lenta, la web tarda segundos en
  // mostrar el logo y el menú.
  return (
    <motion.header
      initial={false}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/95 backdrop-blur-md shadow-lg border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <motion.button
            onClick={() => {
              if (location.pathname !== home) {
                navigate(home);
                return;
              }
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
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
          </motion.button>

          {/* Desktop Navigation: con justify-between en la fila, el hueco al
              logo y el hueco al icono del planeta quedan siempre iguales,
              sin importar que el bloque de la derecha sea más ancho. */}
          <nav className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                to={`#${item.id}`}
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
                    onClick={() => navigate(rutaEquivalente(location.pathname, option.value))}
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
                navigate("/reservas");
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
                    onClick={() => navigate(rutaEquivalente(location.pathname, option.value))}
                    className={language === option.value ? "font-semibold text-primary" : ""}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              aria-label={isMobileMenuOpen ? ARIA.cerrarMenu[language] : ARIA.abrirMenu[language]}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden bg-background border-t border-border"
          >
            <nav className="flex flex-col p-4 space-y-2">
              {navItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <button
                    onClick={() => handleNavClick(item.id)}
                    className="w-full text-left px-4 py-3 text-lg font-medium rounded-lg hover:bg-accent/10 transition-colors"
                  >
                    {item.label}
                  </button>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: navItems.length * 0.1 }}
                className="pt-2"
              >
                <Button
                  size="lg"
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-full"
                  onClick={() => {
                    navigate("/reservas");
                    setIsMobileMenuOpen(false);
                  }}
                >
                  {t.header.cta}
                </Button>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;
