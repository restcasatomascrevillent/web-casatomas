import { useState } from "react";
import { Eye, EyeOff, Info, Plus, UtensilsCrossed } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { ItemTraducido } from "@/lib/carta-i18n";
import {
  AVISO_SIN_ALERGENOS,
  datosAlergenos,
  etiquetaAlergeno,
  tieneInformacionAlergenos,
} from "@/lib/alergenos";
import { resolverImagen } from "@/lib/carta-ssg";
import type { PlatoSSG } from "@/lib/carta-ssg-types";
import { useTranslations } from "@/i18n/LanguageProvider";

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
}

/** "2", "2 kg", "200 g": mismo criterio de unidades que el ticket. */
const formatearCantidad = (cantidad: number, unidad?: string) => {
  if (unidad === "kg") return `${cantidad.toFixed(1).replace(/\.0$/, "")} kg`;
  if (unidad === "100 g" || unidad === "100g") return `${cantidad} g`;
  return `${Math.round(cantidad)}`;
};

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "");

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
const ProductoCard = ({
  plato,
  categoria,
  prioridad = false,
  cantidadEnPedido = 0,
  onAnadir,
}: ProductoCardProps) => {
  const { language, t } = useTranslations();
  const [expanded, setExpanded] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const imagen = resolverImagen(plato.imagen_url, SUPABASE_URL);
  // Mismo vocabulario que la portada (`@/lib/alergenos`): las formas del panel
  // (`frutos_cascara`) y las de la BD (`frutos de cáscara`) son un solo token.
  const datos = datosAlergenos(plato);
  const conAlergenos = tieneInformacionAlergenos(datos);
  // Declarados e inferidos no se mezclan en el mismo badge (mismo criterio que
  // `CartaVinos.tsx`): un inferido nunca puede parecer tan seguro como lo que
  // el restaurante certifica.
  const alergenosOficiales = Array.from(
    new Set(datos.oficiales.map((alergeno) => etiquetaAlergeno(alergeno, language)).filter(Boolean)),
  );
  const alergenosInferidos = Array.from(
    new Set(datos.inferidos.map((alergeno) => etiquetaAlergeno(alergeno, language)).filter(Boolean)),
  ).filter((etiqueta) => !alergenosOficiales.includes(etiqueta));
  const ingredientes = plato.displayIngredientes;
  const encuadre =
    typeof plato.imagen_posicion_y === "number"
      ? { objectPosition: `center ${Math.min(100, Math.max(0, plato.imagen_posicion_y))}%` }
      : undefined;

  return (
    <div className={`[perspective:1200px] ${expanded || infoOpen ? "h-full" : "h-auto"}`}>
      {/* Envoltorio del giro 3D: mismo patrón que `CartaVinos.tsx`. La cara
          trasera va con `backface-visibility:hidden` y en `absolute` salvo
          cuando está boca arriba, para que solo entonces ocupe sitio real. */}
      <div
        className={`relative transition-transform duration-500 [transform-style:preserve-3d] ${
          expanded || infoOpen ? "h-full" : "h-auto"
        } ${infoOpen ? "[transform:rotateY(180deg)]" : ""}`}
      >
        <div className={`${infoOpen ? "absolute inset-0 h-full" : "h-full"} [backface-visibility:hidden]`}>
          <Card className="font-libre-baskerville flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full">
            <AnimatePresence initial={false}>
              {expanded &&
                (imagen ? (
                  <motion.div
                    key="foto"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden bg-muted flex-shrink-0"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={imagen}
                        alt={plato.displayNombre}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        style={encuadre}
                        loading={prioridad ? "eager" : "lazy"}
                        decoding="async"
                        width={640}
                        height={384}
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
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden flex-shrink-0"
                  >
                    <div className="relative h-20 bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
                      <UtensilsCrossed className="w-8 h-8 text-accent/60" />
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-accent/90 text-accent-foreground shadow-sm">{categoria}</Badge>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>

            <CardHeader className="pb-2 px-5 pt-4 flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="flex-1 min-w-0 text-base md:text-lg leading-tight whitespace-normal break-words">
                  {plato.displayNombre}
                </CardTitle>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setExpanded((valor) => !valor)}
                    aria-label={`${expanded ? t.platos.hidePhoto : t.platos.viewPhoto} — ${plato.displayNombre}`}
                    className="flex items-center justify-center w-11 h-11 rounded-full bg-muted/80 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent transition-all duration-200 hover:scale-[1.03]"
                  >
                    {expanded ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInfoOpen((valor) => !valor)}
                    aria-label={`${infoOpen ? t.platos.hideInfo : t.platos.viewInfo} — ${plato.displayNombre}`}
                    className="flex items-center justify-center w-11 h-11 rounded-full bg-muted/80 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent transition-all duration-200 hover:scale-[1.03]"
                  >
                    <Info className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
              {!expanded && (
                <div className="pt-2">
                  <Badge className="bg-accent/90 text-accent-foreground shadow-sm">{categoria}</Badge>
                </div>
              )}
            </CardHeader>

            <CardFooter className="flex flex-wrap justify-between items-center gap-x-3 gap-y-2 border-t bg-muted/30 mt-auto flex-shrink-0 px-5 py-3">
              <span className="font-bold text-accent text-xl">
                {plato.precio_eur}€
                {plato.unidad && (
                  <span className="text-sm font-normal text-muted-foreground"> / {plato.unidad}</span>
                )}
              </span>
              {onAnadir && (
                <div className="flex items-center gap-2">
                  {cantidadEnPedido > 0 && (
                    <span className="text-xs font-semibold text-accent whitespace-nowrap" aria-hidden="true">
                      {t.platos.inOrder.replace("{qty}", formatearCantidad(cantidadEnPedido, plato.unidad))}
                    </span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={onAnadir}
                    aria-label={
                      cantidadEnPedido > 0
                        ? t.platos.addMoreAria
                            .replace("{name}", plato.displayNombre)
                            .replace("{qty}", formatearCantidad(cantidadEnPedido, plato.unidad))
                        : t.platos.addAria.replace("{name}", plato.displayNombre)
                    }
                    className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-4 shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
                    {t.platos.add}
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* Cara trasera: descripción (casi siempre vacía hoy) y alérgenos —
            lo mismo que antes se veía siempre en la única cara de la
            tarjeta, ahora tras la "i". */}
        <div
          className={`${infoOpen ? "relative h-auto" : "absolute inset-0 h-full"} [transform:rotateY(180deg)] [backface-visibility:hidden]`}
        >
          <Card
            className={`font-libre-baskerville flex flex-col overflow-hidden border-2 border-border/80 bg-gradient-to-br from-background to-muted/30 ${
              infoOpen ? "h-auto" : "h-full"
            }`}
          >
            <CardHeader className="pb-3 px-5 pt-4 flex-shrink-0 border-b bg-muted/20">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base md:text-lg leading-tight whitespace-normal break-words">
                    {plato.displayNombre}
                  </CardTitle>
                  <div className="pt-2">
                    <Badge className="bg-accent/90 text-accent-foreground shadow-sm">{categoria}</Badge>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInfoOpen((valor) => !valor)}
                  aria-label={`${infoOpen ? t.platos.hideInfo : t.platos.viewInfo} — ${plato.displayNombre}`}
                  className="flex items-center justify-center w-11 h-11 rounded-full bg-muted/80 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent transition-all duration-200 hover:scale-[1.03] shrink-0"
                >
                  <Info className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="px-5 py-4 flex-grow overflow-auto space-y-3">
              {plato.displayDescripcion && (
                <p className="text-sm text-muted-foreground">{plato.displayDescripcion}</p>
              )}
              {ingredientes.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">{t.platos.ingredientsTitle}</p>
                  <p className="text-sm text-muted-foreground">{ingredientes.join(", ")}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground">{t.platos.allergensTitle}</p>
                {conAlergenos ? (
                  <div className="space-y-2">
                    {alergenosOficiales.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {alergenosOficiales.map((alergeno) => (
                          <Badge key={`oficial-${alergeno}`} variant="destructive" className="text-xs">
                            {alergeno}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {alergenosInferidos.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {alergenosInferidos.map((alergeno) => (
                          <Badge key={`inferido-${alergeno}`} variant="secondary" className="text-xs">
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

            <CardFooter className="flex flex-wrap justify-between items-center gap-x-3 gap-y-2 border-t bg-muted/30 mt-auto flex-shrink-0 px-5 py-3">
              <span className="font-bold text-accent text-xl">
                {plato.precio_eur}€
                {plato.unidad && (
                  <span className="text-sm font-normal text-muted-foreground"> / {plato.unidad}</span>
                )}
              </span>
              {onAnadir && (
                <div className="flex items-center gap-2">
                  {cantidadEnPedido > 0 && (
                    <span className="text-xs font-semibold text-accent whitespace-nowrap" aria-hidden="true">
                      {t.platos.inOrder.replace("{qty}", formatearCantidad(cantidadEnPedido, plato.unidad))}
                    </span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={onAnadir}
                    aria-label={
                      cantidadEnPedido > 0
                        ? t.platos.addMoreAria
                            .replace("{name}", plato.displayNombre)
                            .replace("{qty}", formatearCantidad(cantidadEnPedido, plato.unidad))
                        : t.platos.addAria.replace("{name}", plato.displayNombre)
                    }
                    className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-4 shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
                    {t.platos.add}
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductoCard;
