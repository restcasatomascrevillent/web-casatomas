// La tienda de vinos (`/tienda`) es por ahora una MAQUETA que solo existe en la
// demo: el dueño la quiere ver en staging, no publicada. Se decide al construir,
// con la misma detección de entorno que la versión (`scripts/version.mjs`):
// en el build de producción (Vercel, `VERCEL_ENV=production`, rama `main`) no
// hay ruta, ni enlaces, ni página prerenderizada, así que `/tienda` da el 404
// normal y no sale en el sitemap. En la demo, previews y local, sí.
//
// `vite.config.ts` lo pasa a la app como `import.meta.env.VITE_TIENDA_VISIBLE`
// ("true" | "false"); `src/lib/tienda-visible.ts` lo lee.
import { detectarEntorno } from "./version.mjs";

/** ¿Se construye la tienda en este build? Todo menos producción. */
export function tiendaEnBuild(env = process.env) {
  return detectarEntorno(env) !== "produccion";
}
