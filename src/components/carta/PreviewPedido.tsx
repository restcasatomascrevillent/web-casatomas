import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Receipt, Plus, Minus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getUserPedido, setUserPedido } from "@/utils/sessionManager";
import seafoodImg from "@/assets/platos/seafood.jpg";
import meatImg from "@/assets/platos/meat.jpg";
import saladImg from "@/assets/platos/salad.jpg";
import riceImg from "@/assets/platos/rice.jpg";
import dessertImg from "@/assets/platos/dessert.jpg";
import appetizerImg from "@/assets/platos/appetizer.jpg";

interface PedidoItem {
  nombre: string;
  precio_eur: number;
  categoria?: string;
  unidad?: string;
  cantidad?: number;
}

interface PreviewPedidoProps {
  showFloatingButton?: boolean;
}

const PreviewPedido = ({ showFloatingButton = false }: PreviewPedidoProps) => {
  const [pedido, setPedido] = useState<PedidoItem[]>([]);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(() => {
    return localStorage.getItem('hidePedidoBanner') !== 'true';
  });
  const [showTooltip, setShowTooltip] = useState(true);

  useEffect(() => {
    // Ocultar el tooltip después de 3 segundos
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadPedido = () => {
      const saved = getUserPedido();
      setPedido(saved);
    };
    
    loadPedido();
    
    // Listen for changes
    window.addEventListener('storage', loadPedido);
    window.addEventListener('pedidoUpdated', loadPedido);
    return () => {
      window.removeEventListener('storage', loadPedido);
      window.removeEventListener('pedidoUpdated', loadPedido);
    };
  }, []);

  const removeItem = (index: number) => {
    const newPedido = pedido.filter((_, i) => i !== index);
    setPedido(newPedido);
    setUserPedido(newPedido);
  };

  const clearPedido = () => {
    setPedido([]);
    setUserPedido([]);
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
    setUserPedido(newPedido);
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

  const getCategoryImage = (categoria?: string) => {
    if (!categoria) return appetizerImg;
    const cat = categoria.toUpperCase();
    if (cat.includes('MARISCO') || cat.includes('PESCADO')) return seafoodImg;
    if (cat.includes('CARNE')) return meatImg;
    if (cat.includes('ENSALADA')) return saladImg;
    if (cat.includes('ARROZ')) return riceImg;
    if (cat.includes('POSTRE')) return dessertImg;
    if (cat.includes('ENTRANTE') || cat.includes('SNACK') || cat.includes('SALAZÓN')) return appetizerImg;
    return appetizerImg;
  };

  const total = pedido.reduce((sum, item) => {
    const cantidad = item.cantidad || 1;
    return sum + (item.precio_eur || 0) * cantidad;
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
    <div className="space-y-4 font-mono text-sm">
      <div className="border-b-2 border-dashed border-border pb-2">
        <p className="font-bold">Casa Tomás Restaurante</p>
        <p className="text-xs text-muted-foreground">Preview de Pedido</p>
      </div>
      
      {pedido.map((item, index) => {
        const cantidad = item.cantidad || 1;
        const subtotal = (item.precio_eur || 0) * cantidad;
        const isWeight = item.unidad === 'kg' || item.unidad === 'g';
        
        return (
          <div key={index} className="space-y-3 pb-4 border-b border-dashed border-border">
            <div className="flex gap-3">
              <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                <img 
                  src={getCategoryImage(item.categoria)} 
                  alt={item.nombre}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate">{item.nombre}</p>
                    {item.categoria && (
                      <p className="text-xs text-muted-foreground truncate">{item.categoria}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between mt-2 gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => decrementCantidad(index)}
                      disabled={cantidad <= 1 || isWeight}
                      className="h-7 w-7 p-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    
                    <Input
                      type="number"
                      value={cantidad}
                      onChange={(e) => updateCantidad(index, parseFloat(e.target.value))}
                      className="w-16 h-7 text-center text-xs"
                      min="0.01"
                      step={isWeight ? "0.1" : "1"}
                    />
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => incrementCantidad(index)}
                      disabled={isWeight}
                      className="h-7 w-7 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    
                    {item.unidad && (
                      <span className="text-xs text-muted-foreground ml-1">
                        {item.unidad}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {item.precio_eur?.toFixed(2)}€ × {cantidad.toFixed(isWeight ? 2 : 0)}
                    </p>
                    <p className="font-bold text-accent">
                      {subtotal.toFixed(2)}€
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      <div className="border-t-2 border-dashed border-border pt-4">
        <div className="flex justify-between items-center">
          <span className="font-bold text-lg">TOTAL:</span>
          <span className="font-bold text-2xl text-accent">{total.toFixed(2)}€</span>
        </div>
      </div>
      
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          onClick={clearPedido}
          className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Vaciar Pedido
        </Button>
      </div>
      
      <div className="text-xs text-muted-foreground text-center pt-2 border-t border-dashed border-border">
        <p>Preview de pedido - No vinculante</p>
        <p>Confirma con el camarero</p>
      </div>
    </div>
  );
};

export default PreviewPedido;
