import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
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
    <section ref={ref} className="relative h-screen overflow-hidden bg-gradient-to-br from-dark-slate to-mid-gray">
      <motion.div 
        style={{ y, opacity }}
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-4"
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
            className="w-48 md:w-64 h-auto mx-auto mb-6 drop-shadow-2xl"
          />
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-background mb-4 tracking-tight">
            Casa Tomás
          </h1>
          <p className="text-xl md:text-2xl text-stone max-w-2xl mx-auto leading-relaxed">
            Donde la tradición familiar se convierte en arte culinario
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
            className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            onClick={() => window.open('https://www.covermanager.com/reserve/module_restaurant/restaurante-casa-tomas-crevillent', '_blank')}
          >
            Reservar Mesa
          </Button>
          <Button 
            size="lg"
            variant="outline"
            className="border-2 border-background text-background hover:bg-background hover:text-primary px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            onClick={() => scrollToSection('carta')}
          >
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
              className="w-8 h-8 text-background"
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

      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-20 pointer-events-none" />
    </section>
  );
};

export default Hero;
