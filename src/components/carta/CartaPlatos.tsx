/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, ChevronDown, UtensilsCrossed, Eye, EyeOff } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserPedido, setUserPedido } from "@/utils/sessionManager";
import seafoodImg from "@/assets/platos/seafood.jpg";
import meatImg from "@/assets/platos/meat.jpg";
import saladImg from "@/assets/platos/salad.jpg";
import riceImg from "@/assets/platos/rice.jpg";
import dessertImg from "@/assets/platos/dessert.jpg";
import appetizerImg from "@/assets/platos/appetizer.jpg";
import { useTranslations } from "@/i18n/LanguageProvider";

interface CartaPlatosProps {
  showAddButton: boolean;
}

interface Plato {
  id?: number;
  nombre: string;
  categoria: string;
  descripcion?: string;
  precio_eur: number;
  unidad?: string;
  orden?: number;
  activado?: boolean;
  nombre_en?: string;
  nombre_fr?: string;
  categoria_en?: string;
  categoria_fr?: string;
  descripcion_en?: string;
  descripcion_fr?: string;
  alergenos_oficiales?: unknown;
  alergenos_inferidos?: unknown;
  alergenos_notas?: string | null;
  traducciones?: unknown;
  expanded?: boolean;
}

const CartaPlatos = ({ showAddButton }: CartaPlatosProps) => {
  const { t, language } = useTranslations();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("NOVEDADES DEL DÍA");
  const [platosByCategory, setPlatosByCategory] = useState<Record<string, Plato[]>>({});
  const [loadingByCategory, setLoadingByCategory] = useState<Record<string, boolean>>({});
  const [hasMoreByCategory, setHasMoreByCategory] = useState<Record<string, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const PAGE_SIZE = 24;

  const normalizeAlergenos = (value: unknown) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return value ? [value] : [];
      }
    }
    return [];
  };

  const fetchPlatosByCategory = useCallback(
    async (category: string, append = false) => {
      setLoadingByCategory((prev) => ({ ...prev, [category]: true }));
      const offset = append ? (platosByCategory[category]?.length || 0) : 0;
      const to = offset + PAGE_SIZE - 1;

      try {
        let query = supabase
          .from('Platos')
          .select('*')
          .eq('activado', true)
          .order('categoria', { ascending: true })
          .order('orden', { ascending: true })
          .range(offset, to);

        if (category !== "TODOS") {
          query = query.eq('categoria', category);
        }

        const { data, error } = await query;
        if (error) throw error;
        const mapped = (data || []).map((item) => ({
          ...item,
          alergenos_oficiales: normalizeAlergenos(item.alergenos_oficiales),
          alergenos_inferidos: normalizeAlergenos(item.alergenos_inferidos),
          expanded: Boolean((item as any).expanded),
        }));

        setPlatosByCategory((prev) => {
          const existing = append ? prev[category] || [] : [];
          return { ...prev, [category]: [...existing, ...mapped] };
        });
        setHasMoreByCategory((prev) => ({ ...prev, [category]: (data?.length || 0) === PAGE_SIZE }));
      } catch (error) {
        console.error('Error fetching platos:', error);
        toast({
          title: t.platos.toasts.errorTitle,
          description: t.platos.toasts.errorDescription,
          variant: "destructive",
        });
      } finally {
        setLoadingByCategory((prev) => ({ ...prev, [category]: false }));
      }
    },
    [PAGE_SIZE, platosByCategory, toast, t.platos.toasts.errorDescription, t.platos.toasts.errorTitle]
  );

  useEffect(() => {
    fetchPlatosByCategory(selectedCategory, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const CATEGORY_ORDER = [
    "NOVEDADES DEL DÍA",
    "SNACK",
    "ENTRANTES FRÍOS",
    "ENTRANTES CALIENTES",
    "ENSALADAS",
    "SALAZONES",
    "MARISCOS",
    "PESCADOS",
    "CARNES",
    "ARROCES",
    "POSTRES",
    "TODOS"
  ];

  // Mostrar siempre el orden exacto solicitado, independientemente de si hay platos en esa categoría
  const categories = CATEGORY_ORDER;
  const currentLoading = loadingByCategory[selectedCategory];

  const parseTraducciones = (value: unknown) => {
    if (!value) return null;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    if (typeof value === "object") return value;
    return null;
  };

  const translatedPlatos = useMemo(() => {
    const categoryItems = platosByCategory[selectedCategory] || [];
    return categoryItems.map((item) => {
      const columnName = (item as any)[`nombre_${language}`];
      const columnCategoria = (item as any)[`categoria_${language}`];
      const columnDescripcion = (item as any)[`descripcion_${language}`];
      const columnAlergenosOficiales = (item as any)[`alergenos_oficiales_${language}`];
      const columnAlergenosInferidos = (item as any)[`alergenos_inferidos_${language}`];
      const columnAlergenosNotas = (item as any)[`alergenos_notas_${language}`];

      if (language === "es") {
        return {
          ...item,
          displayNombre: item.nombre,
          displayCategoria: item.categoria,
          displayDescripcion: item.descripcion,
          displayAlergenosOficiales: item.alergenos_oficiales,
          displayAlergenosInferidos: item.alergenos_inferidos,
          displayAlergenosNotas: item.alergenos_notas,
          translatedCategoria: null,
        };
      }

      const traducciones = parseTraducciones((item as any).traducciones);
      const translation = traducciones?.[language] ?? {};
      const translationAlergenosOficiales =
        translation?.alergenos_oficiales ?? translation?.alergenos?.oficiales;
      const translationAlergenosInferidos =
        translation?.alergenos_inferidos ?? translation?.alergenos?.inferidos;
      const translationAlergenosNotas =
        translation?.alergenos_notas ?? translation?.alergenos?.notas;

      return {
        ...item,
        displayNombre: columnName || translation?.nombre || item.nombre,
        displayCategoria: columnCategoria || translation?.categoria || item.categoria,
        displayDescripcion: columnDescripcion ?? translation?.descripcion ?? item.descripcion,
        displayAlergenosOficiales: normalizeAlergenos(
          columnAlergenosOficiales ?? translationAlergenosOficiales ?? item.alergenos_oficiales
        ),
        displayAlergenosInferidos: normalizeAlergenos(
          columnAlergenosInferidos ?? translationAlergenosInferidos ?? item.alergenos_inferidos
        ),
        displayAlergenosNotas:
          columnAlergenosNotas ?? translationAlergenosNotas ?? item.alergenos_notas,
        translatedCategoria: columnCategoria || translation?.categoria || null,
      };
    });
  }, [language, platosByCategory, selectedCategory]);

  const filteredItems = useMemo(() => {
    let items = translatedPlatos;

    if (searchTerm) {
      items = items.filter(item =>
        item.displayNombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return items;
  }, [searchTerm, translatedPlatos]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (!platosByCategory[category]) {
      fetchPlatosByCategory(category, false);
    }
  };

  const loadMore = () => {
    if (hasMoreByCategory[selectedCategory] && !currentLoading) {
      fetchPlatosByCategory(selectedCategory, true);
    }
  };

  const getCategoryImage = (categoria: string) => {
    const cat = categoria.toUpperCase();
    if (cat.includes('MARISCO') || cat.includes('PESCADO')) return seafoodImg;
    if (cat.includes('CARNE')) return meatImg;
    if (cat.includes('ENSALADA')) return saladImg;
    if (cat.includes('ARROZ')) return riceImg;
    if (cat.includes('POSTRE')) return dessertImg;
    if (cat.includes('ENTRANTE') || cat.includes('SNACK') || cat.includes('SALAZÓN')) return appetizerImg;
    return appetizerImg;
  };

  const addToPedido = (item: any) => {
    const pedidoItem = {
      ...item,
      nombre: item.displayNombre || item.nombre,
    };
    const pedido = getUserPedido();
    pedido.push(pedidoItem);
    setUserPedido(pedido);
    toast({
      title: t.platos.toasts.addedTitle,
      description: t.platos.toasts.addedDescription.replace("{name}", pedidoItem.nombre),
    });
  };

  const translateCategory = (category: string) =>
    t.categories.platos[category as keyof typeof t.categories.platos] ?? category;

  const isCardExpanded = (item: any) => {
    const forcedExpanded = expandedCards[item.id];
    if (forcedExpanded !== undefined) return forcedExpanded;
    return Boolean(item.expanded);
  };

  const handleToggleCard = (itemId: string, currentExpanded: boolean) => {
    setExpandedCards((prev) => ({ ...prev, [itemId]: !currentExpanded }));
  };

  return (
    <div className="space-y-8">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative max-w-md mx-auto w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder={t.platos.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-6 text-lg"
          />
        </div>

        {/* Category Filter Dropdown */}
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="w-72 h-12 justify-between bg-gradient-to-r from-background to-muted/30 hover:from-muted/50 hover:to-muted/60 border-2 border-border hover:border-accent/50 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 text-base font-semibold"
              >
                <span className="flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-accent" />
                  {translateCategory(selectedCategory)}
                </span>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 max-h-[28rem] overflow-y-auto bg-background/95 backdrop-blur-lg border-2 border-border shadow-2xl rounded-xl p-2">
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`cursor-pointer rounded-lg px-4 py-3 my-1 text-base transition-all duration-200 ${
                    selectedCategory === category 
                      ? "bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-bold shadow-md" 
                      : "hover:bg-muted/70 hover:translate-x-1"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      selectedCategory === category 
                        ? "bg-accent-foreground" 
                        : "bg-accent/40"
                    }`} />
                    {translateCategory(category)}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Items Grid */}
      {!platosByCategory[selectedCategory] && currentLoading ? (
        <div className="text-center py-16">
          <p className="text-xl text-muted-foreground">{t.platos.loading}</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredItems.map((item, index) => {
          const expanded = isCardExpanded(item);
          const categoryLabel = item.translatedCategoria ?? translateCategory(item.categoria);
          return (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.03 }}
            >
              <Card
                className={`h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${
                  expanded ? "card--expanded" : "card--collapsed"
                }`}
              >
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      key={`image-${item.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden bg-muted flex-shrink-0"
                    >
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={getCategoryImage(item.categoria)}
                          alt={item.displayNombre}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-accent/90 text-accent-foreground backdrop-blur-sm shadow-md">
                            {categoryLabel}
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <CardHeader
                  className={`flex-shrink-0 transition-all duration-200 ${
                    expanded ? "pb-3 px-6" : "py-2.5 px-4 pb-1.5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle
                        className={`leading-tight line-clamp-2 ${
                          expanded ? "text-lg min-h-[3.5rem]" : "text-base"
                        }`}
                      >
                        {item.displayNombre}
                      </CardTitle>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleCard(item.id, expanded)}
                      aria-label={expanded ? t.platos.hidePhoto : t.platos.viewPhoto}
                      className="flex items-center justify-center w-11 h-11 rounded-full bg-muted/80 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent self-center transition-all duration-200 hover:scale-[1.03]"
                    >
                      {expanded ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {!expanded && (
                    <div className="flex items-center gap-2 pt-2">
                      <Badge className="bg-accent/90 text-accent-foreground shadow-sm">
                        {categoryLabel}
                      </Badge>
                    </div>
                  )}
                </CardHeader>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      key={`content-${item.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                    >
                      <CardContent className="space-y-3 pb-4 flex-grow overflow-hidden">
                        {item.displayDescripcion && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.displayDescripcion}</p>
                        )}
                        {(item.displayAlergenosOficiales?.length > 0 ||
                          item.displayAlergenosInferidos?.length > 0) && (
                          <div className="flex flex-wrap gap-1">
                            {item.displayAlergenosOficiales?.map((alergeno: string, idx: number) => (
                              <Badge key={`oficial-${idx}`} variant="destructive" className="text-xs">
                                {alergeno}
                              </Badge>
                            ))}
                            {item.displayAlergenosInferidos?.map((alergeno: string, idx: number) => (
                              <Badge key={`inferido-${idx}`} variant="secondary" className="text-xs">
                                {alergeno}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {item.displayAlergenosNotas && (
                          <p className="text-xs text-destructive italic bg-destructive/10 p-2 rounded line-clamp-2">
                            {item.displayAlergenosNotas}
                          </p>
                        )}
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
                <CardFooter
                  className={`flex justify-between items-center border-t mt-auto flex-shrink-0 transition-all ${
                    expanded ? "pt-3 bg-muted/30 px-6 py-3" : "pt-1 bg-transparent px-4 py-2"
                  }`}
                >
                  <span className={`font-bold text-accent ${expanded ? "text-2xl" : "text-lg"}`}>
                    {item.precio_eur}€
                    {item.unidad && <span className="text-sm font-normal text-muted-foreground"> / {item.unidad}</span>}
                  </span>
                  {showAddButton && (
                    <Button
                      size="sm"
                      onClick={() => addToPedido(item)}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-4 shadow-md hover:shadow-lg transition-all"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t.platos.add}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>
      )}

      {filteredItems.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-xl">{t.platos.empty}</p>
        </div>
      )}

      {hasMoreByCategory[selectedCategory] && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={currentLoading}
            className="rounded-full px-6"
          >
            {currentLoading ? t.platos.loading : t.map.showMore}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CartaPlatos;
