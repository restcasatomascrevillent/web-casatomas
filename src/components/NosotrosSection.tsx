import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Users, ChefHat, Heart, Clock } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const NosotrosSection = () => {
  const equipo = [
    {
      nombre: "Tomás",
      rol: "Jefe y Dueño del Restaurante",
      descripcion: "Con más de 30 años de experiencia, Tomás ha convertido la tradición familiar en un arte culinario único. Su pasión por los productos locales y las recetas tradicionales es el corazón de Casa Tomás.",
      icon: Crown,
      imagen: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop",
    },
    {
      nombre: "Hugo",
      rol: "Camarero - La Siguiente Generación",
      descripcion: "Mano izquierda de Tomás, Hugo representa la nueva generación que honra la tradición mientras aporta su energía y visión fresca al servicio del restaurante.",
      icon: Users,
      imagen: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop",
    },
    {
      nombre: "Antxon",
      rol: "Jefe de Cocina",
      descripcion: "Experto en la perfecta ejecución de cada plato, Antxon lidera nuestro equipo de cocina con maestría y dedicación, asegurando la excelencia en cada servicio.",
      icon: ChefHat,
      imagen: "https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=400&h=400&fit=crop",
    },
  ];

  return (
    <section id="nosotros" className="py-20 px-4 md:px-8 lg:px-16 bg-background">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="max-w-7xl mx-auto"
      >
        {/* Historia del Restaurante */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-primary mb-6"
          >
            Nuestra Historia
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              Casa Tomás nació del sueño de compartir la auténtica cocina tradicional de Crevillent con el mundo. 
              Lo que comenzó como un pequeño restaurante familiar ha crecido hasta convertirse en un referente 
              gastronómico, manteniendo siempre nuestros valores: calidad, tradición y amor por la cocina.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="flex flex-col items-center">
                <Clock className="w-12 h-12 text-accent mb-3" />
                <h3 className="font-semibold mb-2">Más de 30 años</h3>
                <p className="text-sm text-muted-foreground">de tradición culinaria</p>
              </div>
              <div className="flex flex-col items-center">
                <Heart className="w-12 h-12 text-accent mb-3" />
                <h3 className="font-semibold mb-2">Familia y pasión</h3>
                <p className="text-sm text-muted-foreground">en cada plato</p>
              </div>
              <div className="flex flex-col items-center">
                <ChefHat className="w-12 h-12 text-accent mb-3" />
                <h3 className="font-semibold mb-2">Cocina tradicional</h3>
                <p className="text-sm text-muted-foreground">con toques modernos</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Equipo */}
        <div>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-primary text-center mb-12"
          >
            Nosotros
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {equipo.map((persona, index) => {
              const IconComponent = persona.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center mb-4">
                        <Avatar className="w-32 h-32 mb-4 border-4 border-primary/20">
                          <AvatarImage src={persona.imagen} alt={persona.nombre} />
                          <AvatarFallback className="text-2xl bg-accent/10 text-accent">
                            {persona.nombre.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="mb-3">
                          <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/10 rounded-full mb-2">
                            <IconComponent className="w-6 h-6 text-accent" />
                          </div>
                        </div>
                        <h4 className="text-xl font-bold mb-1">{persona.nombre}</h4>
                        <p className="text-sm text-accent font-medium mb-3">{persona.rol}</p>
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-center">
                        {persona.descripcion}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default NosotrosSection;
