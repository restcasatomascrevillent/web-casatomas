import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import logo from "@/assets/logo-casa-tomas.png";
import { useTranslations } from "@/i18n/LanguageProvider";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const { t, language, setLanguage, languages } = useTranslations();
  const location = useLocation();
  const navigate = useNavigate();
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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  const handleNavClick = (sectionId: string) => {
    if (document.getElementById(sectionId)) {
      scrollToSection(sectionId);
      return;
    }
    if (location.pathname !== "/") {
      navigate(`/#${sectionId}`);
      setIsMobileMenuOpen(false);
      return;
    }
    scrollToSection(sectionId);
  };

  const navItems = [
    { id: "carta", label: t.header.nav.carta },
    { id: "novedades", label: t.header.nav.novedades },
    { id: "reservas", label: t.header.nav.reservas },
    { id: "espacios", label: t.header.nav.espacios },
    { id: "nosotros", label: t.header.nav.nosotros },
    { id: "contacto", label: t.header.nav.contacto },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
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
              if (location.pathname !== "/") {
                navigate("/");
                return;
              }
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img src={logo} alt={t.hero.logoAlt} className="h-10 md:h-12 w-auto" />
          </motion.button>

          {/* Desktop Navigation */}
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
            <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/80 px-2 py-1 shadow-sm">
              {languages.map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={language === option.value ? "default" : "ghost"}
                  className="h-8 px-3 rounded-full text-xs font-semibold"
                  onClick={() => setLanguage(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
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
                <Button variant="ghost" size="icon" aria-label="Cambiar idioma">
                  <Globe2 className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {languages.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setLanguage(option.value)}
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
              aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
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
            className="lg:hidden bg-background/98 backdrop-blur-md border-t border-border"
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
