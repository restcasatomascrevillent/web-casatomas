import { useMemo, useState, type ComponentProps } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Wine, UtensilsCrossed, Gift, Calendar, Star, Sparkles, Coffee, Cake } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "@/i18n/LanguageProvider";

import MenuDiarioCards from "@/components/espacios/MenuDiarioCards";
import BotonesNovedad from "@/components/novedades/BotonesNovedad";
import { NEGOCIO } from "@/lib/negocio";
import { imagenOptimizada, srcSetOptimizada } from "@/lib/carta-ssg";
import novedadesSSG from "virtual:novedades-ssg";

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
  /**
   * Botones del pie (jsonb, ver `@/lib/menu-novedad`). Pueden faltar: filas
   * de antes de la migración, o el `[]` que el SSG compacta.
   */
  botones?: unknown;
  menu?: unknown;
  plato_id?: string | null;
}

/**
 * Novedades tal y como las descargó el build (`virtual:novedades-ssg`).
 *
 * Antes esta sección solo se pedía a Supabase desde el navegador: el HTML
 * que sirve Vercel no traía ni un título, solo el esqueleto de carga
 * (`isLoading` es `true` durante el prerenderizado, que nunca espera a un
 * `fetch`). Se siembra como `initialData` del propio `useQuery` de abajo —
 * mismo truco que `initialPlatos` en `CartaPlatos` y `initialVinos` en
 * `CartaVinos` — así que el primer render (build y navegador, antes de
 * hidratar) ya trae las tarjetas reales, y son las MISMAS que pinta el
 * refresco posterior, no una copia aparte para el buscador.
 */
const NOVEDADES_SSG = novedadesSSG.novedades as unknown as Novedad[];

/**
 * Foto de la tarjeta. Si no carga (enlace roto o borrado del almacén), se quita
 * el bloque entero y la tarjeta queda como una sin foto, en vez de enseñar el
 * recuadro roto del navegador en un hueco de 176 px (QA, «Navegación de
 * Novedades 2/2», criterio 3). Mismo criterio que las fotos de `CartaDelDia`.
 */
const FotoNovedad = (props: ComponentProps<"img">) => {
  const [rota, setRota] = useState(false);
  if (rota) return null;
  return (
    <div className="relative h-44 overflow-hidden">
      <img {...props} onError={() => setRota(true)} />
    </div>
  );
};

const getLocalizedContent = (novedad: Novedad, language: Language) => {
  const sufijo = language === "es" ? "" : `_${language}`;
  // Los nombres dinamicos siguen restringidos a las claves declaradas de Novedad.
  const texto = (campo: keyof Novedad): string | undefined => {
    const valor = novedad[campo];
    return typeof valor === "string" ? valor : undefined;
  };
  const lista = (campo: keyof Novedad): string[] | undefined => {
    const valor = novedad[campo];
    return Array.isArray(valor)
      ? valor.filter((item): item is string => typeof item === "string")
      : undefined;
  };

  return {
    titulo: texto(`titulo${sufijo}` as keyof Novedad) || novedad.titulo,
    descripcion: texto(`descripcion${sufijo}` as keyof Novedad) || novedad.descripcion || "",
    badge: texto(`badge_text${sufijo}` as keyof Novedad) || novedad.badge_text || "",
    bullets: lista(`bullets${sufijo}` as keyof Novedad) || novedad.bullets || [],
    tags: lista(`tags${sufijo}` as keyof Novedad) || novedad.tags || [],
  };
};

