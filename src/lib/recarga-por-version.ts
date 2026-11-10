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
 *
 * Tres puertas, un solo mecanismo (la misma marca en `sessionStorage`):
 *   · `vite:preloadError` (los `import()` que pasan por el ayudante de Vite);
 *   · `importarConRecarga` en los `lazy()` (también los que Vite no envuelve);
 *   · `SectionErrorBoundary` (el error ya llegó a React).
 *
 * Super Admin › Logs: el error que provoca la recarga NO se manda en esa
 * página (se va a descargar y el evento se perdería o saldría repetido). Se
 * guarda en `sessionStorage` y sale UNA vez al volver a cargar, con
 * `props.recargado = true`, para que el panel no abra incidencias por algo
 * que se arregló solo.
 */

import { marcarRecargaEnCurso, registrarActividad, type DatosActividad, type TipoActividad } from "@/lib/actividad/registro";

const PREFIJO = "recarga-auto:";
/** Aviso pendiente de mandar tras la recarga (uno como mucho). */
export const CLAVE_AVISO = "recarga-auto-aviso";

const VERSION_BUILD = (import.meta.env.VITE_COMMIT_WEB as string | undefined) || "sin-version";

/** Errores de `import()` dinámico o de su precarga de CSS (Chrome, Firefox y Safari). */
export const esErrorDeVersionAntigua = (error: unknown): boolean => {
  const mensaje = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Failed to fetch/i.test(
    mensaje,
  );
};

interface Entorno {
  storage: Pick<Storage, "getItem" | "setItem"> & Partial<Pick<Storage, "removeItem">> | null;
  recargar: () => void;
  version: string;
  ruta?: () => string;
}

/** Lo que se manda tras la recarga: el mismo evento que se habría mandado, más `recargado`. */
export interface AvisoRecarga {
  tipo: TipoActividad;
  datos: DatosActividad;
}

const entornoNavegador = (): Entorno => {
  let storage: Entorno["storage"] = null;
  try {
    storage = window.sessionStorage;
  } catch {
    // Almacenamiento bloqueado (Safari privado): se recarga sin cortafuegos.
  }
  return { storage, recargar: () => window.location.reload(), version: VERSION_BUILD, ruta: () => window.location.pathname };
};

const mensajeDe = (error: unknown) => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));

/** El aviso por defecto: el error tal cual, como lo habría mandado `capturarErroresTempranos`. */
export const avisoDeError = (error: unknown, origen: string): AvisoRecarga => ({
  tipo: "error_promesa",
  datos: { props: { origen }, error: { mensaje: mensajeDe(error), pila: error instanceof Error ? error.stack : undefined } },
});

/**
 * Recarga la página si no se ha recargado ya por esta versión.
 * Devuelve `true` si ha pedido la recarga. Con `aviso`, lo guarda para
 * mandarlo al volver (ver `informarRecargaPendiente`).
 */
export function recargarUnaVez(entorno: Entorno = entornoNavegador(), aviso?: AvisoRecarga): boolean {
  const clave = `${PREFIJO}${entorno.version}`;
  try {
    if (entorno.storage?.getItem(clave)) return false;
    entorno.storage?.setItem(clave, String(Date.now()));
  } catch {
    // Si no se puede guardar la marca, se recarga igual: peor caso, un reintento de más.
  }
  if (aviso) {
    try {
      const ruta = aviso.datos.ruta ?? entorno.ruta?.();
      entorno.storage?.setItem(CLAVE_AVISO, JSON.stringify({ ...aviso, datos: { ...aviso.datos, ...(ruta ? { ruta } : {}) }, version: entorno.version }));
    } catch {
      // Sin almacenamiento el aviso se pierde: la recarga es lo importante.
    }
  }
  // Los errores que salten mientras la página se descarga son ruido de esta misma recarga.
  marcarRecargaEnCurso();
  entorno.recargar();
  return true;
}

/**
 * Tras una recarga automática: manda (una vez) el error que la provocó, con
 * `props.recargado = true` y la build que falló en `props.despliegue_anterior`.
 * Va a la cola de `registrarActividad`, que lo entrega cuando se instala el
 * rastreador. Devuelve `true` si había aviso.
 */
export function informarRecargaPendiente(entorno: Entorno = entornoNavegador()): boolean {
  let texto: string | null = null;
  try {
    texto = entorno.storage?.getItem(CLAVE_AVISO) ?? null;
    if (texto) entorno.storage?.removeItem?.(CLAVE_AVISO);
  } catch {
    return false;
  }
  if (!texto) return false;
  try {
    const aviso = JSON.parse(texto) as AvisoRecarga & { version?: string };
    if (!aviso || typeof aviso.tipo !== "string") return false;
    registrarActividad(aviso.tipo, {
      ...aviso.datos,
      props: { ...(aviso.datos?.props ?? {}), recargado: true, ...(aviso.version ? { despliegue_anterior: aviso.version } : {}) },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Para los `lazy()`: si el `import()` falla por versión antigua, recarga una
 * vez (misma marca que el resto). Si ya se recargó, el error sigue su curso
 * (lo recoge el `SectionErrorBoundary` o `unhandledrejection`).
 */
export function importarConRecarga<T>(cargar: () => Promise<T>, entorno?: () => Entorno): () => Promise<T> {
  return () =>
    cargar().catch((error: unknown) => {
      if (typeof window !== "undefined" && esErrorDeVersionAntigua(error)) {
        recargarUnaVez(entorno ? entorno() : entornoNavegador(), avisoDeError(error, "lazy"));
      }
      throw error;
    });
}

/**
 * Vite (5.4) lanza `vite:preloadError` en `window` cuando falla cualquier
 * `import()` dinámico que pase por su ayudante, o su precarga (JS o CSS),
 * esté o no dentro de un `SectionErrorBoundary`. No se cancela el evento: si
 * ya se recargó por esta versión, el error sigue su curso y la sección enseña
 * «Recargar página». Al instalarse, manda el aviso de la recarga anterior.
 */
export function instalarRecargaPorVersion(objetivo: Pick<Window, "addEventListener"> = window, entorno?: () => Entorno): void {
  const e = () => (entorno ? entorno() : entornoNavegador());
  informarRecargaPendiente(e());
  objetivo.addEventListener("vite:preloadError", (ev) => {
    const error = (ev as Event & { payload?: unknown }).payload ?? new Error("vite:preloadError");
    recargarUnaVez(e(), avisoDeError(error, "vite:preloadError"));
  });
}
