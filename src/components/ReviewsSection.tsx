import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { format, isValid, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/LanguageProvider";
import { supabase } from "@/integrations/supabase/client";
import { GOOGLE_REVIEW_URL } from "@/lib/negocio";

// Solo se muestran reseñas REALES de la tabla `resenas` (las sincroniza la edge
// function `sync-google-reviews`). Si no hay ninguna publicada, la sección no se
// renderiza: mostrar testimonios inventados como si fueran de clientes es
// práctica desleal (RDL 24/2021).
type Resena = {
  id: string;
  nombre_cliente: string;
  comentario: string | null;
  valoracion: number;
  google_rating: number | null;
  fecha: string;
};

const getInitials = (nombre: string) =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

const ReviewsSection = () => {
  const { t, dateLocale } = useTranslations();

  const { data } = useQuery({
    queryKey: ["resenas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resenas")
        .select("id, nombre_cliente, comentario, valoracion, google_rating, fecha")
        .eq("estado", "publicada")
        .order("fecha", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data as Resena[];
    },
  });

  const reviews = (data ?? []).filter((review) => review.comentario?.trim());
  const hayResenas = reviews.length > 0;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  const formatFecha = (fecha: string) => {
    const parsed = parseISO(fecha);
    return isValid(parsed) ? format(parsed, "d MMMM yyyy", { locale: dateLocale }) : "";
  };

  return (
    <section className="py-20 px-4 md:px-8 lg:px-16 bg-muted">
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
            {t.reviews.title}
          </motion.h2>
          {hayResenas && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              {t.reviews.subtitle}
            </motion.p>
          )}
        </div>

        {hayResenas && (
        <Carousel
          className="w-full"
          opts={{
            align: "start",
            loop: true,
          }}
        >
          <CarouselContent className="-ml-4">
            {reviews.map((review, index) => (
              <CarouselItem key={review.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-semibold">
                            {getInitials(review.nombre_cliente)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {review.nombre_cliente}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {formatFecha(review.fecha)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 mb-3">
                        {renderStars(review.google_rating ?? review.valoracion)}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {review.comentario}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
        )}

        {/* El enlace para dejar reseña se muestra SIEMPRE, haya o no reseñas que
            enseñar: `resenas` no tiene política de lectura anónima, así que en la
            web pública el carrusel sale vacío y antes eso se llevaba por delante
            la sección entera. Apunta al Place ID real (ver `@/lib/negocio`); el
            CID que hubo aquí era inventado y llevaba a un mapa roto. */}
        <div className={hayResenas ? "mt-10 flex justify-center" : "flex justify-center"}>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-2 border-primary/30 font-semibold rounded-full"
          >
            <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer">
              <Star className="w-5 h-5 mr-2" />
              {t.reviews.cta}
            </a>
          </Button>
        </div>
      </motion.div>
    </section>
  );
};

export default ReviewsSection;
