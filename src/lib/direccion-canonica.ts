/**
 * Dirección canónica: minúsculas, sin barras dobles ni barra final.
 *
 * El router del navegador (react-router) casa las rutas SIN distinguir
 * mayúsculas y Vercel SÍ las distingue. En `/Carta`, `/carta/Vinos` o
 * `/En/carta`, Vercel no encuentra el fichero y sirve el `404.html` (con estado
 * 404), pero el router casa la ruta de verdad (`carta`, `carta/vinos`…) y monta
 * esa página encima del HTML del 404. No coinciden, así que React avisa
 * (errores #418/#422/#423), tira el HTML y vuelve a pintar todo. Con barras
 * dobles (`/carta//vinos`) pasa lo contrario: llega una página y el router
 * pinta el 404. Lo vimos apretando la web en producción (21/11/2026).
 *
 * Aquí, ANTES de montar React, una dirección así va a la canónica
 * (`location.replace`, sin dejar la mala en el historial), y la del 404 no se
 * llega a hidratar. Todas las rutas de la web son minúsculas (lo comprueba
 * `src/__tests__/direccion-canonica.test.ts` contra el árbol de rutas). La
 * búsqueda (`?token=…`) y el ancla (`#…`) no se tocan: ahí sí puede haber
 * mayúsculas que importan.
 */

/** Pasa `pathname` a su forma canónica. Idempotente: la canónica de una canónica es ella misma. */
export function direccionCanonica(pathname: string): string {
  const canonica = pathname
    .replace(/\/{2,}/g, "/")
    .toLowerCase()
    // `%c3%91` y `%C3%91` son lo mismo: el navegador escribe los escapes en mayúsculas.
    .replace(/%[0-9a-f]{2}/g, (escape) => escape.toUpperCase());
  return canonica.length > 1 && canonica.endsWith("/") ? canonica.slice(0, -1) : canonica || "/";
}

/** Selector que no existe: vite-react-ssg no monta React mientras el navegador se va a la canónica. */
export const SIN_CONTENEDOR = "#__redirigiendo-a-la-direccion-canonica__";

const CLAVE = "ct_direccion_canonica";

type Ubicacion = Pick<Location, "pathname" | "search" | "hash" | "replace">;
type Almacen = Pick<Storage, "getItem" | "setItem">;

/**
 * Si la dirección no es canónica, se va a la canónica y devuelve `true`
 * (entonces no hay que montar React). Una sola vez por dirección y pestaña: si
 * algo devolviera a la no canónica, se queda y se monta como siempre, sin bucle.
 */
export function irADireccionCanonica(ubicacion: Ubicacion, almacen: Almacen | null): boolean {
  const canonica = direccionCanonica(ubicacion.pathname);
  if (canonica === ubicacion.pathname) return false;
  try {
    if (almacen?.getItem(CLAVE) === ubicacion.pathname) return false;
    almacen?.setItem(CLAVE, ubicacion.pathname);
  } catch {
    // Sin almacenamiento (modo privado estricto): la canónica es idempotente, no hay bucle posible.
  }
  try {
    ubicacion.replace(`${canonica}${ubicacion.search}${ubicacion.hash}`);
    return true;
  } catch {
    return false; // Si el navegador no deja ir, se monta aquí como siempre.
  }
}

/** En el navegador: lo de arriba con `window.location` y `sessionStorage`, ocultando el 404 mientras se va. */
export function irADireccionCanonicaEnElNavegador(): boolean {
  if (typeof window === "undefined") return false;
  let almacen: Almacen | null = null;
  try {
    almacen = window.sessionStorage;
  } catch {
    almacen = null;
  }
  const va = irADireccionCanonica(window.location, almacen);
  // Que no se vea un instante el «404» mientras llega la página buena.
  if (va) document.documentElement.style.visibility = "hidden";
  return va;
}
