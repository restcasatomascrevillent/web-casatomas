/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, ChevronDown, Wine } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserPedido, setUserPedido } from "@/utils/sessionManager";
import { useTranslations } from "@/i18n/LanguageProvider";
import { CATEGORIAS_BEBIDAS } from "@/lib/carta-rutas";
import BackToTopButton from "./BackToTopButton";

/**
 * Categorías DERIVADAS DEL DATO (recuento que descargó el build), no escritas
 * a mano. Con la lista fija de cinco pestañas que había aquí, 29 de las 75
 * bebidas eran inalcanzables desde la portada aunque `/carta/bebidas` sí las
 * mostrara: en la BD hay siete categorías.
 */
const CATEGORIAS = CATEGORIAS_BEBIDAS.map((categoria) => categoria.clave);

/** Determinista (mismo valor en el prerenderizado y al hidratar). */
export const CATEGORIA_INICIAL =
  CATEGORIAS.find((categoria) => categoria === "Aguas") ?? CATEGORIAS[0] ?? "TODAS";

interface CartaBebidasProps {
  showAddButton: boolean;
  /**
   * Bebidas ya descargadas en build (`virtual:carta-ssg/bebidas`), agrupadas
   * al menos bajo "TODAS" y `CATEGORIA_INICIAL`. Evitan el parpadeo de carga
   * al entrar a `/carta/bebidas` y son lo que ve el buscador antes de que
   * llegue el refresco de Supabase — mismo patrón que `initialVinos` en
   * `CartaVinos`.
   */
  initialBebidas?: Record<string, Bebida[]>;
}

interface Bebida {
  id?: string;
  nombre: string;
  precio_eur: number;
  categoria?: string;
  descripcion?: string;
  tamano?: string;
  orden?: number;
  activado?: boolean;
  nombre_en?: string;
  nombre_fr?: string;
  descripcion_en?: string;
  descripcion_fr?: string;
  cantidad?: number;
}

