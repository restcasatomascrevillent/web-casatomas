import { formatearPrecio } from "@/lib/precios";
import {
  etiquetaUnidadPlato,
  gramosDeUnidad,
  normalizarUnidadPlato,
} from "@/lib/unidades-platos";
import OpcionSinGluten from "./OpcionSinGluten";
import { useState } from "react";
import { Info, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ItemTraducido } from "@/lib/carta-i18n";
import {
  AVISO_SIN_ALERGENOS,
  datosAlergenos,
  etiquetaAlergeno,
  ofreceOpcionSinGluten,
  tieneInformacionAlergenos,
} from "@/lib/alergenos";
import { anclaPlato } from "@/lib/carta-rutas";
import { esFotoCarta, imagenOptimizada, resolverImagen } from "@/lib/carta-ssg";
import { videoDePlato } from "@/lib/foto-plato";
import FotoPlato from "./FotoPlato";
import type { PlatoSSG } from "@/lib/carta-ssg-types";
import { NEGOCIO } from "@/lib/negocio";
import { useTranslations } from "@/i18n/LanguageProvider";
import { cerrarInfoConEscape, girarYEnfocar, propsCara } from "@/lib/caraGiro";
import type { Translations } from "@/i18n/languages/es";
import type { Language } from "@/i18n/types";

interface ProductoCardProps {
  /** Ya resuelto al idioma activo (`resolveTranslatedItem`/`agruparPorCategoria`, NO el plato crudo). */
  plato: ItemTraducido<PlatoSSG>;
  /** Categoría ya traducida (texto alternativo de la foto). */
  categoria: string;
  /** La primera fila de la rejilla no se carga en diferido: es el LCP. */
  prioridad?: boolean;
  /**
   * Cuánto hay ya de este plato en el pedido (0 si nada). En el HTML del SSG
   * siempre es 0: el pedido vive en `sessionStorage` y solo se lee tras
   * hidratar (ver `usePedido`).
   */
  cantidadEnPedido?: number;
  /** Sin él, la tarjeta no muestra el botón "Añadir" (solo lectura). */
  onAnadir?: () => void;
  /**
   * Interruptor «Fotos de platos en Casa Tomás» del panel. `false`: la tarjeta
   * no pinta foto ni hueco — queda nombre, descripción, alérgenos y precio,
   * como si la foto no existiera.
   */
  mostrarFoto?: boolean;
  /**
   * Se llega a este plato desde «Échale un vistazo» de una novedad
   * (`#plato-<id>`): un anillo durante un momento para encontrarlo.
   */
  resaltado?: boolean;
}

/** "2", "2 kg", "200 g": mismo criterio de unidades que el ticket. */
const formatearCantidad = (cantidad: number, unidad?: string) => {
  if (normalizarUnidadPlato(unidad) === "kg")
    return `${cantidad.toFixed(1).replace(/\.0$/, "")} kg`;
  if (gramosDeUnidad(unidad) !== null) return `${cantidad} g`;
  return `${Math.round(cantidad)}`;
};

/**
 * Lo que enseña el botón cuando el plato ya está en la mesa: el peso tal cual
 * ("200 g", "1,5 kg") y las unidades con un "×" delante ("× 2"), para que un
 * número suelto no se lea como un precio.
 */
const textoCantidad = (cantidad: number, unidad?: string) => {
  const texto = formatearCantidad(cantidad, unidad);
  return /^\d+$/.test(texto) ? `× ${texto}` : texto.replace(".", ",");
};

const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL as string | undefined
)?.replace(/\/+$/, "");

type PiePlatoProps = {
  precio: number;
  unidad?: string;
  cantidadEnPedido: number;
  nombre: string;
  onAnadir?: () => void;
  t: Translations["platos"];
  language: Language;
};

/**
 * Precio + botón de añadir, igual en las dos caras de la tarjeta.
 *
 * Sin nada en la mesa, el botón dice «+ Añadir». En cuanto el plato está en la
 * mesa, el «+» deja sitio a la cantidad («200 g», «× 2») en un botón oscuro:
 * se ve de un vistazo qué hay pedido sin abrir Mi mesa, y volver a pulsarlo
 * añade otra ración. La cantidad se sigue anunciando por voz en el
 * `aria-label` del botón.
 */
