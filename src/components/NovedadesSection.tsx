import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Wine, UtensilsCrossed, Gift, Calendar, Star, Sparkles, Coffee, Cake, ImageOff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "@/i18n/LanguageProvider";

import pulpoImage from "@/assets/pulpo-plato.jpg";
import carneImage from "@/assets/carne-plato.png";
import champanImage from "@/assets/champan.png";

type IconKey = "utensils" | "wine" | "gift" | "calendar" | "star" | "sparkles" | "coffee" | "cake";

const iconMap: Record<IconKey, typeof Wine> = {
  utensils: UtensilsCrossed,
  wine: Wine,
  gift: Gift,
  calendar: Calendar,
  star: Star,
  sparkles: Sparkles,
  coffee: Coffee,
  cake: Cake,
};

type Language = "es" | "en" | "fr";

interface Novedad {
  id: string;
  titulo: string;
  titulo_en?: string | null;
  titulo_fr?: string | null;
  descripcion?: string | null;
  descripcion_en?: string | null;
  descripcion_fr?: string | null;
  badge_text?: string | null;
  badge_text_en?: string | null;
  badge_text_fr?: string | null;
  icono?: IconKey | null;
  imagen_url?: string | null;
  imagen_posicion_y?: number | null;
  bullets?: string[] | null;
  bullets_en?: string[] | null;
  bullets_fr?: string[] | null;
  tags?: string[] | null;
  tags_en?: string[] | null;
  tags_fr?: string[] | null;
  destacado?: boolean | null;
  orden?: number | null;
}

const fallbackImages = [pulpoImage, carneImage, champanImage];

const getLocalizedContent = (novedad: Novedad, language: Language) => {
  const titleKey = language === "es" ? "titulo" : `titulo_${language}`;
  const descKey = language === "es" ? "descripcion" : `descripcion_${language}`;
  const badgeKey = language === "es" ? "badge_text" : `badge_text_${language}`;
  const bulletsKey = language === "es" ? "bullets" : `bullets_${language}`;
  const tagsKey = language === "es" ? "tags" : `tags_${language}`;

  return {
    titulo: (novedad as Record<string, string | null | undefined>)[titleKey] || novedad.titulo,
    descripcion: (novedad as Record<string, string | null | undefined>)[descKey] || novedad.descripcion || "",
    badge: (novedad as Record<string, string | null | undefined>)[badgeKey] || novedad.badge_text || "",
    bullets: ((novedad as Record<string, string[] | null | undefined>)[bulletsKey] || novedad.bullets || []) as string[],
    tags: ((novedad as Record<string, string[] | null | undefined>)[tagsKey] || novedad.tags || []) as string[],
  };
};

const NovedadesSection = () => {
  const { t, language } = useTranslations();

  const { data, isLoading, error } = useQuery({
    queryKey: ["novedades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("novedades")
        .select("*")
        .order("destacado", { ascending: false })
        .order("orden", { ascending: true });
      if (error) throw error;
      return data as Novedad[];
    },
  });

  const novedades = useMemo(() => data ?? [], [data]);

  const renderCard = (novedad: Novedad, idx: number) => {
    const Icon = iconMap[novedad.icono || "star"];
    const localized = getLocalizedContent(novedad, language);
    const image = novedad.imagen_url || fallbackImages[idx % fallbackImages.length];
    const imageStyle = novedad.imagen_posicion_y ? { objectPosition: `center ${novedad.imagen_posicion_y}%` } : undefined;

    return (
      <motion.div
        key={novedad.id}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: idx * 0.12 }}
        viewport={{ once: true }}
      >
        <Card className="h-full overflow-hidden border border-border/70 bg-gradient-to-br from-background via-muted/40 to-background">
          {image ? (
            <div className="relative h-44 overflow-hidden">
              <img
                src={image}
                alt={localized.titulo}
                className="w-full h-full object-cover"
                style={imageStyle}
                loading="lazy"
                decoding="async"
              />
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center bg-muted/40 text-muted-foreground">
              <ImageOff className="w-6 h-6" />
            </div>
          )}
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <div className="p-3 bg-accent/10 rounded-lg">
                <Icon className="w-6 h-6 text-accent" />
              </div>
              {localized.badge && <Badge className="bg-accent hover:bg-accent/90">{localized.badge}</Badge>}
            </div>
            <CardTitle className="text-xl leading-snug">{localized.titulo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {localized.descripcion && <p className="text-muted-foreground text-sm leading-relaxed">{localized.descripcion}</p>}
            {localized.bullets.length > 0 && (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {localized.bullets.map((item, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="text-primary">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {localized.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {localized.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-[11px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <section id="novedades" className="py-20 px-4 md:px-8 lg:px-16 bg-background">
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
            {t.novedades.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            {t.novedades.subtitle}
          </motion.p>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border border-border/60 bg-gradient-to-br from-background via-muted/40 to-background">
                <Skeleton className="h-44 w-full" />
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div className="text-center text-sm text-destructive">{t.novedades.error || "No se pudieron cargar las novedades."}</div>
        )}

        {!isLoading && !error && novedades.length === 0 && (
          <div className="text-center text-muted-foreground">{t.novedades.empty}</div>
        )}

        <AnimatePresence>
          {!isLoading && !error && novedades.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {novedades.map((novedad, idx) => renderCard(novedad, idx))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
};

export default NovedadesSection;
