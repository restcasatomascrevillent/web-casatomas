/**
 * Variantes redimensionadas del logo (src/assets/logo-casa-tomas.png, 800×550).
 *
 * El original pesaba ~98 KB y se servía a tamaño completo tanto en el header
 * (48 px de alto) como en el hero. Estas variantes son PNG de paleta de 16
 * colores: el logo es negro sobre transparente, así que el PNG cuantizado sale
 * más pequeño que AVIF/WebP con igual o menor error visual y sin necesidad de
 * `<picture>` ni fallback.
 *
 * Regenerar: script `gen-logo-final.cjs` (sharp, `resize` lanczos3 +
 * `png({ palette: true, colors: 16, dither: 0 })`) sobre el PNG original.
 * vite.config.ts desactiva el inline base64 para esta carpeta.
 */
import logo70 from "./logo-casa-tomas-70.png";
import logo140 from "./logo-casa-tomas-140.png";
import logo210 from "./logo-casa-tomas-210.png";
import logo384 from "./logo-casa-tomas-384.png";
import logo512 from "./logo-casa-tomas-512.png";
import logo800 from "./logo-casa-tomas-800.png";

/** Dimensiones intrínsecas (proporción) para `width`/`height` y evitar CLS. */
export const LOGO_WIDTH = 800;
export const LOGO_HEIGHT = 550;

/** Logo pequeño del header (h-10/h-12 → ~58/70 px de ancho). */
export const logoSmall = {
  src: logo140,
  srcSet: `${logo70} 70w, ${logo140} 140w, ${logo210} 210w, ${logo384} 384w`,
};

/** Logo grande del hero (w-64 / md:w-96 / lg:w-[28rem]). */
export const logoHero = {
  src: logo512,
  srcSet: `${logo384} 384w, ${logo512} 512w, ${logo800} 800w`,
  sizes: "(min-width: 1024px) 448px, (min-width: 768px) 384px, 256px",
};

/**
 * Ticket del pedido (h-24 → ~140 px de ancho). Un único `src` nítido a 2×:
 * html-to-image vacía `srcset` al capturar y exporta con `pixelRatio: 2`.
 */
export const logoTicket = logo384;
