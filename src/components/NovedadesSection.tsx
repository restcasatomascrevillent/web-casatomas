import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Wine, UtensilsCrossed } from "lucide-react";

const NovedadesSection = () => {
  const novedades = [
    {
      title: "Nuevas Setas de Temporada",
      description: "Setas silvestres a la parrilla, recién llegadas de nuestros proveedores locales",
      icon: UtensilsCrossed,
      badge: "Nuevo Plato"
    },
    {
      title: "Experiencia de Maridaje",
      description: "Descubre nuestra nueva experiencia de maridaje con vinos selectos de Rioja",
      icon: Wine,
      badge: "Experiencia"
    },
    {
      title: "Cata de Vinos Premium",
      description: "Únete a nuestras catas mensuales guiadas por nuestro sumiller",
      icon: Sparkles,
      badge: "Evento"
    }
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
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-primary mb-4"
          >
            Novedades
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Descubre nuestras últimas incorporaciones y experiencias únicas
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {novedades.map((novedad, index) => {
            const Icon = novedad.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-3 bg-accent/10 rounded-lg">
                        <Icon className="w-6 h-6 text-accent" />
                      </div>
                      <Badge className="bg-accent hover:bg-accent/90">{novedad.badge}</Badge>
                    </div>
                    <CardTitle className="text-xl">{novedad.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{novedad.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
};

export default NovedadesSection;