const PiePlato = ({
  precio,
  unidad,
  cantidadEnPedido,
  nombre,
  onAnadir,
  t,
  language,
}: PiePlatoProps) => {
  const enMesa = cantidadEnPedido > 0;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/60 mt-auto flex-shrink-0 px-4 py-3 sm:px-5">
      <p className="font-bold text-accent text-lg sm:text-xl leading-tight">
        {formatearPrecio(precio)}
        {unidad && (
          <span className="text-xs sm:text-sm font-normal text-muted-foreground">
            {" "}
            / {etiquetaUnidadPlato(unidad, language)}
          </span>
        )}
      </p>
      {onAnadir && (
        <button
          type="button"
          onClick={onAnadir}
          aria-label={
            enMesa
              ? t.addMoreAria
                  .replace("{name}", nombre)
                  .replace("{qty}", formatearCantidad(cantidadEnPedido, unidad))
              : t.addAria.replace("{name}", nombre)
          }
          data-en-mesa={enMesa || undefined}
          className={`inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold shadow-md transition-all hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent ${
            enMesa
              ? "min-w-[4.5rem] bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-accent text-accent-foreground hover:bg-accent-hover"
          }`}
        >
          {enMesa ? (
            // `key`: cada cambio de cantidad vuelve a lanzar el pequeño «salto».
            <span key={cantidadEnPedido} className="animate-scale-in motion-reduce:animate-none whitespace-nowrap">
              {textoCantidad(cantidadEnPedido, unidad)}
            </span>
          ) : (
            <>
              <Plus className="w-4 h-4" aria-hidden="true" />
              {t.add}
            </>
          )}
        </button>
      )}
    </div>
  );
};

/** Botón de la «i»: gira la tarjeta. Uno por cara (el de detrás la devuelve). */
function BotonGiro({
  abierta,
  onGirar,
  nombre,
  t,
}: {
  abierta: boolean;
  onGirar: (boton: HTMLElement) => void;
  nombre: string;
  t: Translations["platos"];
}) {
  return (
    <button
      type="button"
      onClick={(evento) => onGirar(evento.currentTarget)}
      aria-label={`${abierta ? t.hideInfo : t.viewInfo} — ${nombre}`}
      aria-expanded={abierta}
      data-boton-giro=""
      className="flex items-center justify-center w-11 h-11 -mr-2 -mt-1.5 rounded-full text-foreground/80 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent transition-colors shrink-0"
    >
      {abierta ? <X className="w-5 h-5" aria-hidden="true" /> : <Info className="w-5 h-5" aria-hidden="true" />}
    </button>
  );
}

/**
 * Tarjeta de plato para las páginas de carta (`/carta/:categoria`).
 *
 * Delante: la foto siempre a la vista (en móvil, cuadrada a la izquierda; desde
 * tableta, arriba a todo lo ancho; al pulsarla se abre en grande), el nombre y
 * el precio con el botón de añadir. La descripción no sale de primeras (el
 * dueño, 12/11/2026): la «i» gira la tarjeta y detrás están la descripción,
 * ingredientes y alérgenos. Las dos caras están en el
 * HTML del SSG: `[backface-visibility:hidden]` solo cambia cuál mira al
 * visitante, y la que no mira va `inert` (ver `propsCara`).
 */
