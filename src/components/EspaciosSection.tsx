import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { compareDesc, format, isSameDay } from "date-fns";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Camera, ChefHat, Clock, ExternalLink, Home, Sparkles, Star, TreePine, Utensils, Wine } from "lucide-react";

import carnePlato from "@/assets/carne-plato.png";
import pulpoPlato from "@/assets/pulpo-plato.jpg";
import vinosMarques from "@/assets/vinos-marqués.jpeg";
import { useTranslations } from "@/i18n/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EspaciosSection = () => {
  const { t, dateLocale } = useTranslations();
  const [selectedEspacio, setSelectedEspacio] = useState<number | null>(null);
  const [showTodayMenu, setShowTodayMenu] = useState(false);
  const [showTodayTapas, setShowTodayTapas] = useState(false);
  const [showPastMenus, setShowPastMenus] = useState(false);
  const [showPastTapas, setShowPastTapas] = useState(false);
  const [menusCarouselApi, setMenusCarouselApi] = useState<CarouselApi | null>(null);
  const [tapasCarouselApi, setTapasCarouselApi] = useState<CarouselApi | null>(null);
  const [menuSlide, setMenuSlide] = useState(0);
  const [tapasSlide, setTapasSlide] = useState(0);

  const menusDelDia = t.espacios.menus;
  const tapasSemanales = t.espacios.tapas;

  const sortedMenus = [...menusDelDia].sort((a, b) => compareDesc(a.date, b.date));
  const sortedTapas = [...tapasSemanales].sort((a, b) => compareDesc(a.date, b.date));
  const recentMenus = sortedMenus.slice(0, 3);
  const recentTapas = sortedTapas.slice(0, 3);

  useEffect(() => {
    if (!menusCarouselApi) return;
    const onSelect = () => setMenuSlide(menusCarouselApi.selectedScrollSnap());
    menusCarouselApi.on("select", onSelect);
    menusCarouselApi.on("reInit", onSelect);
    onSelect();
    return () => {
      menusCarouselApi.off("select", onSelect);
      menusCarouselApi.off("reInit", onSelect);
    };
  }, [menusCarouselApi]);

  useEffect(() => {
    if (!tapasCarouselApi) return;
    const onSelect = () => setTapasSlide(tapasCarouselApi.selectedScrollSnap());
    tapasCarouselApi.on("select", onSelect);
    tapasCarouselApi.on("reInit", onSelect);
    onSelect();
    return () => {
      tapasCarouselApi.off("select", onSelect);
      tapasCarouselApi.off("reInit", onSelect);
    };
  }, [tapasCarouselApi]);

  const today = new Date();
  const todayDay = today.getDay();
  const isMenuDayToday = todayDay >= 2 && todayDay <= 4;
  const isTapasDayToday = todayDay === 4;

  const todayMenuMatch = sortedMenus.find((menu) => isSameDay(menu.date, today));
  const todayTapasMatch = sortedTapas.find((tapas) => isSameDay(tapas.date, today));

  const todayMenu = sortedMenus.length ? todayMenuMatch ?? sortedMenus[0] : null;
  const todayTapas = sortedTapas.length ? todayTapasMatch ?? sortedTapas[0] : null;

  const menuFallbackActive = Boolean(todayMenu) && !todayMenuMatch;
  const tapasFallbackActive = Boolean(todayTapas) && !todayTapasMatch;

  const menuDaysLabel = `${format(new Date(2025, 0, 21), "EEE", { locale: dateLocale })} - ${format(new Date(2025, 0, 23), "EEE", { locale: dateLocale })}`;
  const tapasDayLabel = format(new Date(2025, 0, 23), "EEE", { locale: dateLocale });

  const espacios = t.espacios.cards.map((card, index) => ({
    ...card,
    icon: index === 0 ? Home : index === 1 ? Utensils : index === 2 ? TreePine : Wine,
    hasGallery: index !== 3,
    images:
      index === 0
        ? [carnePlato, pulpoPlato, vinosMarques]
        : index === 1
          ? [pulpoPlato, vinosMarques, carnePlato]
          : index === 2
            ? [vinosMarques, carnePlato, pulpoPlato]
            : undefined,
    link: index === 3 ? "/touza-cocktail" : undefined,
  }));

  return (
    <section id="espacios" className="py-20 px-4 md:px-8 lg:px-16 bg-gradient-to-b from-muted to-background">
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
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-4"
          >
            {t.espacios.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            {t.espacios.subtitle}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {espacios.map((espacio, index) => {
            const Icon = espacio.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
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
                    {espacio.hasGallery ? (
                      <Button
                        variant="default"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        onClick={() => setSelectedEspacio(index)}
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        {t.espacios.galleryButton}
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        asChild
                      >
                        <Link to={espacio.link || "#"}>
                          <ExternalLink className="w-5 h-5 mr-2" />
                          {t.espacios.visitTouza}
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <Card className="relative overflow-hidden border border-border/60 shadow-lg bg-gradient-to-br from-slate-900/20 via-slate-800/15 to-amber-100/25">
            <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.14),transparent_40%)]" />
            <CardHeader className="relative pb-3">
              <div className="absolute right-3 top-3">
                <Badge variant="secondary" className="text-[11px] sm:text-xs bg-white text-primary border border-border/60 shadow-sm">
                  {menuDaysLabel}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary shadow-inner">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg">{t.espacios.middayMenuTitle}</CardTitle>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t.espacios.middayMenuDescription}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <div className="flex flex-col gap-3 sm:items-start">
                <Button
                  className="w-full h-auto min-h-11 px-4 py-3 text-sm sm:text-base leading-snug whitespace-normal bg-gradient-to-r from-primary via-accent to-primary/80 text-primary-foreground shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all"
                  onClick={() => setShowTodayMenu(true)}
                  disabled={!isMenuDayToday}
                >
                  <Sparkles className="w-4 h-4" />
                  {isMenuDayToday ? t.espacios.todayMenuCta : t.espacios.menuAvailableDays}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border border-border/60 shadow-lg bg-gradient-to-br from-slate-900/20 via-slate-800/15 to-amber-100/25">
            <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.14),transparent_40%)]" />
            <CardHeader className="relative pb-3">
              <div className="absolute right-3 top-3">
                <Badge variant="secondary" className="text-[11px] sm:text-xs bg-white text-primary border border-border/60 shadow-sm capitalize">
                  {tapasDayLabel}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary shadow-inner">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg">{t.espacios.tapasTitle}</CardTitle>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t.espacios.tapasDescription}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <div className="flex flex-col gap-3 sm:items-start">
                <Button
                  className="w-full h-auto min-h-11 px-4 py-3 text-sm sm:text-base leading-snug whitespace-normal bg-gradient-to-r from-primary via-primary/80 to-accent text-primary-foreground shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all"
                  onClick={() => setShowTodayTapas(true)}
                  disabled={!isTapasDayToday}
                >
                  <Sparkles className="w-4 h-4" />
                  {isTapasDayToday ? t.espacios.todayTapasCta : t.espacios.tapasAvailableDay}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Dialog open={selectedEspacio !== null} onOpenChange={() => setSelectedEspacio(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedEspacio !== null ? espacios[selectedEspacio].title : ""}</DialogTitle>
            </DialogHeader>
            {selectedEspacio !== null && espacios[selectedEspacio].images && (
              <Carousel className="w-full">
                <CarouselContent>
                  {espacios[selectedEspacio].images.map((image, idx) => (
                    <CarouselItem key={idx}>
                      <div className="p-1">
                        <img
                          src={image}
                          alt={`${espacios[selectedEspacio].title} ${idx + 1}`}
                          className="w-full h-[250px] md:h-[400px] object-cover rounded-lg"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex" />
                <CarouselNext className="hidden md:flex" />
              </Carousel>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showTodayMenu} onOpenChange={setShowTodayMenu}>
          <DialogContent className="w-[90vw] sm:max-w-2xl md:max-w-3xl rounded-2xl border border-border/70 bg-gradient-to-b from-background via-muted/40 to-background p-4 sm:p-6">
            <DialogHeader className="space-y-2 items-center text-center">
              <DialogTitle className="flex items-center gap-2 text-xl leading-tight text-center">
                <ChefHat className="w-5 h-5 text-primary" />
                {t.espacios.todayMenuTitle}
              </DialogTitle>
              {todayMenu && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground capitalize">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  {format(todayMenu.date, "EEEE d MMMM", { locale: dateLocale })}
                </p>
              )}
            </DialogHeader>
            {todayMenu ? (
              <div className="space-y-4">
                <Card className="border border-border/70 bg-background/80 shadow-inner">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl bg-muted/40 p-4 border border-border/60">
                        <h4 className="font-semibold text-primary mb-2">{t.espacios.menuLabels.starters}</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {todayMenu.primeros.map((plato, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-primary">•</span>
                              <span>{plato}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-xl bg-muted/40 p-4 border border-border/60">
                        <h4 className="font-semibold text-primary mb-2">{t.espacios.menuLabels.mains}</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {todayMenu.segundos.map((plato, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-primary">•</span>
                              <span>{plato}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-xl bg-muted/40 p-4 border border-border/60 flex flex-col justify-between">
                        <div>
                          <h4 className="font-semibold text-primary mb-2">{t.espacios.menuLabels.dessert}</h4>
                          <p className="text-sm text-muted-foreground">• {todayMenu.postre}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 bg-muted/30 p-6 text-center text-muted-foreground">
                {t.espacios.noMenuToday}
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
              {todayTapas && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground capitalize">
                  <CalendarDays className="w-4 h-4 text-primary" />
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

        <Dialog open={showPastMenus} onOpenChange={setShowPastMenus}>
          <DialogContent className="w-[95vw] sm:max-w-4xl p-2 sm:p-6 bg-gradient-to-b from-background via-muted/40 to-background text-center">
            <DialogHeader className="items-center text-center">
              <DialogTitle>{t.espacios.menusDialogTitle}</DialogTitle>
            </DialogHeader>
            <p className="md:hidden text-xs text-muted-foreground mb-2 px-2 text-center break-words">
              ← {t.espacios.swipeHint} →
            </p>
            <Carousel className="w-full px-1 sm:px-0" opts={{ align: "center", loop: true, dragFree: true }} setApi={setMenusCarouselApi}>
              <CarouselContent className="-ml-2 sm:-ml-5 py-2">
                {recentMenus.map((menu, idx) => (
                  <CarouselItem key={idx} className="pl-2 sm:pl-5 basis-[85%] sm:basis-[48%] lg:basis-[32%]">
                    <Card className="relative h-full overflow-hidden border border-border/60 bg-gradient-to-br from-primary/10 via-background to-accent/10 max-w-full mx-auto">
                      <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.14),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(217,70,239,0.12),transparent_35%)]" />
                      <div className="relative h-full p-2.5 sm:p-4 flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-center sm:text-left">
                          <div className="flex items-center gap-3 sm:justify-start justify-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary">
                              <ChefHat className="w-4 h-4" />
                            </span>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-primary">{t.espacios.middayMenuTitle}</p>
                              <p className="font-semibold capitalize leading-tight">
                                <span className="hidden sm:inline">
                                  {format(menu.date, "EEEE d MMMM", { locale: dateLocale })}
                                </span>
                                <span className="sm:hidden">
                                  {format(menu.date, "EEE d MMM", { locale: dateLocale })}
                                </span>
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-background/70 text-foreground border border-border/70">
                            {format(menu.date, "dd MMM", { locale: dateLocale })}
                          </Badge>
                        </div>
                        <div className="grid gap-2">
                          <div className="rounded-lg bg-background/60 border border-border/40 p-2.5 sm:p-3">
                            <h4 className="font-semibold text-primary mb-1 text-sm sm:text-base text-center sm:text-left">{t.espacios.menuLabels.starters}</h4>
                            <ul className="text-xs sm:text-sm text-muted-foreground space-y-0.5 text-center sm:text-left">
                              {menu.primeros.map((plato, i) => (
                                <li key={i} className="flex gap-2 items-start">
                                  <span className="text-primary">•</span>
                                  <span>{plato}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-lg bg-background/60 border border-border/40 p-2.5 sm:p-3">
                            <h4 className="font-semibold text-primary mb-1 text-sm sm:text-base text-center sm:text-left">{t.espacios.menuLabels.mains}</h4>
                            <ul className="text-xs sm:text-sm text-muted-foreground space-y-0.5 text-center sm:text-left">
                              {menu.segundos.map((plato, i) => (
                                <li key={i} className="flex gap-2 items-start">
                                  <span className="text-primary">•</span>
                                  <span>{plato}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-lg bg-background/60 border border-border/40 p-2.5 sm:p-3 text-center sm:text-left">
                            <h4 className="font-semibold text-primary mb-1 text-sm sm:text-base">{t.espacios.menuLabels.dessert}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">• {menu.postre}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex border border-border/70 bg-background/80 text-primary hover:bg-background" aria-label="Anterior" />
              <CarouselNext className="hidden sm:flex border border-border/70 bg-background/80 text-primary hover:bg-background" aria-label="Siguiente" />
            </Carousel>
            <div className="mt-3 flex justify-center gap-2 sm:hidden">
              {recentMenus.map((_, idx) => (
                <button
                  key={idx}
                  className={`h-3 w-3 rounded-full transition ${menuSlide === idx ? "bg-primary" : "bg-border/80"}`}
                  aria-label={`Ir al menú ${idx + 1}`}
                  onClick={() => menusCarouselApi?.scrollTo(idx)}
                />
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showPastTapas} onOpenChange={setShowPastTapas}>
          <DialogContent className="w-[95vw] sm:max-w-4xl p-2 sm:p-6 bg-gradient-to-b from-background via-muted/40 to-background text-center">
            <DialogHeader className="items-center text-center">
              <DialogTitle>{t.espacios.tapasDialogTitle}</DialogTitle>
            </DialogHeader>
            <p className="md:hidden text-xs text-muted-foreground mb-2 px-2 text-center break-words">
              ← {t.espacios.swipeHint} →
            </p>
            <Carousel className="w-full px-1 sm:px-0" opts={{ align: "center", loop: true, dragFree: true }} setApi={setTapasCarouselApi}>
              <CarouselContent className="-ml-2 sm:-ml-5 py-2">
                {recentTapas.map((semana, idx) => (
                  <CarouselItem key={idx} className="pl-2 sm:pl-5 basis-[85%] sm:basis-[48%] lg:basis-[32%]">
                    <Card className="relative h-full overflow-hidden border border-border/60 bg-gradient-to-br from-primary/10 via-background to-accent/10 max-w-full mx-auto">
                      <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.14),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.12),transparent_35%)]" />
                      <div className="relative h-full p-2.5 sm:p-4 flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-center sm:text-left">
                          <div className="flex items-center gap-3 sm:justify-start justify-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary">
                              <Clock className="w-4 h-4" />
                            </span>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-primary">{t.espacios.tapasTitle}</p>
                              <p className="font-semibold capitalize leading-tight">
                                <span className="hidden sm:inline">
                                  {format(semana.date, "EEEE d MMMM", { locale: dateLocale })}
                                </span>
                                <span className="sm:hidden">
                                  {format(semana.date, "EEE d MMM", { locale: dateLocale })}
                                </span>
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-background/70 text-foreground border border-border/70">
                            {format(semana.date, "dd MMM", { locale: dateLocale })}
                          </Badge>
                        </div>
                        <div className="rounded-lg bg-background/60 border border-border/40 p-2.5 sm:p-3">
                          <h4 className="font-semibold text-primary mb-1 text-sm sm:text-base text-center sm:text-left">{t.espacios.menuLabels.tapasOfDay}</h4>
                          <ul className="text-xs sm:text-sm text-muted-foreground space-y-0.5 text-center sm:text-left">
                            {semana.tapas.map((tapa, i) => (
                              <li key={i} className="flex gap-2 items-start">
                                <span className="text-primary">•</span>
                                <span>{tapa}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex border border-border/70 bg-background/80 text-primary hover:bg-background" aria-label="Anterior" />
              <CarouselNext className="hidden sm:flex border border-border/70 bg-background/80 text-primary hover:bg-background" aria-label="Siguiente" />
            </Carousel>
            <div className="mt-3 flex justify-center gap-2 sm:hidden">
              {recentTapas.map((_, idx) => (
                <button
                  key={idx}
                  className={`h-3 w-3 rounded-full transition ${tapasSlide === idx ? "bg-primary" : "bg-border/80"}`}
                  aria-label={`Ir a las tapas ${idx + 1}`}
                  onClick={() => tapasCarouselApi?.scrollTo(idx)}
                />
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </section>
  );
};

export default EspaciosSection;
