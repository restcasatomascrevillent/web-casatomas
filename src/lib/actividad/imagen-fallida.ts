/**
 * Una imagen de la web que no carga: ¿se ha cortado la conexión del visitante o falla la web? (CAS-17)
 *
 * Las dos veces que la lámpara de la cabecera de la carta
 * (`/assets/lampara-1400w-….avif`) «no cargó» (18 y 19/11/2026), el móvil del
 * visitante estaba perdiendo la cobertura: la primera, las peticiones tardaban
 * 5–7 s (lo normal son 0,35 s) y fallaron cuatro imágenes en el mismo
 * milisegundo; la segunda, dos peticiones a Supabase se quedaron sin respuesta
 * 30 ms antes. El fichero estaba (200, 34 KB). Aun así llegaba a Super Admin ›
 * Logs como «Fallo de la web» y abría ticket.
 *
 * Ahora, antes de apuntarla:
 *   1. Si el navegador dice que no hay red, se espera a que vuelva (máx. 30 s);
 *      si hay, se deja pasar un momento.
 *   2. Se vuelve a pedir la imagen UNA vez. Si carga, la imagen se repinta (el
 *      visitante la ve) y se apunta como «recuperada al reintentar».
 *   3. Si tampoco carga, se pregunta al servidor por ese fichero: si no
 *      contesta, es la conexión («sin_conexion»); si contesta (404, 500 o un
 *      fichero que el navegador no sabe pintar), es un fallo de la web y se
 *      apunta como siempre.
 * Así un fichero que de verdad falta o está roto sigue abriendo ticket.
 */

export type ResultadoImagen = "recuperada" | "sin_conexion" | "rota";

/** `accion` con la que se apunta cada caso (el panel: logs-web/origen.ts). Rota: sin `accion` (fallo de la web). */
export const ACCION_IMAGEN: Record<Exclude<ResultadoImagen, "rota">, string> = {
  recuperada: "recuperada_al_reintentar",
  sin_conexion: "sin_conexion",
};

export const ESPERA_REINTENTO_MS = 1_500;
export const ESPERA_CONEXION_MS = 30_000;

export interface EntornoImagen {
  /** `navigator.onLine`: `false` es fiable (no hay red); `true` no garantiza nada. */
  enLinea: () => boolean | undefined;
  /** Resuelve `true` cuando vuelve la red (evento `online`) o `false` si no vuelve a tiempo. */
  esperarConexion: (maxMs: number) => Promise<boolean>;
  esperar: (ms: number) => Promise<void>;
  /** Vuelve a pedir la imagen (fuera de la página) y dice si carga. */
  cargar: (url: string) => Promise<boolean>;
  /** Pregunta al servidor por el fichero: «red» si no contesta; si contesta, su estado HTTP. */
  sondear: (url: string) => Promise<"red" | number>;
}

export function entornoDelNavegador(pedir: typeof fetch): EntornoImagen {
  return {
    enLinea: () => (typeof navigator !== "undefined" ? navigator.onLine : undefined),
    esperarConexion: (maxMs) =>
      new Promise((resolver) => {
        const listo = (ok: boolean) => {
          clearTimeout(limite);
          window.removeEventListener("online", alVolver);
          resolver(ok);
        };
        const alVolver = () => listo(true);
        const limite = setTimeout(() => listo(false), maxMs);
        window.addEventListener("online", alVolver);
      }),
    esperar: (ms) => new Promise((resolver) => setTimeout(resolver, ms)),
    cargar: (url) =>
      new Promise((resolver) => {
        const img = new Image();
        img.onload = () => resolver(true);
        img.onerror = () => resolver(false);
        img.src = url;
      }),
    sondear: async (url) => {
      const control = typeof AbortController === "function" ? new AbortController() : null;
      try {
        // Sin caché (que pregunte de verdad) y cortando en cuanto llegan las cabeceras: solo interesa el estado.
        const res = await pedir(url, { cache: "no-store", credentials: "same-origin", signal: control?.signal });
        control?.abort();
        return res.status;
      } catch {
        return "red";
      }
    },
  };
}

/** Decide por qué no cargó la imagen `url` (ver la cabecera del fichero). */
export async function comprobarImagenFallida(url: string, entorno: EntornoImagen): Promise<ResultadoImagen> {
  if (entorno.enLinea() === false) {
    if (!(await entorno.esperarConexion(ESPERA_CONEXION_MS))) return "sin_conexion";
  } else {
    await entorno.esperar(ESPERA_REINTENTO_MS);
  }
  if (await entorno.cargar(url)) return "recuperada";
  return (await entorno.sondear(url)) === "red" ? "sin_conexion" : "rota";
}

/** Como mucho, estas comprobaciones por imagen y carga de página; las siguientes se apuntan tal cual. */
export const MAX_COMPROBACIONES_POR_IMAGEN = 3;

/**
 * Vuelve a pedir la imagen al propio `<img>` para que el visitante la vea
 * (ya está en la caché del navegador tras `cargar`). Volver a poner el mismo
 * `src`/`srcset` hace que el navegador elija y cargue otra vez la fuente,
 * también dentro de un `<picture>`. React no se entera: el valor no cambia.
 */
export function repintarImagen(img: HTMLImageElement): void {
  if (!img.isConnected) return;
  const srcset = img.getAttribute("srcset");
  if (srcset !== null) img.setAttribute("srcset", srcset);
  const src = img.getAttribute("src");
  if (src !== null) img.setAttribute("src", src);
}
