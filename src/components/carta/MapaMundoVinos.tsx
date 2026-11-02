import { mostrarPrecio } from "@/lib/precios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import FiltrosTipoVino from "./FiltrosTipoVino";
import { claveOrigen, coordenadasConocidas, nombreOrigen, origenComprobable, bodegaVerificada } from "@/lib/origenes-vino";
import { tipoVino as getCategoryKey, type TipoVino } from "@/lib/tipos-vino";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/i18n/LanguageProvider";

interface Vino {
  id?: string;
  nombre: string;
  precio_eur: number;
  categoria?: string;
  denominacion_origen?: string | null;
  ubicacion_pais?: string | null;
  ubicacion_region?: string | null;
}

interface MapaMundoVinosProps {
  /** Los vinos que pasan los filtros de la carta (todos, si no hay ninguno). */
  vinos: Vino[];
  /** Hay un filtro de tipo, denominación o búsqueda aplicado. */
  filtroActivo?: boolean;
  /**
   * Identifica el filtro aplicado: al cambiar, el mapa reencuadra. Un cambio
   * de `vinos` sin cambio de clave (el refresco del catálogo) no mueve la
   * cámara, para no quitarle el mapa de las manos a quien lo está mirando.
   */
  claveFiltro?: string;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const colorByCategory: Record<string, string> = {
  tinto: "#8b1f3d",
  blanco: "#d1a536",
  rosado: "#d76d8a",
  espumoso: "#d7c07f",
  otro: "#5b6f82",
};

const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const markerBackground = (categories: string[]) => {
  const unique = categories.length ? Array.from(new Set(categories)) : ["otro"];
  if (unique.length === 1) return colorByCategory[unique[0]] || colorByCategory.otro;
  const step = 360 / unique.length;
  const slices = unique
    .map((cat, idx) => {
      const color = colorByCategory[cat] || colorByCategory.otro;
      const start = idx * step;
      const end = (idx + 1) * step;
      return `${color} ${start}deg ${end}deg`;
    })
    .join(", ");
  return `conic-gradient(${slices})`;
};

const PAGE_SIZE = 5;

const vistaInicial = (isMobile: boolean) => ({
  center: (isMobile ? [0, 20] : [0, 30]) as [number, number],
  zoom: isMobile ? 1 : 1.5,
});

// Una zona (centro de una D.O.) no es una bodega: no acercar más que a nivel de región.
const ZOOM_MAXIMO_ENCUADRE = 6;
const DURACION_ENCUADRE_MS = 900;

const sinMovimiento = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const AVISOS_SIN_PUNTOS = {
  es: {
    sinVinos: "Ningún vino coincide con los filtros.",
    sinPuntos: "Los vinos de esta selección no tienen ubicación puntual verificada en el mapa. Los encontrarás debajo.",
  },
  en: {
    sinVinos: "No wines match the filters.",
    sinPuntos: "The wines in this selection have no verified map location. You'll find them below the map.",
  },
  fr: {
    sinVinos: "Aucun vin ne correspond aux filtres.",
    sinPuntos: "Les vins de cette sélection n’ont pas de localisation précise vérifiée sur la carte. Vous les trouverez sous la carte.",
  },
};

/**
 * Con filtro, la cámara abarca los vinos que quedan; sin filtro, vuelve a la
 * vista general. Sin movimiento si el visitante lo pide
 * (`prefers-reduced-motion`) o si no hay desde dónde viajar. Si no queda ningún
 * punto no se toca: un aviso sobre el mapa explica por qué no hay marcadores.
 */
function encuadrarMapa(mapa: mapboxgl.Map, puntos: [number, number][], filtroActivo: boolean, animar: boolean) {
  const duration = animar && !sinMovimiento() ? DURACION_ENCUADRE_MS : 0;
  if (!filtroActivo) {
    mapa.easeTo({ ...vistaInicial(window.innerWidth < 768), duration });
  } else if (puntos.length > 0) {
    const longitudes = puntos.map(([longitud]) => longitud);
    const latitudes = puntos.map(([, latitud]) => latitud);
    mapa.fitBounds(
      [[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]],
      { padding: 48, maxZoom: ZOOM_MAXIMO_ENCUADRE, duration },
    );
  }
}

const MapaMundoVinos = ({ vinos, filtroActivo = false, claveFiltro = "" }: MapaMundoVinosProps) => {
  const { t, language } = useTranslations();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  // El mapa se crea una vez: al cambiar de filtro solo se cambian los
  // marcadores (y la cámara), no se reconstruye Mapbox ni se vuelven a pedir
  // los tiles.
  const marcadores = useRef<mapboxgl.Marker[]>([]);
  const puntosColocados = useRef<[number, number][]>([]);
  const [mapaCargado, setMapaCargado] = useState<mapboxgl.Map | null>(null);
  const mapaEncuadrado = useRef<mapboxgl.Map | null>(null);
  const claveEncuadrada = useRef(claveFiltro);
  const [selectedRegion, setSelectedRegion] = useState<{ region: string; vinos: Vino[]; category?: string } | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [tipoRegion, setTipoRegion] = useState<TipoVino>("todos");
  const { toast } = useToast();
  const solicitudes = useRef<AbortController | null>(null);
  type Grupo = { region: string; count: number; vinos: Vino[]; category: string };
  const grupos = useMemo(() => {
    const regionCount: Record<string, Grupo> = {};
    vinos.forEach(vino => {
      const key = claveOrigen(vino);
      const region = nombreOrigen(vino) || t.map.noLocation;
      if (!regionCount[key]) regionCount[key] = { region, count: 0, vinos: [], category: getCategoryKey(vino.categoria) };
      const grupo = regionCount[key];
      grupo.count++;
      grupo.vinos.push(vino);
      if (grupo.category === "otro") grupo.category = getCategoryKey(vino.categoria);
    });

    return Object.values(regionCount);
  }, [vinos, t.map.noLocation]);
  const sinUbicar = grupos.filter(grupo => !coordenadasConocidas(grupo.vinos[0]));

  const addWineMarkers = useCallback(() => {
    if (!map.current) return;
    const mapaActual = map.current;
    const signal = solicitudes.current!.signal;
    const isMobile = window.innerWidth < 768;

    marcadores.current.forEach(marcador => marcador.remove());
    marcadores.current = [];
    puntosColocados.current = [];

    const colocar = (data: Grupo, coords: [number, number]) => {
      const region = data.region;
      if (!signal.aborted && map.current === mapaActual) {
        const markerSize = isMobile ? 35 : 40;
        const fontSize = isMobile ? 12 : 14;
        const catList = data.vinos.map((v) => getCategoryKey(v.categoria));
        const bgColor = markerBackground(catList);
        
        const el = document.createElement('div');
        el.className = 'wine-marker';
        el.style.cssText = `
          background: ${bgColor};
          width: ${markerSize}px;
          height: ${markerSize}px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          font-size: ${fontSize}px;
          transition: box-shadow 150ms ease;
          will-change: transform;
        `;
        const span = document.createElement('span');
        span.style.cssText = 'display: inline-block; width: 100%; text-align: center;';
        span.textContent = String(data.count);
        el.textContent = '';
        el.appendChild(span);
        el.title = region;

        if (!isMobile) {
          el.addEventListener('mouseenter', () => {
            el.style.boxShadow = "0 6px 14px rgba(0,0,0,0.3)";
          });
          el.addEventListener('mouseleave', () => {
            el.style.boxShadow = "0 4px 10px rgba(0,0,0,0.25)";
          });
        }

        // La info de la región sale en un popup (más abajo), no ya en un
        // panel bajo el mapa: no hace falta desplazar la página para
        // enseñarla, aparece encima de donde esté mirando el visitante.
        el.addEventListener('click', () => {
          setTipoRegion("todos");
          setSelectedRegion({ region, vinos: data.vinos, category: data.category });
          if (map.current) {
            map.current.flyTo({ center: coords, zoom: isMobile ? 2 : 3, speed: 0.7, essential: true });
          }
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat(coords)
          .addTo(map.current);
        // Los marcadores se redimensionan con el zoom sin alterar su posición
        marker.setRotationAlignment("map");
        marker.setPitchAlignment("map");
        marcadores.current.push(marker);
        puntosColocados.current.push(coords);
      }
    };

    grupos.forEach(grupo => {
      const coords = coordenadasConocidas(grupo.vinos[0]);
      if (coords) colocar(grupo, coords);
    });
  }, [grupos]);

  const initializeMap = useCallback(() => {
    if (!mapContainer.current || map.current) return;

    solicitudes.current = new AbortController();
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    try {
      // Detectar si es móvil
      const isMobile = window.innerWidth < 768;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        ...vistaInicial(isMobile),
        projection: { name: "mercator" },
        // Mejorar la experiencia táctil en móvil
        touchZoomRotate: true,
        touchPitch: false,
        dragRotate: false,
      });

      // Controles de navegación adaptados a móvil
      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: false,
          showCompass: !isMobile,
        }),
        'top-right'
      );

      // Deshabilitar scroll zoom en móvil para no interferir con el scroll de la página
      if (isMobile) {
        map.current.scrollZoom.disable();
      }

      const mapa = map.current;
      mapa.on('load', () => setMapaCargado(mapa));
    } catch (error) {
      toast({
        title: t.map.errorTitle,
        description: t.map.errorDescription,
        variant: "destructive",
      });
    }
  }, [toast, t]);

  useEffect(() => {
    solicitudes.current?.abort();
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    setSelectedRegion(null);
    setMapaCargado(null);
    initializeMap();

    return () => {
      solicitudes.current?.abort();
      map.current?.remove();
      map.current = null;
      marcadores.current = [];
    };
  }, [initializeMap]);

  // Con el mapa cargado, los marcadores son siempre los de la lista que llega
  // (la que pasa los filtros de la carta). Si lo que cambió es el filtro, la
  // cámara se acerca a esos vinos; si solo se refrescó el catálogo, se queda
  // donde el visitante la dejó.
  useEffect(() => {
    if (!mapaCargado || mapaCargado !== map.current) return;
    addWineMarkers();
    const mapaNuevo = mapaCargado !== mapaEncuadrado.current;
    const filtroCambiado = claveFiltro !== claveEncuadrada.current;
    mapaEncuadrado.current = mapaCargado;
    claveEncuadrada.current = claveFiltro;
    // Un mapa recién creado ya con un filtro puesto (se montó tarde, o se
    // reconstruyó) se coloca de golpe: no hay vista anterior desde la que viajar.
    if (filtroCambiado || (mapaNuevo && filtroActivo)) {
      encuadrarMapa(mapaCargado, puntosColocados.current, filtroActivo, !mapaNuevo);
    }
  }, [mapaCargado, addWineMarkers, claveFiltro, filtroActivo]);

  // Asegurar que el mapa recalcula el tamaño cuando cambia el layout (p.ej. tras aceptar el modal 18+)
  useEffect(() => {
    const resize = () => {
      map.current?.resize();
    };
    const timer = setTimeout(resize, 300);
    window.addEventListener("resize", resize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    map.current?.resize();
  }, [selectedRegion]);

  const sortedSelectedVinos = selectedRegion
    ? selectedRegion.vinos.filter(vino => tipoRegion === "todos" || getCategoryKey(vino.categoria) === tipoRegion)
      .slice().sort((a, b) => a.nombre.localeCompare(b.nombre))
    : [];

  const visibleVinos = sortedSelectedVinos.slice(0, visibleCount);
  const hasMoreVinos = sortedSelectedVinos.length > visibleCount;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedRegion, tipoRegion]);

  const origenesSinUbicar = sinUbicar;
  // Con filtro y ningún vino situable (o ninguno): un aviso en vez de un mapa vacío.
  const avisoSinPuntos = filtroActivo && sinUbicar.length === grupos.length
    ? AVISOS_SIN_PUNTOS[language][vinos.length ? "sinPuntos" : "sinVinos"]
    : "";
  const avisoUbicacion = language === "es" ? "Los puntos sitúan la zona de cada vino: la bodega exacta cuando está documentada, o el centro aproximado de su denominación." : language === "en" ? "Pins show each wine's area: the exact winery where documented, otherwise the approximate centre of its appellation." : "Les points situent la zone de chaque vin : le domaine exact quand il est documenté, sinon le centre approximatif de son appellation.";

  return (
    <div className="mb-8 w-full overflow-hidden">
      <h3 className="text-xl md:text-2xl font-bold text-center mb-3 md:mb-4 px-4">{t.map.title}</h3>
      <p className="text-center text-muted-foreground mb-4 md:mb-6 text-sm md:text-base px-4">
        {avisoUbicacion}
      </p>
      <div className="relative">
        <div 
          ref={mapContainer} 
          className="w-full h-[400px] md:h-[500px] lg:h-[600px] rounded-lg shadow-xl border-2 border-border touch-pan-y max-w-full"
          style={{ maxWidth: '100%', overflow: 'hidden' }}
        />
        {/* Siempre en el DOM (vacío si no hace falta): así un lector de pantalla
            anuncia el aviso cuando aparece. No tapa el mapa ni captura toques. */}
        <div role="status" className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center px-6">
          {avisoSinPuntos && (
            <p className="max-w-sm rounded-md border border-border bg-background/95 px-4 py-3 text-center text-sm text-muted-foreground shadow-sm">
              {avisoSinPuntos}
            </p>
          )}
        </div>
      </div>
      {origenesSinUbicar.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">{language === "es" ? "Vinos sin ubicación puntual verificada" : language === "en" ? "Wines without a verified map location" : "Vins sans localisation précise vérifiée"}</p>
          <div className="flex flex-wrap gap-2">
            {origenesSinUbicar.map(grupo => (
              <Button key={claveOrigen(grupo.vinos[0])} variant="outline" size="sm" onClick={() => {
                setTipoRegion("todos");
                setSelectedRegion({ region: grupo.region, vinos: grupo.vinos, category: grupo.category });
              }}>
                {grupo.region} ({grupo.count})
              </Button>
            ))}
          </div>
        </div>
      )}
      {/* Info de la región en un popup, no en un panel bajo el mapa: antes
          había que desplazar la página para verlo (y en móvil quedaba fuera
          de la vista); ahora aparece encima, dondequiera que esté mirando
          el visitante, y se cierra con la X, Escape o clic fuera. */}
      <Dialog open={!!selectedRegion} onOpenChange={(open) => !open && setSelectedRegion(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedRegion && (
            <>
              <DialogHeader
                className="rounded-xl -m-2 p-4 space-y-1"
                style={{ backgroundColor: hexToRgba(colorByCategory[selectedRegion.category || "otro"] || colorByCategory.otro, 0.08) }}
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{t.vinos.originLabel}</p>
                <DialogTitle className="text-lg md:text-xl">{selectedRegion.region}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {sortedSelectedVinos.length === 1
                    ? t.map.countSingle.replace("{count}", sortedSelectedVinos.length.toString())
                    : t.map.countPlural.replace("{count}", sortedSelectedVinos.length.toString())}
                </DialogDescription>
              </DialogHeader>

              {bodegaVerificada(selectedRegion.vinos[0]) && <a
                className="text-sm underline underline-offset-4"
                href={bodegaVerificada(selectedRegion.vinos[0])!.fuente}
                target="_blank" rel="noopener noreferrer">
                {language === "es" ? "Consultar la ubicación en el Consejo Regulador" : language === "en" ? "View the location in the official wine council directory" : "Consulter la localisation auprès du conseil régulateur"}
              </a>}
              <FiltrosTipoVino vinos={selectedRegion.vinos} seleccionado={tipoRegion} onChange={setTipoRegion} />
              {sortedSelectedVinos.length === 0 && (
                <p role="status" className="py-6 text-center text-sm text-muted-foreground">{t.vinos.empty}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleVinos.map((vino) => {
                  const categoryKey = getCategoryKey(vino.categoria);
                  const cardColor = colorByCategory[categoryKey] || colorByCategory.otro;
                  const cardBg = hexToRgba(cardColor, 0.1);
                  const borderColor = hexToRgba(cardColor, 0.5);

                  return (
                    <div
                      key={vino.id || vino.nombre + vino.denominacion_origen}
                      className="rounded-lg border p-3 flex flex-col gap-1 shadow-sm transition-transform duration-150 hover:-translate-y-0.5"
                      style={{ backgroundColor: cardBg, borderColor }}
                    >
                      <p className="font-semibold text-foreground leading-tight">{vino.nombre}</p>
                      {origenComprobable(vino.denominacion_origen) && (
                        <p className="text-xs text-muted-foreground">{origenComprobable(vino.denominacion_origen)}</p>
                      )}
                      <p className="text-xs font-semibold uppercase" style={{ color: cardColor }}>
                        {vino.categoria || categoryKey}
                      </p>
                      <p className="text-sm font-bold" style={{ color: cardColor }}>
                        {mostrarPrecio(vino.precio_eur, language)}
                      </p>
                    </div>
                  );
                })}
              </div>
              {hasMoreVinos && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
                    {t.map.showMore ?? "Mostrar más"}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MapaMundoVinos;