const CartaBebidas = ({ showAddButton, initialBebidas }: CartaBebidasProps) => {
  const { t, language } = useTranslations();
  const sectionRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  // El input queda ligado a `searchTerm` (respuesta instantánea al teclear);
  // lo que filtra la cuadrícula —y dispara sus animaciones de entrada/salida—
  // va con retraso, para no recalcular y re-animar en cada pulsación.
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 250);
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIA_INICIAL);
  const [bebidasByCategory, setBebidasByCategory] = useState<Record<string, Bebida[]>>(
    () => initialBebidas ?? {},
  );
  const [loadingByCategory, setLoadingByCategory] = useState<Record<string, boolean>>({});
  const [hasMoreByCategory, setHasMoreByCategory] = useState<Record<string, boolean>>({});
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const { toast } = useToast();
  const PAGE_SIZE = 24;
  const currentLoading = loadingByCategory[selectedCategory];

  /** `cantidad`: filas a pedir de una vez (el buscador pide la categoría entera). */
  const fetchBebidas = useCallback(async (category: string, append = false, cantidad = PAGE_SIZE) => {
    setLoadingByCategory((prev) => ({ ...prev, [category]: true }));
    const offset = append ? (bebidasByCategory[category]?.length || 0) : 0;
    const pedidas = Math.max(PAGE_SIZE, cantidad);
    const to = offset + pedidas - 1;
    try {
      // Import perezoso: así el resto del módulo (componente, UI de
      // búsqueda) puede evaluarse y pintar su esqueleto sin esperar a que el
      // SDK de Supabase (~40 KB gzip) cargue primero.
      const { supabase } = await import("@/integrations/supabase/client");
      // Mismo filtro que el prerenderizado (`scripts/carta-ssg.mjs`):
      // `restaurante` separa la carta de Casa Tomás de la del bar (`touza`).
      let query = supabase
        .from('Bebidas')
        .select('*')
        .eq('activado', true)
        .is('restaurante', true)
        .order('orden', { ascending: true })
        // Desempate único: en «TODAS» la mayoría de bebidas comparten `orden`
        // y sin él cada página podía venir en otro orden (repetidas/omitidas).
        .order('id', { ascending: true })
        .range(offset, to);

      if (category !== "TODAS") {
        query = query.eq('categoria', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      const mapped = data || [];
      setBebidasByCategory((prev) => {
        const existing = append ? prev[category] || [] : [];
        return { ...prev, [category]: [...existing, ...mapped] };
      });
      setHasMoreByCategory((prev) => ({ ...prev, [category]: (data?.length || 0) === pedidas }));
      return true;
    } catch (error) {
      console.error('Error fetching bebidas:', error);
      toast({
        title: t.bebidas.toasts.errorTitle,
        description: t.bebidas.toasts.errorDescription,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoadingByCategory((prev) => ({ ...prev, [category]: false }));
    }
  }, [PAGE_SIZE, bebidasByCategory, toast, t.bebidas.toasts.errorDescription, t.bebidas.toasts.errorTitle]);

  useEffect(() => {
    fetchBebidas(selectedCategory, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (!bebidasByCategory[category]) {
      fetchBebidas(category, false);
    }
  };

  const handleCategorySelect = (category: string) => {
    setCategoryMenuOpen(false);
    if (category === selectedCategory) return;
    requestAnimationFrame(() => handleCategoryChange(category));
  };

  const loadMore = () => {
    if (hasMoreByCategory[selectedCategory] && !currentLoading) {
      fetchBebidas(selectedCategory, true);
    }
  };

  // Mismo criterio que la carta de vinos: con una búsqueda activa se trae el
  // resto de la categoría para que el buscador no se limite a las 24 primeras
  // (en «Cervezas» hay 25). Si falla no se reintenta en bucle.
  const busquedaIntentada = useRef(new Set<string>());
  const completandoBusqueda = Boolean(debouncedSearchTerm.trim()) && Boolean(hasMoreByCategory[selectedCategory]);
  useEffect(() => {
    if (!completandoBusqueda || currentLoading || busquedaIntentada.current.has(selectedCategory)) return;
    const categoria = selectedCategory;
    busquedaIntentada.current.add(categoria);
    void fetchBebidas(categoria, true, 1000).then((ok) => {
      if (ok) busquedaIntentada.current.delete(categoria);
    });
  }, [completandoBusqueda, currentLoading, selectedCategory, fetchBebidas]);

  const categories = useMemo(() => {
    const conSeleccion =
      selectedCategory === "TODAS" || CATEGORIAS.includes(selectedCategory)
        ? CATEGORIAS
        : [selectedCategory, ...CATEGORIAS];
    return [...conSeleccion, "TODAS"];
  }, [selectedCategory]);

  const filteredItems = useMemo(() => {
    const categoryItems = bebidasByCategory[selectedCategory] || [];
    const translated = categoryItems.map((bebida) => {
      const columnName = (bebida as any)[`nombre_${language}`];
      const columnDesc = (bebida as any)[`descripcion_${language}`];
      return {
        ...bebida,
        displayNombre: language === "es" ? bebida.nombre : (columnName || bebida.nombre),
        displayDescripcion: language === "es" ? bebida.descripcion : (columnDesc ?? bebida.descripcion),
      };
    });

    let items = translated;

    if (debouncedSearchTerm) {
      items = items.filter(item =>
        (item.displayNombre || item.nombre).toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    return items;
  }, [bebidasByCategory, debouncedSearchTerm, language, selectedCategory]);

  const getPedidoItemKey = (item: Bebida & { nombre?: string }) =>
    item.id
      ? `id:${item.id}`
      : `fallback:${item.nombre}|${item.precio_eur}|${item.tamano ?? ""}|${item.categoria ?? ""}`;

  const addToPedido = (item: Bebida & { displayNombre?: string }) => {
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
      title: t.bebidas.toasts.addedTitle,
      description: t.bebidas.toasts.addedDescription.replace("{name}", pedidoItem.nombre),
    });
  };

  const translateCategory = (category: string) =>
    t.categories.bebidas[category as keyof typeof t.categories.bebidas] ?? category;

  return (
    <div className="space-y-8" ref={sectionRef}>
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative max-w-md mx-auto w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder={t.bebidas.searchPlaceholder}
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
                className="w-72 min-h-12 h-auto justify-between items-start bg-gradient-to-r from-background to-muted/30 hover:from-muted/50 hover:to-muted/60 border-2 border-border hover:border-accent/50 rounded-xl shadow-md hover:shadow-lg transition duration-300 text-base font-semibold text-left touch-manipulation"
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
              className="w-72 max-h-[60vh] overflow-y-auto overscroll-contain bg-background border-2 border-border shadow-2xl rounded-xl p-2 z-50"
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
      {!bebidasByCategory[selectedCategory] && currentLoading ? (
        <div className="text-center py-16">
          <p className="text-xl text-muted-foreground">{t.bebidas.loading}</p>
        </div>
      ) : (
      <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredItems.map((item, index) => (
          // `initial={false}`: esta cuadrícula vive en `/carta/bebidas`, con
          // las bebidas ya en el HTML del SSG — animar una entrada con
          // `initial={{opacity:0}}` dejaría cada tarjeta invisible en ese
          // HTML hasta que el JS hidrata (mismo motivo que en `CartaVinos`).
          <motion.div
            key={item.id}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
          >
            <Card className="font-libre-baskerville h-full flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border-2 border-border/80 bg-gradient-to-br from-background to-muted/30 text-sm">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className="w-10 h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
                      <Wine className="w-4 h-4" />
                    </span>
                    <CardTitle className="text-lg leading-tight line-clamp-2 min-h-12">{item.displayNombre || item.nombre}</CardTitle>
                  </div>
                  <span className="bg-accent/90 text-accent-foreground backdrop-blur-sm shadow-md px-3 py-1 rounded-full text-sm font-semibold flex-shrink-0">
                    {translateCategory(item.categoria)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-4 flex-grow overflow-hidden">
                {(item.displayDescripcion || item.descripcion) && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.displayDescripcion || item.descripcion}</p>
                )}
                {item.tamano && (
                  <p className="text-sm font-semibold text-accent">{item.tamano}</p>
                )}
              </CardContent>
              <CardFooter className="flex justify-between items-center border-t bg-muted/40 flex-shrink-0 mt-auto px-6 py-3">
                <span className="text-2xl font-bold text-accent leading-none">{item.precio_eur}€</span>
                {showAddButton && (
                  <Button
                    size="sm"
                    onClick={() => addToPedido(item)}
                    className="bg-accent hover:bg-accent-hover text-accent-foreground rounded-full px-4 shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {t.bebidas.add}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
      )}

      {filteredItems.length === 0 && !(completandoBusqueda && !busquedaIntentada.current.has(selectedCategory)) && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-xl">{t.bebidas.empty}</p>
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
            {currentLoading ? t.bebidas.loading : t.map.showMore}
          </Button>
        </div>
      )}
      <BackToTopButton targetRef={sectionRef} containerRef={gridRef} />
    </div>
  );
};

export default CartaBebidas;
