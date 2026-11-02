import { gramosDeUnidad, normalizarUnidadPlato } from "@/lib/unidades-platos";
import OpcionSinGluten from "./OpcionSinGluten";
import { useState } from "react";
import { Eye, EyeOff, Info, Plus, UtensilsCrossed } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ItemTraducido } from "@/lib/carta-i18n";
import {
  AVISO_SIN_ALERGENOS,
  datosAlergenos,
  etiquetaAlergeno,
  tieneInformacionAlergenos,
} from "@/lib/alergenos";
import { anclaPlato } from "@/lib/carta-rutas";
import { esFotoCarta, imagenOptimizada, resolverImagen } from "@/lib/carta-ssg";
import { videoDePlato } from "@/lib/foto-plato";
import FotoPlato from "./FotoPlato";
import type { PlatoSSG } from "@/lib/carta-ssg-types";
import { NEGOCIO } from "@/lib/negocio";
import { useTranslations } from "@/i18n/LanguageProvider";
import { girarYEnfocar, propsCara } from "@/lib/caraGiro";
import type { Translations } from "@/i18n/languages/es";

interface ProductoCardProps {
  /** Ya resuelto al idioma activo (`resolveTranslatedItem`/`agruparPorCategoria`, NO el plato crudo). */
  plato: ItemTraducido<PlatoSSG>;
  /** Categoría ya traducida, para la etiqueta de la tarjeta. */
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
   * no ofrece el ojo ni pinta foto ni hueco de «sin foto» — queda nombre,
   * categoría, alérgenos y precio, como si la foto no existiera.
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
};

/**
 * Precio + botón "Añadir", igual en las dos caras de la tarjeta.
 *
 * La cantidad ya en la mesa se ve como una insignia SOBRE el botón, no como
 * texto en la fila: con precio, "N en tu mesa" y el botón a la vez, la fila
 * no cabía en tarjetas estrechas y `flex-wrap` partía el pie en dos líneas
 * — la tarjeta crecía justo al añadir algo. La insignia va en posición
 * absoluta (no ocupa hueco en el flujo), así que el pie cabe siempre en una
 * sola línea, en cualquier ancho; la cantidad se sigue anunciando por voz en
 * el `aria-label` del botón.
 */
const PiePlato = ({
  precio,
  unidad,
  cantidadEnPedido,
  nombre,
  onAnadir,
  t,
}: PiePlatoProps) => (
  <CardFooter className="flex items-center justify-between gap-3 border-t bg-muted/30 mt-auto flex-shrink-0 px-5 py-3">
    <span className="font-bold text-accent text-xl">
      {precio}€
      {unidad && (
        <span className="text-sm font-normal text-muted-foreground">
          {" "}
          / {normalizarUnidadPlato(unidad)}
        </span>
      )}
    </span>
    {onAnadir && (
      <div className="relative shrink-0">
        <Button
          type="button"
          size="sm"
          onClick={onAnadir}
          aria-label={
            cantidadEnPedido > 0
              ? t.addMoreAria
                  .replace("{name}", nombre)
                  .replace("{qty}", formatearCantidad(cantidadEnPedido, unidad))
              : t.addAria.replace("{name}", nombre)
          }
          className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-4 shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
          {t.add}
        </Button>
        {cantidadEnPedido > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center whitespace-nowrap rounded-full bg-foreground px-1 text-[10px] font-bold leading-none text-background shadow ring-2 ring-background"
          >
            {formatearCantidad(cantidadEnPedido, unidad)}
          </span>
        )}
      </div>
    )}
  </CardFooter>
);

