import { Wine } from "lucide-react";

import { useTranslations } from "@/i18n/LanguageProvider";
import type { LineaBebida as DatosLineaBebida } from "@/lib/menu-novedad";
import { cn } from "@/lib/utils";

interface LineaBebidaProps {
  linea: DatosLineaBebida;
  /**
   * `maridaje`: la bebida que acompaña a un plato, con el prefijo «Maridaje:»
   * y un punto más pequeña que el plato, que es quien manda.
   * `cata`: una línea de la cata; aquí la bebida ES el plato, así que va sin
   * prefijo y con el tamaño de un nombre de plato.
   */
  variante: "maridaje" | "cata";
  /** Versión reducida, como `compacta` en `CartaDelDia`. */
  compacta?: boolean;
  className?: string;
}

/**
 * Una bebida del menú de una novedad: copa, nombre, descripción en cursiva y
 * «Contiene sulfitos» en versalitas si el panel lo marcó.
 *
 * La copa va a la izquierda y el texto en su propia columna (`min-w-0` +
 * `[overflow-wrap:anywhere]`): en móvil un nombre largo se parte en líneas que
 * empiezan todas a la altura del nombre, sin ensanchar el diálogo. Bajo un
 * plato, el borde izquierdo del bloque coincide con el del nombre del plato
 * (`data-linea-bebida` lo deja localizable para el e2e).
 */
const LineaBebida = ({ linea, variante, compacta = false, className }: LineaBebidaProps) => {
  const { t } = useTranslations();
  const textos = t.novedades.botones;
  const esCata = variante === "cata";

  return (
    <div data-linea-bebida={variante} className={cn("flex min-w-0 items-start gap-1.5", className)}>
      <Wine
        aria-hidden="true"
        className={cn(
          "shrink-0 text-ticket-rule",
          esCata ? "mt-[0.2rem] h-4 w-4" : "mt-[0.15rem] h-3.5 w-3.5",
        )}
      />
      <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
        <p
          className={cn(
            "leading-snug text-ticket-ink",
            esCata
              ? compacta
                ? "text-[0.875rem]"
                : "text-[0.9375rem] sm:text-base"
              : "text-[0.8125rem]",
          )}
        >
          {!esCata && <span className="text-ticket-stamp">{`${textos.prefijoMaridaje} `}</span>}
          {linea.nombre}
        </p>
        {linea.descripcion && (
          <p className="mt-0.5 text-[0.8125rem] italic leading-snug text-ticket-ink-soft [text-wrap:pretty]">
            {linea.descripcion}
          </p>
        )}
        {linea.sulfitos && (
          <p className="mt-0.5 text-[0.75rem] leading-snug tracking-[0.06em] text-ticket-ink-soft [font-variant-caps:all-small-caps]">
            {textos.contieneSulfitos}
          </p>
        )}
      </div>
    </div>
  );
};

export default LineaBebida;
