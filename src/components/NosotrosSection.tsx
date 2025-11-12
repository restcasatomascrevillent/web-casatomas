import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ChefHat, Heart, Clock } from "lucide-react";

const NosotrosSection = () => {
  const equipo = [
    {
      nombre: "Tomás",
      rol: "Fundador y Chef Principal",
      descripcion: "Con más de 30 años de experiencia, Tomás ha convertido la tradición familiar en un arte culinario único. Su pasión por los productos locales y las recetas tradicionales es el corazón de Casa Tomás.",
    },
    {
      nombre: "Hugo",
      rol: "Segundo Chef",
      descripcion: "Hijo de Tomás, Hugo representa la nueva generación que honra la tradición mientras aporta innovación y técnicas modernas a nuestra cocina.",
    },
    {
      nombre: "Antxon",
      rol: "Jefe de Cocina",
      descripcion: "Experto en la perfecta ejecución de cada plato, Antxon lidera nuestro equipo de cocina con maestría y dedicación, asegurando la excelencia en cada servicio.",
    },
  ];

  return (
    <section className="py-20 px-4 md:px-8 lg:px-16 bg-background">
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
            Nuestro Equipo
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {equipo.map((persona, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                        <ChefHat className="w-8 h-8 text-accent" />
                      </div>
                      <h4 className="text-xl font-bold mb-1">{persona.nombre}</h4>
                      <p className="text-sm text-accent font-medium">{persona.rol}</p>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {persona.descripcion}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default NosotrosSection;
