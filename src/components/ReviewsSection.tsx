import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Star, ExternalLink, MessageSquare } from "lucide-react";

const ReviewsSection = () => {
  const reviews = [
    {
      name: "María García",
      date: "Hace 2 semanas",
      rating: 5,
      comment: "Experiencia excepcional. La calidad de los platos es extraordinaria y el servicio impecable. El pulpo a la gallega estaba delicioso. Totalmente recomendable.",
      avatar: "MG"
    },
    {
      name: "Carlos Rodríguez",
      date: "Hace 1 mes",
      rating: 5,
      comment: "Un restaurante de 10. Ambiente acogedor, comida exquisita y atención personalizada. El menú del mediodía tiene una relación calidad-precio excelente.",
      avatar: "CR"
    },
    {
      name: "Ana Martínez",
      date: "Hace 3 semanas",
      rating: 5,
      comment: "Celebramos nuestro aniversario aquí y fue perfecto. La terraza es preciosa y los platos son verdaderas obras de arte. Volveremos sin duda.",
      avatar: "AM"
    },
    {
      name: "Javier López",
      date: "Hace 2 meses",
      rating: 4,
      comment: "Muy buena experiencia gastronómica. Destacar la carta de vinos y el trato del personal. El solomillo al vino tinto estaba en su punto perfecto.",
      avatar: "JL"
    },
    {
      name: "Isabel Fernández",
      date: "Hace 1 semana",
      rating: 5,
      comment: "Espectacular. Tanto la comida como el ambiente son de primera categoría. Las tapas de los jueves son una experiencia que no te puedes perder.",
      avatar: "IF"
    },
    {
      name: "Miguel Sánchez",
      date: "Hace 3 semanas",
      rating: 5,
      comment: "De los mejores restaurantes de la zona. Productos frescos, elaboración cuidada y un servicio atento. El comedor privado es ideal para eventos.",
      avatar: "MS"
    }
  ];

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

  const handleLeaveReview = () => {
    // URL de Google Reviews para Casa Tomás Restaurante Crevillente
    window.open("https://www.google.com/maps/place/Casa+Tom%C3%A1s+Restaurante/@38.2489234,-0.8107264,17z/data=!4m8!3m7!1s0xd6382b8f8f8f8f8f:0x1234567890abcdef!8m2!3d38.2489234!4d-0.8085377!9m1!1b1!16s%2Fg%2F11c0qw0qw0?entry=ttu", "_blank");
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
            Opiniones de Nuestros Clientes
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Lo que dicen quienes nos visitan
          </motion.p>
        </div>

        <Carousel
          className="w-full"
          opts={{
            align: "start",
            loop: true,
          }}
        >
          <CarouselContent className="-ml-4">
            {reviews.map((review, index) => (
              <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
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
                            {review.avatar}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {review.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {review.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 mb-3">
                        {renderStars(review.rating)}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {review.comment}
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Button
            onClick={handleLeaveReview}
            size="lg"
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Dejar una Reseña en Google
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default ReviewsSection;