const NovedadesSection = () => {
  const { t, language } = useTranslations();

  const { data, isLoading, error } = useQuery({
    queryKey: ["novedades"],
    queryFn: async () => {
      // Import perezoso: el SDK de Supabase (~40 KB gzip) no debe entrar en
      // el chunk que descarga la portada nada más cargar — solo hace falta
      // al ejecutar esta consulta.
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("novedades")
        .select("*")
        .order("destacado", { ascending: false })
        .order("orden", { ascending: true });
      if (error) throw error;
      return data as Novedad[];
    },
    // Datos del build (ver `NOVEDADES_SSG` arriba): con esto, `isLoading` ya
    // es `false` en el primer render — SSG y primer pintado en el navegador
    // — en vez de esperar a este `queryFn`.
    initialData: NOVEDADES_SSG,
    // Sin esto React Query da `initialData` por recién descargado: con el
    // `staleTime` de 5 min de `App.tsx` (y sin refetch al enfocar) el
    // navegador NO volvía a pedir las novedades al cargar la página, así que
    // la web enseñaba la foto del último build. Una novedad creada o una
    // traducción corregida en el panel no aparecía en ningún idioma hasta el
    // siguiente deploy (y guardar novedades no dispara ninguno). Fechándolo
    // con la hora del build, en producción siempre está caducado y se
    // refresca al montar; el primer pintado sigue siendo el del SSG.
    initialDataUpdatedAt: Date.parse(novedadesSSG.generadoEn) || 0,
  });

  const novedades = useMemo(() => data ?? [], [data]);
  // El refresco en el navegador puede fallar aunque ya tengamos tarjetas (las
  // del build o las de una consulta anterior): móvil sin cobertura un momento
  // o, sobre todo, una pestaña abierta desde antes del último deploy, cuyo
  // chunk perezoso del cliente de Supabase ya no existe (un `import()` fallido
  // se queda cacheado, así que los reintentos de React Query fallan igual).
  // React Query conserva `data` y además rellena `error`; antes eso borraba
  // las tarjetas y enseñaba «No se pudieron cargar las novedades». El aviso
  // solo tiene sentido si no hay nada que enseñar.
  const sinDatos = novedades.length === 0;
  const errorSinDatos = Boolean(error) && sinDatos;

  const renderCard = (novedad: Novedad, idx: number) => {
    const Icon = iconMap[novedad.icono || "star"];
    const localized = getLocalizedContent(novedad, language);
    // Sin foto propia, la tarjeta va sin foto (QA-MDN-05, 01/11/2026). Antes
    // se ponía una de relleno según la posición (pulpo, carne o champán), que
    // no tenía nada que ver con la novedad: un filete en una cata de vinos.
    // Una URL con solo espacios (pegada a mano en el panel) también es «sin foto».
    const image = novedad.imagen_url?.trim() || null;
    // `0` (encuadre arriba del todo) es un valor válido del panel: con una
    // comprobación de verdad/falsedad se descartaba y la foto salía centrada.
    // Mismo criterio que `ProductoCard`: solo se omite si no hay número.
    const imageStyle =
      typeof novedad.imagen_posicion_y === "number"
        ? { objectPosition: `center ${Math.min(100, Math.max(0, novedad.imagen_posicion_y))}%` }
        : undefined;
    const imgProps = {
      alt: `${localized.titulo} — ${NEGOCIO.nombre}`,
      className: "w-full h-full object-cover",
      style: imageStyle,
      loading: "lazy" as const,
      // Las fotos se suben sin comprimir (hasta 1,3 MB): pasan por el
      // optimizador de Vercel (como las de la carta) con srcset por ancho.
      srcSet: srcSetOptimizada(image) ?? undefined,
      // 1 columna en móvil; 3 columnas desde `md` (rejilla de máx. 80rem).
      sizes: "(min-width: 768px) 33vw, 100vw",
      width: 640,
      height: 352,
      fetchPriority: "low" as const,
      decoding: "async" as const,
    };

    return (
      <motion.div
        key={novedad.id}
        // `initial={false}`: el contenido de esta tarjeta ahora SIEMPRE está
        // en el HTML (ver `NOVEDADES_SSG`), así que nace en su estado final
        // en vez de opacity:0 a la espera del JS — mismo fix que ya se
        // aplicó al resto de la home en el commit "el contenido de la home
        // ya no se esconde detrás del JS".
        initial={false}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: idx * 0.12 }}
        viewport={{ once: true }}
        // `h-full` aquí y `flex flex-col` en la tarjeta: todas las de una fila
        // miden lo mismo y el `mt-auto` del pie alinea los botones abajo.
        className="h-full"
      >
        <Card className="flex h-full flex-col overflow-hidden border border-border/70 bg-gradient-to-br from-background via-muted/40 to-background">
          {image && <FotoNovedad key={image} src={imagenOptimizada(image, 768) ?? image} {...imgProps} />}
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <div className="p-3 bg-accent/10 rounded-lg">
                <Icon className="w-6 h-6 text-accent" />
              </div>
              {localized.badge && <Badge className="bg-accent hover:bg-accent-hover">{localized.badge}</Badge>}
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
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
          <BotonesNovedad
            idNovedad={novedad.id}
            titulo={localized.titulo}
            botones={novedad.botones}
            menu={novedad.menu}
            platoId={novedad.plato_id}
          />
        </Card>
      </motion.div>
    );
  };

  return (
    <section id="novedades" className="py-20 px-4 md:px-8 lg:px-16 bg-background">
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
            className="text-4xl md:text-5xl font-bold text-primary mb-4"
          >
            {t.novedades.title}
          </motion.h2>
          <motion.p
            initial={false}
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

        {!isLoading && errorSinDatos && (
          <div className="text-center text-sm text-destructive">{t.novedades.error || "No se pudieron cargar las novedades."}</div>
        )}

        {!isLoading && !error && sinDatos && (
          <div className="text-center text-muted-foreground">{t.novedades.empty}</div>
        )}

        <AnimatePresence>
          {!isLoading && !sinDatos && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {novedades.map((novedad, idx) => renderCard(novedad, idx))}
            </div>
          )}
        </AnimatePresence>

        {/* El menú de mediodía y las tapas de los jueves: promociones fijas
            con su propio día, no algo que suba o baje el dueño desde el
            panel — por eso van aparte de la rejilla de `novedades` de arriba,
            debajo del todo, y solo existen el día que toca (ver
            `MenuDiarioCards`). */}
        <MenuDiarioCards />
      </motion.div>
    </section>
  );
};

export default NovedadesSection;
