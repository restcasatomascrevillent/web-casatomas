import { precioConocido, mostrarPrecio, CONSULTAR_PRECIO } from "@/lib/precios";
import ListadoCompletoVinos from "./ListadoCompletoVinos";
import { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import FiltrosTipoVino, { BarraFiltrosVino } from "./FiltrosTipoVino";
import { origenComprobable } from "@/lib/origenes-vino";
import { categoriaCorta, etiquetaTipoVino, tipoDesdeCategoria, tipoVino } from "@/lib/tipos-vino";
import { filtrarVinos, hayFiltroVinos, nombreVinoVisible } from "@/lib/filtro-vinos";
import { Search, AlertCircle, Plus, MapPin, Eye, EyeOff, Info, Wine, Award } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

/** Cada cuánto se vuelve a consultar la carta de vinos con la pestaña abierta y visible. */
const ACTUALIZAR_CARTA_CADA_MS = 10 * 60_000;
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getEdadVinosConfirmada, getUserPedido, setEdadVinosConfirmada, setUserPedido } from "@/utils/sessionManager";
import { openCookiePreferences, useMapsConsent } from "@/lib/cookie-consent";
import { esFotoCarta, imagenOptimizada } from "@/lib/carta-ssg";
import { ordenarPorOrdenEnCategoria } from "@/lib/orden-carta.mjs";
import { NEGOCIO } from "@/lib/negocio";
import { useTranslations } from "@/i18n/LanguageProvider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import BackToTopButton from "./BackToTopButton";
import VotoVinoFavorito from "./VotoVinoFavorito";
// Vocabulario único de alérgenos: este fichero tenía su propia copia de
// `normalizeAlergenos`, que ya divergía de la del resto de la carta.
import {
  AVISO_SIN_ALERGENOS,
  datosAlergenos,
  etiquetaAlergeno,
  normalizeAlergenos,
  tieneInformacionAlergenos,
} from "@/lib/alergenos";

interface CartaVinosProps {
  showAddButton?: boolean;
  showCompleteList?: boolean;
  /**
   * Vinos descargados en build, usados como semilla de la denominación inicial
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
  orden?: string | number | null;
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
  /** Se sirve por copas y su precio (04/11/2026, panel › Gestor Web › Vinos). */
  copeo?: boolean | null;
  precio_copa_eur?: number | null;
  /** Puntos de Robert Parker / The Wine Advocate y la añada a la que corresponden. */
  puntuacion_parker?: number | null;
  puntuacion_parker_anada?: number | null;
}

type VinoRecord = Vino & Record<string, unknown>;

const INFORMACION_VINO = {
  es: { ver: "Ver información", ocultar: "Ocultar información", sinFoto: "Sin foto disponible" },
  en: { ver: "View information", ocultar: "Hide information", sinFoto: "No photo available" },
  fr: { ver: "Voir les informations", ocultar: "Masquer les informations", sinFoto: "Aucune photo disponible" },
};

/**
 * Copa y Parker (04/11/2026, petición del dueño). La copa es un tercer botón
 * redondo (con una copa) que cambia el pie de la tarjeta al precio de la copa,
 * y «Añadir» añade entonces la copa al pedido. La puntuación Parker va como un
 * icono pequeño con los puntos junto al tipo de vino.
 */
const COPA_PARKER = {
  es: {
    verCopa: "Ver precio por copa",
    verBotella: "Ver precio de la botella",
    copa: "Copa",
    copaPedido: "copa",
    parker: (puntos: number, anada?: number | null) => `Puntuación Parker: ${puntos} puntos${anada ? ` (añada ${anada})` : ""}`,
  },
  en: {
    verCopa: "See price by the glass",
    verBotella: "See bottle price",
    copa: "Glass",
    copaPedido: "glass",
    parker: (puntos: number, anada?: number | null) => `Parker score: ${puntos} points${anada ? ` (${anada} vintage)` : ""}`,
  },
  fr: {
    verCopa: "Voir le prix au verre",
    verBotella: "Voir le prix de la bouteille",
    copa: "Verre",
    copaPedido: "verre",
    parker: (puntos: number, anada?: number | null) => `Note Parker : ${puntos} points${anada ? ` (millésime ${anada})` : ""}`,
  },
};

