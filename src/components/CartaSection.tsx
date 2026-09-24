import { motion } from "framer-motion";
import { Suspense, lazy, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Wine, Beer, ArrowRight } from "lucide-react";
import { getUserPedido } from "@/utils/sessionManager";
import { useTranslations } from "@/i18n/LanguageProvider";
import { construirRutaIdioma } from "@/i18n/routing";
import type { Language } from "@/i18n/types";
// Import estático a propósito: `CartaPlatos` se monta siempre (ver abajo) y el
// SSG tiene que poder renderizarlo para que sus tarjetas queden en el HTML.
import CartaPlatos from "./carta/CartaPlatos";
import { semillaCategoriaInicial } from "@/lib/carta-ssg";
import { CATEGORIAS_CARTA, etiquetaCategoriaIdioma, rutaCategoria, TOTAL_CARTA } from "@/lib/carta-rutas";
import type { CartaPlatosSeed } from "./carta/CartaPlatos";

type Section = "platos" | "vinos" | "bebidas" | null;
const CartaVinos = lazy(() => import("./carta/CartaVinos"));
const CartaBebidas = lazy(() => import("./carta/CartaBebidas"));
const PreviewPedido = lazy(() => import("./carta/PreviewPedido"));

// La carta que descargó el build. Se calcula una sola vez por módulo: es un
// valor estático, idéntico en Node y en el navegador.
const PLATOS_SSG = semillaCategoriaInicial() as CartaPlatosSeed;

/**
 * Las pocas etiquetas de este puente a `/carta` no salían del diccionario de
 * `t.` (se escribieron sueltas en castellano). Igual que `getInfoLabels` en
 * `CartaPlatos.tsx`: un mapa local, no una clave nueva en los tres ficheros
 * de idioma, para tres cadenas cortas que no se usan en ningún otro sitio.
 */
const ETIQUETAS_PUENTE: Record<Language, { verCarta: string; referencias: string; nav: string }> = {
  es: { verCarta: "Ver la carta completa", referencias: "referencias", nav: "Páginas de la carta" },
  en: { verCarta: "See the full menu", referencias: "items", nav: "Menu pages" },
  fr: { verCarta: "Voir la carte complète", referencias: "références", nav: "Pages de la carte" },
};

