import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import FiltrosTipoVino from "./FiltrosTipoVino";
import { tipoVino as getCategoryKey, type TipoVino } from "@/lib/tipos-vino";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/i18n/LanguageProvider";

interface Vino {
  nombre: string;
  precio_eur: number;
  categoria?: string;
  denominacion_origen?: string;
  ubicacion_pais?: string;
  ubicacion_region?: string;
}

interface MapaMundoVinosProps {
  vinos: Vino[];
}

// Coordenadas aproximadas de las regiones
const regionCoordinates: { [key: string]: [number, number] } = {
  // Francia
  "Champagne (Grand Est)": [4.0, 49.0],
  "Borgoña (Bourgogne-Franche-Comté)": [4.85, 47.0],
  "Borgoña (Yonne)": [3.6, 47.8],
  "Borgoña (estimado)": [4.85, 47.0],
  "Valle del Loira (Pays de la Loire)": [-0.5, 47.5],
  "Valle del Loira (Indre‑et‑Loire)": [0.7, 47.3],
  "Valle del Loira (Nièvre)": [3.5, 47.0],
  "Burdeos (Nouvelle-Aquitaine)": [-0.5, 44.8],
  "Burdeos (Pauillac)": [-0.75, 45.2],
  "Valle del Ródano (Auvergne-Rhône-Alpes)": [4.8, 45.0],
  "Valle del Ródano Septentrional (Drôme/Ardèche)": [4.8, 45.1],
  "Alsacia (Grand Est)": [7.5, 48.3],
  "Alsacia (Haut‑Rhin)": [7.3, 48.0],
  "Languedoc-Rosellón (Occitanie)": [3.0, 43.5],
  "Provenza (Provence-Alpes-Côte d'Azur)": [6.0, 43.5],
  "Mosela (estimado)": [6.5, 49.8],
  
  // España - Galicia
  "Galicia (Pontevedra)": [-8.6, 42.4],
  "Galicia (Valdeorras, Ourense)": [-7.0, 42.4],
  "Galicia (Ourense)": [-7.9, 42.3],
  "Galicia (Ribeira Sacra – Lugo)": [-7.5, 42.5],
  
  // España - Castilla y León
  "Castilla y León": [-4.5, 41.8],
  "Castilla y León (Valladolid/Segovia)": [-4.7, 41.4],
  "Castilla y León (Segovia)": [-4.1, 41.0],
  "Castilla y León (El Bierzo, León)": [-6.6, 42.6],
  "Castilla y León (Valladolid)": [-4.7, 41.65],
  "Castilla y León (Zamora)": [-5.75, 41.5],
  
  // España - La Rioja y País Vasco
  "La Rioja": [-2.5, 42.3],
  "País Vasco (Rioja Alavesa, Álava)": [-2.7, 42.5],
  
  // España - Navarra
  "Navarra": [-1.65, 42.7],
  "Navarra)": [-1.65, 42.7],
  "Navarra (Vino de Pago Otazu)": [-1.65, 42.7],
  
  // España - Cataluña
  "Cataluña (Barcelona)": [2.15, 41.4],
  "Cataluña (Penedès)": [1.5, 41.3],
  "Cataluña (Priorat, Tarragona)": [0.7, 41.2],
  
  // España - Comunidad Valenciana
  "Comunidad Valenciana (Alicante)": [-0.5, 38.3],
  "Comunidad Valenciana (Valencia)": [-0.4, 39.5],
  
  // España - Región de Murcia
  "Región de Murcia (Jumilla)": [-1.3, 38.5],
  
  // España - Castilla-La Mancha
  "Castilla‑La Mancha (Albacete)": [-1.85, 39.0],
  "Castilla‑La Mancha (Ciudad Real)": [-3.9, 38.9],
  
  // España - Islas Canarias
  "Islas Canarias (Lanzarote)": [-13.6, 29.0],
  
  // España - Andalucía
  "Andalucía (Jerez, Cádiz)": [-6.0, 36.7],
  "Andalucía (Málaga)": [-4.4, 36.7],
  
  // Italia
  "Toscana": [11.2, 43.3],
  "Piamonte": [8.0, 45.0],
  "Veneto": [11.5, 45.5],
  "Sicilia": [14.0, 37.5],
  "Lombardía (Franciacorta)": [10.1, 45.6],
  
  // Portugal
  "Valle del Duero (Norte de Portugal)": [-7.8, 41.2],
  "Alentejo": [-7.9, 38.5],
  "Norte (Vinho Verde)": [-8.5, 41.5],
  "Lisboa (Alenquer)": [-9.0, 39.1],
  
  // Alemania
  "Rheingau": [8.0, 50.0],
  "Baden": [7.8, 48.5],
  
  // Estados Unidos
  "Valle de Napa (California)": [-122.3, 38.5],
  "Valle de Sonoma (California)": [-122.8, 38.4],
  "California (Paso Robles)": [-120.7, 35.6],
  
  // Argentina
  "Mendoza": [-69.0, -33.0],
  
  // Chile
  "Valle de Maipo (Región Metropolitana)": [-70.7, -33.5],
  "Valle de Colchagua (Región de O'Higgins)": [-71.0, -34.6],
  
  // Australia
  "Barossa Valley (Australia del Sur)": [139.0, -34.5],
  
  // Nueva Zelanda
  "Marlborough (Isla Sur)": [173.8, -41.5],
  
  // Sudáfrica
  "Stellenbosch (Provincia Occidental del Cabo)": [18.9, -33.9],
  "Western Cape (Elgin)": [19.0, -34.2],
};

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

