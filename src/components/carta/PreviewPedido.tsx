import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Receipt, Plus, Minus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PedidoItem {
  name: string;
  price_eur: number;
  category?: string;
  unidad?: string;
  cantidad?: number;
}

const PreviewPedido = () => {
  const [pedido, setPedido] = useState<PedidoItem[]>([]);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(() => {
    return localStorage.getItem('hidePedidoBanner') !== 'true';
  });
  const [showTooltip, setShowTooltip] = useState(true);

  useEffect(() => {
    // Ocultar el tooltip después de 5 segundos
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

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

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('hidePedidoBanner', 'true');
  };

  const updateCantidad = (index: number, newCantidad: number) => {
    if (newCantidad < 0.01) return;
    const newPedido = [...pedido];
    newPedido[index] = { ...newPedido[index], cantidad: newCantidad };
    setPedido(newPedido);
    localStorage.setItem('pedido', JSON.stringify(newPedido));
  };

  const incrementCantidad = (index: number) => {
    const item = pedido[index];
    const currentCantidad = item.cantidad || 1;
    const increment = item.unidad === 'kg' || item.unidad === 'g' ? 0.1 : 1;
    updateCantidad(index, currentCantidad + increment);
  };

  const decrementCantidad = (index: number) => {
    const item = pedido[index];
    const currentCantidad = item.cantidad || 1;
    const decrement = item.unidad === 'kg' || item.unidad === 'g' ? 0.1 : 1;
    const newCantidad = Math.max(0.1, currentCantidad - decrement);
    updateCantidad(index, newCantidad);
  };

  const total = pedido.reduce((sum, item) => {
    const cantidad = item.cantidad || 1;
    return sum + (item.price_eur || 0) * cantidad;
  }, 0);

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
    <>
      {/* Banner informativo */}
      <AnimatePresence>
        {showBanner && pedido.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4"
          >
            <div className="bg-accent text-accent-foreground rounded-lg shadow-lg p-4 flex items-start gap-3">
              <Receipt className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm flex-1">
                Tu pedido está guardado. Toca el botón flotante para ver y editar el ticket completo.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissBanner}
                className="h-6 w-6 p-0 hover:bg-accent-foreground/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón flotante */}
      {pedido.length > 0 && (
        <Dialog open={isTicketOpen} onOpenChange={setIsTicketOpen}>
          <DialogTrigger asChild>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="fixed bottom-6 right-6 z-50"
            >
              {/* Tooltip/bocadillo */}
              <AnimatePresence>
                {showTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full right-0 mb-3 w-48"
                  >
                    <div className="bg-accent text-accent-foreground rounded-lg shadow-xl p-3 relative">
                      <p className="text-sm font-medium text-center">
                        Aquí se ve la previsualización
                      </p>
                      {/* Flecha del bocadillo */}
                      <div className="absolute -bottom-2 right-6 w-4 h-4 bg-accent transform rotate-45"></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <Button
                size="lg"
                className="h-14 w-14 rounded-full shadow-2xl bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Receipt className="w-6 h-6" />
              </Button>
            </motion.div>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-6 h-6 text-accent" />
                Ticket del Pedido
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 font-mono text-sm">
              <div className="border-b-2 border-dashed border-border pb-2">
                <p className="font-bold">Casa Tomás Restaurante</p>
                <p className="text-xs text-muted-foreground">Preview de Pedido</p>
              </div>
              
              {pedido.map((item, index) => {
                const cantidad = item.cantidad || 1;
                const subtotal = (item.price_eur || 0) * cantidad;
                const isWeight = item.unidad === 'kg' || item.unidad === 'g';
                
                return (
                  <div key={index} className="space-y-2 pb-3 border-b border-dashed border-border">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        {item.category && (
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => decrementCantidad(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        
                        <Input
                          type="number"
                          step={isWeight ? "0.1" : "1"}
                          min="0.1"
                          value={cantidad.toFixed(isWeight ? 1 : 0)}
                          onChange={(e) => updateCantidad(index, parseFloat(e.target.value) || 0.1)}
                          className="w-20 h-8 text-center font-mono"
                        />
                        
                        <span className="text-xs text-muted-foreground min-w-[30px]">
                          {item.unidad || 'ud'}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => incrementCantidad(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {item.price_eur?.toFixed(2)}€ × {cantidad.toFixed(isWeight ? 1 : 0)}
                        </p>
                        <p className="font-bold">
                          {subtotal.toFixed(2)}€
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="pt-4 border-t-2 border-dashed border-border">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>TOTAL</span>
                  <span className="text-accent text-2xl">{total.toFixed(2)}€</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={clearPedido}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpiar Todo
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center pt-2 font-sans">
                * Este es un preview. Confirma tu pedido con el camarero
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Vista de resumen */}
      <div className="max-w-2xl mx-auto">
        {pedido.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">
              Tu preview de pedido está vacío
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Añade platos desde la carta para comenzar
            </p>
          </div>
        ) : (
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
                {pedido.map((item, index) => {
                  const cantidad = item.cantidad || 1;
                  const subtotal = (item.price_eur || 0) * cantidad;
                  
                  return (
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
                        <p className="text-xs text-muted-foreground">
                          {cantidad.toFixed(item.unidad === 'kg' || item.unidad === 'g' ? 1 : 0)} {item.unidad || 'ud'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold whitespace-nowrap">
                          {subtotal.toFixed(2)}€
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
                  );
                })}
              </CardContent>

              <CardFooter className="border-t-2 border-dashed border-accent/30 flex-col items-stretch">
                <div className="flex justify-between items-center font-mono text-lg font-bold pt-4">
                  <span>TOTAL</span>
                  <span className="text-accent text-2xl">{total.toFixed(2)}€</span>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-4 font-sans">
                  * Toca el botón flotante para ver y editar el ticket completo
                </p>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </div>
    </>
  );
};

export default PreviewPedido;
