import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Wine, AlertCircle } from "lucide-react";
import vinosData from "@/data/vinos.json";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MapaMundi from "./MapaMundi";

const CartaVinos = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAdult, setIsAdult] = useState<boolean | null>(null);
  const [showAgeDialog, setShowAgeDialog] = useState(true);

  const categories = useMemo(() => {
    return ["all", ...vinosData.menu.map(cat => cat.category)];
  }, []);

  const filteredItems = useMemo(() => {
    let items = vinosData.menu.flatMap(category => 
      category.items.map(item => ({
        ...item,
        category: category.category
      }))
    );

    if (selectedCategory !== "all") {
      items = items.filter(item => item.category === selectedCategory);
    }

    if (searchTerm) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return items;
  }, [searchTerm, selectedCategory]);

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
      <div className="text-center py-12">
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
      <MapaMundi vinos={vinosData.menu.flatMap(cat => cat.items)} />

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Buscar vinos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            onClick={() => setSelectedCategory(category)}
            className={selectedCategory === category ? "bg-accent hover:bg-accent/90" : ""}
          >
            {category === "all" ? "Todos" : category}
          </Button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-start gap-2">
                  <Wine className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                  <span>{item.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">{item.category}</p>
                {item.denominacion_origen && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">DO:</span> {item.denominacion_origen}
                  </p>
                )}
                {item.ubicacion && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Origen:</span> {item.ubicacion.region}, {item.ubicacion.pais}
                  </p>
                )}
                <p className="text-2xl font-bold text-accent mt-4">
                  {item.price_eur}€
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron vinos con los filtros seleccionados
        </div>
      )}
    </div>
  );
};

export default CartaVinos;
