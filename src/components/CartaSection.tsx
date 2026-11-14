import { useFiltrosCarta } from "@/hooks/useFiltrosCarta";
import MenuDietario from "@/components/carta/MenuDietario";
import { useState, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Wine, Beer, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getEdadVinosConfirmada, setEdadVinosConfirmada } from "@/utils/sessionManager";
import { useTranslations } from "@/i18n/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import type { Language } from "@/i18n/types";
import { CATEGORIA_INICIAL } from "@/lib/carta-ssg";
import { CATEGORIAS_CARTA, etiquetaCategoriaIdioma, rutaCategoria, type CategoriaCarta } from "@/lib/carta-rutas";
import { construirRutaIdioma } from "@/i18n/routing";
import { useMostrarCartaBebidas } from "@/hooks/useMostrarCartaBebidas";

// Mismos módulos que cargan las rutas `/carta/vinos` y `/carta/bebidas` (ver
// `App.tsx`): Vite dedupea por fichero resuelto, así que precargarlos aquí
// deja el chunk en caché del navegador para cuando `lazyRoute` lo pida de
// verdad al navegar. Si falla (pestaña con una versión antigua), no pasa nada
// aquí: lo trata `vite:preloadError` y, al navegar, la ruta (ver
// `lib/recarga-por-version`); sin `catch` saldría como promesa sin capturar.
const precargarPaginaVinos = () => {
  import("@/pages/carta/Vinos").catch(() => undefined);
};
const precargarPaginaBebidas = () => {
  import("@/pages/carta/Bebidas").catch(() => undefined);
};

/**
 * Las pocas etiquetas de esta sección no salen del diccionario de `t.` (son
 * agrupaciones puramente visuales: "Entrantes" y "Ensaladas" no son
 * categorías reales de la BD, sino la unión de varias — ver `GRUPOS` más
 * abajo). Igual que `getInfoLabels` en `CartaPlatos.tsx`: un mapa local, no
 * una clave nueva en los tres ficheros de idioma, para cadenas cortas que no
 * se usan en ningún otro sitio.
 */
const ETIQUETAS_PUENTE: Record<
  Language,
  {
    nav: string;
    entrantes: string;
    ensaladas: string;
    elige: string;
    snacks: string;
    calientes: string;
    frios: string;
    verde: string;
    salazones: string;
  }
> = {
  es: {
    nav: "Categorías de la carta",
    entrantes: "Entrantes",
    ensaladas: "Ensaladas",
    elige: "Elige un tipo",
    snacks: "Snacks",
    calientes: "Calientes",
    frios: "Fríos",
    verde: "Verde",
    salazones: "Salazones",
  },
  en: {
    nav: "Menu categories",
    entrantes: "Starters",
    ensaladas: "Salads",
    elige: "Choose a type",
    snacks: "Snacks",
    calientes: "Hot",
    frios: "Cold",
    verde: "Green",
    salazones: "Cured",
  },
  fr: {
    nav: "Catégories de la carte",
    entrantes: "Entrées",
    ensaladas: "Salades",
    elige: "Choisissez un type",
    snacks: "Snacks",
    calientes: "Chauds",
    frios: "Froids",
    verde: "Verte",
    salazones: "Salaisons",
  },
};

/**
 * Claves reales (columna `categoria` en Supabase) que forman cada grupo
 * visual, en el orden en que se listan sus pestañas. "Entrantes" y
 * "Ensaladas" no son categorías por sí mismas: son la unión de varias — ver
 * `CATEGORIAS_PLATOS` en `carta-ssg.ts` para las claves reales.
 */
const CLAVES_ENTRANTES = ["SNACK", "ENTRANTES CALIENTES", "ENTRANTES FRÍOS"] as const;
const CLAVES_ENSALADAS = ["ENSALADAS", "SALAZONES"] as const;

/** Categorías de una sola pestaña, en el orden en que se listan. */
const CLAVES_SIMPLES = ["ARROCES", "MARISCOS", "PESCADOS", "CARNES", "POSTRES"] as const;