/** Se sirve por copas y tiene un precio de copa que enseñar. */
const tieneCopa = (vino: Pick<Vino, "copeo" | "precio_copa_eur">) =>
  vino.copeo === true && typeof vino.precio_copa_eur === "number" && vino.precio_copa_eur > 0;

const puntosParker = (vino: Pick<Vino, "puntuacion_parker">) =>
  typeof vino.puntuacion_parker === "number" && vino.puntuacion_parker >= 50 && vino.puntuacion_parker <= 100
    ? vino.puntuacion_parker
    : null;

let clienteSupabase: Promise<typeof import("@/integrations/supabase/client")> | undefined;
const cargarSupabase = () => clienteSupabase ??= import("@/integrations/supabase/client");

const CartaVinos = ({ showAddButton = false, showCompleteList = false, initialVinos, initialMapVinos }: CartaVinosProps) => {
  const { t, language } = useTranslations();
  const sectionRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  // El input queda ligado a `searchTerm` (respuesta instantánea al teclear);
  // lo que filtra la cuadrícula —y dispara sus animaciones de entrada/salida—
  // va con retraso, para no recalcular y re-animar en cada pulsación.
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 250);
  // El primer render coincide con el SSG; la sesión se consulta después de hidratar.
  const [showAgeDialog, setShowAgeDialog] = useState(false);
  const [isAdult, setIsAdult] = useState<boolean | null>(null);
  useEffect(() => {
    const confirmado = getEdadVinosConfirmada();
    setShowAgeDialog(!confirmado);
    setIsAdult(confirmado ? true : null);
  }, []);
  // La semilla SSG siembra "Todos" (ver `Vinos.tsx`): abrir en la misma categoría.
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [vinosByCategory, setVinosByCategory] = useState<Record<string, Vino[]>>(
    () => {
      const semilla = initialVinos ?? {};
      if (selectedCategory === "Todos" || semilla[selectedCategory]) return semilla;
      const vinos = (initialMapVinos ?? Object.values(semilla).flat())
        .filter(vino => vino.categoria === selectedCategory);
      return { ...semilla, [selectedCategory]: vinos.slice(0, 24) };
    },
  );
  const [loadingByCategory, setLoadingByCategory] = useState<Record<string, boolean>>({});
  const [hasMoreByCategory, setHasMoreByCategory] = useState<Record<string, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [infoCards, setInfoCards] = useState<Record<string, boolean>>({});
  // Tarjetas con el precio de la copa a la vista (botón de la copa).
  const [copaCards, setCopaCards] = useState<Record<string, boolean>>({});
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [mapVinos, setMapVinos] = useState<Vino[]>(() => initialMapVinos ?? []);
  const [mapLoading, setMapLoading] = useState(() => !initialMapVinos);
  const mapFetchInFlight = useRef(false);
  const PAGE_SIZE = 24;
  const { toast } = useToast();
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "");
  // El mapa es Mapbox (tercero): solo se monta con el consentimiento real del
  // visitante, no basta con que haya token — ver `src/lib/cookie-consent.ts`.
  const mapsConsent = useMapsConsent();

  /**
   * `cantidad`: cuántas filas pedir de una vez. Por defecto una página; el
   * refresco pide las que ya estaban a la vista (si no, la lista se encogía a
   * 24 fichas mientras se leía la 40) y el buscador pide la categoría entera.
   */
  const fetchVinosByCategory = useCallback(
    async (category: string, append = false, catalogo = mapVinos, cantidad = PAGE_SIZE) => {
      setLoadingByCategory((prev) => ({ ...prev, [category]: true }));
      const offset = append ? (vinosByCategory[category]?.length || 0) : 0;
      const pedidas = Math.max(PAGE_SIZE, cantidad);
      const to = offset + pedidas - 1;

      try {
        // Import perezoso: así el resto del módulo (componente, UI de
        // búsqueda) puede evaluarse y pintar su esqueleto sin esperar a que
        // el SDK de Supabase (~40 KB gzip) cargue primero.
        const { supabase } = await cargarSupabase();
        // Mismo filtro que el prerenderizado (`scripts/carta-ssg.mjs`):
        // `restaurante` separa la carta de Casa Tomás de la del bar (`touza`).
        let query = supabase
          .from('Vinos')
          .select('*')
          .eq('activado', true)
          .is('restaurante', true)
          .order('categoria', { ascending: true })
          .order('orden', { ascending: true })
          // Desempate único: casi todos los vinos comparten categoría y
          // `orden`, y sin él Postgres puede ordenar distinto cada página
          // («Mostrar más» repetía vinos y se saltaba otros).
          .order('id', { ascending: true })
          .range(offset, to);

        const tipo = tipoDesdeCategoria(category);
        if (tipo) {
          // Agrupa todas las categorías reales del tipo, incluso si están
          // divididas entre vinos nacionales e internacionales. Se pagina
          // este grupo en el servidor, no la primera página de «Todos».
          const categorias = [...new Set(catalogo
            .filter(vino => tipoVino(vino.categoria) === tipo)
            .map(vino => vino.categoria).filter((valor): valor is string => !!valor))];
          query = query.in('categoria', categorias);
        } else if (category !== "Todos") {
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

        // Mientras `orden` sea texto en `Vinos`, Supabase lo ordena como texto
        // ("10" antes que "2"). Se reordena numérico dentro de cada categoría
        // (nulos al final), con el mismo criterio que la semilla del build
        // (`scripts/carta-ssg.mjs`). Con la columna ya entera no cambia nada.
        setVinosByCategory((prev) => {
          const existing = append ? prev[category] || [] : [];
          return { ...prev, [category]: ordenarPorOrdenEnCategoria([...existing, ...normalized]) };
        });
        setHasMoreByCategory((prev) => ({ ...prev, [category]: (data?.length || 0) === pedidas }));
        return true;
      } catch (error) {
        console.error('Error fetching vinos:', error);
        toast({
          title: t.vinos.toasts.errorTitle,
          description: t.vinos.toasts.errorDescription,
          variant: "destructive",
        });
        return false;
      } finally {
        setLoadingByCategory((prev) => ({ ...prev, [category]: false }));
      }
    },
    [PAGE_SIZE, toast, t.vinos.toasts.errorDescription, t.vinos.toasts.errorTitle, vinosByCategory, mapVinos]
  );

  useEffect(() => {
    fetchVinosByCategory(selectedCategory, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMap = useCallback(async () => {
    if (mapFetchInFlight.current) return;
    mapFetchInFlight.current = true;
    try {
      const { supabase } = await cargarSupabase();
      const catalogo: Vino[] = [];
      const pageSize = 1000;
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase
          .from('Vinos')
          // `nombre_en`/`nombre_fr`: el buscador filtra el mapa por el mismo
          // nombre que ve el visitante en su idioma.
          .select('id, categoria, ubicacion_region, ubicacion_pais, denominacion_origen, nombre, nombre_en, nombre_fr, precio_eur')
          .eq('activado', true)
          .is('restaurante', true)
          .order('id', { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        catalogo.push(...(data || []));
        if ((data?.length || 0) < pageSize) break;
      }
      // No reconstruir Mapbox si el catálogo sigue siendo el mismo.
      setMapVinos(prev => JSON.stringify(prev) === JSON.stringify(catalogo) ? prev : catalogo);
      return catalogo;
    } catch (error) {
      console.error('Error fetching map vinos:', error);
    } finally {
      mapFetchInFlight.current = false;
      setMapLoading(false);
    }
  }, []);

  const refreshRef = useRef<() => Promise<void>>();
  refreshRef.current = async () => {
    const catalogo = await fetchMap();
    if (catalogo) {
      // Tantas filas como hay a la vista, no solo la primera página.
      await fetchVinosByCategory(selectedCategory, false, catalogo, vinosByCategory[selectedCategory]?.length);
    }
  };

  useEffect(() => {
    void fetchMap();
    const refresh = () => {
      if (document.visibilityState === "visible") void refreshRef.current?.();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    // Cada 10 min (antes 60 s: una petición por minuto y visitante con la carta
    // abierta). Al volver a la pestaña, recuperar la conexión o enfocar la ventana
    // se refresca al instante, así que un cambio de precio no tarda en verse.
    const timer = window.setInterval(refresh, ACTUALIZAR_CARTA_CADA_MS);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchMap]);

  const getPedidoItemKey = (item: Vino & { nombre?: string }) =>
    item.id
      ? `id:${item.id}`
      : `fallback:${item.nombre}|${item.precio_eur}|${item.unidad ?? ""}|${item.categoria ?? ""}`;

  const addToPedido = (item: Vino & { displayNombre?: string }) => {
    if (!precioConocido(item.precio_eur)) return;
    const cantidadInicial = item.cantidad ?? 1;
    const pedidoItem = {
      ...item,
      nombre: item.displayNombre || item.nombre,
      cantidad: cantidadInicial,
    };
    const pedido = getUserPedido();
    const nextPedido = [...pedido];
    const key = getPedidoItemKey(pedidoItem);
    const existingIndex = nextPedido.findIndex((existingItem) => getPedidoItemKey(existingItem) === key);

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

  const tipoSeleccionado = tipoDesdeCategoria(selectedCategory)
    ?? (selectedCategory === "Todos" ? "todos" : tipoVino(selectedCategory));
  const denominaciones = useMemo(() => {
    const cantidades = new Map<string, number>();
    mapVinos.forEach(vino => {
      if (vino.categoria && tipoVino(vino.categoria) === tipoSeleccionado) {
        cantidades.set(vino.categoria, (cantidades.get(vino.categoria) ?? 0) + 1);
      }
    });
    return Array.from(cantidades, ([valor, cantidad]) => ({ valor, etiqueta: categoriaCorta(valor, language), cantidad }));
  }, [mapVinos, tipoSeleccionado, language]);

  // Los mismos filtros (tipo, denominación y buscador) mueven la cuadrícula y el
  // mapa: `filtrarVinos` es la única fuente. La cuadrícula filtra lo ya cargado
  // de la categoría (paginado); el mapa, el catálogo entero.
  const filteredItems = useMemo(() => {
    const categoryItems = vinosByCategory[selectedCategory] || [];
    return filtrarVinos(categoryItems, { categoria: selectedCategory, busqueda: debouncedSearchTerm, language })
      .map((vino) => ({ ...vino, displayNombre: nombreVinoVisible(vino, language) }));
  }, [debouncedSearchTerm, language, selectedCategory, vinosByCategory]);

  const mapaVinos = useMemo(
    () => filtrarVinos(mapVinos, { categoria: selectedCategory, busqueda: debouncedSearchTerm, language }),
    [mapVinos, selectedCategory, debouncedSearchTerm, language],
  );

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

  // Foto e información son excluyentes: abrir una cierra la otra, nunca las
  // dos tarjetas (foto + texto) a la vez estirando la ficha el doble.
  const handleToggleCard = (item: VinoRecord, currentExpanded: boolean) => {
    const key = getCardKey(item);
    const next = !currentExpanded;
    setExpandedCards((prev) => ({ ...prev, [key]: next }));
    if (next) setInfoCards((prev) => ({ ...prev, [key]: false }));
  };

  const isInfoCardOpen = (item: VinoRecord) => Boolean(infoCards[getCardKey(item)]);

  const handleToggleInfoCard = (item: VinoRecord, currentOpen: boolean) => {
    const key = getCardKey(item);
    const next = !currentOpen;
    setInfoCards((prev) => ({ ...prev, [key]: next }));
    if (next) setExpandedCards((prev) => ({ ...prev, [key]: false }));
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

  // El buscador filtra lo ya cargado: con una búsqueda activa se trae el resto
  // de la categoría (unas 200 referencias, una sola petición) para que un vino
  // de la página 2 no «desaparezca». Si la petición falla no se reintenta en
  // bucle: queda «Mostrar más», como siempre.
  const busquedaIntentada = useRef(new Set<string>());
  const completandoBusqueda = Boolean(debouncedSearchTerm.trim()) && Boolean(hasMoreByCategory[selectedCategory]);
  useEffect(() => {
    if (!completandoBusqueda || currentLoading || busquedaIntentada.current.has(selectedCategory)) return;
    const categoria = selectedCategory;
    busquedaIntentada.current.add(categoria);
    void fetchVinosByCategory(categoria, true, mapVinos, 1000).then((ok) => {
      if (ok) busquedaIntentada.current.delete(categoria);
    });
  }, [completandoBusqueda, currentLoading, selectedCategory, fetchVinosByCategory, mapVinos]);

  const handleAgeConfirm = (adult: boolean) => {
    setIsAdult(adult);
    setShowAgeDialog(false);
    if (adult) {
      setEdadVinosConfirmada();
    }
  };

  return (
    <div className="space-y-6" ref={sectionRef}>
      {/* Ventana de verificación de edad: se superpone al contenido, no lo
          sustituye (el contenido ya está en el HTML del SSG). Aparece un
          instante después de entrar a la página. */}
      <Dialog open={showAgeDialog} onOpenChange={() => {}}>
        <DialogContent
          hideCloseButton
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-balance break-words leading-tight">
              <AlertCircle className="w-6 h-6 text-accent" aria-hidden="true" />
              {t.vinos.ageCheckTitle}
            </DialogTitle>
            <DialogDescription>{t.vinos.ageCheckDescription}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 justify-center pt-4">
            <Button onClick={() => handleAgeConfirm(true)} className="bg-accent hover:bg-accent-hover">
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

      {/* Mapa Mundial de vinos: Mapbox es un tercero (tiles + telemetría de
          uso a events.mapbox.com), así que solo se monta con el
          consentimiento real del visitante — sin él, un aviso explica por
          qué no está y deja abrir las preferencias ahí mismo, en vez de
          dejar el hueco en blanco como si faltara. */}
      {isAdult !== false && MAPBOX_TOKEN && !mapLoading && (
        mapsConsent ? (
          <Suspense fallback={null}>
            <MapaMundoVinos
              vinos={mapaVinos}
              filtroActivo={hayFiltroVinos(selectedCategory, debouncedSearchTerm)}
              claveFiltro={`${selectedCategory}\u0000${debouncedSearchTerm}`}
            />
          </Suspense>
        ) : (
          <div className="mb-8 flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 py-10 px-4 text-center">
            <MapPin className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
            <p className="max-w-sm text-sm text-muted-foreground">{t.cookie.mapsDisabledNotice}</p>
            <Button type="button" variant="outline" size="sm" onClick={openCookiePreferences}>
              {t.cookie.mapsEnableCta}
            </Button>
          </div>
        )
      )}

      {isAdult !== false && (
      <>
      {/* «Vota tu vino favorito» (04/11/2026): aviso de 3 s al entrar y botón para votar,
          solo con la votación abierta en el panel y la edad ya confirmada. */}
      <VotoVinoFavorito vinos={mapVinos} listo={isAdult === true} language={language} />

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
            className="h-11 pl-10 text-base font-sans"
          />
        </div>

        {mapVinos.length > 0 && <div className="flex min-w-0 flex-col gap-3">
          <FiltrosTipoVino
            vinos={mapVinos}
            seleccionado={tipoSeleccionado}
            onChange={tipo => handleCategoryChange(tipo === "todos" ? "Todos" : `tipo:${tipo}`)}
          />
          {tipoSeleccionado !== "todos" && denominaciones.length > 0 && <BarraFiltrosVino
            key={tipoSeleccionado}
            etiqueta={language === "es" ? "Filtrar vinos por denominación" : language === "en" ? "Filter wines by region" : "Filtrer les vins par région"}
            seleccionado={selectedCategory}
            onChange={handleCategoryChange}
            opciones={[
              { valor: `tipo:${tipoSeleccionado}`, etiqueta: t.vinos.categoriesAll, cantidad: denominaciones.reduce((total, denominacion) => total + denominacion.cantidad, 0) },
              ...denominaciones,
            ]}
          />}
        </div>}
      </div>

      {/* Items Grid */}
      {!vinosByCategory[selectedCategory] && currentLoading ? (
        <div className="text-center py-16">
          <p className="text-xl text-muted-foreground">{t.vinos.loading}</p>
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {filteredItems.map((item) => {
            const itemRecord = item as VinoRecord;
            const cardKey = getCardKey(itemRecord);
            const infoOpen = isInfoCardOpen(itemRecord);
            const conCopa = tieneCopa(item);
            const copaOpen = conCopa && Boolean(copaCards[cardKey]);
            const parker = puntosParker(item);
            const precioVisible = copaOpen ? item.precio_copa_eur : item.precio_eur;
            const imageUrl = getWineImage(itemRecord);
            const hasVisibleImage = Boolean(imageUrl && !brokenImages[cardKey]);
            const expanded = hasVisibleImage && isCardExpanded(itemRecord);
            const fotoCarta = expanded && esFotoCarta(imageUrl);
            const originLabel = [
              origenComprobable(item.denominacion_origen),
              origenComprobable(item.ubicacion_region), origenComprobable(item.ubicacion_pais),
            ]
              .filter(Boolean)
              .join(" · ");
            const alergenosItem = datosAlergenos(item);
            const conAlergenos = tieneInformacionAlergenos(alergenosItem);
            // Declarados e inferidos no se mezclan en el mismo badge: un
            // inferido nunca puede parecer tan seguro como lo que el
            // restaurante certifica.
            const alergenosOficiales = Array.from(
              new Set(alergenosItem.oficiales.map((a) => etiquetaAlergeno(a, language)).filter(Boolean)),
            );
            const alergenosInferidos = Array.from(
              new Set(alergenosItem.inferidos.map((a) => etiquetaAlergeno(a, language)).filter(Boolean)),
            ).filter((etiqueta) => !alergenosOficiales.includes(etiqueta));
            return (
              <div key={cardKey} className="min-w-0">
                <Card className="overflow-hidden border-border/80 bg-background shadow-sm">
                  <div className="flex">
                    <div className="flex min-w-0 flex-1 flex-col">
                      {/* Con foto lateral la columna de texto es estrecha: los dos
                          botones (44 px cada uno) se apilan a la derecha, a lo alto
                          del título + tipo, en vez de quitarle 100 px al nombre. */}
                      <CardHeader
                        className={expanded
                          ? "grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_1fr] items-start gap-x-2 gap-y-1 space-y-0 px-3 py-2"
                          : "gap-2 px-4 py-3"}
                      >
                        <div className={expanded ? "contents" : "flex items-start justify-between gap-2"}>
                          <CardTitle as="h2"
                            className={`min-w-0 flex-1 pt-1 font-libre-baskerville text-base leading-snug break-words ${expanded ? "col-start-1 row-start-1" : ""}`}
                          >
                            {item.displayNombre || item.nombre}
                          </CardTitle>
                          <div className={`flex shrink-0 gap-1 ${expanded ? "col-start-2 row-span-2 row-start-1 flex-col" : ""}`}>
                            <button
                              type="button"
                              onClick={() => handleToggleCard(itemRecord, expanded)}
                              aria-label={`${expanded ? t.vinos.hidePhoto : t.vinos.viewPhoto} — ${item.displayNombre || item.nombre}`}
                              aria-expanded={expanded}
                              aria-controls={`foto-vino-${cardKey}`}
                              disabled={!hasVisibleImage}
                              title={!hasVisibleImage ? INFORMACION_VINO[language].sinFoto : undefined}
                              className="flex h-11 w-11 items-center justify-center rounded-full bg-muted/60 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              {expanded ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleInfoCard(itemRecord, infoOpen)}
                              aria-label={`${infoOpen ? INFORMACION_VINO[language].ocultar : INFORMACION_VINO[language].ver} — ${item.displayNombre || item.nombre}`}
                              aria-expanded={infoOpen}
                              aria-controls={`info-vino-${cardKey}`}
                              className="flex h-11 w-11 items-center justify-center rounded-full bg-muted/60 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
                            >
                              <Info className="h-4 w-4" aria-hidden="true" />
                            </button>
                            {conCopa && (
                              <button
                                type="button"
                                onClick={() => setCopaCards((prev) => ({ ...prev, [cardKey]: !copaOpen }))}
                                aria-label={`${copaOpen ? COPA_PARKER[language].verBotella : COPA_PARKER[language].verCopa} — ${item.displayNombre || item.nombre}`}
                                aria-pressed={copaOpen}
                                title={copaOpen ? COPA_PARKER[language].verBotella : COPA_PARKER[language].verCopa}
                                className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent ${copaOpen ? "bg-accent text-accent-foreground hover:bg-accent-hover" : "bg-muted/60 text-foreground hover:bg-muted"}`}
                              >
                                <Wine className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className={`font-sans text-xs leading-relaxed text-muted-foreground ${expanded ? "col-start-1 row-start-2" : ""}`}>
                          {etiquetaTipoVino(tipoVino(item.categoria), language)} · {categoriaCorta(item.categoria ?? "", language)}
                          {parker !== null && (
                            // Icono de la puntuación Parker: puntos a la vista; añada al pasar por encima
                            // y para el lector de pantalla.
                            <span
                              title={COPA_PARKER[language].parker(parker, item.puntuacion_parker_anada)}
                              aria-label={COPA_PARKER[language].parker(parker, item.puntuacion_parker_anada)}
                              role="img"
                              className="ml-2 inline-flex translate-y-[-1px] items-center gap-0.5 whitespace-nowrap rounded-full border border-accent/40 bg-accent/10 px-1.5 py-px align-middle text-[11px] font-semibold leading-4 text-accent"
                            >
                              <Award className="h-3 w-3" aria-hidden="true" />
                              {parker}
                              <span className="font-normal">RP</span>
                            </span>
                          )}
                        </p>
                      </CardHeader>

                      {infoOpen && (
                        <CardContent id={`info-vino-${cardKey}`} className="space-y-3 px-4 pb-4 font-sans text-sm leading-relaxed">
                          {originLabel && <p className="flex items-start gap-2 text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" /><span>{originLabel}</span></p>}
                          {item.descripcion?.trim() && <p className="whitespace-pre-line text-muted-foreground">{item.descripcion}</p>}
                          <div className="space-y-2">
                            <p className="font-medium">{t.vinos.allergensTitle}:</p>
                            {conAlergenos ? <div className="flex flex-wrap gap-1">
                              {alergenosOficiales.map(alergeno => <Badge key={`oficial-${cardKey}-${alergeno}`} variant="destructive" className="text-xs">{alergeno}</Badge>)}
                              {alergenosInferidos.map(alergeno => <Badge key={`inferido-${cardKey}-${alergeno}`} variant="secondary" className="text-xs">{alergeno}</Badge>)}
                            </div> : <p className="rounded bg-destructive/10 p-2 text-destructive">{AVISO_SIN_ALERGENOS[language]}</p>}
                          </div>
                          {alergenosItem.notas && <p className="text-xs text-destructive">{alergenosItem.notas}</p>}
                        </CardContent>
                      )}

                      {/* Con foto lateral el precio y «Añadir» comparten una sola
                          fila (sin `flex-wrap`): si el precio no cabe se parte él
                          en dos líneas, nunca baja el botón. */}
                      <CardFooter
                        className={`mt-auto flex items-center justify-between border-t border-border/60 bg-muted/10 ${expanded ? "gap-2 px-3 py-2 max-[359px]:gap-1" : "flex-wrap gap-2 px-4 py-3"}`}
                      >
                        {precioConocido(precioVisible)
                          ? <span className="min-w-0 font-libre-baskerville text-base font-bold leading-tight text-accent min-[360px]:text-lg">
                              {copaOpen && <span className="mr-1.5 font-sans text-xs font-semibold uppercase tracking-wide">{COPA_PARKER[language].copa}</span>}
                              {mostrarPrecio(precioVisible, language)}
                            </span>
                          // «Consultar precio» no es un precio: no se pinta como tal.
                          : <span className="min-w-0 font-sans text-sm font-medium leading-tight text-muted-foreground">{mostrarPrecio(item.precio_eur, language)}</span>}
                        {showAddButton && <Button size="sm" disabled={!precioConocido(precioVisible)} title={!precioConocido(precioVisible) ? CONSULTAR_PRECIO[language] : undefined} onClick={() => addToPedido(copaOpen
                          // La copa es otra línea del pedido (otro id y otro precio que la botella).
                          ? { ...item, id: `${item.id}:copa`, precio_eur: item.precio_copa_eur as number, displayNombre: `${item.displayNombre || item.nombre} (${COPA_PARKER[language].copaPedido})` }
                          : item)} aria-label={`${t.vinos.add} — ${item.displayNombre || item.nombre}${copaOpen ? ` (${COPA_PARKER[language].copaPedido})` : ""}`} className={`h-10 rounded-full bg-accent font-sans text-sm text-accent-foreground hover:bg-accent-hover ${expanded ? "shrink-0 px-3 max-[359px]:px-2" : "px-4"}`}><Plus className="mr-1 h-4 w-4" aria-hidden="true" />{t.vinos.add}</Button>}
                      </CardFooter>
                    </div>

                    {expanded && (
                      // Foto en la columna LATERAL de la tarjeta (no debajo): la
                      // ficha no crece en alto y, en una carta de ~240 vinos, no
                      // hay scroll eterno. Va DESPUÉS del texto en el DOM (el lector
                      // de pantalla lee el nombre antes que la foto) y `order-first`
                      // la deja a la izquierda. El `<img>` lleva `width`/`height`:
                      // el hueco existe antes de cargar (sin CLS).
                      //  - Foto de carta (`-carta-<ext>.webp`, lienzo 3:4 con la
                      //    botella al ~25 % del ancho, centrada): marco 3:5 con
                      //    `object-cover`. Con un marco igual o más estrecho que 3:4
                      //    el `cover` solo recorta cartulina de los lados, nunca la
                      //    botella en alto, y desaparecen las franjas cuando la
                      //    ficha estira el marco por un nombre largo.
                      //  - Foto antigua (otras proporciones, oscuras con halo
                      //    dorado): marco 3:4 con `object-contain` sobre su fondo
                      //    oscuro de siempre, entera.
                      <div
                        id={`foto-vino-${cardKey}`}
                        className={`order-first shrink-0 overflow-hidden border-r border-border/60 ${fotoCarta ? "aspect-[3/5] w-[27%] max-w-[6.5rem] bg-[#cdae77]" : "aspect-[3/4] w-[36%] max-w-[8rem] bg-[#1a1612]"}`}
                      >
                        <img
                          src={imagenOptimizada(imageUrl, 640) || undefined}
                          alt={`${item.displayNombre || item.nombre} — ${categoriaCorta(item.categoria ?? "", language)}, ${NEGOCIO.nombre}`}
                          width={900}
                          height={1200}
                          className={`h-full w-full ${fotoCarta ? "object-cover" : "object-contain"}`}
                          loading="lazy"
                          decoding="async"
                          onError={() => setBrokenImages(prev => ({ ...prev, [cardKey]: true }))}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {!currentLoading && !(completandoBusqueda && !busquedaIntentada.current.has(selectedCategory)) && filteredItems.length === 0 && (
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
      {showCompleteList && isAdult !== false && <ListadoCompletoVinos vinos={mapVinos} language={language} />}
      <BackToTopButton targetRef={sectionRef} containerRef={gridRef} />
    </div>
  );
};

export default CartaVinos;
