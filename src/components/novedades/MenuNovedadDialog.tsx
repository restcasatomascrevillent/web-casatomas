import type { ReactNode } from "react";
import { X } from "lucide-react";

import CartaDelDia, { CLASES_TITULO_CARTA } from "@/components/espacios/CartaDelDia";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTranslations } from "@/i18n/LanguageProvider";
import type { MenuNovedad } from "@/lib/menu-novedad";
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
 * casi a todo el ancho en móvil con scroll por dentro, centrado en escritorio.
 * Se cierra con la X, con Esc o pulsando fuera (lo da Radix).
 */
const MenuNovedadDialog = ({ titulo, menu, children }: MenuNovedadDialogProps) => {
  const { t } = useTranslations();
  const textos = t.novedades.botones;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      {/* Sin descripción: el diálogo lo nombra su título y el contenido es la carta. */}
      <DialogContent
        hideCloseButton
        aria-describedby={undefined}
        className="w-[92vw] sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-border/60 bg-ticket-tray p-3 sm:p-5"
      >
        <CartaDelDia
          menu={menu}
          // `px-8`: el título va centrado y la X ocupa la esquina; sin este
          // margen un título largo se metería debajo de ella.
          titulo={<DialogTitle className={cn(CLASES_TITULO_CARTA, "px-8")}>{titulo}</DialogTitle>}
          seccionesExtra={[{ clave: "bebidas", titulo: textos.bebidas, items: menu.bebidas }]}
        />
        {/* La X del `DialogContent` mide 40 px; esta, 44 como el resto de botones. */}
        <DialogClose className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-white text-foreground shadow-lg transition hover:bg-muted hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <X className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">{textos.cerrar}</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default MenuNovedadDialog;
