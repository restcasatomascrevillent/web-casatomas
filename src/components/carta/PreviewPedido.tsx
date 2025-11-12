import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Receipt } from "lucide-react";
import { motion } from "framer-motion";

const PreviewPedido = () => {
  const [pedido, setPedido] = useState<any[]>([]);

  useEffect(() => {
    const loadPedido = () => {
      const saved = JSON.parse(localStorage.getItem('pedido') || '[]');
      setPedido(saved);
    };
    
    loadPedido();
    
    // Listen for changes
    window.addEventListener('storage', loadPedido);
    return () => window.removeEventListener('storage', loadPedido);
  }, []);

  const removeItem = (index: number) => {
    const newPedido = pedido.filter((_, i) => i !== index);
    setPedido(newPedido);
    localStorage.setItem('pedido', JSON.stringify(newPedido));
  };

  const clearPedido = () => {
    setPedido([]);
    localStorage.setItem('pedido', JSON.stringify([]));
  };

  const total = pedido.reduce((sum, item) => sum + (item.price_eur || 0), 0);

  if (pedido.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-xl text-muted-foreground">
          Tu preview de pedido está vacío
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Añade platos desde la carta para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-background to-muted border-2 border-accent/20">
          <CardHeader className="border-b-2 border-dashed border-accent/30">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-6 h-6 text-accent" />
                Preview del Pedido
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearPedido}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar
              </Button>
            </div>
            <p className="text-sm text-muted-foreground font-mono mt-2">
              Casa Tomás Restaurante
            </p>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-3 font-mono text-sm">
            {pedido.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex justify-between items-start gap-4 pb-2 border-b border-dashed border-border"
              >
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  {item.category && (
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold whitespace-nowrap">
                    {item.price_eur?.toFixed(2)}€
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </CardContent>

          <CardFooter className="border-t-2 border-dashed border-accent/30 flex-col items-stretch">
            <div className="flex justify-between items-center font-mono text-lg font-bold pt-4">
              <span>TOTAL</span>
              <span className="text-accent text-2xl">{total.toFixed(2)}€</span>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4 font-sans">
              * Este es un preview. Confirma tu pedido con el camarero
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default PreviewPedido;
