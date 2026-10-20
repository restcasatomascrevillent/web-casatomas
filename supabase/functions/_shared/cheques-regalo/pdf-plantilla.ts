import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from "npm:pdf-lib@1.17.1";
import { PLANTILLA_REGALO, type PlantillaRegalo, type ChequeRegalo } from "./plantilla.ts";
import { trazarRegalo } from "./diseno.ts";

export async function generarPdfRegalo(cheque: ChequeRegalo, plantilla: PlantillaRegalo, logoPorDefecto: string): Promise<Uint8Array> {
  return (await generarVistaRegalo(cheque, plantilla, logoPorDefecto)).pdf;
}

/** El trazado compartido conserva los textos, medidas y saltos de página del regalo. */
export async function generarVistaRegalo(cheque: ChequeRegalo, plantilla: PlantillaRegalo, logoPorDefecto: string): Promise<{ pdf: Uint8Array; paginas: string[] }> {
  const p = { ...PLANTILLA_REGALO, ...plantilla };
  const doc = await PDFDocument.create();
  const fecha = new Date(cheque.creado_en || cheque.created_at || "2026-01-01T00:00:00Z");
  doc.setCreationDate(fecha); doc.setModificationDate(fecha);
  doc.setTitle(`${p.pdf_titulo} · ${cheque.codigo}`); doc.setAuthor("Casa Tomás");
  const fuente = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const cursiva = await doc.embedFont(StandardFonts.TimesRomanItalic);
  let page: PDFPage, logo: PDFImage;
  const paginas = await trazarRegalo(cheque, p, { fuente, negrita, serif, cursiva }, logoPorDefecto, async data => {
    const bytes = Uint8Array.from(atob(data.split(",")[1]), c => c.charCodeAt(0));
    logo = data.startsWith("data:image/png") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    return logo;
  }, {
    nuevaPagina: () => { page = doc.addPage([595.28, 841.89]); },
    rectangulo: o => { page.drawRectangle({ ...o, color: o.color ? rgb(o.color.red, o.color.green, o.color.blue) : undefined,
      borderColor: o.borderColor ? rgb(o.borderColor.red, o.borderColor.green, o.borderColor.blue) : undefined }); },
    texto: (contenido, o) => { page.drawText(contenido, { ...o, font: o.font as PDFFont, color: rgb(o.color.red, o.color.green, o.color.blue) }); },
    imagen: o => { page.drawImage(logo, o); },
  });
  return { pdf: await doc.save(), paginas };
}
