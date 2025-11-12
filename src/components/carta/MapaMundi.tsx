import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Vino {
  name: string;
  price_eur: number;
  denominacion_origen?: string;
  ubicacion?: {
    pais: string;
    region: string;
  };
}

interface MapaMundiProps {
  vinos: Vino[];
}

const MapaMundi = ({ vinos }: MapaMundiProps) => {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const regionesCount = useMemo(() => {
    const counts: { [key: string]: { count: number; vinos: Vino[] } } = {};
    
    vinos.forEach(vino => {
      if (vino.ubicacion) {
        const key = vino.ubicacion.region;
        if (!counts[key]) {
          counts[key] = { count: 0, vinos: [] };
        }
        counts[key].count++;
        counts[key].vinos.push(vino);
      }
    });

    return counts;
  }, [vinos]);

  const regiones = Object.entries(regionesCount);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-primary mb-2">Origen de nuestros vinos</h3>
        <p className="text-muted-foreground">Selecciona una región para ver los vinos disponibles</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {regiones.map(([region, data], index) => (
          <motion.div
            key={region}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
              onClick={() => setSelectedRegion(region)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm line-clamp-2">{region}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="bg-accent hover:bg-accent/90">
                  {data.count} {data.count === 1 ? 'vino' : 'vinos'}
                </Badge>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {selectedRegion && (
        <Dialog open={!!selectedRegion} onOpenChange={() => setSelectedRegion(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedRegion}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {regionesCount[selectedRegion].vinos.map((vino, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-base">{vino.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {vino.denominacion_origen && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">DO:</span> {vino.denominacion_origen}
                      </p>
                    )}
                    <p className="text-xl font-bold text-accent">{vino.price_eur}€</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MapaMundi;
