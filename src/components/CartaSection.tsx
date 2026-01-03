import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed, Wine, Receipt, Beer } from "lucide-react";
import CartaPlatos from "./carta/CartaPlatos";
import CartaVinos from "./carta/CartaVinos";
import CartaBebidas from "./carta/CartaBebidas";
import PreviewPedido from "./carta/PreviewPedido";
import { getUserPedido } from "@/utils/sessionManager";
import { useTranslations } from "@/i18n/LanguageProvider";

type Section = "platos" | "vinos" | "bebidas" | "pedido" | null;
type PedidoSubSection = "platos" | "vinos" | "bebidas" | null;

const CartaSection = () => {
  const { t } = useTranslations();
  const [activeSection, setActiveSection] = useState<Section>(null);
  const [pedidoSubSection, setPedidoSubSection] = useState<PedidoSubSection>(null);
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

          <div className="relative">
            <Button
              size="lg"
              variant="outline"
              onClick={() => setActiveSection(activeSection === "pedido" ? null : "pedido")}
              className={`px-8 py-6 text-lg font-semibold rounded-full border-2 transition-all duration-300 hover:scale-105 ${
                activeSection === "pedido" 
                  ? "bg-accent/10 border-accent text-accent" 
                  : "border-border"
              }`}
            >
              <Receipt className="w-5 h-5 mr-2" />
              {t.carta.buttons.pedido}
            </Button>
            {pedidoCount > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center rounded-full bg-accent text-accent-foreground p-0 animate-scale-in"
              >
                {pedidoCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Contenido de las secciones */}
        {activeSection === "platos" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <CartaPlatos showAddButton={false} />
          </motion.div>
        )}

        {activeSection === "vinos" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <CartaVinos />
          </motion.div>
        )}

        {activeSection === "bebidas" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <CartaBebidas showAddButton={false} />
          </motion.div>
        )}

        {activeSection === "pedido" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Botones de subsección dentro de Mi Pedido */}
            {!pedidoSubSection ? (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    onClick={() => setPedidoSubSection("platos")}
                    className="px-8 py-6 text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  >
                    <UtensilsCrossed className="w-5 h-5 mr-2" />
                    {t.carta.pedido.addPlatos}
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => setPedidoSubSection("vinos")}
                    className="px-8 py-6 text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  >
                    <Wine className="w-5 h-5 mr-2" />
                    {t.carta.pedido.addVinos}
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => setPedidoSubSection("bebidas")}
                    className="px-8 py-6 text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  >
                    <Beer className="w-5 h-5 mr-2" />
                    {t.carta.pedido.addBebidas}
                  </Button>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-center mb-6">{t.carta.pedido.yourOrder}</h3>
                  <PreviewPedido showFloatingButton={true} />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <Button
                  variant="outline"
                  onClick={() => setPedidoSubSection(null)}
                  className="mb-4"
                >
                  ← {t.carta.pedido.backToOrder}
                </Button>
                {pedidoSubSection === "platos" && (
                  <div>
                    <h3 className="text-2xl font-bold text-center mb-6">{t.carta.pedido.addPlatos}</h3>
                    <CartaPlatos showAddButton={true} />
                  </div>
                )}
                {pedidoSubSection === "vinos" && (
                  <div>
                    <h3 className="text-2xl font-bold text-center mb-6">{t.carta.pedido.addVinos}</h3>
                    <CartaVinos showAddButton={true} />
                  </div>
                )}
                {pedidoSubSection === "bebidas" && (
                  <div>
                    <h3 className="text-2xl font-bold text-center mb-6">{t.carta.pedido.addBebidas}</h3>
                    <CartaBebidas showAddButton={true} />
                  </div>
                )}
                {/* Mantener el botón flotante del ticket visible mientras se añaden artículos */}
                <PreviewPedido showFloatingButton hideInline />
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
};

export default CartaSection;
