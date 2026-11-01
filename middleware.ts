// Routing Middleware de Vercel (no lo empaqueta Vite: lo compila Vercel al desplegar).
//
// Solo para `/404`. El SSG genera `404.html` (ruta "404" de `src/App.tsx`) y Vercel lo
// sirve con estado 404 a cualquier URL que no exista. Pero con `cleanUrls` ese mismo
// fichero también ES la página `/404`, y Vercel la servía con 200: un 404 que responde
// 200 es un «soft 404» para los buscadores. Aquí se reescribe `/404` a una ruta que no
// existe en el build, así Vercel responde lo mismo que a cualquier dirección rota: el
// `404.html` con estado 404. La dirección del navegador no cambia (es un rewrite, no
// una redirección).
//
// El `matcher` limita el middleware a esa única ruta: el resto de páginas (carta,
// idiomas, novedades) ni lo invoca ni cambia de cómo las resuelve Vercel.
// Subruta `/middleware`: solo los ayudantes de middleware, sin el resto del paquete.
import { rewrite } from "@vercel/functions/middleware";

export const config = {
  matcher: "/404",
};

/** Ruta que no existe en el build: ningún fichero ni página del SSG se llama así. */
export const RUTA_INEXISTENTE = "/__pagina-no-encontrada__";

export default function middleware(request: Request): Response {
  return rewrite(new URL(RUTA_INEXISTENTE, request.url));
}
