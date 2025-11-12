import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useToast } from "@/hooks/use-toast";

interface Vino {
  nombre: string;
  precio_eur: number;
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

const MapaMundoVinos = ({ vinos }: MapaMundoVinosProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { toast } = useToast();

  const MAPBOX_TOKEN = "pk.eyJ1Ijoib2ZpY2lvc29zIiwiYSI6ImNtaHZubTFhcDAyOGIybHNneWtrNjY0NjcifQ.yVfJCOCYXbs6VrOkDWOQtg";

  const initializeMap = () => {
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
        projection: 'mercator' as any,
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

      map.current.on('load', () => {
        addWineMarkers();
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar el mapa",
        variant: "destructive",
      });
    }
  };

  const addWineMarkers = () => {
    if (!map.current) return;

    const regionCount: { [key: string]: { count: number; vinos: Vino[] } } = {};
    const isMobile = window.innerWidth < 768;

    vinos.forEach(vino => {
      const region = vino.ubicacion_region;
      if (region) {
        if (!regionCount[region]) {
          regionCount[region] = { count: 0, vinos: [] };
        }
        regionCount[region].count++;
        regionCount[region].vinos.push(vino);
      }
    });

    Object.entries(regionCount).forEach(([region, data]) => {
      const coords = regionCoordinates[region];
      if (coords && map.current) {
        const markerSize = isMobile ? 35 : 40;
        const fontSize = isMobile ? 12 : 14;
        
        const el = document.createElement('div');
        el.className = 'wine-marker';
        el.style.cssText = `
          background-color: hsl(var(--accent));
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
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          font-size: ${fontSize}px;
        `;
        el.textContent = data.count.toString();

        const createPopupContent = (showAll: boolean = false) => {
          const displayVinos = showAll ? data.vinos : data.vinos.slice(0, 5);
          const hasMore = data.vinos.length > 5;
          
          return `
            <div style="padding: ${isMobile ? '10px' : '12px'}; max-height: ${isMobile ? '300px' : '400px'}; overflow-y: auto; min-width: ${isMobile ? '200px' : '250px'};">
              <h3 style="font-weight: bold; margin-bottom: 8px; color: #b6842f; font-size: ${isMobile ? '14px' : '16px'};">${region}</h3>
              <p style="margin-bottom: 12px; color: #686461; font-size: ${isMobile ? '12px' : '13px'}; font-weight: 600;">${data.count} ${data.count === 1 ? 'vino' : 'vinos'}</p>
              <div style="display: flex; flex-direction: column; gap: ${isMobile ? '6px' : '8px'};">
                ${displayVinos.map(vino => `
                  <div style="padding: ${isMobile ? '6px' : '8px'}; background: #f5f5f5; border-radius: 6px; border-left: 3px solid #b6842f;">
                    <p style="font-weight: 600; font-size: ${isMobile ? '12px' : '13px'}; color: #363e45; margin-bottom: 4px;">${vino.nombre}</p>
                    ${vino.denominacion_origen ? `<p style="font-size: ${isMobile ? '10px' : '11px'}; color: #988b81; margin-bottom: 4px;">${vino.denominacion_origen}</p>` : ''}
                    <p style="font-size: ${isMobile ? '13px' : '14px'}; color: #b6842f; font-weight: bold;">${vino.precio_eur}€</p>
                  </div>
                `).join('')}
              </div>
              ${hasMore && !showAll ? `
                <button 
                  id="show-all-wines-${region.replace(/[^a-zA-Z0-9]/g, '')}" 
                  style="margin-top: 12px; width: 100%; padding: ${isMobile ? '10px' : '8px'}; background: #b6842f; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: ${isMobile ? '12px' : '13px'}; -webkit-tap-highlight-color: transparent;"
                >
                  Ver todos los ${data.vinos.length} vinos
                </button>
              ` : ''}
              ${showAll && hasMore ? `
                <button 
                  id="show-less-wines-${region.replace(/[^a-zA-Z0-9]/g, '')}" 
                  style="margin-top: 12px; width: 100%; padding: ${isMobile ? '10px' : '8px'}; background: #686461; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: ${isMobile ? '12px' : '13px'}; -webkit-tap-highlight-color: transparent;"
                >
                  Ver menos
                </button>
              ` : ''}
            </div>
          `;
        };

        const popup = new mapboxgl.Popup({ 
          offset: isMobile ? 20 : 25,
          maxWidth: isMobile ? '280px' : '350px',
          className: 'wine-popup',
          closeButton: true,
          closeOnClick: false,
          focusAfterOpen: false,
        }).setHTML(createPopupContent(false));

        // Handle button clicks in popup
        popup.on('open', () => {
          const showAllBtn = document.getElementById(`show-all-wines-${region.replace(/[^a-zA-Z0-9]/g, '')}`);
          const showLessBtn = document.getElementById(`show-less-wines-${region.replace(/[^a-zA-Z0-9]/g, '')}`);
          
          if (showAllBtn) {
            showAllBtn.addEventListener('click', () => {
              popup.setHTML(createPopupContent(true));
            });
          }
          
          if (showLessBtn) {
            showLessBtn.addEventListener('click', () => {
              popup.setHTML(createPopupContent(false));
            });
          }
        });

        new mapboxgl.Marker(el)
          .setLngLat(coords)
          .setPopup(popup)
          .addTo(map.current);
      }
    });
  };

  useEffect(() => {
    initializeMap();
    
    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div className="mb-8 w-full overflow-hidden">
      <h3 className="text-xl md:text-2xl font-bold text-center mb-3 md:mb-4 px-4">Origen de Nuestros Vinos</h3>
      <p className="text-center text-muted-foreground mb-4 md:mb-6 text-sm md:text-base px-4">
        Toca los marcadores para ver los vinos de cada región
      </p>
      <div 
        ref={mapContainer} 
        className="w-full h-[400px] md:h-[500px] lg:h-[600px] rounded-lg shadow-xl border-2 border-border touch-pan-y max-w-full"
        style={{ maxWidth: '100%', overflow: 'hidden' }}
      />
    </div>
  );
};

export default MapaMundoVinos;
