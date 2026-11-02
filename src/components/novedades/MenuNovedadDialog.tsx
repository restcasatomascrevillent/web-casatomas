import { useState, type ReactNode } from "react";
import { X } from "lucide-react";

import CartaDelDia, { CLASES_TITULO_CARTA, type SeccionExtraCarta } from "@/components/espacios/CartaDelDia";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCerrarConAtras } from "@/hooks/useCerrarConAtras";
import { useTranslations } from "@/i18n/LanguageProvider";
import type { MenuNovedad, PosicionSeccionExtra } from "@/lib/menu-novedad";
import { cn } from "@/lib/utils";

interface MenuNovedadDialogProps {
  /** Título de la novedad, ya en el idioma del visitante. */
  titulo: string;
  menu: MenuNovedad;
  /** El botón que lo abre. Va como `DialogTrigger` para que, al cerrar, el foco vuelva a él. */
  children: ReactNode;
}

/**
 * Menú anunciado en una novedad (p. ej. un menú de Navidad), con la misma
 * carta impresa y el mismo diálogo que el menú del día (`MenuDiarioCards`):
 * casi a todo el ancho en móvil con scroll por dentro, centrado en escritorio,
 * y con la X siempre a la vista aunque el menú sea largo.
 * Se cierra con la X, con Esc o pulsando fuera (lo da Radix), y también con
 * «atrás» del navegador o el gesto de atrás del móvil (`useCerrarConAtras`):
 * antes ese «atrás» salía de la portada con el diálogo abierto.
 *
 * Un menú con maridaje pinta la bebida bajo cada plato; una cata no tiene
 * platos y enseña solo la sección «Cata» con sus bebidas en orden.
 */
const MenuNovedadDialog = ({ titulo, menu, children }: MenuNovedadDialogProps) => {
  const { t } = useTranslations();
  const [abierto, setAbierto] = useState(false);
  useCerrarConAtras(abierto, () => setAbierto(false), "menuNovedad");
  const textos = t.novedades.botones;
  const seccionesExtra: SeccionExtraCarta[] =
    menu.tipo === "cata"
      ? [{ clave: "cata", titulo: textos.cata, lineas: menu.cata }]
      : [{ clave: "bebidas", titulo: menu.titulos?.bebidas ?? textos.bebidas, items: menu.bebidas }];
  // Secciones con nombre libre (Aperitivo, Prepostre…), cada una en su sitio.
  const seccionesIntercaladas: Partial<Record<PosicionSeccionExtra, SeccionExtraCarta[]>> = {};
  for (const extra of menu.extras ?? []) {
    (seccionesIntercaladas[extra.posicion] ??= []).push({ clave: extra.id, titulo: extra.titulo, items: extra.items });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      {/* Sin descripción: el diálogo lo nombra su título y el contenido es la carta. */}
      {/* El scroll es del propio `DialogContent` (`overflow-y-auto`); el relleno
          va dentro, en el envoltorio de la carta, para que la X pueda pegarse
          al borde de arriba sin que el relleno la deje caer. */}
      <DialogContent
        hideCloseButton
        aria-describedby={undefined}
        className="w-[92vw] sm:max-w-lg max-h-[88vh] gap-0 overflow-y-auto rounded-2xl border border-border/60 bg-ticket-tray p-0"
      >
        {/* `[overflow-wrap:anywhere]`: una palabra muy larga sin espacios se
            parte en vez de ensanchar el diálogo. */}
        <div className="p-3 [overflow-wrap:anywhere] sm:p-5">
          <CartaDelDia
            menu={menu}
            // `px-8`: el título va centrado y la X ocupa la esquina; sin este
            // margen un título largo se metería debajo de ella.
            titulo={<DialogTitle className={cn(CLASES_TITULO_CARTA, "px-8")}>{titulo}</DialogTitle>}
            seccionesExtra={seccionesExtra}
            seccionesIntercaladas={seccionesIntercaladas}
            maridajes={menu.maridajes}
            titulosSecciones={menu.titulos}
          />
        </div>
        {/* La X se queda a la vista mientras se desplaza un menú largo: va en
            una franja `sticky` de alto 0 que `order-first` sube a la primera
            fila de la rejilla (sin moverla en el DOM, así que sigue siendo la
            última del orden de tabulación, como en el menú del día). Al estar
            dentro del contenedor que se desplaza, las flechas y AvPág siguen
            moviendo el menú con el foco en ella. Mide 44 px, como el resto de
            botones (la X del `DialogContent`, 40). */}
        <div className="pointer-events-none sticky top-0 z-10 order-first h-0">
          <DialogClose className="pointer-events-auto absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-white text-foreground shadow-lg transition hover:bg-muted hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">{textos.cerrar}</span>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MenuNovedadDialog;
