import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Vino {
  name: string;
  price_eur: number;
  denominacion_origen?: string;
  ubicacion?: {
    pais: string;
    region: string;
  };
}

interface MapaMundoVinosProps {
  vinos: Vino[];
}

// Coordenadas aproximadas de las regiones
const regionCoordinates: { [key: string]: [number, number] } = {
  "Champagne (Grand Est)": [4.0, 49.0],
  "Borgoña (Bourgogne-Franche-Comté)": [4.85, 47.0],
  "Valle del Loira (Pays de la Loire)": [-0.5, 47.5],
  "Burdeos (Nouvelle-Aquitaine)": [-0.5, 44.8],
  "Valle del Ródano (Auvergne-Rhône-Alpes)": [4.8, 45.0],
  "Alsacia (Grand Est)": [7.5, 48.3],
  "Languedoc-Rosellón (Occitanie)": [3.0, 43.5],
  "Provenza (Provence-Alpes-Côte d'Azur)": [6.0, 43.5],
  "Rioja (La Rioja)": [-2.5, 42.3],
  "Ribera del Duero (Castilla y León)": [-4.0, 41.7],
  "Priorat (Cataluña)": [0.7, 41.2],
  "Rías Baixas (Galicia)": [-8.7, 42.4],
  "Penedés (Cataluña)": [1.5, 41.3],
  "Jerez (Andalucía)": [-6.0, 36.7],
  "Toscana": [11.2, 43.3],
  "Piamonte": [8.0, 45.0],
  "Veneto": [11.5, 45.5],
  "Sicilia": [14.0, 37.5],
  "Valle del Duero (Norte de Portugal)": [-7.8, 41.2],
  "Alentejo": [-7.9, 38.5],
  "Valle de Napa (California)": [-122.3, 38.5],
  "Valle de Sonoma (California)": [-122.8, 38.4],
  "Mendoza": [-69.0, -33.0],
  "Valle de Maipo (Región Metropolitana)": [-70.7, -33.5],
  "Valle de Colchagua (Región de O'Higgins)": [-71.0, -34.6],
  "Barossa Valley (Australia del Sur)": [139.0, -34.5],
  "Marlborough (Isla Sur)": [173.8, -41.5],
  "Stellenbosch (Provincia Occidental del Cabo)": [18.9, -33.9],
};

const MapaMundoVinos = ({ vinos }: MapaMundoVinosProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(true);
  const { toast } = useToast();

  const initializeMap = (token: string) => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = token;
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [0, 30],
        zoom: 1.5,
        projection: 'mercator' as any,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      map.current.on('load', () => {
        addWineMarkers();
      });

      setShowTokenInput(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Token de Mapbox inválido",
        variant: "destructive",
      });
    }
  };

  const addWineMarkers = () => {
    if (!map.current) return;

    const regionCount: { [key: string]: { count: number; vinos: Vino[] } } = {};

    vinos.forEach(vino => {
      if (vino.ubicacion) {
        const region = vino.ubicacion.region;
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
        const el = document.createElement('div');
        el.className = 'wine-marker';
        el.style.cssText = `
          background-color: hsl(var(--accent));
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          font-size: 14px;
        `;
        el.textContent = data.count.toString();

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px; max-height: 300px; overflow-y: auto;">
            <h3 style="font-weight: bold; margin-bottom: 8px; color: hsl(var(--primary));">${region}</h3>
            <p style="margin-bottom: 8px; color: hsl(var(--muted-foreground)); font-size: 12px;">${data.count} ${data.count === 1 ? 'vino' : 'vinos'}</p>
            ${data.vinos.slice(0, 5).map(vino => `
              <div style="margin-bottom: 6px; padding: 6px; background: hsl(var(--muted)); border-radius: 4px;">
                <p style="font-weight: 600; font-size: 13px; color: hsl(var(--foreground));">${vino.name}</p>
                <p style="font-size: 12px; color: hsl(var(--accent)); font-weight: bold;">${vino.price_eur}€</p>
              </div>
            `).join('')}
            ${data.vinos.length > 5 ? `<p style="font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 6px;">+ ${data.vinos.length - 5} más...</p>` : ''}
          </div>
        `);

        new mapboxgl.Marker(el)
          .setLngLat(coords)
          .setPopup(popup)
          .addTo(map.current);
      }
    });
  };

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mapboxToken.trim()) {
      initializeMap(mapboxToken);
    } else {
      toast({
        title: "Error",
        description: "Por favor introduce un token de Mapbox válido",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    return () => {
      map.current?.remove();
    };
  }, []);

  if (showTokenInput) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Mapa Mundial de Vinos</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Para ver el mapa interactivo de los orígenes de nuestros vinos, necesitas un token público de Mapbox.
                Consigue uno gratis en{" "}
                <a 
                  href="https://mapbox.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  mapbox.com
                </a>
              </p>
              <Input
                type="text"
                placeholder="pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV4YW1wbGUifQ..."
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
                className="mb-3"
              />
            </div>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90">
              Cargar Mapa
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mb-8">
      <h3 className="text-2xl font-bold text-center mb-4">Origen de Nuestros Vinos</h3>
      <p className="text-center text-muted-foreground mb-6">
        Haz clic en los marcadores para ver los vinos de cada región
      </p>
      <div 
        ref={mapContainer} 
        className="w-full h-[500px] rounded-lg shadow-xl border-2 border-border"
      />
    </div>
  );
};

export default MapaMundoVinos;
