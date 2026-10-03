import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

export interface FacturaCheque {
  id: string;
  numero: string;
  emitida_en: string;
  emisor: { emisor_nombre: string; emisor_nif: string; emisor_direccion: string; logo_data: string; pie: string };
  cliente: { nombre: string; nif: string; direccion: string; email: string };
  importe_eur: number;
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
  // Helvetica admite acentos y €, pero no alfabetos fuera de WinAnsi.
  const safe = (s: string) => Array.from(s).map(c => {
    try { regular.encodeText(c); return c; } catch { return "?"; }
  }).join("");
  const text = (s: string, x: number, y: number, size = 11, strong = false) =>
    page.drawText(safe(s), { x, y, size, font: strong ? bold : regular, color: rgb(.16,.16,.16) });
  const block = (s: string, x: number, y: number, width: number, size = 10) => {
    let line = "";
    for (const word of safe(s).split(/\s+/)) {
      // Divide también tokens largos, como direcciones sin espacios.
      for (const part of word.match(/.{1,35}/g) || [""]) {
        const candidate = line ? line + " " + part : part;
        if (regular.widthOfTextAtSize(candidate, size) > width && line) {
          text(line, x, y, size); y -= size + 4; line = part;
        } else line = candidate;
      }
    }
    if (line) text(line, x, y, size);
    return y - size - 4;
  };
  const p = f.emisor;
  if (/^data:image\/(png|jpeg);base64,/.test(p.logo_data || "")) {
    const bytes = Uint8Array.from(atob(p.logo_data.split(",")[1]), c => c.charCodeAt(0));
    const image = p.logo_data.startsWith("data:image/png") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const scale = Math.min(130 / image.width, 65 / image.height);
    page.drawImage(image, { x: 42, y: 738, width: image.width * scale, height: image.height * scale });
  } else text("CASA TOMÁS", 42, 775, 22, true);
  text("FACTURA", 380, 785, 24, true);
  text(f.numero, 380, 763, 12);
  text(new Date(f.emitida_en).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" }), 380, 743, 11);
  text("EMISOR", 42, 692, 10, true);
  let y = block(p.emisor_nombre, 42, 671, 245, 12);
  y = block("NIF: " + p.emisor_nif, 42, y, 245);
  const emisorFin = block(p.emisor_direccion, 42, y, 245);
  text("CLIENTE", 325, 692, 10, true);
  y = block(f.cliente.nombre, 325, 671, 227, 12);
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
  page.drawRectangle({ x:42, y:478 + offset, width:510, height:32, color:rgb(.94,.92,.89) });
  text("Concepto", 52, 489 + offset, 11, true); text("Importe", 458, 489 + offset, 11, true);
  text("Cheque regalo Casa Tomás", 52, 450 + offset, 12);
  const amount = Number(f.importe_eur);
  const rate = Number(f.iva_porcentaje);
  const cents = Math.round(amount * 100);
  const base = Math.round(cents / (1 + rate / 100));
  const euro = (v: number) => (v / 100).toFixed(2).replace(".", ",") + " €";
  text(euro(cents), 455, 450 + offset, 12);
  text("Base imponible", 325, 381 + offset); text(euro(base), 455, 381 + offset);
  if (rate > 0) {
    text("IVA (" + rate + "%)", 325, 357 + offset); text(euro(cents - base), 455, 357 + offset);
  }
  text("TOTAL PAGADO", 325, 313 + offset, 12, true); text(euro(cents), 455, 313 + offset, 14, true);
  text("Pago confirmado mediante Stripe", 42, 265 + offset, 10);
  block(p.pie || "", 42, 222 + offset, 510, 10);
  return await doc.saveAsBase64();
}

