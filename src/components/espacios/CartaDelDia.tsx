import { Fragment, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { useTranslations } from "@/i18n/LanguageProvider";
import type { Language } from "@/i18n/types";
import {
  AVISO_SIN_ALERGENOS,
  etiquetaAlergeno,
  tieneInformacionAlergenos,
} from "@/lib/alergenos";
import {
  SECCIONES_MENU,
  alergenosDeItem,
  type ItemMenu,
  type MenuDelDia,
  type SeccionMenu,
} from "@/lib/menu-dia";
import type { LineaBebida as DatosLineaBebida } from "@/lib/menu-novedad";
import { cn } from "@/lib/utils";
import LineaBebida from "@/components/novedades/LineaBebida";

/**
 * Clases del título de la carta.
 *
 * El título llega como slot (no como texto) para que en el diálogo lo pinte el
 * `DialogTitle` de Radix y el diálogo quede etiquetado por lo que el visitante
 * ve de verdad — el mismo reparto que usa `reservas/TicketReserva`.
 */
export const CLASES_TITULO_CARTA =
  "text-[1.25rem] sm:text-[1.4rem] font-normal leading-tight tracking-[0.01em] text-ticket-ink";

/** Filete de oro con rombo: la misma marca que abre el resguardo de reserva. */
const FileteOro = ({ className }: { className?: string }) => (
  <div aria-hidden="true" className={cn("flex items-center justify-center gap-2", className)}>
    <span className="h-px w-8 bg-ticket-rule/70" />
    <span className="h-[5px] w-[5px] rotate-45 bg-ticket-rule" />
    <span className="h-px w-8 bg-ticket-rule/70" />
  </div>
);

/** Separador de papel: la línea de puntos del recibo. */
const Separador = ({ className }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={cn("border-t border-dashed border-ticket-ink-soft/35", className)}
  />
);

/** Etiquetas legibles, sin repetidos y en el idioma activo. */
const etiquetasDe = (valores: string[], idioma: Language) => [
  ...new Set(valores.map((valor) => etiquetaAlergeno(valor, idioma)).filter(Boolean)),
];

/**
 * Alérgenos de un plato, plegados.
 *
 * El dueño quiso quitarlos de la web y luego rectificó: "déjalo como está, y lo
 * de alérgenos lo pondría solo si entran a verlo". Así que van en un
 * `<details>`: quien no los busca solo ve una línea de 11 px, y quien los
 * busca los tiene a un clic (o a un Enter — el disclosure nativo ya es
 * accesible por teclado y anuncia su estado sin `aria-expanded` a mano).
 *
 * Declarados e inferidos NO se pintan igual: los inferidos salen de los
 * ingredientes y no pueden tener la misma autoridad que lo que declara el
 * restaurante.
 */
const AlergenosDelPlato = ({ item }: { item: ItemMenu }) => {
  const { t, language } = useTranslations();
  const copia = t.espacios.menuAllergens;
  const datos = alergenosDeItem(item);
  const declarados = etiquetasDe(datos.oficiales, language);
  // Un alérgeno que ya está declarado no se repite como "deducido".
  const inferidos = etiquetasDe(datos.inferidos, language).filter(
    (etiqueta) => !declarados.includes(etiqueta),
  );

  return (
    <details className="group mt-1">
      <summary
        className={cn(
          // `list-none` + el marcador de WebKit ocultos: el triángulo por
          // defecto rompe la tipografía de la carta.
          "inline-flex w-fit cursor-pointer list-none items-center gap-1 rounded-sm",
          // Relleno con margen negativo: la zona táctil crece sin separar los
          // platos entre sí.
          "-mx-1 -my-1 px-1 py-2",
          "text-[0.6875rem] uppercase tracking-[0.14em] text-ticket-ink-soft",
          "transition-colors hover:text-ticket-stamp",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ticket-stamp focus-visible:ring-offset-2 focus-visible:ring-offset-ticket-paper",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        {copia.summary}
        {/* De qué plato son. En pantalla sobra (está justo encima); leído en
            voz alta, sin esto son nueve controles llamados igual. */}
        <span className="sr-only">{` — ${item.nombre}`}</span>
        <ChevronDown
          aria-hidden="true"
          className="h-3 w-3 transition-transform duration-200 group-open:rotate-180"
        />
      </summary>

      <div className="mt-1 space-y-2 border-l border-dotted border-ticket-ink-soft/40 pl-3">
        {tieneInformacionAlergenos(datos) ? (
          <>
            {declarados.length > 0 && (
              <div>
                <p className="text-[0.625rem] uppercase tracking-[0.12em] text-ticket-ink-soft">
                  {copia.declared}
                </p>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {declarados.map((alergeno) => (
                    <li
                      key={alergeno}
                      className="rounded-sm border border-ticket-rule/40 bg-ticket-rule/10 px-1.5 py-0.5 text-[0.6875rem] text-ticket-ink"
                    >
                      {alergeno}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {inferidos.length > 0 && (
              <div>
                <p className="text-[0.625rem] uppercase tracking-[0.12em] text-ticket-ink-soft">
                  {copia.inferred}
                </p>
                {/* Contorno de puntos y tinta suave: se ven, pero no se leen
                    como un dato certificado. */}
                <ul className="mt-1 flex flex-wrap gap-1">
                  {inferidos.map((alergeno) => (
                    <li
                      key={alergeno}
                      className="rounded-sm border border-dotted border-ticket-ink-soft/50 px-1.5 py-0.5 text-[0.6875rem] text-ticket-ink-soft"
                    >
                      {alergeno}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[0.6875rem] italic text-ticket-ink-soft">
                  {copia.inferredHint}
                </p>
              </div>
            )}
          </>
        ) : (
          // No es "no tiene alérgenos": es que no consta el dato. Mismo texto y
          // mismo tratamiento que en la carta (`carta/ProductoCard`).
          <p className="rounded-sm bg-destructive/10 px-2 py-1.5 text-[0.6875rem] text-destructive">
            {AVISO_SIN_ALERGENOS[language]}
          </p>
        )}

        {datos.notas && (
          <p className="rounded-sm bg-destructive/10 px-2 py-1.5 text-[0.6875rem] italic text-destructive">
            {datos.notas}
          </p>
        )}
      </div>
    </details>
  );
};

/**
 * Una línea de la carta.
 *
 * La columna de la izquierda mide siempre lo mismo, lleve foto o no: con foto
 * es la miniatura, sin foto es el rombo de oro de la casa. Así conviven los dos
 * casos (lo normal es una mezcla) sin recuadros grises ni texto desalineado, y
 * la ausencia de foto queda como una viñeta, no como un fallo.
 *
 * Una foto que NO carga cae en ese mismo rombo. No es un caso raro: el menú
 * guarda una COPIA de la url del plato (ver `lib/menu-dia`), así que un menú de
 * hace tres meses puede seguir apuntando a un fichero que ya se borró del
 * almacén. Sin esto, el navegador pinta el recuadro roto del `<img>` —
 * comprobado en el navegador— y una carta impresa no puede permitirse eso.
 */
const Plato = ({
  item,
  compacta,
  conAlergenos,
  maridaje,
}: {
  item: ItemMenu;
  compacta: boolean;
  conAlergenos: boolean;
  /** Bebida que acompaña al plato (menú de una novedad con maridaje). */
  maridaje?: DatosLineaBebida;
}) => {
  const [fotoRota, setFotoRota] = useState(false);

  // El ancho va aparte del alto: la casilla sin foto ocupa la misma columna
  // pero mide lo que mide su viñeta, no lo que mediría una miniatura.
  const ancho = compacta ? "w-11" : "w-12 sm:w-16";
  const lado = compacta ? "h-11 w-11" : "h-12 w-12 sm:h-16 sm:w-16";

  return (
    <li className="flex gap-3 sm:gap-4">
      {item.imagenUrl && !fotoRota ? (
        <img
          src={item.imagenUrl}
          // Decorativa: el nombre del plato está justo al lado, repetirlo en el
          // `alt` solo haría que se leyera dos veces.
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFotoRota(true)}
          width={128}
          height={128}
          style={
            item.imagenPosicionY !== null
              ? { objectPosition: `center ${item.imagenPosicionY}%` }
              : undefined
          }
          className={cn(
            "shrink-0 rounded-md border border-ticket-rule/30 object-cover shadow-sm",
            lado,
          )}
        />
      ) : (
        <span aria-hidden="true" className={cn("flex shrink-0 justify-center", ancho)}>
          <span className="mt-[0.6rem] h-[5px] w-[5px] rotate-45 bg-ticket-rule/80" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "leading-snug text-ticket-ink [overflow-wrap:anywhere]",
            compacta ? "text-[0.875rem]" : "text-[0.9375rem] sm:text-base",
          )}
        >
          {item.nombre}
        </p>
        {item.descripcion && (
          <p className="mt-0.5 text-[0.8125rem] italic leading-snug text-ticket-ink-soft [text-wrap:pretty]">
            {item.descripcion}
          </p>
        )}
        {conAlergenos && <AlergenosDelPlato item={item} />}
        {/* Al final de la columna de texto: alineado con el nombre del plato. */}
        {maridaje && (
          <LineaBebida linea={maridaje} variante="maridaje" compacta={compacta} className="mt-1.5" />
        )}
      </div>
    </li>
  );
};

/**
 * Sección añadida tras las tres del menú: platos (`items`, p. ej. «Bebidas» en
 * el menú de una novedad) o bebidas en orden (`lineas`, la «Cata»).
 */
export type SeccionExtraCarta = {
  clave: string;
  /** Rótulo ya traducido. */
  titulo: string;
} & ({ items: ItemMenu[]; lineas?: never } | { lineas: DatosLineaBebida[]; items?: never });

interface CartaDelDiaProps {
  /** La fecha no se pinta aquí (va en `subtitulo`), por eso no se exige. */
  menu: Pick<MenuDelDia, "estructurado" | "secciones">;
  /** Slot del título. En un diálogo, el `DialogTitle` de Radix. */
  titulo: ReactNode;
  /** Fecha ya formateada en el idioma activo. */
  subtitulo?: string;
  /** Versión reducida, para el carrusel de menús anteriores. */
  compacta?: boolean;
  /** Secciones que van detrás de primero/segundo/postre. Las vacías no se pintan. */
  seccionesExtra?: SeccionExtraCarta[];
  /**
   * Bebida de cada plato por el `id` de su `ItemMenu` (menú de una novedad con
   * maridaje). El menú del día no lo pasa y se pinta como siempre.
   */
  maridajes?: Record<string, DatosLineaBebida>;
  className?: string;
}

/**
 * El menú del día como una carta impresa.
 *
 * Hereda la gramática de los tickets de la casa (`reservas/TicketReserva` y
 * `carta/TicketMesa`): papel con grano, tinta pizarra, filete de oro con rombo,
 * separadores de puntos y serif. Dos diferencias a propósito: aquí los colores
 * son tokens (esto es DOM vivo, no una imagen que se captura) y el canto NO va
 * troquelado — una carta no es un resguardo, así que lleva un filete fino de
 * oro en vez de las muescas de `.ticket-paper`.
 *
 * Jerarquía: manda el nombre del plato; la descripción acompaña en cursiva; la
 * foto es una miniatura que adorna; los alérgenos van plegados.
 */
const CartaDelDia = ({
  menu,
  titulo,
  subtitulo,
  compacta = false,
  seccionesExtra = [],
  maridajes,
  className,
}: CartaDelDiaProps) => {
  const { t, language } = useTranslations();
  const etiquetas = t.espacios.menuLabels;

  const nombreSeccion: Record<SeccionMenu, string> = {
    primero: etiquetas.starters,
    segundo: etiquetas.mains,
    postre: menu.secciones.postre.length > 1 ? etiquetas.desserts : etiquetas.dessert,
  };

  const conPlatos: SeccionExtraCarta[] = [
    ...SECCIONES_MENU.map((seccion): SeccionExtraCarta => ({
      clave: seccion,
      titulo: nombreSeccion[seccion],
      items: menu.secciones[seccion],
    })),
    ...seccionesExtra,
  ].filter((seccion) => (seccion.items ?? seccion.lineas ?? []).length > 0);

  return (
    <div
      className={cn(
        "ticket-grain font-libre-baskerville rounded-lg border border-ticket-rule/25 bg-ticket-paper text-ticket-ink shadow-md",
        compacta ? "px-4 py-5" : "px-5 py-6 sm:px-7 sm:py-7",
        className,
      )}
    >
      <header className="text-center">
        {titulo}
        <FileteOro className="mt-2.5" />
        {subtitulo && (
          <p className="mt-2.5 text-[0.6875rem] uppercase tracking-[0.16em] text-ticket-ink-soft">
            {subtitulo}
          </p>
        )}
      </header>

      {conPlatos.map((seccion) => (
        <Fragment key={seccion.clave}>
          <Separador className={compacta ? "my-3.5" : "my-4 sm:my-5"} />
          <section>
            <h4 className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-ticket-stamp">
              {seccion.titulo}
            </h4>
            {seccion.items ? (
              <ul className={cn("mt-2.5", compacta ? "space-y-3" : "space-y-4")}>
                {seccion.items.map((item) => (
                  <Plato
                    key={item.id}
                    item={item}
                    compacta={compacta}
                    // En un menú heredado (v1) no hay alérgenos en NINGÚN plato:
                    // repetir "no consta" bajo cada línea sería ruido. Se dice
                    // una sola vez, abajo.
                    conAlergenos={menu.estructurado}
                    maridaje={maridajes?.[item.id]}
                  />
                ))}
              </ul>
            ) : (
              // `<ol>`: en una cata el orden es el de servir, y se anuncia.
              <ol className={cn("mt-2.5", compacta ? "space-y-3" : "space-y-4")}>
                {seccion.lineas.map((linea) => (
                  <li key={linea.id}>
                    <LineaBebida linea={linea} variante="cata" compacta={compacta} />
                  </li>
                ))}
              </ol>
            )}
          </section>
        </Fragment>
      ))}

      {!menu.estructurado && (
        <>
          <Separador className={compacta ? "my-3.5" : "my-4 sm:my-5"} />
          {/* Mismo aviso que la carta, en tinta suave: aquí no señala un plato
              concreto, es una nota al pie de todo el menú. */}
          <p className="text-center text-[0.6875rem] italic text-ticket-ink-soft [text-wrap:pretty]">
            {AVISO_SIN_ALERGENOS[language]}
          </p>
        </>
      )}
    </div>
  );
};

export default CartaDelDia;
