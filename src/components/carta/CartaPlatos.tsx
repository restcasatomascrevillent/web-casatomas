import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus } from "lucide-react";
import cartaData from "@/data/carta.json";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const CartaPlatos = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();

  const categories = useMemo(() => {
    return ["all", ...cartaData.menu.map(cat => cat.category)];
  }, []);

  const filteredItems = useMemo(() => {
    let items = cartaData.menu.flatMap(category => 
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

  const addToPedido = (item: any) => {
    const pedido = JSON.parse(localStorage.getItem('pedido') || '[]');
    pedido.push(item);
    localStorage.setItem('pedido', JSON.stringify(pedido));
    toast({
      title: "Añadido al pedido",
      description: `${item.name} añadido a tu preview de pedido`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Buscar platos..."
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
                <CardTitle className="text-lg">{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{item.category}</p>
                {item.allergens_note && (
                  <p className="text-xs text-destructive italic mb-2">{item.allergens_note}</p>
                )}
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <span className="text-xl font-bold text-accent">
                  {item.price_eur}€
                  {item.unit && ` / ${item.unit}`}
                </span>
                <Button
                  size="sm"
                  onClick={() => addToPedido(item)}
                  className="bg-accent hover:bg-accent/90"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Añadir
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron platos con los filtros seleccionados
        </div>
      )}
    </div>
  );
};

export default CartaPlatos;
