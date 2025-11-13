import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, ChevronDown, Wine } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserPedido, setUserPedido } from "@/utils/sessionManager";
import champanImg from "@/assets/champan.png";

interface CartaBebidasProps {
  showAddButton: boolean;
}

const CartaBebidas = ({ showAddButton }: CartaBebidasProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Aguas");
  const [bebidas, setBebidas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBebidas();
  }, []);

  const fetchBebidas = async () => {
    try {
      const { data, error } = await supabase
        .from('bebidas')
        .select('*')
        .eq('activado', true)
        .order('categoria', { ascending: true })
        .order('orden', { ascending: true });

      if (error) throw error;
      setBebidas(data || []);
    } catch (error) {
      console.error('Error fetching bebidas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las bebidas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const CATEGORY_ORDER = [
    "Aguas",
    "Refrescos",
    "Tónicas",
    "Cervezas",
    "Tintos de verano",
    "TODAS"
  ];

  const categories = CATEGORY_ORDER;

  const filteredItems = useMemo(() => {
    let items = bebidas;

    if (selectedCategory !== "TODAS") {
      items = items.filter(item => item.categoria === selectedCategory);
    }

    if (searchTerm) {
      items = items.filter(item =>
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return items;
  }, [searchTerm, selectedCategory, bebidas]);

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
        <p className="text-xl text-muted-foreground">Cargando bebidas...</p>
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
            placeholder="Buscar bebidas..."
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
                  <Wine className="w-5 h-5 text-accent" />
                  {selectedCategory}
                </span>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 max-h-[28rem] overflow-y-auto bg-background border-2 border-border shadow-2xl rounded-xl p-2 z-50">
              {categories.map((category) => (
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
            <Card className="h-full flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg leading-tight line-clamp-2 min-h-[3.5rem] flex-grow">{item.nombre}</CardTitle>
                  <span className="bg-accent/90 text-accent-foreground backdrop-blur-sm shadow-md px-3 py-1 rounded-full text-sm font-semibold flex-shrink-0">
                    {item.categoria}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-4 flex-grow overflow-hidden">
                {item.descripcion && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.descripcion}</p>
                )}
                {item.tamano && (
                  <p className="text-sm font-medium text-accent">{item.tamano}</p>
                )}
              </CardContent>
              <CardFooter className="flex justify-between items-center pt-3 border-t bg-muted/30 flex-shrink-0 mt-auto">
                <span className="text-2xl font-bold text-accent">
                  {item.precio_eur}€
                </span>
                {showAddButton && (
                  <Button
                    size="sm"
                    onClick={() => addToPedido(item)}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-4 shadow-md hover:shadow-lg transition-all"
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
          <p className="text-xl">No se encontraron bebidas con los filtros seleccionados</p>
        </div>
      )}
    </div>
  );
};

export default CartaBebidas;
