import { useMemo, useState } from "react";
import { format, isSameDay, isValid, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { ChefHat, Clock, Sparkles } from "lucide-react";

import ImagenResponsive from "@/components/ImagenResponsive";
import CartaDelDia, { CLASES_TITULO_CARTA } from "@/components/espacios/CartaDelDia";
import { parsearMenuDiario, type MenuDelDia, type MenuDiarioRow } from "@/lib/menu-dia";
import { useTranslations } from "@/i18n/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TapasRow {
  id?: string;
  fecha: string;
  tapas: unknown;
  idiom?: string | null;
}

interface TapasDelDia {
  id: string;
  date: Date;
  tapas: string[];
}

/**
 * Normaliza la columna de tapas.
 *
 * OJO: NO parte por saltos de línea. El menú del día sí lo hace desde
 * `@/lib/menu-dia` (era un fallo: dos platos en dos líneas se pintaban como un
 * bloque). Aquí se deja como estaba a propósito, para no cambiar de paso cómo
 * se ven las tapas, que es otro bloque de la página.
 */
const normalizeMenuItems = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeMenuItems(parsed);
      } catch {
        return [trimmed];
      }
    }

    return [trimmed];
  }

  return [];
};

const parseMenuPayload = (value: unknown): Record<string, unknown> => {
  if (!value) return {};

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
};

const toTapasDelDia = (row: TapasRow, index: number): TapasDelDia | null => {
  const parsedDate = parseISO(row.fecha);
  if (!isValid(parsedDate)) return null;

  const directTapas = normalizeMenuItems(row.tapas);
  const parsedPayload = parseMenuPayload(row.tapas);
  const payloadTapas = normalizeMenuItems(
    parsedPayload.tapas ?? parsedPayload.items ?? parsedPayload.lista ?? parsedPayload.listado,
  );

  const tapas = payloadTapas.length > 0 ? payloadTapas : directTapas;
  if (tapas.length === 0) return null;

  return {
    id: row.id ?? `${row.fecha}-${index}`,
    date: parsedDate,
    tapas,
  };
};

const getIdiomAliases = (language: string): string[] => {
  if (language === "en") return ["en", "ingles", "inglés", "english"];
  if (language === "fr") return ["fr", "frances", "francés", "french"];
  return ["es", "espanol", "español", "spanish"];
};

/** Ancho con el que se pinta la foto de cada tarjeta — mismo criterio que las de Novedades. */
const SIZES_TARJETA = "(min-width: 768px) 33vw, calc(100vw - 32px)";

/**
 * Las dos promociones fijas del restaurante, con día y hora propios: el menú
 * de mediodía (martes a jueves) y las tapas de los jueves. Viven en
 * "Novedades" — más su sitio natural que "Nuestros espacios", que va de fotos
 * del local — con el mismo lenguaje visual que las tarjetas de esa sección
 * (foto arriba, insignia con el icono, título y descripción) para que no
 * desentonen, más un botón propio para abrir el menú/las tapas de hoy.
 *
 * Cada tarjeta solo existe el día que toca: fuera de esos días no hay nada
 * que pulsar (antes se veía igual pero deshabilitada, con un texto tipo
 * "Vuelve el jueves" — confuso el resto de la semana, cuando ni siquiera hay
 * tapas que mostrar).
 */
