import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Wine, AlertCircle, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
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
import MapaMundoVinos from "./MapaMundoVinos";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const CartaVinos = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [isAdult, setIsAdult] = useState<boolean | null>(null);
  const [showAgeDialog, setShowAgeDialog] = useState(true);
  const [vinos, setVinos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchVinos();
  }, []);

  const fetchVinos = async () => {
    try {
      const { data, error } = await supabase
        .from('vinos')
        .select('*')
        .eq('activado', true)
        .order('categoria', { ascending: true })
        .order('orden', { ascending: true });

      if (error) throw error;
      setVinos(data || []);
    } catch (error) {
      console.error('Error fetching vinos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los vinos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const uniqueCategories = new Set(vinos.map(v => v.categoria));
    return ["Todos", ...Array.from(uniqueCategories)];
  }, [vinos]);

  const filteredItems = useMemo(() => {
    let items = vinos;

    if (selectedCategory !== "Todos") {
      items = items.filter(item => item.categoria === selectedCategory);
    }

    if (searchTerm) {
      items = items.filter(item =>
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return items;
  }, [searchTerm, selectedCategory, vinos]);

  const handleAgeConfirm = (adult: boolean) => {
    setIsAdult(adult);
    setShowAgeDialog(false);
  };

  if (showAgeDialog || isAdult === null) {
    return (
      <Dialog open={showAgeDialog} onOpenChange={setShowAgeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-accent" />
              Verificación de edad
            </DialogTitle>
            <DialogDescription>
              Para acceder a nuestra carta de vinos, confirma que eres mayor de 18 años
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 justify-center pt-4">
            <Button
              onClick={() => handleAgeConfirm(true)}
              className="bg-accent hover:bg-accent/90"
            >
              Soy mayor de 18
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAgeConfirm(false)}
            >
              Soy menor de 18
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isAdult === false) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-xl text-muted-foreground">
          Lo sentimos, debes ser mayor de 18 años para ver esta sección
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Mapa Mundial */}
      {!loading && <MapaMundoVinos vinos={vinos} />}

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative max-w-md mx-auto w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Buscar vinos..."
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
                className="w-64 justify-between bg-background hover:bg-muted"
              >
                <span className="font-medium">{selectedCategory}</span>
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 max-h-96 overflow-y-auto bg-background">
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`cursor-pointer ${
                    selectedCategory === category 
                      ? "bg-accent text-accent-foreground font-semibold" 
                      : "hover:bg-muted"
                  }`}
                >
                  {category}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="text-center py-16">
          <p className="text-xl text-muted-foreground">Cargando vinos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.03 }}
            >
              <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl flex items-start gap-2 leading-tight">
                    <Wine className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                    <span>{item.nombre}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm font-medium text-accent uppercase tracking-wide">{item.categoria}</p>
                  {item.denominacion_origen && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">DO:</span> {item.denominacion_origen}
                    </p>
                  )}
                  {item.ubicacion_region && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">Origen:</span> {item.ubicacion_region}{item.ubicacion_pais && `, ${item.ubicacion_pais}`}
                    </p>
                  )}
                  {item.descripcion && (
                    <p className="text-sm text-muted-foreground">{item.descripcion}</p>
                  )}
                  {(item.alergenos_oficiales?.length > 0 || item.alergenos_inferidos?.length > 0) && (
                    <div className="flex flex-wrap gap-1">
                      {item.alergenos_oficiales?.map((alergeno: string, idx: number) => (
                        <Badge key={`oficial-${idx}`} variant="destructive" className="text-xs">
                          {alergeno}
                        </Badge>
                      ))}
                      {item.alergenos_inferidos?.map((alergeno: string, idx: number) => (
                        <Badge key={`inferido-${idx}`} variant="secondary" className="text-xs">
                          {alergeno}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {item.alergenos_notas && (
                    <p className="text-xs text-destructive italic bg-destructive/10 p-2 rounded">
                      {item.alergenos_notas}
                    </p>
                  )}
                  <p className="text-2xl font-bold text-accent pt-2">
                    {item.precio_eur}€
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-xl">No se encontraron vinos con los filtros seleccionados</p>
        </div>
      )}
    </div>
  );
};

export default CartaVinos;