const getRegionInsight = (region: string, category: string, vinosRegion: Vino[]) => {
  const text = (region + " " + (vinosRegion[0]?.denominacion_origen || "")).toLowerCase();
  if (text.includes("rioja")) return "Rioja suele ofrecer tintos de tempranillo con paso por barrica, buena acidez y equilibrio fruta-madera.";
  if (text.includes("ribera")) return "Ribera del Duero: tintos potentes de tempranillo, tanino marcado y crianza, ideales para carnes.";
  if (text.includes("rueda") || text.includes("verdejo")) return "Verdejo de Rueda: blancos aromáticos, cítricos y con un punto herbal refrescante.";
  if (text.includes("albariñ")) return "Rías Baixas: albariños salinos, frescos y muy gastronómicos, con buena acidez.";
  if (text.includes("priorat")) return "Priorat: tintos de garnacha y cariñena, concentrados, minerales y con estructura.";
  if (text.includes("penedès") || text.includes("cava")) return "Penedès/Cava: espumosos de método tradicional con burbuja fina y perfil fresco.";
  if (text.includes("champagne")) return "Champagne: chardonnay y pinot noir con crianza sobre lías, burbuja fina y notas de brioche.";
  if (text.includes("burdeos") || text.includes("bordeaux")) return "Burdeos: ensamblajes de cabernet/merlot con cuerpo medio-alto y potencial de guarda.";
  if (text.includes("borgoña") || text.includes("bourgogne") || text.includes("burgundy")) return "Borgoña: chardonnay o pinot noir elegantes, con fineza y acidez viva.";
  if (text.includes("toscana")) return "Toscana: sangiovese (Chianti/Brunello) con notas de cereza, especias y tanino amable.";
  if (text.includes("napa")) return "Napa Valley: cabernet sauvignon con fruta madura, crianza en roble y volumen en boca.";
  if (text.includes("sonoma")) return "Sonoma: estilos más frescos que Napa, chardonnay y pinot noir con buena acidez.";
  if (text.includes("valle del rhône") || text.includes("ródano") || text.includes("rhone")) return "Ródano: syrah o garnacha con notas de especias y hierbas mediterráneas.";
  if (text.includes("mendoza")) return "Mendoza: malbec jugoso, con fruta negra y tanino redondo; ideal para carnes.";
  if (text.includes("portugal") || text.includes("douro") || text.includes("alentejo")) return "Portugal: mezclas locales con fruta madura y acidez equilibrada; gran relación calidad-precio.";
  if (text.includes("alemania") || text.includes("mosela") || text.includes("rheingau")) return "Alemania: rieslings tensos, minerales y aromáticos, desde secos a sutilmente off-dry.";
  if (category === "espumoso") return "Espumosos: burbuja fina, frescos y versátiles; van de la fruta blanca a notas de brioche según crianza.";
  if (category === "blanco") return "Blancos: perfil fresco, buena acidez y notas cítricas o florales según la uva.";
  if (category === "rosado") return "Rosados: fruta roja fresca, ligeros y perfectos para aperitivo o platos ligeros.";
  if (category === "tinto") return "Tintos: desde perfiles afrutados y jóvenes hasta crianzas con cuerpo y especias de barrica.";
  return "Selección diversa de la D.O.: estilos y uvas que expresan su origen con buena gastronomía de acompañamiento.";
};

