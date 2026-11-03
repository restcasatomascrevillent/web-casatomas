// Estética de Navidad de la web pública. De momento solo en la DEMO: el dueño
// la quiere ver en staging antes de decidir. Se decide al construir, con la
// misma detección de entorno que la versión (`scripts/version.mjs`) y que la
// tienda maqueta (`scripts/tienda-maqueta.mjs`): en el build de producción
// (Vercel, `VERCEL_ENV=production`, rama `main`) no llega nada navideño, ni
// componentes (el `define` deja `NAVIDAD` en `false` y Rollup los quita) ni
// estilos (`virtual:navidad.css` resuelve a un CSS vacío, ver `vite.config.ts`).
//
// `vite.config.ts` lo pasa a la app como `import.meta.env.VITE_NAVIDAD`
// ("true" | "false"); `src/lib/navidad.ts` lo lee.
//
// CÓMO ACTIVARLA EN PRODUCCIÓN MÁS ADELANTE (no está activado): cuando el dueño
// lo pida, en producción valdría solo dentro de la temporada, p. ej. del 1 de
// diciembre al 6 de enero (Reyes), con la fecha del build:
//
//   export function enTemporada(fecha = new Date()) {
//     const mes = fecha.getMonth() + 1, dia = fecha.getDate();
//     return mes === 12 || (mes === 1 && dia <= 6);
//   }
//   export function navidadEnBuild(env = process.env, fecha = new Date()) {
//     return detectarEntorno(env) !== "produccion" || enTemporada(fecha);
//   }
//
// Como es la fecha del BUILD, haría falta un despliegue el 1 de diciembre y
// otro el 7 de enero (un cron de Vercel o un commit cualquiera) para encenderla
// y apagarla a tiempo.
import { detectarEntorno } from "./version.mjs";

/** ¿Lleva este build la estética de Navidad? Todo menos producción. */
export function navidadEnBuild(env = process.env) {
  return detectarEntorno(env) !== "produccion";
}
