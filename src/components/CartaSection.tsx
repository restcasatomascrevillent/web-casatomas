import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed, Wine, Receipt } from "lucide-react";
import CartaPlatos from "./carta/CartaPlatos";
import CartaVinos from "./carta/CartaVinos";
import PreviewPedido from "./carta/PreviewPedido";

type Section = "platos" | "vinos" | "pedido" | null;

const CartaSection = () => {
  const [activeSection, setActiveSection] = useState<Section>(null);
  const [pedidoCount, setPedidoCount] = useState(0);

  useEffect(() => {
    const updatePedidoCount = () => {
      const saved = JSON.parse(localStorage.getItem('pedido') || '[]');
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
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">Nuestra Carta</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Descubre nuestra selección de platos y vinos cuidadosamente elegidos
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
              Carta de Platos
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
              Carta de Vinos
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
              Mi Pedido
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

        {activeSection === "pedido" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-center mb-6">Arma tu pedido</h3>
              <CartaPlatos showAddButton={true} />
            </div>
            <div className="mt-12">
              <PreviewPedido showFloatingButton={true} />
            </div>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
};

export default CartaSection;
