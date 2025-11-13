import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, ChevronDown, UtensilsCrossed } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserPedido, setUserPedido } from "@/utils/sessionManager";

interface CartaPlatosProps {
  showAddButton: boolean;
}

const CartaPlatos = ({ showAddButton }: CartaPlatosProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("NOVEDADES DEL DÍA");
  const [platos, setPlatos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlatos();
  }, []);

  const fetchPlatos = async () => {
    try {
      const { data, error } = await supabase
        .from('platos')
        .select('*')
        .eq('activado', true)
        .order('categoria', { ascending: true })
        .order('orden', { ascending: true });

      if (error) throw error;
      setPlatos(data || []);
    } catch (error) {
      console.error('Error fetching platos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los platos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const CATEGORY_ORDER = [
    "NOVEDADES DEL DÍA",
    "ENTRANTES FRÍOS",
    "ENTRANTES CALIENTES",
    "ENSALADAS",
    "SALAZONES",
    "MARISCOS",
    "PESCADOS",
    "CARNES",
    "ARROCES",
    "POSTRES",
    "TODOS"
  ];

  const categories = useMemo(() => {
    const uniqueCategories = new Set(platos.map(p => p.categoria.toUpperCase()));
    const categoriesArray = Array.from(uniqueCategories);
    
    // Filtrar el orden predefinido manteniendo solo las categorías que existen
    const orderedCategories = CATEGORY_ORDER.filter(cat => 
      cat === "TODOS" || categoriesArray.includes(cat)
    );
    
    return orderedCategories;
  }, [platos]);

  const filteredItems = useMemo(() => {
    let items = platos;

    if (selectedCategory !== "TODOS") {
      items = items.filter(item => item.categoria.toUpperCase() === selectedCategory);
    }

    if (searchTerm) {
      items = items.filter(item =>
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return items;
  }, [searchTerm, selectedCategory, platos]);

  const addToPedido = (item: any) => {
    const pedido = getUserPedido();
    pedido.push(item);
    setUserPedido(pedido);
    toast({
      title: "Añadido al pedido",
      description: `${item.nombre} añadido a tu preview de pedido`,
    });
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-xl text-muted-foreground">Cargando carta...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative max-w-md mx-auto w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Buscar platos..."
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
                className="w-72 h-12 justify-between bg-gradient-to-r from-background to-muted/30 hover:from-muted/50 hover:to-muted/60 border-2 border-border hover:border-accent/50 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 text-base font-semibold"
              >
                <span className="flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-accent" />
                  {selectedCategory}
                </span>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 max-h-[28rem] overflow-y-auto bg-background/95 backdrop-blur-lg border-2 border-border shadow-2xl rounded-xl p-2">
              {categories.map((category, index) => (
                <DropdownMenuItem
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`cursor-pointer rounded-lg px-4 py-3 my-1 text-base transition-all duration-200 ${
                    selectedCategory === category 
                      ? "bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-bold shadow-md" 
                      : "hover:bg-muted/70 hover:translate-x-1"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      selectedCategory === category 
                        ? "bg-accent-foreground" 
                        : "bg-accent/40"
                    }`} />
                    {category}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Items Grid */}
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
                <CardTitle className="text-xl leading-tight">{item.nombre}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-medium text-accent uppercase tracking-wide">{item.categoria}</p>
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
              </CardContent>
              <CardFooter className="flex justify-between items-center pt-4 border-t">
                <span className="text-2xl font-bold text-accent">
                  {item.precio_eur}€
                  {item.unidad && <span className="text-sm font-normal text-muted-foreground"> / {item.unidad}</span>}
                </span>
                {showAddButton && (
                  <Button
                    size="sm"
                    onClick={() => addToPedido(item)}
                    className="bg-accent hover:bg-accent/90 rounded-full px-4"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Añadir
                  </Button>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-xl">No se encontraron platos con los filtros seleccionados</p>
        </div>
      )}
    </div>
  );
};

export default CartaPlatos;
