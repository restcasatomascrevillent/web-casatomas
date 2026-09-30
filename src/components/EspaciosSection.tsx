import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, ExternalLink, Home, TreePine, Utensils, Wine } from "lucide-react";

import manifestImagenes from "@/assets/responsive/manifest";
import ImagenResponsive, { type NombreImagen } from "@/components/ImagenResponsive";
import { useTranslations } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// La web de Touza vive en touza-restaurant-website.vercel.app. Si el dueño
// pasa a tener dominio propio, basta con fijar VITE_TOUZA_URL para
// sobrescribir este valor por defecto.
const TOUZA_URL = (import.meta.env.VITE_TOUZA_URL as string | undefined) || "https://touza-restaurant-website.vercel.app";

/**
 * Colores REALES de la web de Touza (touza-restaurant-website.vercel.app):
 * fondo casi negro y dorado como color de marca — comprobado con un scrape de
 * su página (tema oscuro, `primary`/`accent` #D4A574, `background` #0A0A0A,
 * botón principal con ese mismo dorado y texto casi negro). Fuera de los
 * tokens de este proyecto (son los colores de OTRO negocio, no los nuestros)
 * a propósito: la tarjeta tiene que leerse como "esto es Touza", no como una
 * cuarta sala de Casa Tomás con una etiqueta distinta.
 */
const TOUZA = {
  bg: "#0A0A0A",
  accent: "#D4A574",
  accentSoft: "rgba(212, 165, 116, 0.16)",
  texto: "#1A1A1A",
};

/**
 * Ancho con el que se pinta cada foto de la galería (atributo `sizes`).
 * Diálogo `max-w-4xl` (896 px) con `p-6` + `p-1` → 840 px de contenido; por
 * debajo de 896 px de viewport ocupa `100vw - 56px`. Las fotos apaisadas, con
 * `object-cover` a 250 px de alto en móvil, se escalan por la altura y salen
 * más anchas que el hueco: se les pide `100vw` para no quedarse cortas.
 */
const sizesGaleria = (nombre: NombreImagen) => {
  const { width, height } = manifestImagenes[nombre];
  return width > height ? "(max-width: 895px) 100vw, 840px" : "(max-width: 895px) calc(100vw - 56px), 840px";
};