const ProductoCard = ({
  plato,
  categoria,
  prioridad = false,
  cantidadEnPedido = 0,
  onAnadir,
  mostrarFoto = true,
  resaltado = false,
}: ProductoCardProps) => {
  const { language, t } = useTranslations();
  const [infoOpen, setInfoOpen] = useState(false);
  const [fotoGrande, setFotoGrande] = useState(false);
  const imagen = mostrarFoto
    ? resolverImagen(plato.imagen_url, SUPABASE_URL)
    : null;
  // Mismo vocabulario que la portada (`@/lib/alergenos`): las formas del panel
  // (`frutos_cascara`) y las de la BD (`frutos de cáscara`) son un solo token.
  const datos = datosAlergenos(plato);
  const conAlergenos = tieneInformacionAlergenos(datos);
  // Declarados e inferidos no se mezclan en el mismo badge: un inferido nunca
  // puede parecer tan seguro como lo que el restaurante certifica.
  const alergenosOficiales = Array.from(
    new Set(
      datos.oficiales
        .map((alergeno) => etiquetaAlergeno(alergeno, language))
        .filter(Boolean),
    ),
  );
  const alergenosInferidos = Array.from(
    new Set(
      datos.inferidos
        .map((alergeno) => etiquetaAlergeno(alergeno, language))
        .filter(Boolean),
    ),
  ).filter((etiqueta) => !alergenosOficiales.includes(etiqueta));
  const ingredientes = plato.displayIngredientes;
  const descripcion = plato.displayDescripcion?.trim();
  const fotoCarta = esFotoCarta(imagen);
  const encuadre =
    !fotoCarta && typeof plato.imagen_posicion_y === "number"
      ? {
          objectPosition: `center ${Math.min(100, Math.max(0, plato.imagen_posicion_y))}%`,
        }
      : undefined;
  const girar = (boton: HTMLElement) =>
    girarYEnfocar(boton, () => setInfoOpen((valor) => !valor));
  const pie = (
    <PiePlato
      precio={plato.precio_eur}
      unidad={plato.unidad}
      cantidadEnPedido={cantidadEnPedido}
      nombre={plato.displayNombre}
      onAnadir={onAnadir}
      t={t.platos}
      language={language}
    />
  );

  return (
    <div
      // Ancla de «Échale un vistazo». `scroll-mt-28` (112 px): el desplazamiento
      // al `#` (lo hace `Header`) deja el plato por debajo de la cabecera fija.
      id={anclaPlato(plato.id)}
      data-resaltado={resaltado || undefined}
      // Sin `h-full`: la rejilla estira la tarjeta al alto de su fila y, con
      // `flex`, las caras ocupan ese alto (un `height: 100%` aquí no se
      // resolvía y la cara girada quedaba más baja que sus vecinas).
      className="scroll-mt-28 flex flex-col [perspective:1200px]"
      data-tarjeta-giro={anclaPlato(plato.id)}
      onKeyDown={(evento) => cerrarInfoConEscape(evento, infoOpen, () => setInfoOpen(false))}
    >
      {/* Envoltorio del giro 3D. La cara que no mira va en `absolute` (ocupa el
          sitio de la otra) y la que mira en flujo: la tarjeta toma el alto de
          su fila, o más si la trasera es más larga. */}
      <div
        className={`relative flex flex-1 flex-col transition-transform duration-500 motion-reduce:transition-none [transform-style:preserve-3d] ${
          infoOpen ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div
          className={`${infoOpen ? "absolute inset-0" : "relative flex-1"} flex flex-col [backface-visibility:hidden]`}
          data-cara="delantera"
          {...propsCara(infoOpen)}
        >
          <Card
            className={`font-libre-baskerville flex flex-1 flex-col overflow-hidden rounded-2xl border-border/70 transition duration-300 motion-reduce:transition-none hover:shadow-xl sm:hover:-translate-y-1 ${
              resaltado ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
            }`}
          >
            <div className="flex flex-1 flex-row sm:flex-col">
              {imagen && (
                <div
                  className={`relative m-3 mr-0 h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-muted sm:m-0 sm:h-auto sm:w-full sm:rounded-none ${
                    fotoCarta ? "sm:aspect-[4/3]" : "sm:h-48"
                  }`}
                >
                  {/* Pulsar la foto la abre en grande. `z-[1]`: por encima de la
                      foto (la «sticker» se anima con `transform` y, sin z-index,
                      taparía el botón); el botón de vídeo de `FotoPlato` va en
                      `z-[2]` y se sigue pudiendo pulsar. */}
                  <button
                    type="button"
                    onClick={() => setFotoGrande(true)}
                    aria-label={`${t.platos.enlargePhoto} — ${plato.displayNombre}`}
                    aria-haspopup="dialog"
                    className="absolute inset-0 z-[1] cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                  />
                  <FotoPlato
                    src={imagenOptimizada(imagen, 768) ?? imagen}
                    imagenOriginal={imagen}
                    video={videoDePlato(plato)}
                    alt={`${plato.displayNombre} — ${categoria}, ${NEGOCIO.nombre}`}
                    style={encuadre}
                    loading={prioridad ? "eager" : "lazy"}
                    etiquetaReproducir={t.platos.playVideo}
                    etiquetaPausar={t.platos.pauseVideo}
                    width={640}
                    height={fotoCarta ? 480 : 384}
                  />
                </div>
              )}
              {/* El nombre, centrado en el hueco que queda junto a la foto (en
                  móvil) o bajo ella (desde tableta). La «i» va en la esquina, en
                  absoluto, para que no descentre el nombre; el relleno lateral
                  igual a cada lado le deja sitio. */}
              <div className="relative flex min-w-0 flex-1 items-center justify-center px-10 py-3 sm:px-12 sm:py-4">
                <CardTitle
                  as="h2"
                  className="min-w-0 text-center text-balance text-base md:text-lg font-bold leading-snug tracking-normal text-primary whitespace-normal break-words"
                >
                  {plato.displayNombre}
                </CardTitle>
                <div className="absolute right-3 top-2.5 sm:right-4 sm:top-3.5">
                  <BotonGiro abierta={false} onGirar={girar} nombre={plato.displayNombre} t={t.platos} />
                </div>
              </div>
            </div>
            {pie}
          </Card>
        </div>

        {/* Cara trasera: descripción completa, ingredientes y alérgenos. */}
        <div
          className={`${infoOpen ? "relative flex-1" : "absolute inset-0"} flex flex-col [transform:rotateY(180deg)] [backface-visibility:hidden]`}
          data-cara="trasera"
          {...propsCara(!infoOpen)}
        >
          <Card className="font-libre-baskerville flex flex-1 flex-col overflow-hidden rounded-2xl border-border/70 bg-gradient-to-br from-background to-muted/30">
            <div className="flex items-start justify-between gap-2 border-b border-border/60 px-4 pt-3 pb-3 sm:px-5 sm:pt-4">
              <CardTitle
                as="p"
                className="flex-1 min-w-0 text-base md:text-lg font-bold leading-snug tracking-normal text-primary whitespace-normal break-words"
              >
                {plato.displayNombre}
              </CardTitle>
              <BotonGiro abierta onGirar={girar} nombre={plato.displayNombre} t={t.platos} />
            </div>

            <div className="flex-grow space-y-3 overflow-auto px-4 py-4 sm:px-5">
              {descripcion && (
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                  {descripcion}
                </p>
              )}
              {ofreceOpcionSinGluten(plato) && <OpcionSinGluten />}
              {ingredientes.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">
                    {t.platos.ingredientsTitle}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {ingredientes.join(", ")}
                  </p>
                </div>
              )}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground">
                  {t.platos.allergensTitle}
                </p>
                {conAlergenos ? (
                  <div className="space-y-2">
                    {alergenosOficiales.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {alergenosOficiales.map((alergeno) => (
                          <Badge
                            key={`oficial-${alergeno}`}
                            variant="destructive"
                            className="text-xs"
                          >
                            {alergeno}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {alergenosInferidos.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {alergenosInferidos.map((alergeno) => (
                          <Badge
                            key={`inferido-${alergeno}`}
                            variant="secondary"
                            className="text-xs"
                          >
                            {alergeno}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // No es "no tiene alérgenos": es que no consta el dato. Se dice así.
                  <p className="text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded">
                    {AVISO_SIN_ALERGENOS[language]}
                  </p>
                )}
              </div>
              {plato.displayAlergenosNotas && (
                <p className="text-xs italic text-destructive bg-destructive/10 px-2 py-1.5 rounded">
                  {plato.displayAlergenosNotas}
                </p>
              )}
            </div>
            {pie}
          </Card>
        </div>
      </div>

      {/* La foto en grande. Fuera de las caras: la que no mira va `inert`. */}
      {imagen && (
        <Dialog open={fotoGrande} onOpenChange={setFotoGrande}>
          <DialogContent
            aria-describedby={undefined}
            className="w-[calc(100%-1.5rem)] max-w-3xl gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-2xl"
          >
            <img
              src={imagenOptimizada(imagen, 1024) ?? imagen}
              alt={`${plato.displayNombre} — ${categoria}, ${NEGOCIO.nombre}`}
              width={1024}
              height={768}
              decoding="async"
              className="block h-auto max-h-[75dvh] w-full bg-muted object-contain"
              style={encuadre}
            />
            <div className="flex items-center justify-between gap-4 px-5 py-4 pr-5">
              <DialogTitle className="font-libre-baskerville text-lg md:text-xl font-bold leading-snug text-primary">
                {plato.displayNombre}
              </DialogTitle>
              <p className="shrink-0 font-libre-baskerville text-lg font-bold text-accent">
                {formatearPrecio(plato.precio_eur)}
                {plato.unidad && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {etiquetaUnidadPlato(plato.unidad, language)}
                  </span>
                )}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ProductoCard;
