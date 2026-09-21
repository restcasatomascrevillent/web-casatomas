import { UtensilsCrossed } from "lucide-react";
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
import type { Language } from "@/i18n/types";

interface ProductoCardProps {
  /** Ya resuelto al idioma activo (`resolveTranslatedItem`/`agruparPorCategoria`, NO el plato crudo). */
  plato: ItemTraducido<PlatoSSG>;
  /** Categoría ya traducida, para la etiqueta de la tarjeta. */
  categoria: string;
  /** La primera fila de la rejilla no se carga en diferido: es el LCP. */
  prioridad?: boolean;
}

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "");

const ETIQUETAS: Record<Language, { alergenos: string }> = {
  es: { alergenos: "Alérgenos" },
  en: { alergenos: "Allergens" },
  fr: { alergenos: "Allergènes" },
};

/**
 * Tarjeta de plato para las páginas de carta.
 *
 * Es la misma tarjeta de `CartaPlatos` (mismo `Card`, mismo `Badge` de
 * categoría, mismo precio en `text-accent`, misma tipografía y el mismo
 * `hover:-translate-y-1`) con una diferencia deliberada: aquí NO hay nada
 * plegado. En la portada la foto vive tras el botón del ojo y los alérgenos
 * tras el giro de la tarjeta; en una página pensada para indexarse, todo lo
 * que está en el HTML tiene que verse sin tocar nada.
 */
const ProductoCard = ({ plato, categoria, prioridad = false }: ProductoCardProps) => {
  const { language } = useTranslations();
  const etiquetas = ETIQUETAS[language];
  const imagen = resolverImagen(plato.imagen_url, SUPABASE_URL);
  // Mismo vocabulario que la portada (`@/lib/alergenos`): las formas del panel
  // (`frutos_cascara`) y las de la BD (`frutos de cáscara`) son un solo token.
  const datos = datosAlergenos(plato);
  const alergenos = Array.from(
    new Set(
      [...datos.oficiales, ...datos.inferidos]
        .map((alergeno) => etiquetaAlergeno(alergeno, language))
        .filter(Boolean),
    ),
  );
  const encuadre =
    typeof plato.imagen_posicion_y === "number"
      ? { objectPosition: `center ${Math.min(100, Math.max(0, plato.imagen_posicion_y))}%` }
      : undefined;

  return (
    // Sin `h-full`: la rejilla usa `items-start`, así cada tarjeta mide lo que
    // necesita. Con estiramiento, las 71 fichas sin foto quedaban con un hueco
    // enorme entre el nombre y el precio para igualar la altura de las que sí
    // la tienen.
    <Card className="font-libre-baskerville flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {imagen ? (
        <div className="relative h-48 overflow-hidden bg-muted flex-shrink-0">
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
      ) : (
        // Sin foto la tarjeta no se deforma: la franja mantiene la altura del
        // resto de la rejilla. 71 de los 128 platos están en este caso.
        <div className="relative h-20 bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center flex-shrink-0">
          <UtensilsCrossed className="w-8 h-8 text-accent/60" />
          <div className="absolute top-2 right-2">
            <Badge className="bg-accent/90 text-accent-foreground shadow-sm">{categoria}</Badge>
          </div>
        </div>
      )}

      <CardHeader className="pb-2 px-5 pt-4 flex-shrink-0">
        <CardTitle className="text-base md:text-lg leading-tight whitespace-normal break-words">
          {plato.displayNombre}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-5 pb-3">
        {/* Las descripciones están vacías en las 128 filas (en los tres
            idiomas): no se inventa ninguna. Lo que sí aporta valor real al
            visitante son los alérgenos. */}
        {plato.displayDescripcion && (
          <p className="text-sm text-muted-foreground mb-3">{plato.displayDescripcion}</p>
        )}
        {tieneInformacionAlergenos(datos) ? (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">{etiquetas.alergenos}</p>
            <div className="flex flex-wrap gap-1">
              {alergenos.map((alergeno) => (
                <Badge key={alergeno} variant="secondary" className="text-xs font-normal">
                  {alergeno}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          // No es "no tiene alérgenos": es que no consta el dato. Se dice así.
          <p className="text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded">
            {AVISO_SIN_ALERGENOS[language]}
          </p>
        )}
        {/* La nota es lo más útil que hay en muchas fichas ("Disponible sin
            gluten con pan sin gluten") y no se pintaba en las páginas
            indexables, solo en la tarjeta girable de la portada. */}
        {plato.displayAlergenosNotas && (
          <p className="mt-2 text-xs italic text-destructive bg-destructive/10 px-2 py-1.5 rounded">
            {plato.displayAlergenosNotas}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex justify-between items-center border-t bg-muted/30 flex-shrink-0 px-5 py-3">
        <span className="font-bold text-accent text-xl">
          {plato.precio_eur}€
          {plato.unidad && (
            <span className="text-sm font-normal text-muted-foreground"> / {plato.unidad}</span>
          )}
        </span>
      </CardFooter>
    </Card>
  );
};

export default ProductoCard;
