import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Home, Utensils, TreePine, Wine, Camera, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import carnePlato from "@/assets/carne-plato.png";
import pulpoPlato from "@/assets/pulpo-plato.jpg";
import vinosMarques from "@/assets/vinos-marqués.jpeg";

const EspaciosSection = () => {
  const [selectedEspacio, setSelectedEspacio] = useState<number | null>(null);

  const espacios = [
    {
      title: "Salón Principal",
      description: "Amplio y acogedor, perfecto para celebraciones familiares y eventos especiales",
      icon: Home,
      hasGallery: true,
      images: [carnePlato, pulpoPlato, vinosMarques],
    },
    {
      title: "Comedor Privado",
      description: "Espacio íntimo ideal para comidas de negocio o reuniones privadas",
      icon: Utensils,
      hasGallery: true,
      images: [pulpoPlato, vinosMarques, carnePlato],
    },
    {
      title: "Terraza Exterior",
      description: "Disfruta de nuestros platos al aire libre en un ambiente relajado",
      icon: TreePine,
      hasGallery: true,
      images: [vinosMarques, carnePlato, pulpoPlato],
    },
    {
      title: "Touza Cocktail Bar",
      description: "Coctelería de autor en un ambiente sofisticado y exclusivo",
      icon: Wine,
      hasGallery: false,
      link: "/touza-cocktail",
    },
  ];

  return (
    <section id="espacios" className="py-20 px-4 md:px-8 lg:px-16 bg-gradient-to-b from-muted to-background">
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
            Nuestros Espacios
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Diferentes ambientes para cada ocasión
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {espacios.map((espacio, index) => {
            const Icon = espacio.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-3 bg-accent/10 rounded-lg">
                        <Icon className="w-6 h-6 text-accent" />
                      </div>
                      <CardTitle className="text-xl">{espacio.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{espacio.description}</p>
                    {espacio.hasGallery ? (
                      <Button 
                        variant="default" 
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        onClick={() => setSelectedEspacio(index)}
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        Ver Galería de Fotos
                      </Button>
                    ) : (
                      <Button 
                        variant="default" 
                        className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        asChild
                      >
                        <Link to={espacio.link || "#"}>
                          <ExternalLink className="w-5 h-5 mr-2" />
                          Visitar Touza Cocktail
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Información adicional */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <Card className="bg-accent/5 border-accent/20">
            <CardHeader>
              <CardTitle className="text-lg">Menú del Mediodía</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                De martes a jueves, disfruta de nuestro menú del mediodía elaborado con productos frescos de temporada
              </p>
              <Button variant="outline">Ver Menús Anteriores</Button>
            </CardContent>
          </Card>

          <Card className="bg-accent/5 border-accent/20">
            <CardHeader>
              <CardTitle className="text-lg">Tapas los Jueves</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Cada jueves por la noche (excepto festivos), descubre nuestra selección especial de tapas
              </p>
              <Button variant="outline">Ver Tapas de la Semana</Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Diálogo del carrusel de fotos */}
        <Dialog open={selectedEspacio !== null} onOpenChange={() => setSelectedEspacio(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedEspacio !== null ? espacios[selectedEspacio].title : ''}</DialogTitle>
            </DialogHeader>
            {selectedEspacio !== null && espacios[selectedEspacio].images && (
              <Carousel className="w-full">
                <CarouselContent>
                  {espacios[selectedEspacio].images.map((image, idx) => (
                    <CarouselItem key={idx}>
                      <div className="p-1">
                        <img 
                          src={image} 
                          alt={`${espacios[selectedEspacio].title} ${idx + 1}`}
                          className="w-full h-[400px] object-cover rounded-lg"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </section>
  );
};

export default EspaciosSection;
