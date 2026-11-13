import { esFotoCarta } from "@/lib/carta-ssg";

/**
 * Qué se pinta en el hueco de la foto de un plato.
 *
 *  - `ninguna`: no hay foto (la tarjeta pone su hueco de «sin foto»).
 *  - `foto`:    foto antigua, `<img>` quieta (object-cover + encuadre).
 *  - `sticker`: foto `-carta` (plato sobre fondo liso): `<img>` con la
 *               animación CSS `foto-sticker` (acercamiento + giro leve + brillo).
 *  - `video`:   el plato tiene `video_url`: `<video>` con la foto de póster,
 *               que arranca solo (sin sonido) al verse en pantalla.
 *
 * El vídeo solo sale después de hidratar, sin `prefers-reduced-motion` y sin
 * «Ahorro de datos» (`navigator.connection.saveData`): en el HTML
 * prerenderizado (y para quien pide menos movimiento o ahorrar datos) queda la
 * foto como `<img>` normal, que es lo que indexa Google y lo que cuenta para el
 * LCP. Sin foto no hay vídeo: la foto es el póster y el respaldo si el vídeo falla.
 */
export type ModoFotoPlato = "ninguna" | "foto" | "sticker" | "video";

export interface EntradaModoFotoPlato {
  imagen: string | null | undefined;
  video: string | null | undefined;
  /** `true` si el visitante pide menos movimiento (`prefers-reduced-motion`). */
  reducirMovimiento: boolean;
  /** `true` si el navegador pide ahorrar datos (`navigator.connection.saveData`). */
  ahorrarDatos?: boolean;
  /** `false` en el prerenderizado y en el primer render del navegador. */
  hidratado: boolean;
  /** El `<video>` dio error al cargar: se vuelve a la foto. */
  videoFallido?: boolean;
}

export function modoFotoPlato({
  imagen,
  video,
  reducirMovimiento,
  ahorrarDatos = false,
  hidratado,
  videoFallido = false,
}: EntradaModoFotoPlato): ModoFotoPlato {
  if (!imagen) return "ninguna";
  if (video && hidratado && !reducirMovimiento && !ahorrarDatos && !videoFallido) {
    return "video";
  }
  return esFotoCarta(imagen) ? "sticker" : "foto";
}

/**
 * `video_url` de la fila de `Platos`. La columna aún no existe en todas las
 * bases de datos: se lee de forma tolerante (ausente, `null`, vacía o con un
 * valor que no es una URL http(s) de vídeo → sin vídeo).
 */
export function videoDePlato(fila: unknown): string | null {
  if (!fila || typeof fila !== "object") return null;
  const valor = (fila as { video_url?: unknown }).video_url;
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return /^https:\/\/\S+$/i.test(limpio) ? limpio : null;
}
