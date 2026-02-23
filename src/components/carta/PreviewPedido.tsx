import { Suspense, lazy, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Trash2, Receipt, Plus, Minus, X, Share2, MessageCircle, Instagram, Facebook, Bot } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

const AIChatbot = lazy(() => import("../AIChatbot"));

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
  const { toast } = useToast();
  const ticketRef = useRef<HTMLDivElement | null>(null);
  const ticketItemsRef = useRef<HTMLDivElement | null>(null);
  const localeByLanguage: Record<typeof language, string> = {
    es: "es-ES",
    en: "en-US",
    fr: "fr-FR",
  };
  const [pedido, setPedido] = useState<PedidoItem[]>([]);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatTicketImage, setChatTicketImage] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<number, string>>({});

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

  const captureTicketAsImage = async () => {
    if (!ticketRef.current) throw new Error("Ticket no disponible para captura");
    const node = ticketRef.current;
    const timestamp = new Date().toISOString().replace(/[:.-]/g, "");
    const filename = `ticket_${timestamp}.png`;
    const { toPng } = await import("html-to-image");

    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      style: { padding: "16px", background: "#f8f8f8" },
    });

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: "image/png" });
    return { dataUrl, file, filename };
  };

  const shareTicket = async (channel: "whatsapp" | "instagram" | "facebook") => {
    try {
      setShareError(null);
      setShareLoading(true);
      const { file } = await captureTicketAsImage();
      const shareText = t.preview.share.shareMessage;
      const canShareFile = typeof navigator !== "undefined" && "canShare" in navigator && navigator.canShare({ files: [file] });

      if (canShareFile) {
        await navigator.share({
          files: [file],
          text: shareText,
          title: t.carta.buttons.pedido,
        });
        return;
      }

      const blobUrl = URL.createObjectURL(file);
      if (channel === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
      } else if (channel === "instagram") {
        window.open(blobUrl, "_blank");
      } else {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, "_blank");
      }
      toast({
        title: t.preview.share.downloadTitle,
        description: t.preview.share.downloadDescription,
      });
    } catch (error) {
      console.error(error);
      setShareError(t.preview.share.error);
      toast({
        title: t.preview.share.errorTitle,
        description: t.preview.share.error,
        variant: "destructive",
      });
    } finally {
      setShareLoading(false);
    }
  };

  const captureTicketItemsAsImage = async (): Promise<string | null> => {
    if (!ticketItemsRef.current || pedido.length === 0) return null;
    const { toPng } = await import("html-to-image");
    return toPng(ticketItemsRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      style: { background: "#ffffff", padding: "8px" },
    });
  };

  const handleOpenChatbot = async () => {
    try {
      setChatTicketImage(null);
      const itemsImage = await captureTicketItemsAsImage();
      setChatTicketImage(itemsImage);
    } catch (error) {
      console.error("No se pudo generar la imagen de alimentos del ticket:", error);
      setChatTicketImage(null);
    } finally {
      setIsChatOpen(true);
    }
  };

  const removeItem = (index: number) => {
    const newPedido = pedido.filter((_, i) => i !== index);
    setPedido(newPedido);
    setUserPedido(newPedido);
  };

  const clearPedido = () => {
    setPedido([]);
    setUserPedido([]);
  };

  const updateCantidad = (index: number, newCantidad: number) => {
    if (newCantidad < 0.01) return;
    const newPedido = [...pedido];
    newPedido[index] = { ...newPedido[index], cantidad: newCantidad };
    setPedido(newPedido);
    setUserPedido(newPedido);
  };

  const getUnitConfig = (unidad?: string) => {
    if (unidad === "kg") {
      return {
        defaultAmount: 1,
        step: 0.1,
        minValue: 0.1,
        isWeight: true,
        format: (val: number) => `${val.toFixed(1).replace(/\.0$/, "")} kg`,
        priceLabel: "/kg",
        decimals: 1,
      };
    }
    if (unidad === "100 g" || unidad === "100g") {
      return {
        defaultAmount: 100,
        step: 10,
        minValue: 10,
        isWeight: true,
        format: (val: number) => `${val} g`,
        priceLabel: "/100g",
        decimals: 0,
      };
    }
    if (unidad === "unidad" || unidad === "ud" || unidad === "ud.") {
      return {
        defaultAmount: 1,
        step: 1,
        minValue: 1,
        isWeight: false,
        format: (val: number) => `${Math.max(1, Math.round(val))} ud.`,
        priceLabel: "/ud",
        decimals: 0,
      };
    }
    return {
      defaultAmount: 1,
      step: 1,
      minValue: 1,
      isWeight: false,
      format: (val: number) => `${Math.max(1, Math.round(val))}`,
      priceLabel: "",
      decimals: 0,
    };
  };

  const calculateSubtotal = (item: PedidoItem) => {
    const config = getUnitConfig(item.unidad);
    const cantidad = item.cantidad ?? config.defaultAmount;
    if (item.unidad === "kg") {
      return cantidad * (item.precio_eur || 0);
    }
    if (item.unidad === "100 g" || item.unidad === "100g") {
      return (cantidad / 100) * (item.precio_eur || 0);
    }
    return cantidad * (item.precio_eur || 0);
  };

  const incrementCantidad = (index: number) => {
    const item = pedido[index];
    const config = getUnitConfig(item.unidad);
    const currentCantidad = item.cantidad ?? config.defaultAmount;
    const newValue = parseFloat((currentCantidad + config.step).toFixed(config.decimals));
    updateCantidad(index, newValue);
  };

  const decrementCantidad = (index: number) => {
    const item = pedido[index];
    const config = getUnitConfig(item.unidad);
    const currentCantidad = item.cantidad ?? config.defaultAmount;
    const newValue = Math.max(config.minValue, parseFloat((currentCantidad - config.step).toFixed(config.decimals)));
    updateCantidad(index, newValue);
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
    return sum + calculateSubtotal(item);
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
    <div className="max-w-md mx-auto" ref={ticketRef}>{empty}</div>
  ) : (
    <div
      ref={ticketRef}
      className="bg-white text-black p-6 rounded-lg shadow-lg text-xs border-2 border-dashed border-gray-300"
    >
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
      <div ref={ticketItemsRef} className="space-y-3 mb-3">
        {pedido.map((item, index) => {
          const config = getUnitConfig(item.unidad);
          const cantidad = item.cantidad ?? config.defaultAmount;
          const subtotal = calculateSubtotal(item);
          const priceLabel =
            item.unidad === "kg" ? "/kg" : item.unidad === "100 g" || item.unidad === "100g" ? "/100g" : item.unidad === "unidad" ? "/ud" : "";

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
                    disabled={cantidad <= config.minValue}
                    className="h-5 w-5 p-0 border-black"
                  >
                    <Minus className="h-2 w-2" />
                  </Button>

                  <Input
                    type="number"
                    onChange={(e) => {
                      const val = e.target.value;
                      // Permitir vacío y solo dígitos/punto
                      if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                        setInputValues((prev) => ({ ...prev, [index]: val }));
                      }
                    }}
                    onBlur={(e) => {
                      const val = e.target.value;
                      const parsed = parseFloat(val);
                      if (val === "" || !Number.isFinite(parsed) || parsed < config.minValue) {
                        updateCantidad(index, config.defaultAmount);
                      } else {
                        const factor = Math.pow(10, config.decimals);
                        const rounded = Math.round(parsed * factor) / factor;
                        updateCantidad(index, rounded);
                      }
                      setInputValues((prev) => {
                        const next = { ...prev };
                        delete next[index];
                        return next;
                      });
                    }}
                    value={inputValues[index] ?? cantidad}
                    className="w-16 h-5 text-center text-[10px] border-black"
                    min={config.minValue}
                    step={config.step}
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => incrementCantidad(index)}
                    className="h-5 w-5 p-0 border-black"
                  >
                    <Plus className="h-2 w-2" />
                  </Button>

                  {item.unidad && <span className="text-[9px] ml-1">{item.unidad}</span>}
                </div>

                <div className="text-right">
                  <p className="text-[9px] text-gray-600">
                    {config.format(cantidad)} x {item.precio_eur?.toFixed(2)}€{priceLabel}
                  </p>
                  <p className="font-bold text-[11px]">{subtotal.toFixed(2)}€</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CT AI Button with Prompt */}
      <div className="flex items-center justify-center gap-4 mb-5 px-1">
        <p className="text-[10px] text-gray-500 italic text-center leading-tight max-w-[180px]">
          "{t.preview.aiPrompt}"
        </p>
        <Button
          onClick={handleOpenChatbot}
          className="w-auto px-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 text-[11px] shadow-md hover:shadow-lg transition-all duration-300 flex-shrink-0"
        >
          <Bot className="w-4 h-4 mr-2" />
          {t.hero.ctaAi}
        </Button>
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

      <div className="text-center mt-4 space-y-2">
        <p className="text-[10px]">********************************</p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => shareTicket("whatsapp")}
            disabled={shareLoading}
            className="text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50"
            aria-label="Compartir por WhatsApp"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          <button
            onClick={() => shareTicket("instagram")}
            disabled={shareLoading}
            className="text-pink-600 hover:text-pink-700 transition-colors disabled:opacity-50"
            aria-label="Compartir por Instagram"
          >
            <Instagram className="h-5 w-5" />
          </button>
          <button
            onClick={() => shareTicket("facebook")}
            disabled={shareLoading}
            className="text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
            aria-label="Compartir por Facebook"
          >
            <Facebook className="h-5 w-5" />
          </button>
        </div>
        {shareLoading && <p className="text-xs text-muted-foreground">{t.preview.share.generating}</p>}
        {shareError && <p className="text-xs text-destructive">{shareError}</p>}
        <p className="text-[10px]">********************************</p>
      </div>

      <div className="text-center mt-3 space-y-1">
        <p className="text-[9px] mt-1">{t.preview.thanks}</p>
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
        lockOutsideInteractions={isChatOpen}
      >
        {ticketCard}
      </TicketDialog>

      {isChatOpen && (
        <Suspense fallback={null}>
          <AIChatbot
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            initialTicketImage={chatTicketImage}
            initialGreeting="Hola! Soy Casa Tomas AI, ¿Con qué te puedo ayudar?"
          />
        </Suspense>
      )}
    </>
  );
};