const CartaSection = () => {
  const { t, language } = useTranslations();
  const etiquetas = ETIQUETAS_PUENTE[language];
  const [activeSection, setActiveSection] = useState<Section>(null);
  const [pedidoCount, setPedidoCount] = useState(0);

  useEffect(() => {
    const updatePedidoCount = () => {
      const saved = getUserPedido();
      setPedidoCount(saved.length);
    };
    
    updatePedidoCount();
    
    // Listen for storage changes
    window.addEventListener('storage', updatePedidoCount);
    // Also listen for custom event when items are added
    window.addEventListener('pedidoUpdated', updatePedidoCount);
    
    return () => {
      window.removeEventListener('storage', updatePedidoCount);
      window.removeEventListener('pedidoUpdated', updatePedidoCount);
    };
  }, []);

  const shouldRenderPreview = activeSection !== null || pedidoCount > 0;

  return (
    <section id="carta" className="py-20 px-4 md:px-8 lg:px-16 bg-gradient-to-b from-background to-muted">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="max-w-7xl mx-auto"
      >
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">{t.carta.title}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.carta.subtitle}
          </p>
        </div>

        {/* Botones principales: platos arriba a todo lo ancho, y debajo
            vinos/bebidas uno al lado del otro (evita repetir esas dos
            categorías como píldoras sueltas más abajo). */}
        <div className="flex flex-col items-center gap-3 mb-8 w-full max-w-md mx-auto">
          <Button
            size="lg"
            onClick={() => setActiveSection(activeSection === "platos" ? null : "platos")}
            className={`w-full px-8 py-6 text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 ${
              activeSection === "platos"
                ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                : "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            }`}
          >
            <UtensilsCrossed className="w-5 h-5 mr-2" />
            {t.carta.buttons.platos}
          </Button>
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button
              size="lg"
              onClick={() => setActiveSection(activeSection === "vinos" ? null : "vinos")}
              className={`px-4 py-6 text-base sm:text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 ${
                activeSection === "vinos"
                  ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                  : "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              }`}
            >
              <Wine className="w-5 h-5 mr-2" />
              {t.carta.buttons.vinos}
            </Button>
            <Button
              size="lg"
              onClick={() => setActiveSection(activeSection === "bebidas" ? null : "bebidas")}
              className={`px-4 py-6 text-base sm:text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 ${
                activeSection === "bebidas"
                  ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                  : "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              }`}
            >
              <Beer className="w-5 h-5 mr-2" />
              {t.carta.buttons.bebidas}
            </Button>
          </div>
        </div>

        {/* Puente a las páginas de carta. Los tres botones de arriba despliegan
            la carta interactiva aquí mismo; estos enlaces llevan a las páginas
            propias, donde cada sección está entera y con URL propia. Es la vía
            por la que se llega navegando, no solo desde el sitemap. */}
        <nav aria-label={etiquetas.nav} className="mb-12">
          <div className="flex justify-center mb-6">
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-2 border-accent/40 text-accent font-semibold hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all duration-300"
            >
              <Link to={construirRutaIdioma("/carta", language)}>
                {etiquetas.verCarta} · {TOTAL_CARTA} {etiquetas.referencias}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
          {/* Solo categorías de platos: vinos y bebidas ya tienen su propio
              botón arriba, listarlas también aquí las duplicaba. */}
          <div className="max-w-3xl mx-auto rounded-2xl border border-border/60 bg-background/60 p-4 sm:p-5">
            <ul className="flex flex-wrap items-center justify-center gap-2.5">
              {CATEGORIAS_CARTA.map((categoria) => (
                <li key={categoria.slug}>
                  <Link
                    to={rutaCategoria(categoria.slug, language)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3.5 py-2 text-sm text-muted-foreground shadow-sm transition-all duration-200 hover:border-accent hover:text-foreground hover:shadow-md hover:-translate-y-0.5"
                  >
                    {etiquetaCategoriaIdioma(categoria.clave, language)}
                    <span className="text-xs font-semibold text-accent">{categoria.total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Contenido de las secciones */}

        {/* Los platos se montan SIEMPRE y se ocultan con `hidden` hasta que se
            abre la sección. Así el HTML que sirve Vercel trae ya las tarjetas
            reales y son EXACTAMENTE los mismos nodos que destapa el botón: no
            hay una copia aparte para el buscador. `initialPlatos` viene del
            build, por lo que al abrir no hay parpadeo de carga. */}
        <div hidden={activeSection !== "platos"}>
          <motion.div
            initial={false}
            animate={activeSection === "platos" ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
          >
            <CartaPlatos
              showAddButton
              active={activeSection === "platos"}
              initialPlatos={PLATOS_SSG}
            />
          </motion.div>
        </div>

        {activeSection === "vinos" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Suspense fallback={<div className="py-12 text-center text-muted-foreground">{t.vinos.loading}</div>}>
              <CartaVinos showAddButton />
            </Suspense>
          </motion.div>
        )}

        {activeSection === "bebidas" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Suspense fallback={<div className="py-12 text-center text-muted-foreground">{t.bebidas.loading}</div>}>
              <CartaBebidas showAddButton />
            </Suspense>
          </motion.div>
        )}
        {/* Botón flotante del ticket disponible en toda la carta */}
        {shouldRenderPreview && (
          <Suspense fallback={null}>
            <PreviewPedido showFloatingButton hideInline />
          </Suspense>
        )}

      </motion.div>
    </section>
  );
};

export default CartaSection;
