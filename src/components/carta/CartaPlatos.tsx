import { mostrarPrecio } from "@/lib/precios";
import {
  etiquetaUnidadPlato,
  gramosDeUnidad,
  normalizarUnidadPlato,
} from "@/lib/unidades-platos";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import OpcionSinGluten from "./OpcionSinGluten";
import {
  Search,
  Plus,
  ChevronDown,
  UtensilsCrossed,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { esFotoCarta, imagenOptimizada } from "@/lib/carta-ssg";
import { videoDePlato } from "@/lib/foto-plato";
import FotoPlato from "./FotoPlato";
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
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import BackToTopButton from "./BackToTopButton";
import { resolveTranslatedItem } from "@/lib/carta-i18n";
import {
  AVISO_SIN_ALERGENOS,
  cumpleFiltroDietetico,
  datosAlergenos,
  etiquetaAlergeno,
  normalizeAlergenos,
  tieneInformacionAlergenos,
} from "@/lib/alergenos";
import { CATEGORIAS_CARTA } from "@/lib/carta-rutas";
import { ordenarPorOrdenEnCategoria } from "@/lib/orden-carta.mjs";
import { girarYEnfocar, propsCara } from "@/lib/caraGiro";

/** Estado inicial de `platosByCategory`: categoria -> platos. */
export type CartaPlatosSeed = Record<string, Plato[]>;

interface CartaPlatosProps {
  showAddButton: boolean;
  /**
   * La sección está abierta. Mientras está cerrada el componente se monta (para
   * que el SSG deje sus tarjetas en el HTML) pero no pide nada a Supabase.
   */
  active?: boolean;
  /**
   * Platos de la categoría inicial descargados en build (`virtual:carta-ssg`).
   * Evitan el parpadeo de carga al abrir la carta y son lo que ve el buscador.
   */
  initialPlatos?: CartaPlatosSeed;
}

/**
 * Filtros dietéticos que se pueden evaluar con los datos que hay en la BD.
 *
 * "Vegano" y "Vegetariano" se han retirado de la interfaz: buscaban esas
 * palabras dentro de la columna de alérgenos, que nunca las contiene, así que
 * devolvían CERO platos siempre. La lógica y el motivo quedan documentados en
 * `FILTROS_DIETETICOS_PENDIENTES` (`@/lib/alergenos`), a la espera de una
 * columna propia de etiquetas dietéticas.
 */
type DietaryFilterKey = "celiaquia" | "lactosa";

interface Plato {
  id?: string;
  nombre: string;
  categoria: string;
  descripcion?: string;
  sin_gluten_disponible?: boolean;
  imagen_url?: string | null;
  imagen_posicion_y?: number | null;
  ingredientes?: string[] | string | null;
  precio_eur: number;
  unidad?: string;
  orden?: string | number | null;
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

const CartaPlatos = ({
  showAddButton,
  active = true,
  initialPlatos,
}: CartaPlatosProps) => {
  const { t, language } = useTranslations();
  const sectionRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  // El input queda ligado a `searchTerm` (respuesta instantánea al teclear);
  // lo que filtra la cuadrícula —y dispara sus animaciones de entrada/salida—
  // va con retraso, para no recalcular y re-animar en cada pulsación.
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 250);
  const [selectedCategory, setSelectedCategory] =
    useState<string>("NOVEDADES DEL DÍA");
  const [platosByCategory, setPlatosByCategory] = useState<
    Record<string, Plato[]>
  >(() => initialPlatos ?? {});
  const [loadingByCategory, setLoadingByCategory] = useState<
    Record<string, boolean>
  >({});
  const [hasMoreByCategory, setHasMoreByCategory] = useState<
    Record<string, boolean>
  >({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(
    {},
  );
  const [infoCards, setInfoCards] = useState<Record<string, boolean>>({});
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [dietaryFilters, setDietaryFilters] = useState<
    Record<DietaryFilterKey, boolean>
  >({
    celiaquia: false,
    lactosa: false,
  });
  const { toast } = useToast();
  const PAGE_SIZE = 24;
  const supabaseUrl = (
    import.meta.env.VITE_SUPABASE_URL as string | undefined
  )?.replace(/\/+$/, "");

  const capitalizeFirst = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };

  const fetchPlatosByCategory = useCallback(
    async (category: string, append = false) => {
      setLoadingByCategory((prev) => ({ ...prev, [category]: true }));
      const offset = append ? platosByCategory[category]?.length || 0 : 0;
      const to = offset + PAGE_SIZE - 1;

      try {
        // Import perezoso: el SDK de Supabase (~40 KB gzip) no debe entrar en
        // el chunk que descarga la portada nada más cargar — solo hace falta
        // aquí, cuando de verdad se pide esta categoría.
        const { supabase } = await import("@/integrations/supabase/client");
        // `restaurante` distingue la carta de Casa Tomás de la del bar (`touza`).
        // El prerenderizado (`scripts/carta-ssg.mjs`) ya filtraba por ella; sin
        // esto, al hidratar volvían a aparecer platos que el HTML no traía.
        let query = supabase
          .from("Platos")
          .select("*")
          .eq("activado", true)
          .is("restaurante", true)
          .order("categoria", { ascending: true })
          .order("orden", { ascending: true })
          // Desempate único (como Vinos y Bebidas): casi todos los platos
          // comparten `orden` (0 = sin ordenar) y sin él cada página de 24
          // podía venir en otro orden (platos repetidos u omitidos).
          .order("id", { ascending: true })
          .range(offset, to);

        if (category !== "TODOS") {
          query = query.eq("categoria", category);
        }

        const { data, error } = await query;
        if (error) throw error;
        const mapped = (data || []).map((item) => ({
          ...item,
          unidad: normalizarUnidadPlato(item.unidad),
          alergenos_oficiales: normalizeAlergenos(item.alergenos_oficiales),
          alergenos_inferidos: normalizeAlergenos(item.alergenos_inferidos),
          expanded: Boolean((item as any).expanded),
        }));

        // Mientras `orden` sea texto en `Platos`, Supabase lo ordena como texto
        // ("10" antes que "2"): aquí se reordena numérico dentro de cada
        // categoría (nulos al final), igual que los datos del build
        // (`scripts/carta-ssg.mjs`). Con la columna ya entera no cambia nada.
        setPlatosByCategory((prev) => {
          const existing = append ? prev[category] || [] : [];
          return { ...prev, [category]: ordenarPorOrdenEnCategoria([...existing, ...mapped]) };
        });
        setHasMoreByCategory((prev) => ({
          ...prev,
          [category]: (data?.length || 0) === PAGE_SIZE,
        }));
      } catch (error) {
        console.error("Error fetching platos:", error);
        toast({
          title: t.platos.toasts.errorTitle,
          description: t.platos.toasts.errorDescription,
          variant: "destructive",
        });
      } finally {
        setLoadingByCategory((prev) => ({ ...prev, [category]: false }));
      }
    },
    [
      PAGE_SIZE,
      platosByCategory,
      toast,
      t.platos.toasts.errorDescription,
      t.platos.toasts.errorTitle,
    ],
  );

  // Se refresca contra Supabase la primera vez que se abre la sección. Antes
  // esto ocurría al montar, y montar equivalía a abrir; ahora el componente se
  // monta con la portada, así que la petición se retrasa hasta que hace falta.
  const yaRefrescado = useRef(false);
  useEffect(() => {
    if (!active || yaRefrescado.current) return;
    yaRefrescado.current = true;
    fetchPlatosByCategory(selectedCategory, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  /**
   * Categorías DERIVADAS DEL DATO, no escritas a mano.
   *
   * Antes eran una lista fija en este fichero: una categoría nueva creada desde
   * el panel no aparecía aquí (aunque `/carta/<slug>` sí existiera) y una
   * borrada seguía ofreciéndose vacía. Ahora salen de `CATEGORIAS_CARTA`, que
   * es lo que descargó el build — la misma fuente que usan las páginas
   * estáticas, así que portada y `/carta` no pueden discrepar.
   *
   * Se mantiene la categoría seleccionada aunque no esté en los datos del build
   * (p. ej. la inicial cuando el snapshot está vacío) para que el desplegable
   * nunca muestre una etiqueta que no está en su propia lista.
   */
  const categories = useMemo(() => {
    const claves = CATEGORIAS_CARTA.map((categoria) => categoria.clave);
    const conSeleccion =
      selectedCategory === "TODOS" || claves.includes(selectedCategory)
        ? claves
        : [selectedCategory, ...claves];
    return [...conSeleccion, "TODOS"];
  }, [selectedCategory]);

  const currentLoading = loadingByCategory[selectedCategory];

  // La resolución de idioma vive en `@/lib/carta-i18n` para que la comparta
  // el prerenderizado de build (`carta-ssg.ts`) y no haya dos implementaciones.
  const translatedPlatos = useMemo(() => {
    const categoryItems = (platosByCategory[selectedCategory] ||
      []) as PlatoRecord[];
    return categoryItems.map((item) => resolveTranslatedItem(item, language));
  }, [language, platosByCategory, selectedCategory]);

  const filteredItems = useMemo(() => {
    let items = translatedPlatos;

    const activeDietaryFilters = (
      Object.keys(dietaryFilters) as DietaryFilterKey[]
    ).filter((key) => dietaryFilters[key]);

    // Filtro de seguridad alimentaria: ver `cumpleFiltroDietetico`. Un plato
    // sin alérgenos registrados NO aparece —"no consta" no es "es apto"— y la
    // comparación es por alérgeno completo, no por subcadena, así que un
    // alérgeno personalizado escrito como "sin gluten" ya no excluye el plato.
    if (activeDietaryFilters.length > 0) {
      items = items.filter((item) => {
        const datos = datosAlergenos(item);
        return activeDietaryFilters.every(
          (filterKey) =>
            (filterKey === "celiaquia" &&
              item.sin_gluten_disponible === true) ||
            cumpleFiltroDietetico(datos, filterKey),
        );
      });
    }

    if (debouncedSearchTerm) {
      items = items.filter((item) =>
        item.displayNombre
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()),
      );
    }

    return items;
  }, [debouncedSearchTerm, dietaryFilters, translatedPlatos]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (!platosByCategory[category]) {
      fetchPlatosByCategory(category, false);
    }
  };

  const handleCategorySelect = (category: string) => {
    setCategoryMenuOpen(false);
    if (category === selectedCategory) return;
    requestAnimationFrame(() => handleCategoryChange(category));
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
      if (
        !trimmed ||
        trimmed.toLowerCase() === "null" ||
        trimmed.toLowerCase() === "undefined"
      ) {
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
      const nestedKeys = [
        "url",
        "publicUrl",
        "public_url",
        "path",
        "src",
        "href",
        "link",
        "imagen_url",
      ];
      for (const nestedKey of nestedKeys) {
        const nested = extractImageCandidate(record[nestedKey]);
        if (nested) return nested;
      }
    }

    return null;
  };

  const getDishImage = (item: PlatoRecord) =>
    extractImageCandidate(item.imagen_url);

  const getImagePositionY = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Math.min(100, Math.max(0, numeric));
  };

  const getInitialCantidad = (unidad?: string) => {
    const gramos = gramosDeUnidad(unidad);
    if (gramos !== null) return gramos;
    return 1;
  };

  const getPedidoItemKey = (item: any) =>
    item.id
      ? `id:${item.id}`
      : `fallback:${item.nombre}|${item.precio_eur}|${normalizarUnidadPlato(item.unidad)}|${item.categoria ?? ""}`;

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
    const existingIndex = nextPedido.findIndex(
      (existingItem: any) => getPedidoItemKey(existingItem) === key,
    );

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
      description: t.platos.toasts.addedDescription.replace(
        "{name}",
        pedidoItem.nombre,
      ),
    });
  };

  const translateCategory = (category: string) =>
    t.categories.platos[category as keyof typeof t.categories.platos] ??
    category;

  const isCardExpanded = (item: any) => {
    // Sin foto no hay nada que desplegar (igual que ProductoCard y CartaVinos).
    if (!item.imagen_url?.trim?.()) return false;
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
  // Solo los filtros que se pueden responder con datos reales. "Vegano" y
  // "Vegetariano" devolvían siempre cero platos y se han retirado; ver el
  // TODO de `FILTROS_DIETETICOS_PENDIENTES` en `@/lib/alergenos`.
  const dietaryFilterOptions: { key: DietaryFilterKey; label: string }[] = [
    { key: "celiaquia", label: t.platos.dietaryFilters.celiaquia },
    { key: "lactosa", label: t.platos.dietaryFilters.lactosa },
  ];

  const handleDietaryFilterChange = (
    filter: DietaryFilterKey,
    checked: boolean,
  ) => {
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
          <DropdownMenu
            open={categoryMenuOpen}
            onOpenChange={setCategoryMenuOpen}
            modal={false}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-72 h-12 justify-between bg-gradient-to-r from-background to-muted/30 hover:from-muted/50 hover:to-muted/60 border-2 border-border hover:border-accent/50 rounded-xl shadow-md hover:shadow-lg transition duration-300 text-base font-semibold touch-manipulation"
              >
                <span className="flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-accent" />
                  {translateCategory(selectedCategory)}
                </span>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              sideOffset={8}
              onCloseAutoFocus={(event) => event.preventDefault()}
              className="w-72 max-h-[60vh] overflow-y-auto overscroll-contain bg-background border-2 border-border shadow-2xl rounded-xl p-2"
            >
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category}
                  onSelect={(event) => {
                    event.preventDefault();
                    handleCategorySelect(category);
                  }}
                  className={`cursor-pointer rounded-lg px-4 py-3 my-1 text-base transition duration-200 touch-manipulation ${
                    selectedCategory === category
                      ? "bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-bold shadow-md"
                      : "hover:bg-muted/70 hover:translate-x-1"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        selectedCategory === category
                          ? "bg-accent-foreground"
                          : "bg-accent/40"
                      }`}
                    />
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
                    onCheckedChange={(value) =>
                      handleDietaryFilterChange(filter.key, value === true)
                    }
                    className={
                      checked
                        ? "border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
                        : ""
                    }
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
        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {filteredItems.map((item, index) => {
            const itemRecord = item as PlatoRecord;
            const cardKey =
              itemRecord.id ||
              `${itemRecord.nombre}|${itemRecord.precio_eur}|${itemRecord.categoria ?? ""}`;
            const expanded = isCardExpanded(item);
            const infoOpen = isInfoCardOpen(item);
            const imageUrl = getDishImage(itemRecord);
            const hasVisibleImage = Boolean(imageUrl && !brokenImages[cardKey]);
            const fotoCarta = esFotoCarta(imageUrl);
            const imagePositionY = fotoCarta
              ? null
              : getImagePositionY(itemRecord.imagen_posicion_y);
            const imageStyle =
              imagePositionY === null
                ? undefined
                : { objectPosition: `center ${imagePositionY}%` };
            const categoryLabel =
              item.translatedCategoria ?? translateCategory(item.categoria);
            // Vocabulario único (`@/lib/alergenos`): "frutos_cascara" del panel y
            // "frutos de cáscara" de la BD son el mismo alérgeno y se pintan con
            // la misma etiqueta, traducida al idioma activo.
            const alergenosItem = datosAlergenos(item);
            const conAlergenos = tieneInformacionAlergenos(alergenosItem);
            const infoAlergenos = Array.from(
              new Set(
                [...alergenosItem.oficiales, ...alergenosItem.inferidos]
                  .map((alergeno) => etiquetaAlergeno(alergeno, language))
                  .filter(Boolean),
              ),
            );
            const infoIngredientes = item.displayIngredientes || [];
            // La foto se pinta en las dos caras: si el cliente la ha abierto y
            // luego pulsa «información», la tarjeta gira pero la foto sigue.
            const bloqueFoto = (
              <div
                className={`relative ${fotoCarta ? "aspect-[4/3]" : "h-48"} overflow-hidden`}
              >
                {hasVisibleImage ? (
                  <FotoPlato
                    src={imagenOptimizada(imageUrl, 768) || imageUrl || ""}
                    imagenOriginal={imageUrl}
                    video={videoDePlato(itemRecord)}
                    alt={item.displayNombre}
                    style={imageStyle}
                    loading="lazy"
                    width={640}
                    height={fotoCarta ? 480 : 384}
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
            );
            return (
              // Sin `layout`: con él, mostrar/ocultar la foto o la información
              // de UNA tarjeta cambiaba su alto y Framer Motion recalculaba y
              // volvía a animar la posición de TODAS las demás tarjetas del
              // grid (el reflow que provoca ese cambio de alto), no solo la
              // que se tocó. El propio giro/despliegue de la tarjeta ya anima
              // suave por su cuenta (motion.div de abajo); las vecinas ahora
              // solo se reacomodan con el reflow normal del grid, sin el coste
              // de una animación de layout por cada tarjeta visible.
              <motion.div
                key={cardKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: Math.min(index * 0.03, 0.3),
                }}
                className="h-full [perspective:1200px]"
              >
                <div
                  className={`relative transition-transform duration-500 [transform-style:preserve-3d] ${
                    expanded || infoOpen ? "h-full" : "h-auto"
                  } ${infoOpen ? "[transform:rotateY(180deg)]" : ""}`}
                  data-tarjeta-giro={cardKey}
                >
                  <div
                    className={`${infoOpen ? "absolute inset-0 h-full" : "h-full"} [backface-visibility:hidden]`}
                    data-cara="delantera"
                    {...propsCara(infoOpen)}
                  >
                    <Card
                      className={`font-libre-baskerville flex flex-col transition-[box-shadow,transform] duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${
                        expanded || infoOpen ? "h-full" : "h-auto"
                      } ${expanded ? "card--expanded" : "card--collapsed"}`}
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
                            {bloqueFoto}
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
                              className={`leading-tight whitespace-normal break-words line-clamp-2 ${
                                expanded ? "text-lg" : "text-base min-h-12"
                              }`}
                            >
                              {item.displayNombre}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-2 self-center">
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleCard(item.id, expanded)
                              }
                              aria-label={
                                expanded
                                  ? t.platos.hidePhoto
                                  : t.platos.viewPhoto
                              }
                              className="flex items-center justify-center w-11 h-11 rounded-full bg-muted/80 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent transition-all duration-200 hover:scale-[1.03]"
                            >
                              {expanded ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={(evento) =>
                                girarYEnfocar(evento.currentTarget, () =>
                                  handleToggleInfoCard(item.id, infoOpen),
                                )
                              }
                              aria-label={
                                infoOpen
                                  ? "Ocultar información del plato"
                                  : "Mostrar información del plato"
                              }
                              aria-expanded={infoOpen}
                              data-boton-giro=""
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
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {item.displayDescripcion}
                                </p>
                              )}
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <CardFooter
                        className={`flex justify-between items-center border-t mt-auto flex-shrink-0 transition-all ${
                          expanded
                            ? "pt-3 bg-muted/30 px-6 py-3"
                            : "pt-1 bg-transparent px-4 py-2"
                        }`}
                      >
                        <span
                          className={`font-bold text-accent ${expanded ? "text-2xl" : "text-lg"}`}
                        >
                          {mostrarPrecio(item.precio_eur, language)}
                          {item.unidad && (
                            <span className="text-sm font-normal text-muted-foreground">
                              {" "}
                              / {etiquetaUnidadPlato(item.unidad, language)}
                            </span>
                          )}
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
                    data-cara="trasera"
                    {...propsCara(!infoOpen)}
                  >
                    <Card
                      className={`font-libre-baskerville flex flex-col overflow-hidden border-2 border-border/80 bg-gradient-to-br from-background to-muted/30 ${
                        infoOpen ? "h-auto" : "h-full"
                      }`}
                    >
                      {expanded && (
                        <div className="bg-muted flex-shrink-0">
                          {bloqueFoto}
                        </div>
                      )}
                      <CardHeader className="pb-3 px-6 flex-shrink-0 border-b bg-muted/20">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg leading-tight whitespace-normal break-words">
                              {item.displayNombre}
                            </CardTitle>
                            <div className="pt-2">
                              <Badge className="bg-accent/90 text-accent-foreground shadow-sm">
                                {categoryLabel}
                              </Badge>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(evento) =>
                              girarYEnfocar(evento.currentTarget, () =>
                                handleToggleInfoCard(item.id, infoOpen),
                              )
                            }
                            aria-label={
                              infoOpen
                                ? "Ocultar información del plato"
                                : "Mostrar información del plato"
                            }
                            aria-expanded={infoOpen}
                            data-boton-giro=""
                            className="flex items-center justify-center w-11 h-11 rounded-full bg-muted/80 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent transition-all duration-200 hover:scale-[1.03]"
                          >
                            <Info className="w-5 h-5" />
                          </button>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 pb-4 flex-grow overflow-auto px-6 pt-4">
                        {item.displayDescripcion?.trim() && (
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {item.displayDescripcion}
                          </p>
                        )}
                        {item.sin_gluten_disponible === true && (
                          <OpcionSinGluten />
                        )}
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-foreground">
                            {infoLabels.allergens}:
                          </p>
                          {conAlergenos ? (
                            <div className="flex flex-wrap gap-1">
                              {infoAlergenos.map(
                                (alergeno: string, idx: number) => (
                                  <Badge
                                    key={`info-alergeno-${idx}`}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {alergeno}
                                  </Badge>
                                ),
                              )}
                            </div>
                          ) : (
                            // "No disponible" se podía leer como "no tiene
                            // alérgenos". Aquí se dice lo que pasa de verdad: no
                            // consta el dato y hay que preguntar.
                            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                              {AVISO_SIN_ALERGENOS[language]}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-foreground">
                            {infoLabels.ingredients}:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {infoIngredientes.length > 0
                              ? infoIngredientes
                                  .map((ingrediente: string) =>
                                    capitalizeFirst(ingrediente),
                                  )
                                  .join(", ")
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
                          {mostrarPrecio(item.precio_eur, language)}
                          {item.unidad && (
                            <span className="text-sm font-normal text-muted-foreground">
                              {" "}
                              / {etiquetaUnidadPlato(item.unidad, language)}
                            </span>
                          )}
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
