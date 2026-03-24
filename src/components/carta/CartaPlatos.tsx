/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, ChevronDown, UtensilsCrossed, Eye, EyeOff, Info } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserPedido, setUserPedido } from "@/utils/sessionManager";
import { useTranslations } from "@/i18n/LanguageProvider";
import BackToTopButton from "./BackToTopButton";

interface CartaPlatosProps {
  showAddButton: boolean;
}

type DietaryFilterKey = "celiaquia" | "lactosa" | "vegano" | "vegetariano";

interface Plato {
  id?: string;
  nombre: string;
  categoria: string;
  descripcion?: string;
  imagen_url?: string | null;
  imagen_posicion_y?: number | null;
  ingredientes?: string[] | string | null;
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
  ingredientes_en?: string[] | string | null;
  ingredientes_fr?: string[] | string | null;
  alergenos_oficiales?: string[];
  alergenos_inferidos?: string[];
  alergenos_notas?: string | null;
  traducciones?: unknown;
  expanded?: boolean;
}

type PlatoRecord = Plato & Record<string, unknown>;

const CartaPlatos = ({ showAddButton }: CartaPlatosProps) => {
  const { t, language } = useTranslations();
  const sectionRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("NOVEDADES DEL DÍA");
  const [platosByCategory, setPlatosByCategory] = useState<Record<string, Plato[]>>({});
  const [loadingByCategory, setLoadingByCategory] = useState<Record<string, boolean>>({});
  const [hasMoreByCategory, setHasMoreByCategory] = useState<Record<string, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [infoCards, setInfoCards] = useState<Record<string, boolean>>({});
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [dietaryFilters, setDietaryFilters] = useState<Record<DietaryFilterKey, boolean>>({
    celiaquia: false,
    lactosa: false,
    vegano: false,
    vegetariano: false,
  });
  const { toast } = useToast();
  const PAGE_SIZE = 24;
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "");

  const normalizeAlergenos = (value: unknown): string[] => {
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

  const normalizeIngredientes = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item).trim())
        .filter(Boolean);
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return [];
      const cleaned = trimmed.replace(/^ingredients?\s*:\s*/i, "").replace(/^ingr[eé]dients?\s*:\s*/i, "").replace(/^ingredientes?\s*:\s*/i, "");

      try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => String(item).trim())
            .filter(Boolean);
        }
      } catch {
        // Si no es JSON, se interpreta como lista separada por comas.
      }

      return cleaned
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  };

  const capitalizeFirst = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };

  const normalizeForMatch = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const includesAnyMatcher = (values: string[], matchers: string[]) =>
    values.some((value) => matchers.some((matcher) => value.includes(matcher)));

  const DIETARY_MATCHERS: Record<DietaryFilterKey, string[]> = {
    celiaquia: ["gluten"],
    lactosa: ["lactosa", "lacteo", "lacteos", "leche", "milk", "dairy", "lait"],
    vegano: ["vegano", "vegana", "vegan", "apto vegano", "apta vegana"],
    vegetariano: [
      "vegetariano",
      "vegetariana",
      "vegetarian",
      "apto vegetariano",
      "apta vegetariana",
      "vegano",
      "vegana",
      "vegan",
    ],
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
      const columnIngredientes = (item as any)[`ingredientes_${language}`];
      const columnAlergenosOficiales = (item as any)[`alergenos_oficiales_${language}`];
      const columnAlergenosInferidos = (item as any)[`alergenos_inferidos_${language}`];
      const columnAlergenosNotas = (item as any)[`alergenos_notas_${language}`];

      if (language === "es") {
        return {
          ...item,
          displayNombre: item.nombre,
          displayCategoria: item.categoria,
          displayDescripcion: item.descripcion,
          displayIngredientes: normalizeIngredientes((item as any).ingredientes),
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
      const translationIngredientes = translation?.ingredientes;

      return {
        ...item,
        displayNombre: columnName || translation?.nombre || item.nombre,
        displayCategoria: columnCategoria || translation?.categoria || item.categoria,
        displayDescripcion: columnDescripcion ?? translation?.descripcion ?? item.descripcion,
        displayIngredientes: normalizeIngredientes(
          columnIngredientes ?? translationIngredientes ?? (item as any).ingredientes
        ),
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

    const activeDietaryFilters = (Object.keys(dietaryFilters) as DietaryFilterKey[]).filter(
      (key) => dietaryFilters[key]
    );

    if (activeDietaryFilters.length > 0) {
      items = items.filter((item: any) => {
        const officialAllergens = (Array.isArray(item.displayAlergenosOficiales)
          ? item.displayAlergenosOficiales
          : []
        )
          .map((allergen: string) => normalizeForMatch(allergen))
          .filter(Boolean);

        return activeDietaryFilters.every((filterKey) => {
          if (filterKey === "celiaquia" || filterKey === "lactosa") {
            return !includesAnyMatcher(officialAllergens, DIETARY_MATCHERS[filterKey]);
          }
          return includesAnyMatcher(officialAllergens, DIETARY_MATCHERS[filterKey]);
        });
      });
    }

    if (searchTerm) {
      items = items.filter(item =>
        item.displayNombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return items;
  }, [dietaryFilters, searchTerm, translatedPlatos]);

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

  const toPublicImageUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("data:") ||
      trimmed.startsWith("blob:")
    ) {
      return trimmed;
    }
    if (!supabaseUrl) return trimmed;
    if (trimmed.startsWith("/storage/v1/object/public/")) {
      return `${supabaseUrl}${trimmed}`;
    }
    if (trimmed.startsWith("/")) {
      return `${supabaseUrl}${trimmed}`;
    }
    if (trimmed.includes("/")) {
      return `${supabaseUrl}/storage/v1/object/public/${trimmed.replace(/^\/+/, "")}`;
    }
    return trimmed;
  };

  const extractImageCandidate = (value: unknown): string | null => {
    if (value === null || value === undefined) return null;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "undefined") {
        return null;
      }
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        try {
          return extractImageCandidate(JSON.parse(trimmed));
        } catch {
          return toPublicImageUrl(trimmed);
        }
      }
      return toPublicImageUrl(trimmed);
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        const nested = extractImageCandidate(entry);
        if (nested) return nested;
      }
      return null;
    }

    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      const nestedKeys = ["url", "publicUrl", "public_url", "path", "src", "href", "link", "imagen_url"];
      for (const nestedKey of nestedKeys) {
        const nested = extractImageCandidate(record[nestedKey]);
        if (nested) return nested;
      }
    }

    return null;
  };

  const getDishImage = (item: PlatoRecord) => extractImageCandidate(item.imagen_url);

  const getImagePositionY = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Math.min(100, Math.max(0, numeric));
  };

  const getInitialCantidad = (unidad?: string) => {
    if (unidad === "kg") return 1;
    if (unidad === "100 g" || unidad === "100g") return 100;
    return 1;
  };

  const getPedidoItemKey = (item: any) =>
    item.id
      ? `id:${item.id}`
      : `fallback:${item.nombre}|${item.precio_eur}|${item.unidad ?? ""}|${item.categoria ?? ""}`;

  const addToPedido = (item: any) => {
    const cantidadInicial = item.cantidad ?? getInitialCantidad(item.unidad);
    const pedidoItem = {
      ...item,
      nombre: item.displayNombre || item.nombre,
      cantidad: cantidadInicial,
    };
    const pedido = getUserPedido();
    const nextPedido = [...pedido];
    const key = getPedidoItemKey(pedidoItem);
    const existingIndex = nextPedido.findIndex((existingItem: any) => getPedidoItemKey(existingItem) === key);

    if (existingIndex >= 0) {
      const existingItem = nextPedido[existingIndex];
      const existingCantidad =
        typeof existingItem.cantidad === "number"
          ? existingItem.cantidad
          : getInitialCantidad(existingItem.unidad);
      nextPedido[existingIndex] = {
        ...existingItem,
        ...pedidoItem,
        cantidad: existingCantidad + cantidadInicial,
      };
    } else {
      nextPedido.push(pedidoItem);
    }

    setUserPedido(nextPedido);
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

  const isInfoCardOpen = (item: any) => Boolean(infoCards[item.id]);

  const handleToggleInfoCard = (itemId: string, currentOpen: boolean) => {
    setInfoCards((prev) => ({ ...prev, [itemId]: !currentOpen }));
  };

  const getInfoLabels = () => {
    if (language === "en") {
      return {
        allergens: "Allergens",
        ingredients: "Ingredients",
        noData: "Not available",
      };
    }
    if (language === "fr") {
      return {
        allergens: "Allergènes",
        ingredients: "Ingrédients",
        noData: "Non disponible",
      };
    }
    return {
      allergens: "Alérgenos",
      ingredients: "Ingredientes",
      noData: "No disponible",
    };
  };

  const infoLabels = getInfoLabels();
  const dietaryFilterOptions: { key: DietaryFilterKey; label: string }[] = [
    { key: "celiaquia", label: t.platos.dietaryFilters.celiaquia },
    { key: "lactosa", label: t.platos.dietaryFilters.lactosa },
    { key: "vegano", label: t.platos.dietaryFilters.vegano },
    { key: "vegetariano", label: t.platos.dietaryFilters.vegetariano },
  ];

  const handleDietaryFilterChange = (filter: DietaryFilterKey, checked: boolean) => {
    setDietaryFilters((prev) => ({ ...prev, [filter]: checked }));
  };

  return (
    <div className="space-y-8" ref={sectionRef}>
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

        <div className="mx-auto w-full max-w-4xl">
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
            {dietaryFilterOptions.map((filter) => {
              const checked = dietaryFilters[filter.key];
              const checkboxId = `dietary-filter-${filter.key}`;
              return (
                <label
                  key={filter.key}
                  htmlFor={checkboxId}
                  className={`inline-flex cursor-pointer select-none items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all duration-200 ${
                    checked
                      ? "border-accent bg-accent/10 text-foreground shadow-sm"
                      : "border-border/70 bg-background/70 text-muted-foreground hover:border-accent/40 hover:text-foreground"
                  }`}
                >
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    onCheckedChange={(value) => handleDietaryFilterChange(filter.key, value === true)}
                    className={checked ? "border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground" : ""}
                  />
                  <span className="font-medium">{filter.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {!platosByCategory[selectedCategory] && currentLoading ? (
        <div className="text-center py-16">
          <p className="text-xl text-muted-foreground">{t.platos.loading}</p>
        </div>
      ) : (
      <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredItems.map((item, index) => {
          const itemRecord = item as PlatoRecord;
          const cardKey = itemRecord.id || `${itemRecord.nombre}|${itemRecord.precio_eur}|${itemRecord.categoria ?? ""}`;
          const expanded = isCardExpanded(item);
          const infoOpen = isInfoCardOpen(item);
          const imageUrl = getDishImage(itemRecord);
          const hasVisibleImage = Boolean(imageUrl && !brokenImages[cardKey]);
          const imagePositionY = getImagePositionY(itemRecord.imagen_posicion_y);
          const imageStyle = imagePositionY === null ? undefined : { objectPosition: `center ${imagePositionY}%` };
          const categoryLabel = item.translatedCategoria ?? translateCategory(item.categoria);
          const infoAlergenos = Array.from(
            new Set(
              [...(item.displayAlergenosOficiales || []), ...(item.displayAlergenosInferidos || [])]
                .map((alergeno: string) => capitalizeFirst(alergeno))
                .filter(Boolean)
            )
          );
          const infoIngredientes = item.displayIngredientes || [];
          return (
            <motion.div
              layout
              key={cardKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.03 }}
              className="h-full [perspective:1200px]"
            >
              <div
                className={`relative transition-transform duration-500 [transform-style:preserve-3d] ${
                  expanded || infoOpen ? "h-full" : "h-auto"
                } ${
                  infoOpen ? "[transform:rotateY(180deg)]" : ""
                }`}
              >
                <div className={`${infoOpen ? "absolute inset-0 h-full" : "h-full"} [backface-visibility:hidden]`}>
                  <Card
                    className={`font-libre-baskerville flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${
                      expanded || infoOpen ? "h-full" : "h-auto"
                    } ${
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
                            {hasVisibleImage ? (
                              <img
                                src={imageUrl || undefined}
                                alt={item.displayNombre}
                                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                style={imageStyle}
                                onError={() =>
                                  setBrokenImages((prev) => ({ ...prev, [cardKey]: true }))
                                }
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
                                <UtensilsCrossed className="w-9 h-9 text-accent/70" />
                              </div>
                            )}
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
                            className={`leading-tight whitespace-normal break-words ${
                              expanded ? "text-lg" : "text-base"
                            }`}
                          >
                            {item.displayNombre}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2 self-center">
                          <button
                            type="button"
                            onClick={() => handleToggleCard(item.id, expanded)}
                            aria-label={expanded ? t.platos.hidePhoto : t.platos.viewPhoto}
                            className="flex items-center justify-center w-11 h-11 rounded-full bg-muted/80 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent transition-all duration-200 hover:scale-[1.03]"
                          >
                            {expanded ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleInfoCard(item.id, infoOpen)}
                            aria-label={infoOpen ? "Ocultar información del plato" : "Mostrar información del plato"}
                            className="flex items-center justify-center w-11 h-11 rounded-full bg-muted/80 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent transition-all duration-200 hover:scale-[1.03]"
                          >
                            <Info className="w-5 h-5" />
                          </button>
                        </div>
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
                </div>

                <div
                  className={`${infoOpen ? "relative h-auto" : "absolute inset-0 h-full"} [transform:rotateY(180deg)] [backface-visibility:hidden]`}
                >
                  <Card
                    className={`font-libre-baskerville flex flex-col overflow-hidden border-2 border-border/80 bg-gradient-to-br from-background to-muted/30 ${
                      infoOpen ? "h-auto" : "h-full"
                    }`}
                  >
                    <CardHeader className="pb-3 px-6 flex-shrink-0 border-b bg-muted/20">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg leading-tight whitespace-normal break-words">
                            {item.displayNombre}
                          </CardTitle>
                          <div className="pt-2">
                            <Badge className="bg-accent/90 text-accent-foreground shadow-sm">{categoryLabel}</Badge>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleInfoCard(item.id, infoOpen)}
                          aria-label={infoOpen ? "Ocultar información del plato" : "Mostrar información del plato"}
                          className="flex items-center justify-center w-11 h-11 rounded-full bg-muted/80 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent transition-all duration-200 hover:scale-[1.03]"
                        >
                          <Info className="w-5 h-5" />
                        </button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pb-4 flex-grow overflow-auto px-6 pt-4">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">
                          {infoLabels.allergens}:
                        </p>
                        {infoAlergenos.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {infoAlergenos.map((alergeno: string, idx: number) => (
                              <Badge key={`info-alergeno-${idx}`} variant="secondary" className="text-xs">
                                {alergeno}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">{infoLabels.noData}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">
                          {infoLabels.ingredients}:
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {infoIngredientes.length > 0
                            ? infoIngredientes.map((ingrediente: string) => capitalizeFirst(ingrediente)).join(", ")
                            : infoLabels.noData}
                        </p>
                      </div>

                      {item.displayAlergenosNotas && (
                        <p className="text-xs text-destructive italic bg-destructive/10 p-2 rounded">
                          {item.displayAlergenosNotas}
                        </p>
                      )}
                    </CardContent>

                    <CardFooter className="flex justify-between items-center border-t bg-muted/30 mt-auto flex-shrink-0 px-6 py-3">
                      <span className="font-bold text-accent text-2xl">
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
                </div>
              </div>
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
      <BackToTopButton targetRef={sectionRef} containerRef={gridRef} />
    </div>
  );
};

export default CartaPlatos;