const EspaciosSection = () => {
  const { t } = useTranslations();
  const [selectedEspacio, setSelectedEspacio] = useState<number | null>(null);
  // Galería: solo se montan la diapositiva visible y sus vecinas (y las ya
  // vistas, para no parpadear al volver). Antes, abrirla bajaba las 3–5 fotos.
  const [galleryApi, setGalleryApi] = useState<CarouselApi | null>(null);
  const [gallerySlidesMontadas, setGallerySlidesMontadas] = useState<ReadonlySet<number>>(() => new Set([0, 1]));
  // Diapositiva actual de la galería abierta: solo para los puntos y el
  // contador ("2 / 5") de abajo — la propia `Carousel` ya lleva el estado real.
  const [gallerySlideActual, setGallerySlideActual] = useState(0);

  useEffect(() => {
    if (!galleryApi) return;
    const onSelect = () => {
      const actual = galleryApi.selectedScrollSnap();
      setGallerySlideActual(actual);
      setGallerySlidesMontadas((prev) =>
        prev.has(actual - 1) && prev.has(actual) && prev.has(actual + 1)
          ? prev
          : new Set([...prev, actual - 1, actual, actual + 1]),
      );
    };
    galleryApi.on("select", onSelect);
    galleryApi.on("reInit", onSelect);
    onSelect();
    return () => {
      galleryApi.off("select", onSelect);
      galleryApi.off("reInit", onSelect);
    };
  }, [galleryApi]);

  // Solo las tres salas con fotos — Touza es otro negocio, con su propia
  // tarjeta más abajo, no una cuarta "sala" de la rejilla.
  const espacios = t.espacios.cards.slice(0, 3).map((card, index) => ({
    ...card,
    icon: index === 0 ? Home : index === 1 ? Utensils : TreePine,
    images:
      index === 0
        ? (["salon-1", "salon-2", "salon-3", "salon-4", "salon-5"] as NombreImagen[])
        : index === 1
          ? (["comedor-1", "comedor-2", "comedor-3"] as NombreImagen[])
          : (["vinos-marques", "carne-plato", "pulpo-plato"] as NombreImagen[]),
  }));
  const touza = t.espacios.cards[3];

  return (
    <section id="espacios" className="py-20 px-4 md:px-8 lg:px-16 bg-gradient-to-b from-muted to-background">
      <motion.div
        initial={false}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="max-w-7xl mx-auto"
      >
        <div className="text-center mb-12">
          <motion.h2
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-4"
          >
            {t.espacios.title}
          </motion.h2>
          <motion.p
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            {t.espacios.subtitle}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {espacios.map((espacio, index) => {
            const Icon = espacio.icon;
            return (
              <motion.div
                key={index}
                initial={false}
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
                    <Button
                      variant="default"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                      onClick={() => {
                        // Se reinicia en el mismo render que abre el diálogo: con un
                        // useEffect, el primer render montaría las fotos de la galería anterior.
                        setGallerySlidesMontadas(new Set([0, 1]));
                        setGallerySlideActual(0);
                        setSelectedEspacio(index);
                      }}
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      {t.espacios.galleryButton}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Touza: OTRO negocio (el cocktail bar del dueño), no una sala más de
            Casa Tomás — por eso va aparte, bajo la rejilla de fotos, y con los
            colores reales de su propia web en vez de los tokens de este sitio. */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <Card
            className="relative overflow-hidden border-0 shadow-xl"
            style={{ backgroundColor: TOUZA.bg }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(circle at 15% 20%, ${TOUZA.accentSoft}, transparent 45%), radial-gradient(circle at 85% 100%, ${TOUZA.accentSoft}, transparent 40%)`,
              }}
            />
            <CardContent className="relative flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:items-center sm:gap-6 sm:p-8 sm:text-left">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: TOUZA.accentSoft }}
              >
                <Wine className="h-7 w-7" style={{ color: TOUZA.accent }} />
              </div>
              <div className="flex-1">
                <h3 className="font-libre-baskerville text-xl font-bold text-white sm:text-2xl">{touza.title}</h3>
                <p className="mt-1 text-white/70">{touza.description}</p>
              </div>
              <Button
                asChild
                size="lg"
                className="w-full shrink-0 rounded-full font-semibold shadow-lg transition-transform duration-300 hover:scale-105 sm:w-auto"
                style={{ backgroundColor: TOUZA.accent, color: TOUZA.texto }}
              >
                <a href={TOUZA_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  {t.espacios.visitTouza}
                </a>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <Dialog open={selectedEspacio !== null} onOpenChange={() => setSelectedEspacio(null)}>
          <DialogContent className="max-w-4xl overflow-hidden bg-background/95 backdrop-blur-sm">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3 pr-6">
                <DialogTitle>{selectedEspacio !== null ? espacios[selectedEspacio].title : ""}</DialogTitle>
                {selectedEspacio !== null && (
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
                    {gallerySlideActual + 1} / {espacios[selectedEspacio].images.length}
                  </span>
                )}
              </div>
              <DialogDescription className="sr-only">
                Galería de imágenes del espacio seleccionado.
              </DialogDescription>
            </DialogHeader>
            {selectedEspacio !== null && espacios[selectedEspacio].images && (
              <>
                <Carousel className="w-full" setApi={setGalleryApi}>
                  <CarouselContent>
                    {espacios[selectedEspacio].images.map((image, idx) => (
                      <CarouselItem key={idx}>
                        <div className="p-1">
                          {gallerySlidesMontadas.has(idx) ? (
                            <ImagenResponsive
                              nombre={image}
                              alt={`${espacios[selectedEspacio].title} ${idx + 1}`}
                              className="w-full h-[250px] md:h-[400px] object-cover rounded-xl shadow-lg ring-1 ring-border/60"
                              loading="lazy"
                              fetchPriority="low"
                              decoding="async"
                              sizes={sizesGaleria(image)}
                            />
                          ) : (
                            // Mismo hueco que la foto: el carrusel no cambia de tamaño al montarla.
                            <div className="w-full h-[250px] md:h-[400px] rounded-xl" aria-hidden="true" />
                          )}
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden md:flex bg-background/90 shadow-md" />
                  <CarouselNext className="hidden md:flex bg-background/90 shadow-md" />
                </Carousel>
                {espacios[selectedEspacio].images.length > 1 && (
                  <div className="flex justify-center gap-2 pt-1">
                    {espacios[selectedEspacio].images.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        aria-label={`${t.espacios.galleryButton} ${idx + 1}`}
                        aria-current={gallerySlideActual === idx}
                        onClick={() => galleryApi?.scrollTo(idx)}
                        className={`h-2 rounded-full transition-all ${
                          gallerySlideActual === idx ? "w-6 bg-accent" : "w-2 bg-border hover:bg-accent/50"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </section>
  );
};

export default EspaciosSection;
