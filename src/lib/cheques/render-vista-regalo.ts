// Solo las cuatro fuentes del regalo: evita descargar las otras diez fuentes de PDF.
import { Encodings } from "@pdf-lib/standard-fonts/lib/Encoding.js";
import { decompressJson } from "@pdf-lib/standard-fonts/lib/utils.js";
import helvetica from "@pdf-lib/standard-fonts/lib/Helvetica.compressed.json" with { type: "json" };
import helveticaBold from "@pdf-lib/standard-fonts/lib/Helvetica-Bold.compressed.json" with { type: "json" };
import timesRoman from "@pdf-lib/standard-fonts/lib/Times-Roman.compressed.json" with { type: "json" };
import timesItalic from "@pdf-lib/standard-fonts/lib/Times-Italic.compressed.json" with { type: "json" };
import { trazarRegalo, type FuenteRegalo } from "../../../supabase/functions/_shared/cheques-regalo/diseno.ts";
import type { ChequeRegalo, PlantillaRegalo } from "../../../supabase/functions/_shared/cheques-regalo/plantilla.ts";
import { LOGO_CASA_TOMAS_PNG_BASE64 } from "../../../supabase/functions/_shared/cheques-regalo/logo-base64.ts";

const logoPorDefecto = "data:image/png;base64," + LOGO_CASA_TOMAS_PNG_BASE64;
/** Las métricas y el kerning son los que utiliza pdf-lib, sin cargar su motor de PDF. */
function cargarFuente(comprimida: string): FuenteRegalo {
  const font = JSON.parse(decompressJson(comprimida)) as { FontName: string; CharMetrics: { N: string; WX: number }[]; KernPairs: [string, string, number][] };
  const anchos = new Map(font.CharMetrics.map(m => [m.N, m.WX]));
  const kerning = new Map<string, Map<string, number>>();
  for (const [izquierda, derecha, ajuste] of font.KernPairs) {
    if (!kerning.has(izquierda)) kerning.set(izquierda, new Map());
    kerning.get(izquierda)!.set(derecha, ajuste);
  }
  const medidas = new Map<string, number>();
  const codificar = (texto: string) => Array.from(texto, c => Encodings.WinAnsi.encodeUnicodeCodePoint(c.codePointAt(0)!));
  return { name: font.FontName, encodeText: codificar, widthOfTextAtSize: (texto, size) => {
    const key = `${size}|${texto}`;
    const medida = medidas.get(key);
    if (medida !== undefined) return medida;
    const caracteres = codificar(texto);
    let total = 0;
    for (let i = 0; i < caracteres.length; i++) total += (anchos.get(caracteres[i].name) || 250)
      + (kerning.get(caracteres[i].name)?.get(caracteres[i + 1]?.name) || 0);
    const width = total * (size / 1000);
    if (medidas.size >= 512) medidas.delete(medidas.keys().next().value!);
    medidas.set(key, width); return width;
  } };
}
const fuentes = { fuente: cargarFuente(helvetica), negrita: cargarFuente(helveticaBold),
  serif: cargarFuente(timesRoman), cursiva: cargarFuente(timesItalic) };
const logos = new Map<string, { width: number; height: number }>();

/** Lee dimensiones del PNG/JPEG una vez; no descomprime ni incrusta la imagen en un PDF. */
function dimensionesLogo(data: string) {
  const guardado = logos.get(data); if (guardado) return Promise.resolve(guardado);
  const bytes = Uint8Array.from(atob(data.split(",")[1]), c => c.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  let width = 0, height = 0;
  if (data.startsWith("data:image/png") && bytes.length >= 24 && view.getUint32(0) === 0x89504e47) {
    width = view.getUint32(16); height = view.getUint32(20);
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let i = 2; i + 8 < bytes.length;) {
      if (bytes[i] !== 0xff) break;
      const marker = bytes[i + 1];
      if (marker === 0xff) { i++; continue; }
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { i += 2; continue; }
      const length = view.getUint16(i + 2);
      if (length < 2 || i + 2 + length > bytes.length) break;
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
        height = view.getUint16(i + 5); width = view.getUint16(i + 7); break;
      }
      i += 2 + length;
    }
  }
  if (!width || !height) throw new Error("Logo inválido");
  const result = { width, height };
  if (logos.size >= 4) logos.delete(logos.keys().next().value!);
  logos.set(data, result); return Promise.resolve(result);
}
export function generarPaginasRegalo(cheque: ChequeRegalo, plantilla: PlantillaRegalo) {
  return trazarRegalo(cheque, plantilla, fuentes, logoPorDefecto, dimensionesLogo);
}
