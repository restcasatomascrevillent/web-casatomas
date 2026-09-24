import type { ImgHTMLAttributes } from "react";

import manifest from "@/assets/responsive/manifest";

/**
 * Fotos del sitio en AVIF/WebP a varios anchos (`src/assets/responsive/`).
 *
 * Las variantes se generan fuera del build con `sharp` a partir de los JPG
 * originales de `src/assets/` (que se conservan como máster pero ya no se
 * importan, así que no se publican). `manifest.ts` guarda las dimensiones del
 * original y los anchos generados; el glob resuelve cada fichero a su URL con
 * hash en `/assets`, servida como `immutable`.
 *
 * Motivo: los JPG de 1050–1400 px (150–340 KB) se pintaban a 250–400 px de alto
 * y eran lo más pesado de la portada en Fast Data Transfer de Vercel.
 */
const urls = import.meta.glob<string>("/src/assets/responsive/*.{avif,webp,jpg}", {
  eager: true,
  query: "?url",
  import: "default",
});

type Entrada = { width: number; height: number; widths: readonly number[]; fallback: number };
export type NombreImagen = keyof typeof manifest;

const url = (nombre: string, ancho: number, ext: string) => {
  const u = urls[`/src/assets/responsive/${nombre}-${ancho}w.${ext}`];
  if (!u) throw new Error(`Falta la variante ${nombre}-${ancho}w.${ext} en src/assets/responsive/`);
  return u;
};

const srcSet = (nombre: string, e: Entrada, ext: string) =>
  e.widths.map((w) => `${url(nombre, w, ext)} ${w}w`).join(", ");

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "sizes" | "width" | "height"> & {
  nombre: NombreImagen;
  /** Ancho real con el que se pinta la imagen (atributo `sizes`). */
  sizes: string;
};

/**
 * `<picture>` con AVIF → WebP → JPG. El `<picture>` va con `display: contents`
 * para que el `<img>` siga maquetándose exactamente igual que antes (mismas
 * clases, mismo `h-full`/`object-cover` respecto al contenedor).
 */
const ImagenResponsive = ({ nombre, sizes, ...img }: Props) => {
  const e = manifest[nombre] satisfies Entrada;
  return (
    <picture className="contents">
      <source type="image/avif" srcSet={srcSet(nombre, e, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(nombre, e, "webp")} sizes={sizes} />
      <img src={url(nombre, e.fallback, "jpg")} width={e.width} height={e.height} {...img} />
    </picture>
  );
};

export default ImagenResponsive;
