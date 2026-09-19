import { motion } from "framer-motion";
import { Suspense, lazy, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Wine, Beer, ArrowRight } from "lucide-react";
import { getUserPedido } from "@/utils/sessionManager";
import { useTranslations } from "@/i18n/LanguageProvider";
// Import estático a propósito: `CartaPlatos` se monta siempre (ver abajo) y el
// SSG tiene que poder renderizarlo para que sus tarjetas queden en el HTML.
import CartaPlatos from "./carta/CartaPlatos";
import { semillaCategoriaInicial } from "@/lib/carta-ssg";
import {
  CATEGORIAS_CARTA,
  etiquetaCategoria,
  RESUMEN_BEBIDAS,
  RESUMEN_VINOS,
  rutaCategoria,
  TOTAL_CARTA,
} from "@/lib/carta-rutas";
import type { CartaPlatosSeed } from "./carta/CartaPlatos";

type Section = "platos" | "vinos" | "bebidas" | null;
const CartaVinos = lazy(() => import("./carta/CartaVinos"));
const CartaBebidas = lazy(() => import("./carta/CartaBebidas"));
const PreviewPedido = lazy(() => import("./carta/PreviewPedido"));

// La carta que descargó el build. Se calcula una sola vez por módulo: es un
// valor estático, idéntico en Node y en el navegador.
const PLATOS_SSG = semillaCategoriaInicial() as CartaPlatosSeed;

const CartaSection = () => {
  const { t } = useTranslations();
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

        {/* Botones principales */}
        <div className="flex flex-col items-center gap-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              onClick={() => setActiveSection(activeSection === "platos" ? null : "platos")}
              className={`px-8 py-6 text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 ${
                activeSection === "platos" 
                  ? "bg-accent hover:bg-accent/90 text-accent-foreground" 
                  : "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              }`}
            >
              <UtensilsCrossed className="w-5 h-5 mr-2" />
              {t.carta.buttons.platos}
            </Button>
            <Button
              size="lg"
              onClick={() => setActiveSection(activeSection === "vinos" ? null : "vinos")}
              className={`px-8 py-6 text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 ${
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
              className={`px-8 py-6 text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 ${
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
        <nav aria-label="Páginas de la carta" className="mb-12">
          <div className="flex justify-center mb-5">
            <Link
              to="/carta"
              className="inline-flex items-center gap-2 text-accent font-semibold hover:underline underline-offset-4 text-base md:text-lg"
            >
              Ver la carta completa · {TOTAL_CARTA} referencias
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {CATEGORIAS_CARTA.map((categoria) => (
              <li key={categoria.slug}>
                <Link
                  to={rutaCategoria(categoria.slug)}
                  className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:border-accent/40 hover:text-foreground"
                >
                  {etiquetaCategoria(categoria.clave)}
                  <span className="text-xs font-semibold text-accent">{categoria.total}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/carta/vinos"
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:border-accent/40 hover:text-foreground"
              >
                Vinos
                <span className="text-xs font-semibold text-accent">{RESUMEN_VINOS.total}</span>
              </Link>
            </li>
            <li>
              <Link
                to="/carta/bebidas"
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:border-accent/40 hover:text-foreground"
              >
                Bebidas
                <span className="text-xs font-semibold text-accent">{RESUMEN_BEBIDAS.total}</span>
              </Link>
            </li>
          </ul>
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
