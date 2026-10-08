import { PLANTILLA_REGALO, textoRegalo, type PlantillaRegalo, type ChequeRegalo } from "./plantilla.ts";

export interface FuenteRegalo {
  name: string; encodeText: (texto: string) => unknown; widthOfTextAtSize: (texto: string, size: number) => number;
}
export type FuentesRegalo = { fuente: FuenteRegalo; negrita: FuenteRegalo; serif: FuenteRegalo; cursiva: FuenteRegalo };
type Color = { red: number; green: number; blue: number };
type Rectangulo = { x: number; y: number; width: number; height: number; color?: Color; borderColor?: Color; borderWidth?: number };
type Texto = { x: number; y: number; size: number; font: FuenteRegalo; color: Color };
export interface DibujanteRegalo {
  nuevaPagina: () => void; rectangulo: (o: Rectangulo) => void; texto: (contenido: string, o: Texto) => void;
  imagen: (o: { x: number; y: number; width: number; height: number }) => void;
}
const rgb = (red: number, green: number, blue: number): Color => ({ red, green, blue });

/** Un solo diseño para el PDF enviado y la vista local; no crea ni serializa un PDF. */
export async function trazarRegalo(cheque: ChequeRegalo, plantilla: PlantillaRegalo, fuentes: FuentesRegalo, logoPorDefecto: string,
  cargarLogo: (data: string) => Promise<{ width: number; height: number }>, dibujar?: DibujanteRegalo): Promise<string[]> {
  const p = { ...PLANTILLA_REGALO, ...plantilla };
  const { fuente, negrita, serif, cursiva } = fuentes;
  const color = (hex: string) => rgb(...([1,3,5].map(i => parseInt(hex.slice(i,i + 2),16) / 255) as [number,number,number]));
  const acento = color(/^#[\da-f]{6}$/i.test(p.color_acento) ? p.color_acento : PLANTILLA_REGALO.color_acento);
  const fondo = color(/^#[\da-f]{6}$/i.test(p.color_fondo) ? p.color_fondo : PLANTILLA_REGALO.color_fondo);
  const tinta = rgb(.20,.20,.20), suave = rgb(.39,.37,.35);
  const ancho = 595.28, alto = 841.89;
  const safe = (text: string) => Array.from(String(text)).map(c => {
    if (/\s/.test(c)) return c;
    try { fuente.encodeText(c); return c; } catch { return "?"; }
  }).join("");
  dibujar?.nuevaPagina();
  let y = 0;
  const paginas: string[][] = [[]];
  const escapar = (valor: string) => valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const svgColor = (c: Color) => `rgb(${[c.red,c.green,c.blue].map(v => Math.round(v * 255)).join(",")})`;
  const agregar = (trazo: string) => paginas[paginas.length - 1].push(trazo);
  const rectangulo = (o: { x: number; y: number; width: number; height: number; color?: Color; borderColor?: Color; borderWidth?: number }) => {
    dibujar?.rectangulo(o);
    agregar(`<rect x="${o.x}" y="${alto - o.y - o.height}" width="${o.width}" height="${o.height}" fill="${o.color ? svgColor(o.color) : "none"}" stroke="${o.borderColor ? svgColor(o.borderColor) : "none"}" stroke-width="${o.borderWidth || 0}"/>`);
  };
  const texto = (contenido: string, o: { x: number; y: number; size: number; font: FuenteRegalo; color: Color }) => {
    dibujar?.texto(contenido, o);
    const familia = o.font.name.startsWith("Times") ? "'Times New Roman',Times,serif" : "Arial,Helvetica,sans-serif";
    agregar(`<text x="${o.x}" y="${alto - o.y}" font-size="${o.size}" font-family="${familia}" font-weight="${o.font.name.includes("Bold") ? "700" : "400"}" font-style="${o.font.name.includes("Italic") ? "italic" : "normal"}" fill="${svgColor(o.color)}" xml:space="preserve">${escapar(contenido)}</text>`);
  };
  const decorar = () => {
    rectangulo({ x: 0, y: 0, width: ancho, height: alto, color: fondo });
    rectangulo({ x: 30, y: 30, width: ancho - 60, height: alto - 60, borderWidth: .7, borderColor: acento });
    texto("CASA TOMÁS · CREVILLENT", { x: 48, y: 48, size: 8, font: fuente, color: suave });
    texto(String(paginas.length), { x: ancho - 52, y: 48, size: 8, font: fuente, color: suave });
  };
  const envolver = (text: string, font: FuenteRegalo, size: number, width = 465) => {
    const lineas: string[] = [];
    for (const parrafo of safe(text).split(/\r?\n/)) {
      let linea = "";
      for (const palabra of parrafo.split(/\s+/)) {
        let trozo = "";
        const trozos: string[] = [];
        for (const c of palabra) {
          if (font.widthOfTextAtSize(trozo + c, size) > width) { trozos.push(trozo); trozo = ""; }
          trozo += c;
        }
        trozos.push(trozo);
        for (const parte of trozos) {
          const candidata = linea ? linea + " " + parte : parte;
          if (font.widthOfTextAtSize(candidata, size) > width && linea) { lineas.push(linea); linea = parte; }
          else linea = candidata;
        }
      }
      lineas.push(linea);
    }
    return lineas;
  };
  const asegurar = (altura: number) => {
    if (y - altura >= 88) return;
    paginas.push([]); dibujar?.nuevaPagina(); decorar();
    texto(safe(p.pdf_titulo + " · " + cheque.codigo), { x: 56, y: alto - 70, size: 14, font: serif, color: acento });
    y = alto - 110;
  };
  const bloque = (text: string, size = 11, font: FuenteRegalo = fuente, colorTexto = tinta, centrado = true) => {
    for (const linea of envolver(text, font, size)) {
      asegurar(size + 7);
      texto(linea, { x: centrado ? (ancho - font.widthOfTextAtSize(linea, size)) / 2 : 65, y, size, font, color: colorTexto });
      y -= size + 7;
    }
  };
  decorar();
  y = alto - 70;
  const logoData = p.logo_data || logoPorDefecto;
  if (/^data:image\/(png|jpeg);base64,/.test(logoData)) {
    const logo = await cargarLogo(logoData);
    const escala = Math.min(170 / logo.width, 100 / logo.height);
    const h = logo.height * escala, w = logo.width * escala;
    dibujar?.imagen({ x: (ancho - w) / 2, y: y - h, width: w, height: h });
    agregar(`<image href="${escapar(logoData)}" x="${(ancho - w) / 2}" y="${alto - y}" width="${w}" height="${h}"/>`);
    y -= h + 30;
  } else { bloque("Casa Tomás", 30, serif, acento); y -= 15; }
  bloque(textoRegalo(p.pdf_titulo, cheque, cheque.ocultar_importe), 29, serif, acento);
  if (p.pdf_subtitulo) bloque(textoRegalo(p.pdf_subtitulo, cheque, cheque.ocultar_importe), 12, cursiva, suave);
  y -= 18;
  if (!cheque.ocultar_importe) { bloque(Number(cheque.importe_eur).toFixed(2).replace(".", ",") + " €", 38, negrita); y -= 16; }
  asegurar(100);
  rectangulo({ x: 80, y: y - 68, width: ancho - 160, height: 90, color: rgb(1,1,1), borderColor: acento, borderWidth: .5 });
  bloque("CÓDIGO DEL CHEQUE", 9, fuente, suave);
  y -= 20; bloque(cheque.codigo, 26, negrita, acento); y -= 28;
  if (cheque.destinatario_nombre) { bloque("Para " + cheque.destinatario_nombre, 17, serif); y -= 8; }
  if (cheque.fecha_entrega_deseada) bloque("Entrega deseada: " + cheque.fecha_entrega_deseada.split("-").reverse().join("/"), 10, fuente, suave);
  if (cheque.mensaje) { y -= 14; bloque(cheque.mensaje, 13, cursiva, suave); }
  y -= 24;
  if (p.pdf_instrucciones) bloque(textoRegalo(p.pdf_instrucciones, cheque, cheque.ocultar_importe), 10, fuente, suave);
  y -= 16;
  if (p.pdf_pie) bloque(textoRegalo(p.pdf_pie, cheque, cheque.ocultar_importe), 9, fuente, suave);
  return paginas.map(trazos => `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">${trazos.join("")}</svg>`);
}
