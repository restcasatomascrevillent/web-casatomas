/**
 * Módulo virtual que sirve el plugin `novedades-ssg` de `vite.config.ts`.
 * El contenido lo descarga `scripts/novedades-ssg.mjs` de Supabase en cada
 * build. Filas sin tipar a propósito (igual que el `data as Novedad[]` que
 * ya hacía `NovedadesSection.tsx` con la respuesta de Supabase en runtime):
 * es este módulo virtual el que decide qué columnas sobreviven.
 */
declare module "virtual:novedades-ssg" {
  interface NovedadesSSG {
    generadoEn: string;
    novedades: Record<string, unknown>[];
  }
  const novedades: NovedadesSSG;
  export default novedades;
}
