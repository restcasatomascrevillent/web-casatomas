import { CASA_TOMAS } from "./casa-tomas.ts";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

export interface FacturaCheque {
  id: string;
  numero: string;
  emitida_en: string;
  emisor: { email_mensaje?: string; emisor_nombre: string; emisor_nif: string; emisor_direccion: string; logo_data: string; pie: string };
  cliente: { nombre: string; nif: string; direccion: string; email: string };
  importe_eur: number;
  /** Gastos de gestión de la compra online; 0 o ausente en facturas anteriores a ellos. */
  gastos_gestion_eur?: number | null;
  iva_porcentaje: number;
  email_enviado_en: string | null;
}

export async function generarPdfFactura(f: FacturaCheque): Promise<string> {
  const doc = await PDFDocument.create();
  // Los reintentos de email usan el mismo PDF y la misma clave de idempotencia.
  const fecha = new Date(f.emitida_en);
  doc.setCreationDate(fecha);
  doc.setModificationDate(fecha);
  doc.setTitle("Factura " + f.numero);
  doc.setAuthor(f.emisor.emisor_nombre);
  let page = doc.addPage([595.28, 841.89]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const ink = rgb(.19,.16,.14);
  const muted = rgb(.47,.41,.34);
  const brown = rgb(.475,.329,.251);
  const cream = rgb(.969,.953,.922);
  const lineColor = rgb(.898,.867,.816);
  // Helvetica admite acentos y €, pero no alfabetos fuera de WinAnsi.
  const safe = (s: string) => Array.from(s).map(c => {
    if (/\s/.test(c)) return c;
    try { regular.encodeText(c); return c; } catch { return "?"; }
  }).join("");
  const text = (s: string, x: number, y: number, size = 11, strong = false, color = ink) =>
    page.drawText(safe(s), { x, y, size, font: strong ? bold : regular, color });
  const block = (s: string, x: number, y: number, width: number, size = 10) => {
    for (const paragraph of safe(s).split(/\r?\n/)) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        // Divide también tokens largos, como direcciones sin espacios.
        for (const part of word.match(/.{1,35}/g) || [""]) {
          const candidate = line ? line + " " + part : part;
          if (regular.widthOfTextAtSize(candidate, size) > width && line) {
            text(line, x, y, size); y -= size + 4; line = part;
          } else line = candidate;
        }
      }
      if (line) text(line, x, y, size);
      y -= size + 4;
    }
    return y;
  };
  const p = f.emisor;
  page.drawRectangle({ x: 0, y: 705, width: 595.28, height: 136.89, color: cream });
  page.drawRectangle({ x: 0, y: 837.89, width: 595.28, height: 4, color: brown });
  if (/^data:image\/(png|jpeg);base64,/.test(p.logo_data || "")) {
    const bytes = Uint8Array.from(atob(p.logo_data.split(",")[1]), c => c.charCodeAt(0));
    const image = p.logo_data.startsWith("data:image/png") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const scale = Math.min(160 / image.width, 95 / image.height);
    page.drawImage(image, { x: 42, y: 725, width: image.width * scale, height: image.height * scale });
  } else text("CASA TOMÁS", 42, 775, 22, true);
  text("CHEQUE REGALO", 380, 802, 9, false, muted);
  page.drawText("Factura", { x: 380, y: 766, size: 34, font: serif, color: ink });
  text(f.numero, 380, 743, 11);
  text(new Date(f.emitida_en).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" }), 380, 723, 10);
  text("EMITIDA POR", 42, 676, 9, false, muted);
  let y = block(p.emisor_nombre, 42, 654, 245, 12);
  y = block("NIF: " + p.emisor_nif, 42, y, 245);
  const emisorFin = block(p.emisor_direccion, 42, y, 245);
  text("FACTURADA A", 325, 676, 9, false, muted);
  y = block(f.cliente.nombre, 325, 654, 227, 12);
  y = block("NIF: " + f.cliente.nif, 325, y, 227);
  y = block(f.cliente.direccion, 325, y, 227);
  const clienteFin = block(f.cliente.email, 325, y, 227);
  let tableTop = Math.min(510, emisorFin - 30, clienteFin - 30);
  if (tableTop < 470) {
    page = doc.addPage([595.28, 841.89]);
    text("FACTURA " + f.numero + " · Continuación", 42, 785, 14, true);
    tableTop = 730;
  }
  const offset = tableTop - 510;
  page.drawRectangle({ x:42, y:478 + offset, width:510, height:32, color: cream });
  text("DESCRIPCIÓN", 52, 489 + offset, 9, false, muted); text("IMPORTE", 458, 489 + offset, 9, false, muted);
  text("Cheque regalo Casa Tomás", 52, 450 + offset, 12, true);
  text("1 unidad · Compra en la web", 52, 430 + offset, 9, false, muted);
  const rate = Number(f.iva_porcentaje);
  const chequeCents = Math.round(Number(f.importe_eur) * 100);
  const gastosCents = Math.round(Number(f.gastos_gestion_eur || 0) * 100);
  // El total pagado incluye los gastos de gestión; la base y el IVA salen de él.
  const cents = chequeCents + gastosCents;
  const base = Math.round(cents / (1 + rate / 100));
  const euro = (v: number) => (v / 100).toFixed(2).replace(".", ",") + " €";
  text(euro(chequeCents), 455, 450 + offset, 12);
  if (gastosCents > 0) {
    text("Gastos de gestión", 52, 405 + offset, 11, true); text(euro(gastosCents), 455, 405 + offset, 11);
  }
  text("Base imponible", 325, 381 + offset); text(euro(base), 455, 381 + offset);
  if (rate > 0) {
    text("IVA (" + rate + "%)", 325, 357 + offset); text(euro(cents - base), 455, 357 + offset);
  }
  page.drawRectangle({ x: 313, y: 297 + offset, width: 239, height: 46, color: brown });
  text("TOTAL PAGADO", 325, 314 + offset, 10, false, rgb(1,1,1));
  text(euro(cents), 450, 312 + offset, 17, true, rgb(1,1,1));
  text("Pago confirmado mediante Stripe", 42, 265 + offset, 9, false, muted);
  page.drawLine({ start: { x: 42, y: 244 + offset }, end: { x: 552, y: 244 + offset }, color: lineColor, thickness: 1 });
  block(p.pie || CASA_TOMAS.pie, 42, 222 + offset, 510, 9);
  return await doc.saveAsBase64();
}