const PAGE_SIZE = 5;

const MapaMundoVinos = ({ vinos }: MapaMundoVinosProps) => {
  const { t } = useTranslations();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<{ region: string; vinos: Vino[]; category?: string } | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [tipoRegion, setTipoRegion] = useState<TipoVino>("todos");
  const { toast } = useToast();

  const addWineMarkers = useCallback(() => {
    if (!map.current) return;

    const regionCount: { [key: string]: { count: number; vinos: Vino[]; category: string } } = {};
    const isMobile = window.innerWidth < 768;

    vinos.forEach(vino => {
      const region = vino.ubicacion_region;
      if (region) {
        if (!regionCount[region]) {
          regionCount[region] = { count: 0, vinos: [], category: getCategoryKey(vino.categoria) };
        }
        regionCount[region].count++;
        regionCount[region].vinos.push(vino);
        const currentCategory = regionCount[region].category;
        const vinoCategory = getCategoryKey(vino.categoria);
        if (currentCategory === "otro" && vinoCategory !== "otro") {
          regionCount[region].category = vinoCategory;
        }
      }
    });

    Object.entries(regionCount).forEach(([region, data]) => {
      const coords = regionCoordinates[region];
      if (coords && map.current) {
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
      }
    });
  }, [vinos]);

  const initializeMap = useCallback(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    try {
      // Detectar si es móvil
      const isMobile = window.innerWidth < 768;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: isMobile ? [0, 20] : [0, 30],
        zoom: isMobile ? 1 : 1.5,
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

      map.current.on('load', addWineMarkers);
    } catch (error) {
      toast({
        title: t.map.errorTitle,
        description: t.map.errorDescription,
        variant: "destructive",
      });
    }
  }, [addWineMarkers, toast, t]);

  useEffect(() => {
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    setSelectedRegion(null);
    initializeMap();

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [initializeMap]);

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

  return (
    <div className="mb-8 w-full overflow-hidden">
      <h3 className="text-xl md:text-2xl font-bold text-center mb-3 md:mb-4 px-4">{t.map.title}</h3>
      <p className="text-center text-muted-foreground mb-4 md:mb-6 text-sm md:text-base px-4">
        {t.map.subtitle}
      </p>
      <div 
        ref={mapContainer} 
        className="w-full h-[400px] md:h-[500px] lg:h-[600px] rounded-lg shadow-xl border-2 border-border touch-pan-y max-w-full"
        style={{ maxWidth: '100%', overflow: 'hidden' }}
      />
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

              <div className="flex flex-wrap gap-4">
                <div className="text-sm text-muted-foreground max-w-xl">
                  <p className="font-semibold text-foreground mb-1">{t.map.aboutDO ?? "Sobre esta D.O."}</p>
                  <p className="leading-snug">{getRegionInsight(selectedRegion.region, selectedRegion.category || "otro", selectedRegion.vinos)}</p>
                </div>
              </div>

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
                      key={vino.nombre + vino.denominacion_origen}
                      className="rounded-lg border p-3 flex flex-col gap-1 shadow-sm transition-transform duration-150 hover:-translate-y-0.5"
                      style={{ backgroundColor: cardBg, borderColor }}
                    >
                      <p className="font-semibold text-foreground leading-tight">{vino.nombre}</p>
                      {vino.denominacion_origen && (
                        <p className="text-xs text-muted-foreground">{vino.denominacion_origen}</p>
                      )}
                      <p className="text-xs font-semibold uppercase" style={{ color: cardColor }}>
                        {vino.categoria || categoryKey}
                      </p>
                      <p className="text-sm font-bold" style={{ color: cardColor }}>
                        {vino.precio_eur}€
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
