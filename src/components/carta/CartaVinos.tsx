import { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Wine, AlertCircle, ChevronDown, Plus, MapPin, Eye, EyeOff } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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
/**
 * `mapbox-gl` pesa ~458 KB gzip — 2,7x toda la aplicación — y hasta ahora
 * entraba en el chunk de la carta de vinos por un import estático. Además el
 * mapa NO funciona: no hay ningún `VITE_MAPBOX_TOKEN` en el build (ni siquiera
 * estaba en `.env.example`), así que `mapboxgl.accessToken` quedaba vacío, no
 * se pedía ni un tile y el visitante veía un recuadro blanco de 600 px.
 *
 * Solución: carga diferida Y solo si hay token. Sin token el mapa no se monta
 * y `mapbox-gl` no se descarga nunca. Para reactivarlo basta con definir
 * `VITE_MAPBOX_TOKEN` (ver `.env.example`).
 */
const MapaMundoVinos = lazy(() => import("./MapaMundoVinos"));
const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) ?? "";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getUserPedido, setUserPedido } from "@/utils/sessionManager";
import { useTranslations } from "@/i18n/LanguageProvider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import BackToTopButton from "./BackToTopButton";
// Vocabulario único de alérgenos: este fichero tenía su propia copia de
// `normalizeAlergenos`, que ya divergía de la del resto de la carta.
import { etiquetaAlergeno, normalizeAlergenos } from "@/lib/alergenos";

interface CartaVinosProps {
  showAddButton?: boolean;
  /**
   * Vinos de la categoría inicial ("Todos") descargados en build
   * (`virtual:carta-ssg/vinos`). Evitan el parpadeo de carga al entrar a la
   * página y son lo que ve el buscador antes de que llegue el refresco de
   * Supabase.
   */
  initialVinos?: Record<string, Vino[]>;
  /**
   * Lista completa de vinos (mismo origen que `initialVinos`, sin paginar)
   * para el desplegable de categorías y el mapa: ambos necesitan verlas
   * todas, no solo la página inicial de la categoría activa.
   */
  initialMapVinos?: Vino[];
}

interface Vino {
  id?: string;
  nombre: string;
  precio_eur: number;
  categoria?: string;
  imagen_url?: string | null;
  imagen_posicion_y?: number | null;
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
  expanded?: boolean;
}

type VinoRecord = Vino & Record<string, unknown>;

