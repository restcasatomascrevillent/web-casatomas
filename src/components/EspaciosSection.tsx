import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Home, Utensils, TreePine, Wine, Camera, ExternalLink, ChefHat, Clock, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import carnePlato from "@/assets/carne-plato.png";
import pulpoPlato from "@/assets/pulpo-plato.jpg";
import vinosMarques from "@/assets/vinos-marqués.jpeg";
import { useTranslations } from "@/i18n/LanguageProvider";

const EspaciosSection = () => {
  const { t, dateLocale } = useTranslations();
  const [selectedEspacio, setSelectedEspacio] = useState<number | null>(null);
  const [showMenus, setShowMenus] = useState(false);
  const [showTapas, setShowTapas] = useState(false);

  const menusDelDia = t.espacios.menus;
  const tapasSemanales = t.espacios.tapas;
  const espacios = t.espacios.cards.map((card, index) => ({
    ...card,
    icon: index === 0 ? Home : index === 1 ? Utensils : index === 2 ? TreePine : Wine,
    hasGallery: index !== 3,
    images: index === 0 ? [carnePlato, pulpoPlato, vinosMarques] : index === 1 ? [pulpoPlato, vinosMarques, carnePlato] : index === 2 ? [vinosMarques, carnePlato, pulpoPlato] : undefined,
    link: index === 3 ? "/touza-cocktail" : undefined,
  }));

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
            {t.espacios.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            {t.espacios.subtitle}
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
                        {t.espacios.galleryButton}
                      </Button>
                    ) : (
                      <Button 
                        variant="default" 
                        className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        asChild
                      >
                        <Link to={espacio.link || "#"}>
                          <ExternalLink className="w-5 h-5 mr-2" />
                          {t.espacios.visitTouza}
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
          <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border border-border/60 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-primary" />
                {t.espacios.middayMenuTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{t.espacios.middayMenuDescription}</p>
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant="default" 
                  className="flex-1 min-w-[140px] bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300"
                  onClick={() => setShowMenus(true)}
                >
                  <ChefHat className="w-5 h-5 mr-2" />
                  {t.espacios.middayMenuButton}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 min-w-[120px] border-primary/50 text-primary hover:bg-primary/10"
                  onClick={() => setShowMenus(true)}
                >
                  <Star className="w-4 h-4 mr-2" />
                  {t.espacios.middayMenuToday ?? "Hoy"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border border-border/60 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                {t.espacios.tapasTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{t.espacios.tapasDescription}</p>
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant="default"
                  className="flex-1 min-w-[140px] bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300"
                  onClick={() => setShowTapas(true)}
                >
                  <Clock className="w-5 h-5 mr-2" />
                  {t.espacios.tapasButton}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 min-w-[120px] border-primary/50 text-primary hover:bg-primary/10"
                  onClick={() => setShowTapas(true)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t.espacios.tapasToday ?? "Hoy"}
                </Button>
              </div>
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
                          className="w-full h-[250px] md:h-[400px] object-cover rounded-lg"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex" />
                <CarouselNext className="hidden md:flex" />
              </Carousel>
            )}
          </DialogContent>
        </Dialog>

        {/* Diálogo de Menús del Día */}
        <Dialog open={showMenus} onOpenChange={setShowMenus}>
            <DialogContent className="w-[92vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto p-2 sm:p-6">
            <DialogHeader>
              <DialogTitle>{t.espacios.menusDialogTitle}</DialogTitle>
            </DialogHeader>
            <p className="md:hidden text-xs text-muted-foreground mb-2 px-1">{t.espacios.swipeHint}</p>
              <Carousel className="w-full px-1 sm:px-0" opts={{ align: "center", loop: true, dragFree: true }}>
                <CarouselContent className="-ml-3 sm:-ml-4">
                  {menusDelDia.map((menu, idx) => (
                    <CarouselItem
                      key={idx}
                      className="pl-3 sm:pl-4 basis-[88%] sm:basis-1/2 lg:basis-1/3"
                    >
                      <Card className="h-full bg-gradient-to-br from-background via-muted/40 to-background border border-border/70 shadow-lg">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base md:text-lg flex items-center gap-2 capitalize">
                            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary">
                              <ChefHat className="w-4 h-4 md:w-5 md:h-5" />
                            </span>
                            <span className="leading-tight">{format(menu.date, "EEEE d MMMM", { locale: dateLocale })}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="rounded-lg bg-background/80 border border-border/60 p-3">
                            <h4 className="font-semibold text-primary mb-1">{t.espacios.menuLabels.starters}</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {menu.primeros.map((plato, i) => (
                                <li key={i}>• {plato}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-lg bg-background/80 border border-border/60 p-3">
                            <h4 className="font-semibold text-primary mb-1">{t.espacios.menuLabels.mains}</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {menu.segundos.map((plato, i) => (
                                <li key={i}>• {plato}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-lg bg-background/80 border border-border/60 p-3">
                            <h4 className="font-semibold text-primary mb-1">{t.espacios.menuLabels.dessert}</h4>
                            <p className="text-sm text-muted-foreground">• {menu.postre}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex" aria-label="Anterior" />
                <CarouselNext className="hidden sm:flex" aria-label="Siguiente" />
              </Carousel>
            </DialogContent>
        </Dialog>

        {/* Diálogo de Tapas Semanales */}
        <Dialog open={showTapas} onOpenChange={setShowTapas}>
            <DialogContent className="w-[92vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto p-2 sm:p-6">
              <DialogHeader>
                <DialogTitle>{t.espacios.tapasDialogTitle}</DialogTitle>
              </DialogHeader>
              <p className="md:hidden text-xs text-muted-foreground mb-2 px-1">{t.espacios.swipeHint}</p>
              <Carousel className="w-full px-1 sm:px-0" opts={{ align: "center", loop: true, dragFree: true }}>
                <CarouselContent className="-ml-3 sm:-ml-4">
                  {tapasSemanales.map((semana, idx) => (
                    <CarouselItem
                      key={idx}
                      className="pl-3 sm:pl-4 basis-[88%] sm:basis-1/2 lg:basis-1/3"
                    >
                      <Card className="h-full bg-gradient-to-br from-background via-muted/40 to-background border border-border/70 shadow-lg">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base md:text-lg flex items-center gap-2 capitalize">
                            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary">
                              <Clock className="w-4 h-4 md:w-5 md:h-5" />
                            </span>
                            <span className="leading-tight">{format(semana.date, "EEEE d MMM", { locale: dateLocale })}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <h4 className="font-semibold text-primary mb-1">{t.espacios.menuLabels.tapasOfDay}</h4>
                          <ul className="text-sm text-muted-foreground space-y-2">
                            {semana.tapas.map((tapa, i) => (
                              <li key={i} className="flex items-start">
                                <span className="text-primary mr-2">•</span>
                                <span>{tapa}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex" aria-label="Anterior" />
                <CarouselNext className="hidden sm:flex" aria-label="Siguiente" />
              </Carousel>
            </DialogContent>
        </Dialog>
      </motion.div>
    </section>
  );
};

export default EspaciosSection;
