/**
 * Recarga automática cuando la pestaña se ha quedado con una versión antigua.
 *
 * Cada release cambia los hashes de `/assets`. Una pestaña abierta desde antes
 * pide al navegar ficheros que ya no existen: el `import()` de la sección (o
 * el CSS que precarga) falla y la sección no se pinta. Recargar una vez trae
 * el `index.html` nuevo con los hashes buenos y se resuelve solo.
 *
 * Una sola recarga por versión: la marca lleva el commit de la build que
 * falló. Si tras recargar la misma build sigue fallando (sin red de verdad,
 * un fichero perdido), no hay bucle. Si más tarde llega otra release a esa
 * misma pestaña, el commit es otro y se vuelve a permitir.
 */

const PREFIJO = "recarga-auto:";

const VERSION_BUILD = (import.meta.env.VITE_COMMIT_WEB as string | undefined) || "sin-version";

/** Errores de `import()` dinámico o de su precarga de CSS (Chrome, Firefox y Safari). */
export const esErrorDeVersionAntigua = (error: unknown): boolean => {
  const mensaje = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Failed to fetch/i.test(
    mensaje,
  );
};

interface Entorno {
  storage: Pick<Storage, "getItem" | "setItem"> | null;
  recargar: () => void;
  version: string;
}

const entornoNavegador = (): Entorno => {
  let storage: Entorno["storage"] = null;
  try {
    storage = window.sessionStorage;
  } catch {
    // Almacenamiento bloqueado (Safari privado): se recarga sin cortafuegos.
  }
  return { storage, recargar: () => window.location.reload(), version: VERSION_BUILD };
};

/**
 * Recarga la página si no se ha recargado ya por esta versión.
 * Devuelve `true` si ha pedido la recarga.
 */
export function recargarUnaVez(entorno: Entorno = entornoNavegador()): boolean {
  const clave = `${PREFIJO}${entorno.version}`;
  try {
    if (entorno.storage?.getItem(clave)) return false;
    entorno.storage?.setItem(clave, String(Date.now()));
  } catch {
    // Si no se puede guardar la marca, se recarga igual: peor caso, un reintento de más.
  }
  entorno.recargar();
  return true;
}

/**
 * Vite (5.4) lanza `vite:preloadError` en `window` cuando falla cualquier
 * `import()` dinámico o su precarga (JS o CSS), esté o no dentro de un
 * `SectionErrorBoundary`. No se cancela el evento: si ya se recargó por esta
 * versión, el error sigue su curso y la sección enseña «Recargar página».
 */
export function instalarRecargaPorVersion(objetivo: Pick<Window, "addEventListener"> = window, entorno?: () => Entorno): void {
  objetivo.addEventListener("vite:preloadError", () => {
    recargarUnaVez(entorno ? entorno() : entornoNavegador());
  });
}