const MenuDiarioCards = () => {
  const { t, dateLocale, language } = useTranslations();
  const [showTodayMenu, setShowTodayMenu] = useState(false);
  const [showTodayTapas, setShowTodayTapas] = useState(false);

  const idiomAliases = useMemo(() => getIdiomAliases(language), [language]);

  const { data: rawMenusDelDia = [] } = useQuery({
    queryKey: ["menus_diarios", language],
    queryFn: async () => {
      // Import perezoso: el SDK de Supabase (~40 KB gzip) no debe entrar en
      // el chunk que descarga la portada nada más cargar — solo hace falta
      // al ejecutar esta consulta.
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("menus_diarios")
        .select("id, fecha, menu, idiom")
        .in("idiom", idiomAliases)
        .order("fecha", { ascending: false });

      if (error) throw error;
      return (data || []) as MenuDiarioRow[];
    },
  });

  const menusDelDia = useMemo(
    () => rawMenusDelDia.map((row) => parsearMenuDiario(row)).filter((menu): menu is MenuDelDia => menu !== null),
    [rawMenusDelDia],
  );

  const { data: rawTapasSemanales = [] } = useQuery({
    queryKey: ["tapas", language],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("tapas")
        .select("id, fecha, tapas, idiom")
        .in("idiom", idiomAliases)
        .order("fecha", { ascending: false });

      if (error) throw error;
      return (data || []) as TapasRow[];
    },
  });

  const tapasSemanales = useMemo(
    () => rawTapasSemanales.map((row, index) => toTapasDelDia(row, index)).filter((tapas): tapas is TapasDelDia => Boolean(tapas)),
    [rawTapasSemanales],
  );

  const today = new Date();
  const todayDay = today.getDay();
  const isMenuDayToday = todayDay >= 2 && todayDay <= 4;
  const isTapasDayToday = todayDay === 4;

  const todayMenu = menusDelDia.find((menu) => isSameDay(menu.date, today)) ?? null;
  const todayTapas = tapasSemanales.find((tapas) => isSameDay(tapas.date, today)) ?? null;

  const menuDaysLabel = `${format(new Date(2025, 0, 21), "EEE", { locale: dateLocale })} - ${format(new Date(2025, 0, 23), "EEE", { locale: dateLocale })}`;
  const tapasDayLabel = format(new Date(2025, 0, 23), "EEE", { locale: dateLocale });

  if (!isMenuDayToday && !isTapasDayToday) return null;

  return (
    <>
      <div className="flex flex-wrap justify-center gap-6 sm:gap-8 mb-10">
        {isMenuDayToday && (
          <div className="w-full sm:w-[22rem]">
            <Card className="h-full overflow-hidden border border-border/70 bg-gradient-to-br from-background via-muted/40 to-background">
              <div className="relative h-44 overflow-hidden">
                <ImagenResponsive
                  nombre="carne-plato"
                  alt=""
                  sizes={SIZES_TARJETA}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  fetchPriority="low"
                  decoding="async"
                />
              </div>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <ChefHat className="w-6 h-6 text-accent" />
                  </div>
                  <Badge className="bg-accent hover:bg-accent/90">{menuDaysLabel}</Badge>
                </div>
                <CardTitle className="text-xl leading-snug">{t.espacios.middayMenuTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm leading-relaxed">{t.espacios.middayMenuDescription}</p>
                <Button
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-all"
                  onClick={() => setShowTodayMenu(true)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t.espacios.todayMenuCta}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {isTapasDayToday && (
          <div className="w-full sm:w-[22rem]">
            <Card className="h-full overflow-hidden border border-border/70 bg-gradient-to-br from-background via-muted/40 to-background">
              <div className="relative h-44 overflow-hidden">
                <ImagenResponsive
                  nombre="pulpo-plato"
                  alt=""
                  sizes={SIZES_TARJETA}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  fetchPriority="low"
                  decoding="async"
                />
              </div>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <Clock className="w-6 h-6 text-accent" />
                  </div>
                  <Badge className="bg-accent hover:bg-accent/90 capitalize">{tapasDayLabel}</Badge>
                </div>
                <CardTitle className="text-xl leading-snug">{t.espacios.tapasTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm leading-relaxed">{t.espacios.tapasDescription}</p>
                <Button
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-all"
                  onClick={() => setShowTodayTapas(true)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t.espacios.todayTapasCta}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* El menú de hoy, como una carta impresa sobre la bandeja del diálogo.
          El ancho es el de una carta (no el de un panel): con fotos, tres
          columnas de texto obligaban a leer en zigzag. */}
      <Dialog open={showTodayMenu} onOpenChange={setShowTodayMenu}>
        <DialogContent className="w-[92vw] sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-border/60 bg-ticket-tray p-3 sm:p-5">
          <DialogDescription className="sr-only">Menú diario cargado desde base de datos.</DialogDescription>
          {todayMenu ? (
            <CartaDelDia
              menu={todayMenu}
              titulo={<DialogTitle className={CLASES_TITULO_CARTA}>{t.espacios.todayMenuTitle}</DialogTitle>}
              subtitulo={format(todayMenu.date, "EEEE d MMMM", { locale: dateLocale })}
            />
          ) : (
            <div className="rounded-lg border border-ticket-rule/25 bg-ticket-paper px-5 py-6 text-center font-libre-baskerville text-ticket-ink">
              <DialogTitle className={CLASES_TITULO_CARTA}>{t.espacios.todayMenuTitle}</DialogTitle>
              <p className="mt-3 text-sm text-ticket-ink-soft">{t.espacios.noMenuToday}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showTodayTapas} onOpenChange={setShowTodayTapas}>
        <DialogContent className="w-[90vw] sm:max-w-2xl md:max-w-3xl rounded-2xl border border-border/70 bg-gradient-to-b from-background via-muted/40 to-background p-4 sm:p-6">
          <DialogHeader className="space-y-2 items-center text-center">
            <DialogTitle className="flex items-center gap-2 text-xl leading-tight text-center">
              <Clock className="w-5 h-5 text-primary" />
              {t.espacios.todayTapasTitle}
            </DialogTitle>
            <DialogDescription className="sr-only">Tapas del día cargadas desde base de datos.</DialogDescription>
            {todayTapas && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground capitalize">
                {format(todayTapas.date, "EEEE d MMMM", { locale: dateLocale })}
              </p>
            )}
          </DialogHeader>
          {todayTapas ? (
            <div className="space-y-4">
              <Card className="border border-border/70 bg-background/80 shadow-inner">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-primary flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      {t.espacios.menuLabels.tapasOfDay}
                    </h4>
                  </div>
                  <ul className="grid gap-3 sm:grid-cols-2 text-sm text-muted-foreground">
                    {todayTapas.tapas.map((tapa, i) => (
                      <li key={i} className="flex gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                        <span className="text-primary">•</span>
                        <span>{tapa}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="rounded-xl border border-border/70 bg-muted/30 p-6 text-center text-muted-foreground">
              {t.espacios.noTapasToday}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MenuDiarioCards;
