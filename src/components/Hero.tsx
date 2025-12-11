import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { Calendar, UtensilsCrossed } from "lucide-react";
import logo from "@/assets/logo-casa-tomas.png";

const Hero = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      ref={ref}
      className="relative h-screen overflow-hidden bg-gradient-to-br from-background via-muted to-background"
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 -right-20 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>
      <motion.div
        style={{ y, opacity }}
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="mb-8"
        >
          <img
            src={logo}
            alt="Casa Tomás Restaurante"
            className="w-64 md:w-96 lg:w-[28rem] h-auto mx-auto mb-6 drop-shadow-2xl"
          />
          <p className="text-2xl md:text-3xl text-foreground/80 max-w-2xl mx-auto leading-relaxed font-semibold italic">
            Nunca é longo o camino que conduce á casa dun amigo
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Button
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            onClick={() => {
              window.location.href = "/reservas";
            }}
          >
            <Calendar className="w-5 h-5 mr-2" />
            Reservar Mesa
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-2 border-primary/30 bg-background/50 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            onClick={() => scrollToSection("carta")}
          >
            <UtensilsCrossed className="w-5 h-5 mr-2" />
            Ver Carta
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="absolute bottom-8"
        >
          <div className="animate-float">
            <svg
              className="w-8 h-8 text-foreground/60"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
