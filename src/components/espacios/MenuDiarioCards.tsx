import { useMemo, useState } from "react";
import { format, isSameDay, isValid, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { ChefHat, Clock, Sparkles } from "lucide-react";

import CartaDelDia, { CLASES_TITULO_CARTA } from "@/components/espacios/CartaDelDia";
import { parsearMenuDiario, type MenuDelDia, type MenuDiarioRow } from "@/lib/menu-dia";
import { useTranslations } from "@/i18n/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

/**
 * Las dos promociones fijas del restaurante, con día y hora propios: el menú
 * de mediodía (martes a jueves) y las tapas de los jueves. Viven bajo la
 * rejilla de "Novedades" — más su sitio natural que "Nuestros espacios", que
 * va de fotos del local — como una franja horizontal ancha (icono, título y
 * descripción, botón), el mismo patrón que la tarjeta de Touza en Espacios,
 * para que destaquen como algo aparte de las tarjetas normales de encima.
 *
 * Cada tarjeta solo existe el día que toca: fuera de esos días no hay nada
 * que pulsar (antes se veía igual pero deshabilitada, con un texto tipo
 * "Vuelve el jueves" — confuso el resto de la semana, cuando ni siquiera hay
 * tapas que mostrar). Los jueves, cuando coinciden las dos, van una debajo de
 * la otra — nunca en la misma fila: cada una es una franja a todo lo ancho.
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
      <div className="space-y-6 mb-12">
        {isMenuDayToday && (
          <Card className="overflow-hidden border border-border/60 shadow-lg bg-gradient-to-br from-background via-muted/40 to-background">
            <CardContent className="flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:items-center sm:gap-6 sm:p-8 sm:text-left">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/15">
                <ChefHat className="h-7 w-7 text-accent" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h3 className="font-libre-baskerville text-xl font-bold text-primary sm:text-2xl">
                    {t.espacios.middayMenuTitle}
                  </h3>
                  <Badge className="bg-accent hover:bg-accent/90">{menuDaysLabel}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{t.espacios.middayMenuDescription}</p>
              </div>
              <Button
                size="lg"
                className="w-full shrink-0 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-lg transition-transform duration-300 hover:scale-105 sm:w-auto"
                onClick={() => setShowTodayMenu(true)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t.espacios.todayMenuCta}
              </Button>
            </CardContent>
          </Card>
        )}

        {isTapasDayToday && (
          <Card className="overflow-hidden border border-border/60 shadow-lg bg-gradient-to-br from-background via-muted/40 to-background">
            <CardContent className="flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:items-center sm:gap-6 sm:p-8 sm:text-left">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/15">
                <Clock className="h-7 w-7 text-accent" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h3 className="font-libre-baskerville text-xl font-bold text-primary sm:text-2xl">
                    {t.espacios.tapasTitle}
                  </h3>
                  <Badge className="bg-accent hover:bg-accent/90 capitalize">{tapasDayLabel}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{t.espacios.tapasDescription}</p>
              </div>
              <Button
                size="lg"
                className="w-full shrink-0 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-lg transition-transform duration-300 hover:scale-105 sm:w-auto"
                onClick={() => setShowTodayTapas(true)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t.espacios.todayTapasCta}
              </Button>
            </CardContent>
          </Card>
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
