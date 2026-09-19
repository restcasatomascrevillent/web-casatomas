import { UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeAlergenos } from "@/lib/carta-i18n";
import { resolverImagen } from "@/lib/carta-ssg";
import type { PlatoSSG } from "@/lib/carta-ssg-types";

interface ProductoCardProps {
  plato: PlatoSSG;
  /** Categoría ya traducida, para la etiqueta de la tarjeta. */
  categoria: string;
  /** La primera fila de la rejilla no se carga en diferido: es el LCP. */
  prioridad?: boolean;
}

const capitalizar = (valor: string) => {
  const limpio = valor.trim();
  return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase() : "";
};

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "");

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
  const imagen = resolverImagen(plato.imagen_url, SUPABASE_URL);
  const alergenos = Array.from(
    new Set(
      [
        ...normalizeAlergenos(plato.alergenos_oficiales),
        ...normalizeAlergenos(plato.alergenos_inferidos),
      ]
        .map(capitalizar)
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
            alt={plato.nombre}
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
          {plato.nombre}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-5 pb-3">
        {/* Las descripciones están vacías en las 128 filas: no se inventa ninguna.
            Lo que sí aporta valor real al visitante son los alérgenos. */}
        {plato.descripcion && (
          <p className="text-sm text-muted-foreground mb-3">{plato.descripcion}</p>
        )}
        {alergenos.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">Alérgenos</p>
            <div className="flex flex-wrap gap-1">
              {alergenos.map((alergeno) => (
                <Badge key={alergeno} variant="secondary" className="text-xs font-normal">
                  {alergeno}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Alérgenos: consúltanos en el restaurante</p>
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
