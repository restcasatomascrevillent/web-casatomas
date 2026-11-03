import denominaciones from "./denominaciones-vino.json";

// Respaldo del mapa de vinos: el centro aproximado de la denominación de
// origen, para un vino cuya región no es una zona conocida (p. ej. el panel
// rellena solo «Galicia» para una «D.O. Rías Baixas»). Ver docs/mapa-zonas-vino.md.
// Aquí no se normaliza el texto: `origenes-vino.ts` pasa país y D.O. ya
// normalizados con `normalizarOrigen`.

export type DenominacionConocida = {
  // Texto con el que se agrupa y se muestra el punto. Si coincide con la región
  // de otros vinos (p. ej. «Rioja»), todos comparten el mismo punto en el mapa.
  nombre: string;
  coordenadas: number[];
  fuente: string;
};

// «d.o.ca. rioja» → «rioja»; «docg moscato d'asti» → «moscato d'asti».
const PREFIJO = /^(?:d\.\s?o\.?(?:\s?(?:ca|p|q)\.?)?|doca|docg|doc|doq|dop|aoc|aop|igp|igt|wo)(?:\s+|\.\s*)/;

export const claveDenominacion = (denominacionNormalizada: string) =>
  denominacionNormalizada.replace(/[’‘`´]/g, "'").replace(PREFIJO, "").trim();

// Cava, las IGP y las D.O. de varias comunidades o con subzonas muy separadas
// no están en el fichero a propósito: no tienen un centro que no engañe.
export function denominacionConocida(paisNormalizado: string, denominacionNormalizada: string): DenominacionConocida | null {
  const clave = claveDenominacion(denominacionNormalizada);
  if (!paisNormalizado || !clave) return null;
  return (denominaciones as Record<string, DenominacionConocida>)[`${paisNormalizado}|||${clave}`] ?? null;
}

// Comunidades autónomas: una región demasiado amplia para situar un vino que
// además declara una D.O. conocida (Ribera del Duero y Rueda están ambas en
// «Castilla y León»). Si no hay D.O. conocida, la región sigue valiendo.
const COMUNIDADES = new Set([
  "andalucia", "aragon", "asturias", "principado de asturias", "baleares", "islas baleares", "illes balears",
  "canarias", "islas canarias", "cantabria", "castilla y leon", "castilla-la mancha", "castilla la mancha",
  "cataluna", "catalunya", "comunidad valenciana", "comunitat valenciana", "extremadura", "galicia", "la rioja",
  "madrid", "comunidad de madrid", "murcia", "region de murcia", "navarra", "comunidad foral de navarra",
  "pais vasco", "euskadi",
]);

export const esComunidadAutonoma = (paisNormalizado: string, regionNormalizada: string) =>
  paisNormalizado === "espana" && COMUNIDADES.has(regionNormalizada);
