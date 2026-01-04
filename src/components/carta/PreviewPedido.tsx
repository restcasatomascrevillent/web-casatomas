import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Trash2, Receipt, Plus, Minus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getUserPedido, setUserPedido } from "@/utils/sessionManager";
import seafoodImg from "@/assets/platos/seafood.jpg";
import meatImg from "@/assets/platos/meat.jpg";
import saladImg from "@/assets/platos/salad.jpg";
import riceImg from "@/assets/platos/rice.jpg";
import dessertImg from "@/assets/platos/dessert.jpg";
import appetizerImg from "@/assets/platos/appetizer.jpg";
import logoImg from "@/assets/logo-casa-tomas.png";
import { useTranslations } from "@/i18n/LanguageProvider";

interface PedidoItem {
  nombre: string;
  precio_eur: number;
  categoria?: string;
  unidad?: string;
  cantidad?: number;
}

interface PreviewPedidoProps {
  showFloatingButton?: boolean;
  hideInline?: boolean;
}

const PreviewPedido = ({ showFloatingButton = false, hideInline = false }: PreviewPedidoProps) => {
  const { t, language } = useTranslations();
  const localeByLanguage: Record<typeof language, string> = {
    es: "es-ES",
    en: "en-US",
    fr: "fr-FR",
  };
  const [pedido, setPedido] = useState<PedidoItem[]>([]);
  const [isTicketOpen, setIsTicketOpen] = useState(false);

  useEffect(() => {
    const loadPedido = () => {
      const saved = getUserPedido();
      setPedido(saved);
    };

    loadPedido();

    // Listen for changes
    window.addEventListener("storage", loadPedido);
    window.addEventListener("pedidoUpdated", loadPedido);
    return () => {
      window.removeEventListener("storage", loadPedido);
      window.removeEventListener("pedidoUpdated", loadPedido);
    };
  }, []);

  useEffect(() => {
    if (pedido.length === 0 && isTicketOpen) {
      setIsTicketOpen(false);
    }
  }, [pedido.length, isTicketOpen]);

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
    localStorage.setItem("hidePedidoBanner", "true");
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
    const increment = item.unidad === "kg" || item.unidad === "g" ? 0.1 : 1;
    updateCantidad(index, currentCantidad + increment);
  };

  const decrementCantidad = (index: number) => {
    const item = pedido[index];
    const currentCantidad = item.cantidad || 1;
    const decrement = item.unidad === "kg" || item.unidad === "g" ? 0.1 : 1;
    const newCantidad = Math.max(0.1, currentCantidad - decrement);
    updateCantidad(index, newCantidad);
  };

  const getCategoryImage = (categoria?: string) => {
    if (!categoria) return appetizerImg;
    const cat = categoria.toUpperCase();
    if (cat.includes("MARISCO") || cat.includes("PESCADO")) return seafoodImg;
    if (cat.includes("CARNE")) return meatImg;
    if (cat.includes("ENSALADA")) return saladImg;
    if (cat.includes("ARROZ")) return riceImg;
    if (cat.includes("POSTRE")) return dessertImg;
    if (cat.includes("ENTRANTE") || cat.includes("SNACK") || cat.includes("SALAZÓN")) return appetizerImg;
    return appetizerImg;
  };

  const total = pedido.reduce((sum, item) => {
    const cantidad = item.cantidad || 1;
    return sum + (item.precio_eur || 0) * cantidad;
  }, 0);

  const translateCategory = (category?: string) => {
    if (!category) return "";
    return (
      t.categories.platos[category as keyof typeof t.categories.platos] ||
      t.categories.bebidas[category as keyof typeof t.categories.bebidas] ||
      (category === "Todos" ? t.vinos.categoriesAll : category)
    );
  };

  const empty = (
    <div className="text-center py-12">
      <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <p className="text-xl text-muted-foreground">{t.preview.emptyTitle}</p>
      <p className="text-sm text-muted-foreground mt-2">{t.preview.emptySubtitle}</p>
    </div>
  );

  const ticketCard = pedido.length === 0 ? (
    <div className="max-w-md mx-auto">{empty}</div>
  ) : (
    <div className="bg-white text-black p-6 rounded-lg shadow-lg font-mono text-xs border-2 border-dashed border-gray-300">
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-3 mb-3">
        <div className="flex justify-center mb-2">
          <img src={logoImg} alt={t.hero.logoAlt} className="h-24 w-auto object-contain" />
        </div>
        <p className="text-[10px] mt-2">================================</p>
        <p className="text-[10px] mt-1">
          {new Date().toLocaleDateString(localeByLanguage[language], {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <p className="text-[10px]">================================</p>
      </div>

      {/* Items */}
      <div className="space-y-3 mb-3">
        {pedido.map((item, index) => {
          const cantidad = item.cantidad || 1;
          const subtotal = (item.precio_eur || 0) * cantidad;
          const isWeight = item.unidad === "kg" || item.unidad === "g";

          return (
            <div key={index} className="border-b border-dashed border-gray-400 pb-2">
              {/* Nombre del producto */}
              <div className="flex justify-between items-start mb-1">
                <p className="font-bold text-[11px] uppercase flex-1 pr-2 leading-tight">{item.nombre}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="h-5 w-5 p-0 hover:bg-red-100 text-red-600 flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Categoría si existe */}
              {item.categoria && (
                <p className="text-[9px] text-gray-600 mb-1">({translateCategory(item.categoria)})</p>
              )}

              {/* Cantidad y controles */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => decrementCantidad(index)}
                    disabled={cantidad <= 1 || isWeight}
                    className="h-5 w-5 p-0 border-black"
                  >
                    <Minus className="h-2 w-2" />
                  </Button>

                  <Input
                    type="number"
                    value={cantidad}
                    onChange={(e) => updateCantidad(index, parseFloat(e.target.value))}
                    className="w-12 h-5 text-center text-[10px] border-black"
                    min="0.01"
                    step={isWeight ? "0.1" : "1"}
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => incrementCantidad(index)}
                    disabled={isWeight}
                    className="h-5 w-5 p-0 border-black"
                  >
                    <Plus className="h-2 w-2" />
                  </Button>

                  {item.unidad && <span className="text-[9px] ml-1">{item.unidad}</span>}
                </div>

                <div className="text-right">
                  <p className="text-[9px] text-gray-600">
                    {cantidad.toFixed(isWeight ? 2 : 0)} x {item.precio_eur?.toFixed(2)}€
                  </p>
                  <p className="font-bold text-[11px]">{subtotal.toFixed(2)}€</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="border-t-2 border-black pt-3 mb-3">
        <p className="text-[10px]">================================</p>
        <div className="flex justify-between items-center my-2">
          <span className="font-bold text-sm">{t.preview.totalLabel}:</span>
          <span className="font-bold text-xl">{total.toFixed(2)}€</span>
        </div>
        <p className="text-[10px]">================================</p>
      </div>

      {/* Footer */}
      <div className="text-center text-[9px] text-gray-600 space-y-1 mb-3">
        <p>{t.preview.previewLabel}</p>
        <p>{t.preview.notBinding}</p>
        <p>{t.preview.confirm}</p>
      </div>

      {/* Botón vaciar */}
      <Button
        variant="outline"
        onClick={clearPedido}
        className="w-full border-red-600 text-red-600 hover:bg-red-50 text-xs"
      >
        <Trash2 className="w-3 h-3 mr-2" />
        {t.preview.clear}
      </Button>

      <div className="text-center mt-3">
        <p className="text-[10px]">********************************</p>
        <p className="text-[9px] mt-1">{t.preview.thanks}</p>
        <p className="text-[10px] mt-1">********************************</p>
      </div>
    </div>
  );

  return (
    <>
      {!hideInline && <div className="max-w-md mx-auto">{ticketCard}</div>}

      {showFloatingButton && pedido.length > 0 && (
        <FloatingTicketButton
          onOpen={() => setIsTicketOpen(true)}
          isDisabled={false}
          count={pedido.length}
        />
      )}

      <TicketDialog
        open={isTicketOpen}
        onOpenChange={setIsTicketOpen}
        title={t.carta.buttons.pedido}
        description={t.preview.previewLabel}
      >
        {ticketCard}
      </TicketDialog>
    </>
  );
};

export default PreviewPedido;

type FloatingButtonProps = {
  onOpen: () => void;
  isDisabled?: boolean;
  count?: number;
};

const FloatingTicketButton = ({ onOpen, isDisabled = false, count = 0 }: FloatingButtonProps) => (
  <div className="fixed bottom-5 right-4 md:right-6 z-50">
    <Button
      onClick={onOpen}
      disabled={isDisabled}
      aria-label="Abrir ticket del pedido"
      className="shadow-lg bg-background/90 backdrop-blur border border-border/70 text-foreground hover:shadow-xl rounded-full px-4 py-3.5 min-h-[3.25rem] flex items-center gap-3"
    >
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-accent/15 text-accent">
        <Receipt className="h-5 w-5" />
      </div>
      <div className="flex flex-col items-start leading-tight">
        <span className="text-xs font-semibold">Ticket</span>
        <span className="text-[11px] text-muted-foreground">Ver pedido</span>
      </div>
      {count > 0 && (
        <span className="ml-1 inline-flex h-6 px-2 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
          {count}
        </span>
      )}
    </Button>
  </div>
);

type TicketDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
};

const TicketDialog = ({ open, onOpenChange, title, description, children }: TicketDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-transparent border-none shadow-none [&>button.absolute]:hidden data-[state=open]:bg-transparent">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeInOut" }}
        className="rounded-2xl bg-background shadow-2xl border border-border/60"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-accent/15 text-accent">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold leading-tight">{title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-tight">
                {description}
              </DialogDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-9 w-9 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4 sm:p-6 max-h-[70vh] overflow-auto">{children}</div>
      </motion.div>
    </DialogContent>
  </Dialog>
);
