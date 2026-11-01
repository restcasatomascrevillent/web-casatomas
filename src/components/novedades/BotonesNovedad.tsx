import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Eye, Phone } from "lucide-react";

import MenuNovedadDialog from "@/components/novedades/MenuNovedadDialog";
import { PHONE_HREF, PHONE_NACIONAL } from "@/components/TelLink";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { useTranslations } from "@/i18n/LanguageProvider";
import { rutaPlato } from "@/lib/carta-rutas";
import { parsearBotonesNovedad, parsearMenuNovedad, type BotonNovedad } from "@/lib/menu-novedad";
import { cn } from "@/lib/utils";

interface BotonesNovedadProps {
  idNovedad: string;
  /** Título de la novedad ya traducido: nombra el modal y desambigua los botones. */
  titulo: string;
  /** Columnas crudas de la fila (`botones`, `menu`, `plato_id`). */
  botones: unknown;
  menu: unknown;
  platoId: unknown;
}

/**
 * `flex-auto` (base = ancho del texto en una línea) + `flex-wrap` en el pie:
 * dos botones van uno al lado del otro si sus textos caben enteros y, si no,
 * cada uno en su fila a todo el ancho. `whitespace-normal` solo entra en juego
 * si un texto no cabe ni solo en la tarjeta (3 columnas en tablet). Todo CSS:
 * el HTML del SSG y el de la hidratación son el mismo.
 */
const CLASE_BOTON =
  "h-auto min-h-11 min-w-32 flex-auto whitespace-normal rounded-full px-4 py-2 text-center leading-tight";
const CLASE_PRINCIPAL = "bg-accent text-accent-foreground shadow-sm hover:bg-accent/90";
const CLASE_SECUNDARIO = "border-accent/60";

/**
 * Pie de una tarjeta de novedad: 0, 1 o 2 botones fijos en el orden que
 * eligió el dueño. Un botón que no puede funcionar no se pinta:
 *  - «Ver menú» sin un menú legible con algún plato o, si es una cata, con
 *    alguna bebida (`parsearMenuNovedad` da `null`: es el `menuPintable` del
 *    panel, regla L3 del contrato v2);
 *  - «Échale un vistazo» si el plato no está en la carta del build (borrado,
 *    retirado o nuevo desde el último despliegue): ni enlace roto ni 404.
 * Sin botones que pintar no hay pie, y la tarjeta queda como siempre.
 */
const BotonesNovedad = ({ idNovedad, titulo, botones, menu, platoId }: BotonesNovedadProps) => {
  const { t, language } = useTranslations();
  const textos = t.novedades.botones;

  const menuNovedad = useMemo(
    () => parsearMenuNovedad(menu, language, idNovedad),
    [menu, language, idNovedad],
  );
  const enlacePlato = rutaPlato(platoId, language);

  const visibles = parsearBotonesNovedad(botones).filter(
    (tipo) => tipo === "llamar" || (tipo === "ver_menu" ? menuNovedad !== null : enlacePlato !== null),
  );
  if (visibles.length === 0) return null;

  const pintar = (tipo: BotonNovedad, indice: number) => {
    const principal = indice === 0;
    const props = {
      variant: principal ? ("default" as const) : ("outline" as const),
      className: cn(CLASE_BOTON, principal ? CLASE_PRINCIPAL : CLASE_SECUNDARIO),
    };

    if (tipo === "llamar") {
      return (
        <Button key={tipo} asChild {...props}>
          {/* La etiqueta empieza por el texto visible («Llamar 966…», WCAG 2.5.3). */}
          <a href={PHONE_HREF} aria-label={`${textos.llamar} ${PHONE_NACIONAL}, ${t.mobileCta.callAria}`}>
            <Phone aria-hidden="true" />
            <span>{textos.llamar}</span>{" "}
            {/* Muchos ordenadores no pueden llamar: en escritorio se ve el número. */}
            <span className="hidden font-normal tabular-nums lg:inline">{PHONE_NACIONAL}</span>
          </a>
        </Button>
      );
    }

    if (tipo === "ver_menu" && menuNovedad) {
      return (
        <MenuNovedadDialog key={tipo} titulo={titulo} menu={menuNovedad}>
          <Button type="button" {...props}>
            <BookOpen aria-hidden="true" />
            <span>
              {textos.verMenu}
              <span className="sr-only">{` — ${titulo}`}</span>
            </span>
          </Button>
        </MenuNovedadDialog>
      );
    }

    if (tipo === "ver_plato" && enlacePlato) {
      return (
        <Button key={tipo} asChild {...props}>
          <Link to={enlacePlato}>
            <Eye aria-hidden="true" />
            <span>
              {textos.verPlato}
              <span className="sr-only">{` — ${titulo}`}</span>
            </span>
          </Link>
        </Button>
      );
    }

    return null;
  };

  return (
    <CardFooter className="mt-auto flex-wrap gap-2">
      {visibles.map(pintar)}
    </CardFooter>
  );
};

export default BotonesNovedad;
