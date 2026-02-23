import { motion } from "framer-motion";
import { Suspense, lazy, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Wine, Beer } from "lucide-react";
import { getUserPedido } from "@/utils/sessionManager";
import { useTranslations } from "@/i18n/LanguageProvider";

type Section = "platos" | "vinos" | "bebidas" | null;
const CartaPlatos = lazy(() => import("./carta/CartaPlatos"));
const CartaVinos = lazy(() => import("./carta/CartaVinos"));
const CartaBebidas = lazy(() => import("./carta/CartaBebidas"));
const PreviewPedido = lazy(() => import("./carta/PreviewPedido"));

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

        {/* Contenido de las secciones */}
        {activeSection === "platos" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Suspense fallback={<div className="py-12 text-center text-muted-foreground">{t.platos.loading}</div>}>
              <CartaPlatos showAddButton />
            </Suspense>
          </motion.div>
        )}

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