const CartaSection = () => {
  const { conFiltros, totalCategoria } = useFiltrosCarta();
  const buscarCategoria = (clave: string): CategoriaCarta | undefined => {
    const categoria = CATEGORIAS_CARTA.find(item => item.clave === clave);
    return categoria ? { ...categoria, total: totalCategoria(clave) } : undefined;
  };
  const { t, language } = useTranslations();
  const { toast } = useToast();
  const navigate = useNavigate();
  const etiquetas = ETIQUETAS_PUENTE[language];
  const [showAgeDialog, setShowAgeDialog] = useState(false);

  const rutaVinos = conFiltros(construirRutaIdioma("/carta/vinos", language));
  const rutaBebidas = conFiltros(construirRutaIdioma("/carta/bebidas", language));
  const mostrarCartaBebidas = useMostrarCartaBebidas();

  const novedades = buscarCategoria(CATEGORIA_INICIAL);
  // Cada pestaña de un grupo se busca por separado: si a una categoría no le
  // queda ningún plato activo, `CATEGORIAS_CARTA` no la lista y su pestaña
  // desaparece sola, sin dejar un enlace roto ni un grupo vacío.
  const entrantes = CLAVES_ENTRANTES.map((clave, indice) => ({
    clave,
    etiqueta: [etiquetas.snacks, etiquetas.calientes, etiquetas.frios][indice],
    categoria: buscarCategoria(clave),
  })).filter(
    (item): item is typeof item & { categoria: CategoriaCarta } => Boolean(item.categoria),
  );
  const ensaladas = CLAVES_ENSALADAS.map((clave, indice) => ({
    clave,
    etiqueta: [etiquetas.verde, etiquetas.salazones][indice],
    categoria: buscarCategoria(clave),
  })).filter(
    (item): item is typeof item & { categoria: CategoriaCarta } => Boolean(item.categoria),
  );
  const simples = CLAVES_SIMPLES.map((clave) => buscarCategoria(clave)).filter(
    (categoria): categoria is CategoriaCarta => Boolean(categoria),
  );

  // Suma de las pestañas de cada grupo: "Entrantes" y "Ensaladas" no son
  // categorías reales con su propio recuento, así que se calcula sumando el
  // de las que sí lo son.
  const totalEntrantes = entrantes.reduce((suma, item) => suma + item.categoria.total, 0);
  const totalEnsaladas = ensaladas.reduce((suma, item) => suma + item.categoria.total, 0);

  // El botón "Carta de vinos" ya no navega directo: si el visitante no ha
  // confirmado su edad en esta sesión del navegador, primero se le pregunta
  // aquí mismo y solo se le lleva a `/carta/vinos` si responde que sí. Si ya
  // lo confirmó antes (p. ej. entrando antes a esa página), se le deja pasar
  // sin volver a preguntar.
  const handleVinosClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (getEdadVinosConfirmada()) {
      navigate(rutaVinos);
      return;
    }
    setShowAgeDialog(true);
  };

  const handleAgeConfirm = (adult: boolean) => {
    setShowAgeDialog(false);
    if (adult) {
      setEdadVinosConfirmada();
      navigate(rutaVinos);
    } else {
      toast({
        title: t.vinos.ageCheckTitle,
        description: t.vinos.ageCheckBlocked,
        variant: "destructive",
      });
    }
  };

  const filaClass = "py-4 border-b border-border/70 last:border-b-0";
  const filaEnlaceClass = `${filaClass} flex items-baseline justify-between gap-4`;
  const filaBotonClass = `${filaClass} flex items-center justify-between gap-4 w-full text-left`;
  const nombreClass =
    "font-libre-baskerville text-lg sm:text-xl text-foreground transition-colors group-hover:text-accent";
  const contadorClass = "text-sm text-muted-foreground shrink-0";
  const opcionClass =
    "flex items-center justify-between gap-4 rounded-xl border border-border/70 px-4 py-3 font-libre-baskerville text-base text-foreground transition-colors hover:border-accent hover:text-accent";

  return (
    <section id="carta" className="py-20 px-4 md:px-8 lg:px-16 bg-gradient-to-b from-background to-muted">
      <div
        className="max-w-7xl mx-auto"
      >
        {/* Sin subtítulo: el título y la línea bajo él ya bastan para
            encabezar la lista de categorías que sigue. */}
        <div className="text-center mb-12">
          <h2 className="font-libre-baskerville text-4xl md:text-5xl font-bold text-primary">{t.carta.title}</h2>
          <div className="w-12 h-px bg-primary/50 mx-auto mt-5" aria-hidden="true" />
        </div>

        {/* Cada categoría es un enlace real a su propia página
            (`/carta/<slug>`, ya prerenderizada con su buscador y filtros):
            esto no es un acordeón que abre contenido aquí mismo, es
            navegación de verdad, igual que ya hacen vinos y bebidas.

            "Entrantes" y "Ensaladas" no son categorías reales —no hay una
            página que las represente—, así que su fila abre un diálogo con
            sus pestañas reales para elegir una y entrar. Esos enlaces NO
            están en el HTML del SSG hasta que se abre el diálogo (un
            `Dialog` de Radix no se renderiza en Node), pero eso no dificulta
            encontrarlos: `/carta` y el `sitemap.xml` ya enlazan a cada
            categoría por su cuenta, esta lista no es su única puerta de
            entrada. */}
        <MenuDietario>
        <nav aria-label={etiquetas.nav} className="max-w-2xl mx-auto mb-12">
          {novedades && (
            <Link to={conFiltros(rutaCategoria(novedades.slug, language))} className={`${filaEnlaceClass} group`}>
              <span className={nombreClass}>{etiquetaCategoriaIdioma(novedades.clave, language)}</span>
              <span className={contadorClass}>{novedades.total}</span>
            </Link>
          )}

          {entrantes.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" className={filaBotonClass}>
                  <span className={nombreClass}>{etiquetas.entrantes}</span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className={contadorClass}>{totalEntrantes}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{etiquetas.entrantes}</DialogTitle>
                  <DialogDescription>{etiquetas.elige}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2.5 pt-2">
                  {entrantes.map((item) => (
                    <Link key={item.clave} to={conFiltros(rutaCategoria(item.categoria.slug, language))} className={opcionClass}>
                      <span>{item.etiqueta}</span>
                      <span className={contadorClass}>{item.categoria.total}</span>
                    </Link>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}

          {ensaladas.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" className={filaBotonClass}>
                  <span className={nombreClass}>{etiquetas.ensaladas}</span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className={contadorClass}>{totalEnsaladas}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{etiquetas.ensaladas}</DialogTitle>
                  <DialogDescription>{etiquetas.elige}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2.5 pt-2">
                  {ensaladas.map((item) => (
                    <Link key={item.clave} to={conFiltros(rutaCategoria(item.categoria.slug, language))} className={opcionClass}>
                      <span>{item.etiqueta}</span>
                      <span className={contadorClass}>{item.categoria.total}</span>
                    </Link>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}

          {simples.map((categoria) => (
            <Link key={categoria.slug} to={conFiltros(rutaCategoria(categoria.slug, language))} className={`${filaEnlaceClass} group`}>
              <span className={nombreClass}>{etiquetaCategoriaIdioma(categoria.clave, language)}</span>
              <span className={contadorClass}>{categoria.total}</span>
            </Link>
          ))}
        </nav>
        </MenuDietario>

        {/* Sin la carta de Bebidas (apagada en el panel), «Carta de vinos» va sola y centrada. */}
        <div className={`grid gap-3 w-full mx-auto ${mostrarCartaBebidas ? "grid-cols-2 max-w-2xl" : "grid-cols-1 max-w-xs"}`}>
          {/* La carta de vinos ya no se despliega aquí: tiene su propia
              página (`/carta/vinos`), con el mismo buscador/mapa/pedido
              pero con los vinos ya en el HTML del SSG en vez de a la
              espera de Supabase.
              `onMouseEnter`/`onFocus`/`onTouchStart` precargan el chunk de
              esa página antes del click (al pasar el cursor, al llegar
              por teclado, o al tocarlo en móvil): para cuando el usuario
              suelta el clic, el código ya está en caché y la navegación
              se siente instantánea en vez de esperar la descarga.
              Sigue siendo un `<Link>` de verdad (con su `href`) para que
              se pueda rastrear/abrir en pestaña nueva, pero `onClick` frena
              la navegación con `preventDefault` hasta que se responda al
              diálogo de edad — así no se llega a `/carta/vinos` antes de
              pulsar. */}
          <Button
            asChild
            size="lg"
            onMouseEnter={precargarPaginaVinos}
            onFocus={precargarPaginaVinos}
            onTouchStart={precargarPaginaVinos}
            className="h-auto min-h-11 whitespace-normal py-2 text-center leading-tight px-2 sm:h-11 sm:whitespace-nowrap sm:px-4 sm:py-6 text-sm sm:text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Link to={rutaVinos} onClick={handleVinosClick}>
              <Wine className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" />
              {t.carta.buttons.vinos}
            </Link>
          </Button>
          {/* Misma lógica que "Carta de vinos": página propia
              (`/carta/bebidas`) con el mismo buscador/filtro/pedido, y
              precarga del chunk al pasar el cursor/tocar/llegar por
              teclado para que la navegación se sienta instantánea. */}
          {/* Carta de Bebidas solo si está encendida en el panel (11/11/2026: apagada por defecto). */}
          {mostrarCartaBebidas && (
            <Button
              asChild
              size="lg"
              onMouseEnter={precargarPaginaBebidas}
              onFocus={precargarPaginaBebidas}
              onTouchStart={precargarPaginaBebidas}
              className="h-auto min-h-11 whitespace-normal py-2 text-center leading-tight px-2 sm:h-11 sm:whitespace-nowrap sm:px-4 sm:py-6 text-sm sm:text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 bg-secondary hover:bg-secondary-hover text-secondary-foreground"
            >
              <Link to={rutaBebidas}>
                <Beer className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" />
                {t.carta.buttons.bebidas}
              </Link>
            </Button>
          )}
        </div>

        {/* El botón flotante del ticket ya no se monta aquí: lo pone
            `FloatingActions` (en el `Layout`) para todo el sitio, también en
            `/carta/:categoria`, `/carta/vinos` y `/carta/bebidas`. */}
      </div>

      {/* Verificación de edad antes de entrar a "Carta de vinos": solo se
          cierra pulsando uno de los dos botones (sin clic fuera, sin Escape,
          sin "X") para que la navegación a `/carta/vinos` no pueda saltársela. */}
      <Dialog open={showAgeDialog} onOpenChange={() => {}}>
        <DialogContent
          hideCloseButton
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-balance break-words leading-tight">
              <AlertCircle className="w-6 h-6 text-accent" aria-hidden="true" />
              {t.vinos.ageCheckTitle}
            </DialogTitle>
            <DialogDescription>{t.vinos.ageCheckDescription}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 justify-center pt-4">
            <Button onClick={() => handleAgeConfirm(true)} className="bg-accent hover:bg-accent-hover">
              {t.vinos.ageCheckConfirm}
            </Button>
            <Button variant="outline" onClick={() => handleAgeConfirm(false)}>
              {t.vinos.ageCheckDecline}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default CartaSection;

