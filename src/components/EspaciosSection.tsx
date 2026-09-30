import { motion } from "framer-motion";
import { ExternalLink, Wine } from "lucide-react";
import { useTranslations } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import EspaciosGallery from "./EspaciosGallery";

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

const EspaciosSection = () => {
  const { t } = useTranslations();
  const touza = t.espacios.cards[3];
  return (
    <section id="espacios" className="py-20 px-0 md:px-8 lg:px-16 bg-background">
      <div className="max-w-7xl mx-auto">
        <EspaciosGallery />
        <div className="mt-8 px-4 md:px-0">
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

        </div>
      </div>
    </section>
  );
};
export default EspaciosSection;