export default PreviewPedido;

type FloatingButtonProps = {
  onOpen: () => void;
  isDisabled?: boolean;
  count?: number;
};

const FloatingTicketButton = ({ onOpen, isDisabled = false, count = 0 }: FloatingButtonProps) => {
  const { t } = useTranslations();
  return (
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
          <span className="text-xs font-semibold">{t.preview.floatingTicketTitle}</span>
          <span className="text-[11px] text-muted-foreground">{t.preview.floatingTicketSubtitle}</span>
        </div>
        {count > 0 && (
          <span className="ml-1 inline-flex h-6 px-2 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
            {count}
          </span>
        )}
      </Button>
    </div>
  );
};

type TicketDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  lockOutsideInteractions?: boolean;
  children: React.ReactNode;
};

const TicketDialog = ({
  open,
  onOpenChange,
  title,
  description,
  lockOutsideInteractions = false,
  children,
}: TicketDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        onPointerDownOutside={(event) => {
          if (lockOutsideInteractions) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (lockOutsideInteractions) event.preventDefault();
        }}
        className="sm:max-w-xl p-0 overflow-hidden bg-transparent border-none shadow-none [&>button.absolute]:hidden data-[state=open]:bg-transparent"
      >
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
          <div className="p-4 sm:p-6 max-h-[70vh] overflow-auto space-y-4">{children}</div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
