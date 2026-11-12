import type { ComponentType } from "react";
import {
  Beef,
  Cake,
  Cookie,
  Fish,
  Ham,
  Salad,
  Shell,
  Snowflake,
  Soup,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import PaellaIcon from "@/components/icons/PaellaIcon";

/**
 * Un icono por categoría de platos, el mismo en el índice de `/carta` y dentro
 * de cada sección (junto al título y en «Otras secciones»). Las claves son las
 * de `CATEGORIAS_PLATOS` (`@/lib/carta-ssg`); una categoría nueva creada desde
 * el panel que no esté aquí cae en el cubierto genérico en vez de quedarse sin
 * icono.
 */
const ICONO_POR_CATEGORIA: Record<string, ComponentType<{ className?: string }>> = {
  "NOVEDADES DEL DÍA": Sparkles,
  SNACK: Cookie,
  "ENTRANTES FRÍOS": Snowflake,
  "ENTRANTES CALIENTES": Soup,
  ENSALADAS: Salad,
  SALAZONES: Ham,
  MARISCOS: Shell,
  PESCADOS: Fish,
  CARNES: Beef,
  ARROCES: PaellaIcon,
  POSTRES: Cake,
};

export function IconoCategoria({ clave, className }: { clave: string; className?: string }) {
  const Icono = ICONO_POR_CATEGORIA[clave] ?? UtensilsCrossed;
  return <Icono className={className} />;
}
