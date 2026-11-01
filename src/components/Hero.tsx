import { Button } from "@/components/ui/button";
import { Calendar, UtensilsCrossed } from "lucide-react";
import { Head } from "vite-react-ssg";
import { LOGO_HEIGHT, LOGO_WIDTH, logoHero } from "@/assets/logo";
import { useTranslations } from "@/i18n/LanguageProvider";
import { Link } from "react-router-dom";
import type { Language } from "@/i18n/types";
import { construirRutaIdioma } from "@/i18n/routing";
import { RESERVAS_PATH } from "@/lib/condiciones";

// Aria-label de la flecha de scroll. Distinto del texto del botón "Ver
// carta" (mismo destino) para no repetir el mismo nombre accesible dos
// veces seguidas en la pantalla de lectores de pantalla.
const ARIA_SCROLL_DOWN: Record<Language, string> = {
  es: "Desplázate a la carta",
  en: "Scroll to the menu",
  fr: "Faites défiler jusqu'à la carte",
};

const Hero = () => {
  const { t, language } = useTranslations();

  return (
    <>
      {/* Precarga la imagen del logo del hero (LCP de la portada) con la MISMA
          `srcset`/`sizes` que el `<img>` de abajo: el navegador ya sabe qué
          variante pedirá según el ancho de pantalla y no espera a que el
          parser HTML llegue hasta el `<img>` para empezar la descarga. En
          conexiones lentas eso es la diferencia entre verlo desde el primer
          pintado o varios cientos de ms después. */}
      <Head>
        <link
          rel="preload"
          as="image"
          href={logoHero.src}
          imageSrcSet={logoHero.srcSet}
          imageSizes={logoHero.sizes}
          fetchPriority="high"
        />
      </Head>
      <section
        className="hero-section relative overflow-hidden bg-gradient-to-br from-background via-muted to-background"
      >
        <div aria-hidden="true" className="hero-backdrop absolute inset-0" />
        <div className="relative min-h-[inherit] flex flex-col items-center justify-center pt-24 pb-32 sm:pb-24 lg:pb-20 text-center px-4 z-10">
          <div className="mb-8">
            <img
              src={logoHero.src}
              srcSet={logoHero.srcSet}
              sizes={logoHero.sizes}
              alt={t.hero.logoAlt}
              className="w-64 md:w-96 lg:w-[28rem] h-auto mx-auto mb-6 drop-shadow-2xl"
              width={LOGO_WIDTH}
              height={LOGO_HEIGHT}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
            {/* Sigue siendo el H1 de la portada (lo que Google lee como título de
                la página), pero discreto: una línea pequeña en versalitas en vez
                de una frase grande que compita con el logo y el lema. */}
            <h1 className="text-[11px] sm:text-xs md:text-sm font-medium uppercase tracking-[0.12em] sm:tracking-[0.2em] md:tracking-[0.3em] text-muted-foreground max-w-2xl mx-auto mb-4 text-balance">
              {{ es: "Cocina gallega · Marisco · Crevillente", en: "Galician cuisine · Seafood · Crevillente", fr: "Cuisine galicienne · Fruits de mer · Crevillente" }[language]}
            </h1>
            <p className="text-2xl md:text-3xl text-foreground/80 max-w-2xl mx-auto leading-relaxed font-semibold italic">
              {t.hero.motto}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              className="bg-accent hover:bg-accent-hover text-accent-foreground px-8 py-6 text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              asChild
            >
              <Link to={construirRutaIdioma(RESERVAS_PATH, language)}>
                <Calendar className="w-5 h-5 mr-2" />
                {t.hero.ctaPrimary}
              </Link>
            </Button>
            {/* `<a href="#carta">`, no `onClick` + JS: el scroll suave ya lo da
                `scroll-behavior: smooth` (index.css) de forma nativa, así que
                este enlace navega bien desde el primer HTML, sin esperar a que
                React hidrate el botón. */}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-2 border-primary/30 bg-background/50 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <a href="#carta">
                <UtensilsCrossed className="w-5 h-5 mr-2" />
                {t.hero.ctaSecondary}
              </a>
            </Button>
          </div>

          {/* Enlace real a `#carta`, no un `<div>` decorativo: funciona en
              cuanto hay HTML (scroll suave nativo vía CSS), sin esperar a que
              React hidrate para registrar un click. */}
          <a
            href="#carta"
            aria-label={ARIA_SCROLL_DOWN[language]}
            className="absolute bottom-20 sm:bottom-24 lg:bottom-8 block"
          >
            <div className="animate-float">
              <svg
                className="w-8 h-8 text-foreground/60"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
              </svg>
            </div>
          </a>
        </div>
      </section>
    </>
  );
};

export default Hero;
