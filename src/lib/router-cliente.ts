import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { registrarRouter } from "@/lib/recarga-por-version";

/**
 * Router del navegador (vite-react-ssg, `customCreateRouter`), SIN los
 * cargadores de datos estáticos que añade vite-react-ssg a TODAS las rutas.
 *
 * Esos cargadores, en la primera navegación dentro de la pestaña, piden
 * `/static-loader-data-manifest-<hash>.json` y luego
 * `/static-loader-data/<ruta>.<hash>.json`, con un hash al azar de CADA build.
 * Tras publicar (o tras cualquier rebuild del panel) esos ficheros ya no
 * existen: la respuesta es el 404 en HTML, `JSON.parse` revienta
 * («Unexpected token '<'») y react-router pinta su pantalla de error
 * («Unexpected Application Error!») sin recargar ni dejar rastro en Logs.
 * La web no usa datos de cargadores (`useLoaderData`): la carta y las
 * novedades van en módulos virtuales (ver `vite.config.ts`), así que quitarlos
 * no cambia nada salvo esas peticiones.
 *
 * También deja el router a mano de `recarga-por-version` para saber adónde
 * iba una navegación que falló.
 */
export function quitarCargadores(rutas: RouteObject[]): RouteObject[] {
  return rutas.map((ruta) => {
    const { loader: _loader, children, ...resto } = ruta;
    return (children ? { ...resto, children: quitarCargadores(children) } : resto) as RouteObject;
  });
}

export const crearRouterCliente: typeof createBrowserRouter = (rutas, opciones) => {
  const router = createBrowserRouter(quitarCargadores(rutas), opciones);
  registrarRouter(router);
  return router;
};