/**
 * Tarjeta de plato para las páginas de carta.
 *
 * Igual que `CartaVinos.tsx`: el ojo pliega/despliega la foto y la "i" gira
 * la tarjeta para enseñar alérgenos por detrás. Antes esta tarjeta no
 * plegaba nada a propósito (todo visible de una, sin depender de un clic,
 * en una página pensada para indexarse) — pero ambos estados, plegado y
 * girado, siguen en el HTML del SSG igualmente: `[backface-visibility:
 * hidden]` solo cambia qué cara mira al visitante, no si el contenido
 * existe en el DOM. Lo único que de verdad desaparece del HTML mientras la
 * foto está plegada es la propia `<img>` — sin coste real aquí, porque
 * ninguno de los 128 platos tiene descripción (ver más abajo).
 */
/** Botón del ojo (mostrar/ocultar foto): igual en las dos caras de la tarjeta. */
function BotonOjoFoto({
  tieneFoto,
  expanded,
  onToggle,
  nombre,
  t,
}: {
  tieneFoto: boolean;
  expanded: boolean;
  onToggle: () => void;
  nombre: string;
  t: Translations["platos"];
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!tieneFoto}
      aria-label={`${tieneFoto ? (expanded ? t.hidePhoto : t.viewPhoto) : t.noPhoto} — ${nombre}`}
      title={tieneFoto ? undefined : t.noPhoto}
      className="flex items-center justify-center w-11 h-11 rounded-full bg-muted/80 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent transition-all duration-200 hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100 shrink-0"
    >
      {expanded ? (
        <EyeOff className="w-5 h-5" aria-hidden="true" />
      ) : (
        <Eye className="w-5 h-5" aria-hidden="true" />
      )}
    </button>
  );
}

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
  // "Foto expandida en carta web" (adminpanelct, `expanded` en Platos/Vinos):
  // arranca desplegada si así se marcó en el panel — mismo criterio que
  // `CartaPlatos.tsx`/`CartaVinos.tsx`, que ya lo respetaban; a esta tarjeta
  // (la de las páginas /carta/:categoria) se le había quedado siempre en
  // `false` pasara lo que pasara en el panel.
  const [expandedEstado, setExpanded] = useState(() => Boolean(plato.expanded));
  const [infoOpen, setInfoOpen] = useState(false);
  const imagen = mostrarFoto
    ? resolverImagen(plato.imagen_url, SUPABASE_URL)
    : null;
  // Con las fotos apagadas, o si el plato no tiene foto, la tarjeta nunca se
  // despliega: un plato marcado «expandido» sin foto enseñaba un hueco vacío
  // con cubiertos (01-11-2026, p. ej. el tataki de chuleta de vaca).
  const expanded = mostrarFoto && Boolean(imagen) && expandedEstado;
  // Mismo vocabulario que la portada (`@/lib/alergenos`): las formas del panel
  // (`frutos_cascara`) y las de la BD (`frutos de cáscara`) son un solo token.
  const datos = datosAlergenos(plato);
  const conAlergenos = tieneInformacionAlergenos(datos);
  // Declarados e inferidos no se mezclan en el mismo badge (mismo criterio que
  // `CartaVinos.tsx`): un inferido nunca puede parecer tan seguro como lo que
  // el restaurante certifica.
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
  const fotoCarta = esFotoCarta(imagen);
  const proporcionFoto = fotoCarta ? "aspect-[4/3]" : "h-48";
  const encuadre =
    !fotoCarta && typeof plato.imagen_posicion_y === "number"
      ? {
          objectPosition: `center ${Math.min(100, Math.max(0, plato.imagen_posicion_y))}%`,
        }
      : undefined;

  return (
    <div
      // Ancla de «Échale un vistazo». `scroll-mt-28` (112 px): el desplazamiento
      // al `#` (lo hace `Header`) deja el plato por debajo de la cabecera fija.
      id={anclaPlato(plato.id)}
      data-resaltado={resaltado || undefined}
      className={`scroll-mt-28 [perspective:1200px] ${expanded || infoOpen ? "h-full" : "h-auto"}`}
      data-tarjeta-giro={anclaPlato(plato.id)}
    >
      {/* Envoltorio del giro 3D: mismo patrón que `CartaVinos.tsx`. La cara
          trasera va con `backface-visibility:hidden` y en `absolute` salvo
          cuando está boca arriba, para que solo entonces ocupe sitio real. */}
      <div
        className={`relative transition-transform duration-500 [transform-style:preserve-3d] ${
          expanded || infoOpen ? "h-full" : "h-auto"
        } ${infoOpen ? "[transform:rotateY(180deg)]" : ""}`}
      >
        <div
          className={`${infoOpen ? "absolute inset-0 h-full" : "h-full"} [backface-visibility:hidden]`}
          data-cara="delantera"
          {...propsCara(infoOpen)}
        >
          <Card
            className={`font-libre-baskerville flex flex-col overflow-hidden transition duration-300 motion-reduce:transition-none hover:shadow-xl hover:-translate-y-1 h-full ${
              resaltado ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
            }`}
          >
            {/* `scaleY` en vez de `height: "auto"`: animar `height` fuerza un
                reflow en cada fotograma (la propiedad afecta al layout), y con
                varias decenas de platos en la página el tirón se notaba al
                abrir la foto en móvil. `scaleY` + `opacity` las anima el
                compositor (sin recalcular layout de por medio); el hueco de la
                tarjeta aparece de golpe en vez de crecer suave, pero ya no
                hay tirón. */}
            {/* `exit` con su propia duración, más corta que la de entrada: el
                alto en layout de este bloque no se anima (es `scaleY`, no
                `height`), así que mientras dura la salida la tarjeta se
                queda a tamaño completo con la foto ya encogida/desvanecida
                dentro — cuanto más larga la salida, más se nota ese hueco
                quieto antes del cierre de golpe al desmontar. */}
            <AnimatePresence initial={false}>
              {expanded &&
                (imagen ? (
                  <motion.div
                    key="foto"
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    exit={{
                      scaleY: 0,
                      opacity: 0,
                      transition: { duration: 0.12, ease: "easeInOut" },
                    }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    style={{ transformOrigin: "top" }}
                    className="overflow-hidden bg-muted flex-shrink-0"
                  >
                    <div className={`relative ${proporcionFoto} overflow-hidden`}>
                      <FotoPlato
                        src={imagenOptimizada(imagen, 768) ?? imagen}
                        imagenOriginal={imagen}
                        video={videoDePlato(plato)}
                        alt={`${plato.displayNombre} — ${categoria}, ${NEGOCIO.nombre}`}
                        style={encuadre}
                        loading={prioridad ? "eager" : "lazy"}
                        width={640}
                        height={fotoCarta ? 480 : 384}
                      />
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-accent/90 text-accent-foreground backdrop-blur-sm shadow-md">
                          {categoria}
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="sin-foto"
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    exit={{
                      scaleY: 0,
                      opacity: 0,
                      transition: { duration: 0.12, ease: "easeInOut" },
                    }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    style={{ transformOrigin: "top" }}
                    className="overflow-hidden flex-shrink-0"
                  >
                    <div className="relative h-20 bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
                      <UtensilsCrossed className="w-8 h-8 text-accent/60" />
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-accent/90 text-accent-foreground shadow-sm">
                          {categoria}
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>

            <CardHeader className="pb-2 px-5 pt-4 flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="flex-1 min-w-0 text-base md:text-lg leading-tight whitespace-normal break-words min-h-12">
                  {plato.displayNombre}
                </CardTitle>
                <div className="flex items-center gap-2 shrink-0">
                  {mostrarFoto && (
                    <BotonOjoFoto
                      tieneFoto={!!plato.imagen_url?.trim()}
                      expanded={expanded}
                      onToggle={() => setExpanded((valor) => !valor)}
                      nombre={plato.displayNombre}
                      t={t.platos}
                    />
                  )}
                  <button
                    type="button"
                    onClick={(evento) =>
                      girarYEnfocar(evento.currentTarget, () =>
                        setInfoOpen((valor) => !valor),
                      )
                    }
                    aria-label={`${infoOpen ? t.platos.hideInfo : t.platos.viewInfo} — ${plato.displayNombre}`}
                    aria-expanded={infoOpen}
                    data-boton-giro=""
                    className="flex items-center justify-center w-11 h-11 rounded-full bg-muted/80 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent transition-all duration-200 hover:scale-[1.03]"
                  >
                    <Info className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
              {!expanded && (
                <div className="pt-2">
                  <Badge className="bg-accent/90 text-accent-foreground shadow-sm">
                    {categoria}
                  </Badge>
                </div>
              )}
            </CardHeader>

            <PiePlato
              precio={plato.precio_eur}
              unidad={plato.unidad}
              cantidadEnPedido={cantidadEnPedido}
              nombre={plato.displayNombre}
              onAnadir={onAnadir}
              t={t.platos}
            />
          </Card>
        </div>

        {/* Cara trasera: descripción (casi siempre vacía hoy) y alérgenos —
            lo mismo que antes se veía siempre en la única cara de la
            tarjeta, ahora tras la "i". */}
        <div
          className={`${infoOpen ? "relative h-auto" : "absolute inset-0 h-full"} [transform:rotateY(180deg)] [backface-visibility:hidden]`}
          data-cara="trasera"
          {...propsCara(!infoOpen)}
        >
          <Card
            className={`font-libre-baskerville flex flex-col overflow-hidden border-2 border-border/80 bg-gradient-to-br from-background to-muted/30 ${
              infoOpen ? "h-auto" : "h-full"
            }`}
          >
            {/* Si el cliente ya había abierto la foto, sigue a la vista al
                girar a la información: que desaparezca de golpe queda mal. */}
            {expanded && imagen && (
              <div className={`relative ${proporcionFoto} overflow-hidden bg-muted flex-shrink-0`}>
                <img
                  src={imagenOptimizada(imagen, 768)}
                  alt={`${plato.displayNombre} — ${categoria}, ${NEGOCIO.nombre}`}
                  className="w-full h-full object-cover"
                  style={encuadre}
                  loading="lazy"
                  decoding="async"
                  width={640}
                  height={fotoCarta ? 480 : 384}
                />
              </div>
            )}
            <CardHeader className="pb-3 px-5 pt-4 flex-shrink-0 border-b bg-muted/20">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base md:text-lg leading-tight whitespace-normal break-words">
                    {plato.displayNombre}
                  </CardTitle>
                  <div className="pt-2">
                    <Badge className="bg-accent/90 text-accent-foreground shadow-sm">
                      {categoria}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {mostrarFoto && (
                    <BotonOjoFoto
                      tieneFoto={!!plato.imagen_url?.trim()}
                      expanded={expanded}
                      onToggle={() => setExpanded((valor) => !valor)}
                      nombre={plato.displayNombre}
                      t={t.platos}
                    />
                  )}
                  <button
                    type="button"
                    onClick={(evento) =>
                      girarYEnfocar(evento.currentTarget, () =>
                        setInfoOpen((valor) => !valor),
                      )
                    }
                    aria-label={`${infoOpen ? t.platos.hideInfo : t.platos.viewInfo} — ${plato.displayNombre}`}
                    aria-expanded={infoOpen}
                    data-boton-giro=""
                    className="flex items-center justify-center w-11 h-11 rounded-full bg-muted/80 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent transition-all duration-200 hover:scale-[1.03] shrink-0"
                  >
                    <Info className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-5 py-4 flex-grow overflow-auto space-y-3">
              {plato.displayDescripcion?.trim() && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {plato.displayDescripcion}
                </p>
              )}
              {plato.sin_gluten_disponible === true && <OpcionSinGluten />}
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
            </CardContent>

            <PiePlato
              precio={plato.precio_eur}
              unidad={plato.unidad}
              cantidadEnPedido={cantidadEnPedido}
              nombre={plato.displayNombre}
              onAnadir={onAnadir}
              t={t.platos}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductoCard;
