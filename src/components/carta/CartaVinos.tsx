import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Wine, AlertCircle, ChevronDown, Plus, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MapaMundoVinos from "./MapaMundoVinos";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getUserPedido, setUserPedido } from "@/utils/sessionManager";
import { useTranslations } from "@/i18n/LanguageProvider";
import BackToTopButton from "./BackToTopButton";

interface CartaVinosProps {
  showAddButton?: boolean;
}

interface Vino {
  id?: string;
  nombre: string;
  precio_eur: number;
  categoria?: string;
  denominacion_origen?: string;
  ubicacion_region?: string;
  ubicacion_pais?: string;
  orden?: number;
  activado?: boolean;
  alergenos_oficiales?: string[] | null;
  alergenos_inferidos?: string[] | null;
  alergenos_notas?: string | null;
  descripcion?: string;
  unidad?: string;
  cantidad?: number;
  nombre_en?: string;
  nombre_fr?: string;
}

const CartaVinos = ({ showAddButton = false }: CartaVinosProps) => {
  const { t, language } = useTranslations();
  const sectionRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [isAdult, setIsAdult] = useState<boolean | null>(null);
  const [showAgeDialog, setShowAgeDialog] = useState(true);
  const [vinosByCategory, setVinosByCategory] = useState<Record<string, Vino[]>>({});
  const [loadingByCategory, setLoadingByCategory] = useState<Record<string, boolean>>({});
  const [hasMoreByCategory, setHasMoreByCategory] = useState<Record<string, boolean>>({});
  const [mapVinos, setMapVinos] = useState<Vino[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapPrefetched, setMapPrefetched] = useState(false);
  const PAGE_SIZE = 24;
  const { toast } = useToast();

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

  const fetchVinosByCategory = useCallback(
    async (category: string, append = false) => {
      setLoadingByCategory((prev) => ({ ...prev, [category]: true }));
      const offset = append ? (vinosByCategory[category]?.length || 0) : 0;
      const to = offset + PAGE_SIZE - 1;

      try {
        let query = supabase
          .from('Vinos')
          .select('*')
          .eq('activado', true)
          .order('categoria', { ascending: true })
          .order('orden', { ascending: true })
          .range(offset, to);

        if (category !== "Todos") {
          query = query.eq('categoria', category);
        }

        const { data, error } = await query;
        if (error) throw error;
        const normalized: Vino[] = (data || []).map((item) => ({
          ...item,
          alergenos_oficiales: normalizeAlergenos(item.alergenos_oficiales),
          alergenos_inferidos: normalizeAlergenos(item.alergenos_inferidos),
        }));

        setVinosByCategory((prev) => {
          const existing = append ? prev[category] || [] : [];
          return { ...prev, [category]: [...existing, ...normalized] };
        });
        setHasMoreByCategory((prev) => ({ ...prev, [category]: (data?.length || 0) === PAGE_SIZE }));
      } catch (error) {
        console.error('Error fetching vinos:', error);
        toast({
          title: t.vinos.toasts.errorTitle,
          description: t.vinos.toasts.errorDescription,
          variant: "destructive",
        });
      } finally {
        setLoadingByCategory((prev) => ({ ...prev, [category]: false }));
      }
    },
    [PAGE_SIZE, toast, t.vinos.toasts.errorDescription, t.vinos.toasts.errorTitle, vinosByCategory]
  );

  useEffect(() => {
    fetchVinosByCategory(selectedCategory, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMap = useCallback(async () => {
    if (mapPrefetched) return;
    try {
      const { data, error } = await supabase
        .from('Vinos')
        .select('categoria, ubicacion_region, ubicacion_pais, denominacion_origen, nombre, precio_eur')
        .eq('activado', true);
      if (error) throw error;
      setMapVinos(data || []);
    } catch (error) {
      console.error('Error fetching map vinos:', error);
    } finally {
      setMapPrefetched(true);
      setMapLoading(false);
    }
  }, [mapPrefetched]);

  useEffect(() => {
    fetchMap();
  }, [fetchMap]);

  const addToPedido = (item: Vino & { displayNombre?: string }) => {
    const pedido = getUserPedido();
    const pedidoItem = {
      ...item,
      nombre: item.displayNombre || item.nombre,
      cantidad: item.cantidad ?? 1,
    };
    pedido.push(pedidoItem);
    setUserPedido(pedido);
    toast({
      title: t.vinos.toasts.addedTitle,
      description: t.vinos.toasts.addedDescription.replace("{name}", pedidoItem.nombre),
    });
  };

  const categories = useMemo(() => {
    const seen = new Set<string>();
    mapVinos.forEach((vino) => {
      if (vino.categoria) {
        seen.add(vino.categoria);
      }
    });
    const list = Array.from(seen);
    list.push("Todos");
    return list;
  }, [mapVinos]);

  const getLocalizedField = (vino: Vino, key: string) => {
    const value = (vino as { [key: string]: unknown })[key];
    return typeof value === "string" ? value : undefined;
  };

  const filteredItems = useMemo(() => {
    const categoryItems = vinosByCategory[selectedCategory] || [];
    const translated = categoryItems.map((vino) => {
      const columnName = getLocalizedField(vino, `nombre_${language}`);
      return {
        ...vino,
        displayNombre: language === "es" ? vino.nombre : (columnName || vino.nombre),
      };
    });

    let items = translated;

    if (selectedCategory !== "Todos") {
      items = items.filter(item => item.categoria === selectedCategory);
    }

    if (searchTerm) {
      items = items.filter(item =>
        (item.displayNombre || item.nombre).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return items;
  }, [language, searchTerm, selectedCategory, vinosByCategory]);

  const currentLoading = loadingByCategory[selectedCategory];

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (!vinosByCategory[category]) {
      fetchVinosByCategory(category, false);
    }
  };

  const loadMore = () => {
    if (hasMoreByCategory[selectedCategory] && !currentLoading) {
      fetchVinosByCategory(selectedCategory, true);
    }
  };

  const handleAgeConfirm = (adult: boolean) => {
    setIsAdult(adult);
    setShowAgeDialog(false);
  };

  const translateCategory = (category: string) =>
    category === "Todos" ? t.vinos.categoriesAll : category;

  if (showAgeDialog || isAdult === null) {
    return (
      <Dialog open={showAgeDialog} onOpenChange={setShowAgeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-accent" />
              {t.vinos.ageCheckTitle}
            </DialogTitle>
            <DialogDescription>
              {t.vinos.ageCheckDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 justify-center pt-4">
            <Button
              onClick={() => handleAgeConfirm(true)}
              className="bg-accent hover:bg-accent/90"
            >
              {t.vinos.ageCheckConfirm}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAgeConfirm(false)}
            >
              {t.vinos.ageCheckDecline}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isAdult === false) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-xl text-muted-foreground">
          {t.vinos.ageCheckBlocked}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8" ref={sectionRef}>
      {/* Mapa Mundial de vinos */}
      {!mapLoading && <MapaMundoVinos vinos={mapVinos} />}

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative max-w-md mx-auto w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder={t.vinos.searchPlaceholder}
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
                className="w-72 min-h-12 h-auto justify-between items-start bg-gradient-to-r from-background to-muted/30 hover:from-muted/50 hover:to-muted/60 border-2 border-border hover:border-accent/50 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 text-base font-semibold text-left"
              >
                <span className="flex items-start gap-2 text-left whitespace-normal break-words leading-tight flex-1">
                  <Wine className="w-5 h-5 text-accent" />
                  {translateCategory(selectedCategory)}
                </span>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 flex-shrink-0 mt-1" />
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
                  <span className="flex items-start gap-3 text-left whitespace-normal break-words leading-tight">
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
      {!vinosByCategory[selectedCategory] && currentLoading ? (
        <div className="text-center py-16">
          <p className="text-xl text-muted-foreground">{t.vinos.loading}</p>
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.03 }}
            >
              <Card className="h-full flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border-2 border-border/80 bg-gradient-to-br from-background to-muted/30 text-sm">
                <CardHeader className="flex-shrink-0 pb-3">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
                      <Wine className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <CardTitle className="text-lg leading-tight whitespace-normal break-words">
                        {item.displayNombre || item.nombre}
                      </CardTitle>
                      <Badge className="bg-accent/90 text-accent-foreground shadow-sm w-fit">
                        {translateCategory(item.categoria)}
                      </Badge>
                      {(item.denominacion_origen || item.ubicacion_region || item.ubicacion_pais) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                          <MapPin className="w-4 h-4 text-accent" />
                          <span className="line-clamp-1">
                            {[item.denominacion_origen, item.ubicacion_region, item.ubicacion_pais].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pb-4 flex-grow overflow-hidden">
                  {item.descripcion && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{item.descripcion}</p>
                  )}
                  {(item.alergenos_oficiales?.length > 0 || item.alergenos_inferidos?.length > 0) && (
                    <div className="flex flex-wrap gap-1">
                      {item.alergenos_oficiales?.map((alergeno: string, idx: number) => (
                        <Badge key={`oficial-${idx}`} variant="destructive" className="text-xs">
                          {alergeno}
                        </Badge>
                      ))}
                      {item.alergenos_inferidos?.map((alergeno: string, idx: number) => (
                        <Badge key={`inferido-${idx}`} variant="secondary" className="text-xs">
                          {alergeno}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {item.alergenos_notas && (
                    <p className="text-xs text-destructive italic bg-destructive/10 p-2 rounded line-clamp-2">
                      {item.alergenos_notas}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between items-center border-t bg-muted/40 flex-shrink-0 mt-auto px-6 py-3">
                  <span className="text-2xl font-bold text-accent leading-none">{item.precio_eur}€</span>
                  {showAddButton && (
                    <Button
                      size="sm"
                     onClick={() => addToPedido(item)}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-4 shadow-md hover:shadow-lg transition-all"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t.vinos.add}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {!currentLoading && filteredItems.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-xl">{t.vinos.empty}</p>
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
            {currentLoading ? t.vinos.loading : t.map.showMore}
          </Button>
        </div>
      )}
      <BackToTopButton targetRef={sectionRef} containerRef={gridRef} />
    </div>
  );
};

export default CartaVinos;
