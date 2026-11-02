/**
 * Fotos de botella de mentira para los e2e de la carta de vinos (SVG, sin
 * binarios en el repo). Imitan lo que llega de Supabase Storage:
 *
 *  - «foto de carta» (nombre con `-carta`): lienzo 3:4 de 900x1200, botella al
 *    80 % del alto apoyada en la línea base (89 %) sobre cartulina kraft
 *    (`#d3b47e` -> `#c4a46d`, el tema `cartulina` del panel).
 *  - fotos antiguas (sin `-carta`): una 3:4 oscura con halo dorado y otra
 *    apaisada 4:3 de móvil, para comprobar que se ven enteras con
 *    `object-contain`.
 */
export type TipoFoto = "burdeos" | "borgona" | "champan" | "fina" | "magnum" | "antigua-oscura" | "antigua-apaisada";

/** Nombre de archivo que debe llevar `imagen_url` (con `-carta` solo las nuevas). */
export function archivoFoto(tipo: TipoFoto): string {
  return tipo.startsWith("antigua") ? `${tipo}.jpg` : `${tipo}-carta.webp`;
}

export function tipoDeArchivo(archivo: string): TipoFoto | null {
  const base = archivo.replace(/\.[a-z0-9]+$/i, "").replace(/-carta$/, "");
  return ["burdeos", "borgona", "champan", "fina", "magnum", "antigua-oscura", "antigua-apaisada"].includes(base) ? (base as TipoFoto) : null;
}

// ancho del cuerpo (px del lienzo), hombro (fracción del alto) y ancho del cuello
const FORMAS: Record<string, { w: number; hombro: number; cuello: number; vidrio: string; etiqueta: string }> = {
  burdeos: { w: 250, hombro: 0.3, cuello: 70, vidrio: "#1f3a2a", etiqueta: "#f1e8d2" },
  borgona: { w: 285, hombro: 0.42, cuello: 78, vidrio: "#2b3b22", etiqueta: "#efe3c8" },
  champan: { w: 330, hombro: 0.45, cuello: 92, vidrio: "#1d2a1c", etiqueta: "#f4ead2" },
  fina: { w: 200, hombro: 0.36, cuello: 58, vidrio: "#3d5a2c", etiqueta: "#f6efdc" },
  magnum: { w: 560, hombro: 0.34, cuello: 150, vidrio: "#1a2b20", etiqueta: "#f0e5cb" },
};

function botella(forma: string, cx: number, base: number, alto: number, escala = 1): string {
  const f = FORMAS[forma];
  const w = f.w * escala;
  const n = f.cuello * escala;
  const top = base - alto;
  const hombro = base - alto * (1 - f.hombro - 0.2);
  const cuelloY = top + alto * 0.2;
  const cuerpo =
    `M${cx - w / 2} ${base} L${cx - w / 2} ${hombro} C${cx - w / 2} ${hombro - alto * 0.12} ${cx - n / 2} ${hombro - alto * 0.1} ${cx - n / 2} ${cuelloY} ` +
    `L${cx - n / 2} ${top} L${cx + n / 2} ${top} L${cx + n / 2} ${cuelloY} C${cx + n / 2} ${hombro - alto * 0.1} ${cx + w / 2} ${hombro - alto * 0.12} ${cx + w / 2} ${hombro} L${cx + w / 2} ${base}Z`;
  return `
    <ellipse cx="${cx}" cy="${base}" rx="${w * 0.62}" ry="${18 * escala}" fill="rgba(74,50,16,.5)" filter="url(#blur)"/>
    <path d="${cuerpo}" fill="url(#vidrio-${forma})"/>
    <rect x="${cx - n / 2}" y="${top}" width="${n}" height="${alto * 0.09}" fill="#8e6725"/>
    <rect x="${cx - w / 2}" y="${base - alto * 0.5}" width="${w}" height="${alto * 0.26}" fill="${f.etiqueta}"/>
    <rect x="${cx - w / 2 + w * 0.12}" y="${base - alto * 0.45}" width="${w * 0.76}" height="${alto * 0.03}" fill="#8e6725" opacity=".8"/>
    <rect x="${cx - w / 2 + w * 0.2}" y="${base - alto * 0.39}" width="${w * 0.6}" height="${alto * 0.02}" fill="#3a2c18" opacity=".55"/>
    <path d="${cuerpo}" fill="url(#brillo)"/>`;
}

function defs(): string {
  const vidrios = Object.entries(FORMAS)
    .map(([k, f]) => `<linearGradient id="vidrio-${k}" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset=".25" stop-color="${f.vidrio}"/><stop offset=".7" stop-color="${f.vidrio}"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>`)
    .join("");
  return `<defs>${vidrios}
    <linearGradient id="brillo" x1="0" x2="1"><stop offset=".14" stop-color="#fff" stop-opacity="0"/><stop offset=".2" stop-color="#fff" stop-opacity=".28"/><stop offset=".27" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="kraft" cx=".5" cy=".46" r=".8"><stop offset="0" stop-color="#d3b47e"/><stop offset="1" stop-color="#c4a46d"/></radialGradient>
    <radialGradient id="vineta" cx=".5" cy=".48" r=".75"><stop offset=".6" stop-color="#5a3e14" stop-opacity="0"/><stop offset="1" stop-color="#5a3e14" stop-opacity=".12"/></radialGradient>
    <radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#b6852f" stop-opacity=".55"/><stop offset="1" stop-color="#b6852f" stop-opacity="0"/></radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="14"/></filter></defs>`;
}

function lienzo(ancho: number, alto: number, contenido: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">${defs()}${contenido}</svg>`;
}

export function svgDeFoto(tipo: TipoFoto): string {
  if (tipo === "antigua-oscura") {
    return lienzo(900, 1200, `<rect width="900" height="1200" fill="#1a1612"/><ellipse cx="450" cy="620" rx="420" ry="520" fill="url(#halo)"/>${botella("burdeos", 450, 1060, 900)}`);
  }
  if (tipo === "antigua-apaisada") {
    // Foto de móvil: 4:3, fondo gris claro, botella pequeña y descentrada.
    return lienzo(1200, 900, `<rect width="1200" height="900" fill="#e8e6e1"/><rect y="640" width="1200" height="260" fill="#cfc9bd"/>${botella("borgona", 640, 700, 560)}`);
  }
  const alto = tipo === "magnum" ? 960 : 960;
  return lienzo(900, 1200, `<rect width="900" height="1200" fill="url(#kraft)"/><rect width="900" height="1200" fill="url(#vineta)"/>${botella(tipo, 450, 1068, alto, tipo === "magnum" ? 0.7 : 1)}`);
}
