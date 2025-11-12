import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CartaPlatos from "./carta/CartaPlatos";
import CartaVinos from "./carta/CartaVinos";
import PreviewPedido from "./carta/PreviewPedido";

const CartaSection = () => {
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

        <Tabs defaultValue="platos" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
            <TabsTrigger value="platos">Platos</TabsTrigger>
            <TabsTrigger value="vinos">Vinos</TabsTrigger>
            <TabsTrigger value="preview">Mi Pedido</TabsTrigger>
          </TabsList>
          
          <TabsContent value="platos">
            <CartaPlatos />
          </TabsContent>
          
          <TabsContent value="vinos">
            <CartaVinos />
          </TabsContent>
          
          <TabsContent value="preview">
            <PreviewPedido />
          </TabsContent>
        </Tabs>
      </motion.div>
    </section>
  );
};

export default CartaSection;
