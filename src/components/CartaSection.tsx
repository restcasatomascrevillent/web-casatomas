import { motion } from "framer-motion";
import { useState, useEffect, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Wine, Beer, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getEdadVinosConfirmada, setEdadVinosConfirmada } from "@/utils/sessionManager";
import { useTranslations } from "@/i18n/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import type { Language } from "@/i18n/types";
// Import estático a propósito: `CartaPlatos` se monta siempre (ver abajo) y el
// SSG tiene que poder renderizarlo para que sus tarjetas queden en el HTML.
import CartaPlatos from "./carta/CartaPlatos";
import { semillaCategoriaInicial } from "@/lib/carta-ssg";
import { CATEGORIAS_CARTA, etiquetaCategoriaIdioma, rutaCategoria } from "@/lib/carta-rutas";
import { construirRutaIdioma } from "@/i18n/routing";
import type { CartaPlatosSeed } from "./carta/CartaPlatos";

type Section = "platos" | null;

// Mismos módulos que cargan las rutas `/carta/vinos` y `/carta/bebidas` (ver
// `App.tsx`): Vite dedupea por fichero resuelto, así que precargarlos aquí
// deja el chunk en caché del navegador para cuando `lazyRoute` lo pida de
// verdad al navegar.
const precargarPaginaVinos = () => {
  import("@/pages/carta/Vinos");
};
const precargarPaginaBebidas = () => {
  import("@/pages/carta/Bebidas");
};

// La carta que descargó el build. Se calcula una sola vez por módulo: es un
// valor estático, idéntico en Node y en el navegador.
const PLATOS_SSG = semillaCategoriaInicial() as CartaPlatosSeed;

/**
 * Las pocas etiquetas de esta sección no salían del diccionario de `t.` (se
 * escribieron sueltas en castellano). Igual que `getInfoLabels` en
 * `CartaPlatos.tsx`: un mapa local, no una clave nueva en los tres ficheros
 * de idioma, para dos cadenas cortas que no se usan en ningún otro sitio.
 */
const ETIQUETAS_PUENTE: Record<Language, { verCarta: string; nav: string }> = {
  es: { verCarta: "Ver la carta completa", nav: "Páginas de la carta" },
  en: { verCarta: "See the full menu", nav: "Menu pages" },
  fr: { verCarta: "Voir la carte complète", nav: "Pages de la carte" },
};

const CartaSection = () => {
  const { t, language } = useTranslations();
  const { toast } = useToast();
  const navigate = useNavigate();
  const etiquetas = ETIQUETAS_PUENTE[language];
  const [activeSection, setActiveSection] = useState<Section>(null);
  const [showAgeDialog, setShowAgeDialog] = useState(false);

  const rutaVinos = construirRutaIdioma("/carta/vinos", language);
  const rutaBebidas = construirRutaIdioma("/carta/bebidas", language);

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

  // Precarga en segundo plano, sin bloquear nada: el SDK de Supabase se
  // importa de forma perezosa (ver CartaPlatos) para no entrar en la carga
  // inicial, pero así ya está en caché del navegador cuando el visitante
  // abra "Carta de platos" en vez de tener que descargarlo justo en ese
  // click.
  useEffect(() => {
    const idle = "requestIdleCallback" in window ? window.requestIdleCallback : (cb: () => void) => setTimeout(cb, 1500);
    const cancelIdle = "cancelIdleCallback" in window ? window.cancelIdleCallback : clearTimeout;
    const id = idle(() => {
      import("@/integrations/supabase/client");
    });
    return () => cancelIdle(id as number);
  }, []);

  return (
    <section id="carta" className="py-20 px-4 md:px-8 lg:px-16 bg-gradient-to-b from-background to-muted">
      <motion.div
        initial={false}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="max-w-7xl mx-auto"
      >
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">{t.carta.title}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.carta.subtitle}
          </p>
        </div>

        {/* "Ver la carta completa" abre aquí mismo el buscador de platos (el
            mismo componente y datos que antes destapaba "Carta de platos",
            solo que reetiquetado y sin el contador de referencias). Debajo,
            las categorías de platos como acceso directo a cada una por
            separado, y al final vinos/bebidas con su propio color cada
            uno para diferenciarlos a simple vista. */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="flex justify-center mb-8">
            <Button
              size="lg"
              onClick={() => setActiveSection(activeSection === "platos" ? null : "platos")}
              className={`w-full sm:w-auto px-8 py-6 text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 ${
                activeSection === "platos"
                  ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                  : "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              }`}
            >
              <UtensilsCrossed className="w-5 h-5 mr-2 shrink-0" />
              {etiquetas.verCarta}
            </Button>
          </div>

          <nav aria-label={etiquetas.nav} className="rounded-2xl border border-border/60 bg-background/60 p-4 sm:p-5 mb-8">
            <ul className="flex flex-wrap items-center justify-center gap-2.5">
              {CATEGORIAS_CARTA.map((categoria) => (
                <li key={categoria.slug}>
                  <Link
                    to={rutaCategoria(categoria.slug, language)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3.5 py-2 text-sm text-muted-foreground shadow-sm transition-all duration-200 hover:border-accent hover:text-foreground hover:shadow-md hover:-translate-y-0.5"
                  >
                    {etiquetaCategoriaIdioma(categoria.clave, language)}
                    <span className="text-xs font-semibold text-accent">{categoria.total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid grid-cols-2 gap-3 w-full">
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
              className="px-2 sm:px-4 py-5 sm:py-6 text-sm sm:text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 bg-primary hover:bg-primary/90 text-primary-foreground"
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
            <Button
              asChild
              size="lg"
              onMouseEnter={precargarPaginaBebidas}
              onFocus={precargarPaginaBebidas}
              onTouchStart={precargarPaginaBebidas}
              className="px-2 sm:px-4 py-5 sm:py-6 text-sm sm:text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              <Link to={rutaBebidas}>
                <Beer className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" />
                {t.carta.buttons.bebidas}
              </Link>
            </Button>
          </div>
        </div>

        {/* Contenido de las secciones */}

        {/* Los platos se montan SIEMPRE y se ocultan con `hidden` hasta que se
            abre la sección. Así el HTML que sirve Vercel trae ya las tarjetas
            reales y son EXACTAMENTE los mismos nodos que destapa el botón: no
            hay una copia aparte para el buscador. `initialPlatos` viene del
            build, por lo que al abrir no hay parpadeo de carga. */}
        <div hidden={activeSection !== "platos"}>
          <motion.div
            initial={false}
            animate={activeSection === "platos" ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
          >
            <CartaPlatos
              showAddButton
              active={activeSection === "platos"}
              initialPlatos={PLATOS_SSG}
            />
          </motion.div>
        </div>

        {/* Las bebidas ya no se despliegan aquí: tienen su propia página
            (`/carta/bebidas`), igual que los vinos. */}
        {/* El botón flotante del ticket ya no se monta aquí: lo pone
            `FloatingActions` (en el `Layout`) para todo el sitio, también en
            `/carta/:categoria`, `/carta/vinos` y `/carta/bebidas`. */}

      </motion.div>

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
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-accent" aria-hidden="true" />
              {t.vinos.ageCheckTitle}
            </DialogTitle>
            <DialogDescription>{t.vinos.ageCheckDescription}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 justify-center pt-4">
            <Button onClick={() => handleAgeConfirm(true)} className="bg-accent hover:bg-accent/90">
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