const CartaVinos = ({ showAddButton = false, initialVinos, initialMapVinos }: CartaVinosProps) => {
  const { t, language } = useTranslations();
  const sectionRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  // El input queda ligado a `searchTerm` (respuesta instantánea al teclear);
  // lo que filtra la cuadrícula —y dispara sus animaciones de entrada/salida—
  // va con retraso, para no recalcular y re-animar en cada pulsación.
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 250);
  // El aviso de edad es una ventana ENCIMA del contenido, no una condición
  // que decide si ese contenido se pinta: `Dialog` se porta a `<body>` y en
  // el HTML del SSG no llega a existir (Node no tiene `document`), así que
  // arrancar en `true` no deja nada invisible ni detrás de una interacción
  // — la carta ya está en el HTML; esta ventana solo se superpone en el
  // navegador, un instante después de entrar.
  const [showAgeDialog, setShowAgeDialog] = useState(true);
  const [isAdult, setIsAdult] = useState<boolean | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [vinosByCategory, setVinosByCategory] = useState<Record<string, Vino[]>>(
    () => initialVinos ?? {},
  );
  const [loadingByCategory, setLoadingByCategory] = useState<Record<string, boolean>>({});
  const [hasMoreByCategory, setHasMoreByCategory] = useState<Record<string, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [mapVinos, setMapVinos] = useState<Vino[]>(() => initialMapVinos ?? []);
  const [mapLoading, setMapLoading] = useState(() => !initialMapVinos);
  const [mapPrefetched, setMapPrefetched] = useState(false);
  const PAGE_SIZE = 24;
  const { toast } = useToast();
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "");

  const fetchVinosByCategory = useCallback(
    async (category: string, append = false) => {
      setLoadingByCategory((prev) => ({ ...prev, [category]: true }));
      const offset = append ? (vinosByCategory[category]?.length || 0) : 0;
      const to = offset + PAGE_SIZE - 1;

      try {
        // Import perezoso: así el resto del módulo (componente, UI de
        // búsqueda) puede evaluarse y pintar su esqueleto sin esperar a que
        // el SDK de Supabase (~40 KB gzip) cargue primero.
        const { supabase } = await import("@/integrations/supabase/client");
        // Mismo filtro que el prerenderizado (`scripts/carta-ssg.mjs`):
        // `restaurante` separa la carta de Casa Tomás de la del bar (`touza`).
        let query = supabase
          .from('Vinos')
          .select('*')
          .eq('activado', true)
          .is('restaurante', true)
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
          expanded: Boolean((item as VinoRecord).expanded),
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
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from('Vinos')
        .select('categoria, ubicacion_region, ubicacion_pais, denominacion_origen, nombre, precio_eur')
        .eq('activado', true)
        .is('restaurante', true);
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

  const getPedidoItemKey = (item: Vino & { nombre?: string }) =>
    item.id
      ? `id:${item.id}`
      : `fallback:${item.nombre}|${item.precio_eur}|${item.unidad ?? ""}|${item.categoria ?? ""}`;

  const addToPedido = (item: Vino & { displayNombre?: string }) => {
    const cantidadInicial = item.cantidad ?? 1;
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
      const existingCantidad = typeof existingItem.cantidad === "number" ? existingItem.cantidad : 1;
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

    if (debouncedSearchTerm) {
      items = items.filter(item =>
        (item.displayNombre || item.nombre).toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    return items;
  }, [debouncedSearchTerm, language, selectedCategory, vinosByCategory]);

  const currentLoading = loadingByCategory[selectedCategory];

  const getCardKey = (item: VinoRecord) =>
    item.id || `${item.nombre}|${item.precio_eur}|${item.categoria ?? ""}`;

  const isCardExpanded = (item: VinoRecord) => {
    const key = getCardKey(item);
    if (expandedCards[key] !== undefined) {
      return expandedCards[key];
    }
    return Boolean(item.expanded);
  };

  const handleToggleCard = (item: VinoRecord, currentExpanded: boolean) => {
    const key = getCardKey(item);
    setExpandedCards((prev) => ({ ...prev, [key]: !currentExpanded }));
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
      const nestedKeys = [
        "url",
        "publicUrl",
        "public_url",
        "signedUrl",
        "signed_url",
        "path",
        "src",
        "href",
        "link",
        "imagen_url",
        "foto_url",
        "image_url",
      ];
      for (const nestedKey of nestedKeys) {
        const nested = extractImageCandidate(record[nestedKey]);
        if (nested) return nested;
      }
    }

    return null;
  };

  const getWineImage = (item: VinoRecord) => {
    return extractImageCandidate(item.imagen_url);
  };

  const getImagePositionY = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Math.min(100, Math.max(0, numeric));
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (!vinosByCategory[category]) {
      fetchVinosByCategory(category, false);
    }
  };

  const handleCategorySelect = (category: string) => {
    setCategoryMenuOpen(false);
    if (category === selectedCategory) return;
    requestAnimationFrame(() => handleCategoryChange(category));
  };

  const loadMore = () => {
    if (hasMoreByCategory[selectedCategory] && !currentLoading) {
      fetchVinosByCategory(selectedCategory, true);
    }
  };

  const translateCategory = (category: string) =>
    category === "Todos" ? t.vinos.categoriesAll : category;

  const handleAgeConfirm = (adult: boolean) => {
    setIsAdult(adult);
    setShowAgeDialog(false);
  };

  return (
    <div className="space-y-8" ref={sectionRef}>
      {/* Ventana de verificación de edad: se superpone al contenido, no lo
          sustituye (el contenido ya está en el HTML del SSG). Aparece un
          instante después de entrar a la página. */}
      <Dialog open={showAgeDialog} onOpenChange={setShowAgeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-accent" aria-hidden="true" />
              {t.vinos.ageCheckTitle}
            </DialogTitle>
            <DialogDescription>{t.vinos.ageCheckDescription}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 justify-center pt-4">
            <Button onClick={() => handleAgeConfirm(true)} className="bg-accent hover:bg-accent/90">
              {t.vinos.ageCheckConfirm}
            </Button>
            <Button variant="outline" onClick={() => handleAgeConfirm(false)}>
              {t.vinos.ageCheckDecline}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isAdult === false && (
        <div className="text-center py-16">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
          <p className="text-xl text-muted-foreground">{t.vinos.ageCheckBlocked}</p>
        </div>
      )}

      {/* Mapa Mundial de vinos */}
      {isAdult !== false && MAPBOX_TOKEN && !mapLoading && (
        <Suspense fallback={null}>
          <MapaMundoVinos vinos={mapVinos} />
        </Suspense>
      )}

      {isAdult !== false && (
      <>
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative max-w-md mx-auto w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" aria-hidden="true" />
          {/* El placeholder desaparece al escribir y no sustituye a una
              etiqueta: `aria-label` es lo que sigue anunciando un lector de
              pantalla una vez el campo tiene texto. */}
          <Input
            type="search"
            aria-label={t.vinos.searchPlaceholder}
            placeholder={t.vinos.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-6 text-lg"
          />
        </div>

        {/* Category Filter Dropdown */}
        <div className="flex justify-center">
          <DropdownMenu open={categoryMenuOpen} onOpenChange={setCategoryMenuOpen} modal={false}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="w-72 min-h-12 h-auto justify-between items-start bg-gradient-to-r from-background to-muted/30 hover:from-muted/50 hover:to-muted/60 border-2 border-border hover:border-accent/50 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 text-base font-semibold text-left touch-manipulation"
              >
                <span className="flex items-start gap-2 text-left whitespace-normal break-words leading-tight flex-1">
                  <Wine className="w-5 h-5 text-accent" />
                  {translateCategory(selectedCategory)}
                </span>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 flex-shrink-0 mt-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              sideOffset={8}
              onCloseAutoFocus={(event) => event.preventDefault()}
              className="w-72 max-h-[60vh] overflow-y-auto overscroll-contain bg-background/95 backdrop-blur-lg border-2 border-border shadow-2xl rounded-xl p-2"
            >
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category}
                  onSelect={(event) => {
                    event.preventDefault();
                    handleCategorySelect(category);
                  }}
                  className={`cursor-pointer rounded-lg px-4 py-3 my-1 text-base transition-all duration-200 touch-manipulation ${
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
          {filteredItems.map((item, index) => {
            const itemRecord = item as VinoRecord;
            const cardKey = getCardKey(itemRecord);
            const expanded = isCardExpanded(itemRecord);
            const imageUrl = getWineImage(itemRecord);
            const hasVisibleImage = Boolean(imageUrl && !brokenImages[cardKey]);
            const imagePositionY = getImagePositionY(itemRecord.imagen_posicion_y);
            const imageStyle = imagePositionY === null ? undefined : { objectPosition: `center ${imagePositionY}%` };
            const originLabel = [item.denominacion_origen, item.ubicacion_region, item.ubicacion_pais]
              .filter(Boolean)
              .join(" · ");

            return (
              // Sin `layout` (ver más abajo por qué) y con `initial={false}`:
              // esta carta vive en su propia página SSG, con los vinos ya en
              // el HTML — animar una entrada con `initial={{opacity:0}}`
              // dejaría cada tarjeta invisible en ese HTML hasta que el JS
              // hidrata (la advertencia de `CartaPageLayout` sobre por qué
              // aquí no se usa `motion`/`whileInView`).
              //
              // Sin `layout`: con él, mostrar/ocultar la foto de UNA tarjeta
              // cambiaba su alto y Framer Motion recalculaba y volvía a
              // animar la posición de TODAS las demás tarjetas del grid (el
              // reflow que provoca ese cambio de alto), no solo la que se
              // tocó. El propio despliegue de la tarjeta ya anima suave por
              // su cuenta (motion.div de abajo); las vecinas ahora solo se
              // reacomodan con el reflow normal del grid.
              <motion.div
                key={cardKey}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                className="h-full [perspective:1200px]"
              >
                <Card
                  className={`font-libre-baskerville flex flex-col transition-[box-shadow,transform] duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${
                    expanded ? "h-full card--expanded" : "h-auto card--collapsed"
                  }`}
                >
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        key={`image-${cardKey}`}
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
                              alt={item.displayNombre || item.nombre}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                              style={imageStyle}
                              loading="lazy"
                              decoding="async"
                              onError={() =>
                                setBrokenImages((prev) => ({ ...prev, [cardKey]: true }))
                              }
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
                              <Wine className="w-9 h-9 text-accent/70" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-accent/90 text-accent-foreground backdrop-blur-sm shadow-md">
                              {translateCategory(item.categoria)}
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
                          {item.displayNombre || item.nombre}
                        </CardTitle>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleCard(itemRecord, expanded)}
                        aria-label={`${expanded ? t.vinos.hidePhoto : t.vinos.viewPhoto} — ${item.displayNombre || item.nombre}`}
                        className="flex items-center justify-center w-11 h-11 rounded-full bg-muted/80 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent transition-all duration-200 hover:scale-[1.03]"
                      >
                        {expanded ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                      </button>
                    </div>
                    {!expanded && (
                      <div className="flex items-center gap-2 pt-2">
                        <Badge className="bg-accent/90 text-accent-foreground shadow-sm">
                          {translateCategory(item.categoria)}
                        </Badge>
                      </div>
                    )}
                  </CardHeader>

                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        key={`content-${cardKey}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                      >
                        <CardContent className="space-y-3 pb-4 flex-grow overflow-hidden">
                          {originLabel && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
                              <span className="line-clamp-2">{originLabel}</span>
                            </div>
                          )}
                          {item.descripcion && (
                            <p className="text-sm text-muted-foreground line-clamp-3">{item.descripcion}</p>
                          )}
                          {(item.alergenos_oficiales?.length > 0 || item.alergenos_inferidos?.length > 0) && (
                            <div className="flex flex-wrap gap-1">
                              {item.alergenos_oficiales?.map((alergeno: string, idx: number) => (
                                <Badge key={`oficial-${cardKey}-${idx}`} variant="destructive" className="text-xs">
                                  {etiquetaAlergeno(alergeno, language)}
                                </Badge>
                              ))}
                              {item.alergenos_inferidos?.map((alergeno: string, idx: number) => (
                                <Badge key={`inferido-${cardKey}-${idx}`} variant="secondary" className="text-xs">
                                  {etiquetaAlergeno(alergeno, language)}
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
                    </span>
                    {showAddButton && (
                      <Button
                        size="sm"
                        onClick={() => addToPedido(item)}
                        aria-label={`${t.vinos.add} — ${item.displayNombre || item.nombre}`}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-4 shadow-md hover:shadow-lg transition-all"
                      >
                        <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
                        {t.vinos.add}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
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
      </>
      )}
      <BackToTopButton targetRef={sectionRef} containerRef={gridRef} />
    </div>
  );
};

export default CartaVinos;
