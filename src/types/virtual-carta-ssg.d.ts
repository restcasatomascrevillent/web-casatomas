/**
 * Módulos virtuales que sirve el plugin `carta-ssg` de `vite.config.ts`.
 * El contenido lo descarga `scripts/carta-ssg.mjs` de Supabase en cada build.
 *
 * Son tres para que la portada no cargue con las 185 filas de vinos ni con las
 * 75 de bebidas: solo `virtual:carta-ssg` entra en el bundle de la home.
 */
declare module "virtual:carta-ssg" {
  import type { CartaSSG } from "@/lib/carta-ssg-types";
  const carta: CartaSSG;
  export default carta;
}

declare module "virtual:carta-ssg/vinos" {
  import type { VinosSSG } from "@/lib/carta-ssg-types";
  const vinos: VinosSSG;
  export default vinos;
}

declare module "virtual:carta-ssg/bebidas" {
  import type { BebidasSSG } from "@/lib/carta-ssg-types";
  const bebidas: BebidasSSG;
  export default bebidas;
}

declare module "virtual:carta-ssg/tienda" {
  import type { TiendaSSG } from "@/lib/carta-ssg-types";
  const tienda: TiendaSSG;
  export default tienda;
}

declare module "virtual:carta-ssg/tienda-visible" {
  import type { TiendaVisibleSSG } from "@/lib/carta-ssg-types";
  const tiendaVisible: TiendaVisibleSSG;
  export default tiendaVisible;
}
