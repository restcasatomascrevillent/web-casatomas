import type { BebidaSSG, VinoSSG } from "@/lib/carta-ssg-types";

export interface Bodega {
  vinos: VinoSSG[];
  bebidas: BebidaSSG[];
}

let bodegaPedida: Promise<Bodega> | undefined;

/**
 * Vinos y bebidas del buscador de `/carta`, con una sola petición por página:
 * la comparten todos los buscadores que se monten (al volver atrás a `/carta`,
 * por ejemplo). Si falla, se olvida para poder reintentar.
 *
 * Los tests la esperan en un `beforeAll`: con la suite entera, cada `import()`
 * diferido podía tardar segundos en resolverse y el test de la bodega se
 * quedaba en «Sin resultados».
 */
export function cargarBodega(): Promise<Bodega> {
  bodegaPedida ??= Promise.all([import("virtual:carta-ssg/vinos"), import("virtual:carta-ssg/bebidas")])
    .then(([vinos, bebidas]) => ({ vinos: vinos.default.vinos ?? [], bebidas: bebidas.default.bebidas ?? [] }))
    .catch((error: unknown) => {
      bodegaPedida = undefined;
      throw error;
    });
  return bodegaPedida;
}
