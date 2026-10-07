import { type PDFFont, type PDFPage, PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";
import type { ChequeParaEmail, OpcionesEnvioCheque } from "./tipos.ts";

/**
 * Mismos tokens de color que `src/components/carta/TicketMesa.tsx` (el
 * "estilo de Casa Tomás" de cualquier documento imprimible del sitio: tinta
 * pizarra, gris suave, filete dorado — nada de dorados ni filigranas de más).
 */
const TINTA = rgb(0x3a / 255, 0x41 / 255, 0x48 / 255);
const TINTA_SUAVE = rgb(0x6a / 255, 0x63 / 255, 0x60 / 255);
const BORDE = rgb(0xd1 / 255, 0xd5 / 255, 0xdb / 255);
const PAPEL = rgb(0xfb / 255, 0xf8 / 255, 0xf3 / 255);
/** `--accent` de `src/index.css` (hsl(38 59% 45%)) convertido a rgb 0–1. */
const DORADO = rgb(0.7155, 0.5208, 0.1845);

const ANCHO = 595.28; // A4
const ALTO = 841.89;
const MARGEN = 56;

/** Envuelve el texto a `anchoMax` puntos — pdf-lib no lo hace solo. */
function envolverTexto(texto: string, font: PDFFont, size: number, anchoMax: number): string[] {
  const palabras = texto.split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (font.widthOfTextAtSize(candidata, size) > anchoMax && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = candidata;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function centrado(page: PDFPage, texto: string, y: number, font: PDFFont, size: number, color = TINTA) {
  const ancho = font.widthOfTextAtSize(texto, size);
  page.drawText(texto, { x: (ANCHO - ancho) / 2, y, size, font, color });
}

/** "2026-03-15" → "15/03/2026". */
function formatearFecha(iso: string | null): string {
  if (!iso) return "";
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

/**
 * El cheque regalo como documento imprimible: A4, logo real embebido, mismo
 * lenguaje visual que el resto de documentos del sitio. `ocultarImporte`
 * (ver `tipos.ts`) quita la cifra tanto del PDF como del email — el resto
 * del documento es idéntico.
 */
export async function generarPdfCheque(
  cheque: ChequeParaEmail,
  opciones: OpcionesEnvioCheque,
  logoPng: Uint8Array,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([ANCHO, ALTO]);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifNegrita = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifCursiva = await doc.embedFont(StandardFonts.TimesRomanItalic);

  page.drawRectangle({ x: 0, y: 0, width: ANCHO, height: ALTO, color: PAPEL });
  page.drawRectangle({
    x: MARGEN,
    y: MARGEN,
    width: ANCHO - MARGEN * 2,
    height: ALTO - MARGEN * 2,
    borderColor: BORDE,
    borderWidth: 1,
  });

  let y = ALTO - MARGEN - 56;

  const logo = await doc.embedPng(logoPng);
  const logoAncho = 150;
  const logoAlto = (logo.height / logo.width) * logoAncho;
  page.drawImage(logo, { x: (ANCHO - logoAncho) / 2, y: y - logoAlto, width: logoAncho, height: logoAlto });
  y -= logoAlto + 36;

  page.drawLine({ start: { x: ANCHO / 2 - 60, y }, end: { x: ANCHO / 2 + 60, y }, thickness: 1.5, color: DORADO });
  y -= 36;

  centrado(page, "CHEQUE REGALO", y, serifNegrita, 22, DORADO);
  y -= 48;

  if (!opciones.ocultarImporte) {
    centrado(page, `${cheque.importe_eur} €`, y, serifNegrita, 34, TINTA);
    y -= 56;
  }

  centrado(page, "Código para canjear en el restaurante", y, serif, 11, TINTA_SUAVE);
  y -= 34;
  centrado(page, cheque.codigo, y, serifNegrita, 28, TINTA);
  y -= 50;

  if (cheque.destinatario_nombre) {
    centrado(page, `Para: ${cheque.destinatario_nombre}`, y, serifCursiva, 14, TINTA);
    y -= 28;
  }

  if (cheque.fecha_entrega_deseada) {
    centrado(page, `Entrega deseada: ${formatearFecha(cheque.fecha_entrega_deseada)}`, y, serif, 11, TINTA_SUAVE);
    y -= 24;
  }

  if (cheque.mensaje) {
    y -= 12;
    const anchoMaxMensaje = ANCHO - MARGEN * 2 - 120;
    for (const linea of envolverTexto(cheque.mensaje, serifCursiva, 12, anchoMaxMensaje)) {
      centrado(page, linea, y, serifCursiva, 12, TINTA_SUAVE);
      y -= 18;
    }
  }

  // Pie, siempre pegado al borde inferior del marco, no al final del contenido.
  const yPie = MARGEN + 70;
  page.drawLine({
    start: { x: ANCHO / 2 - 60, y: yPie + 28 },
    end: { x: ANCHO / 2 + 60, y: yPie + 28 },
    thickness: 1,
    color: DORADO,
  });
  centrado(
    page,
    "Presenta este cheque (impreso o en el móvil) al pagar en Casa Tomás, Crevillente.",
    yPie,
    serif,
    10,
    TINTA_SUAVE,
  );
  centrado(page, "Carrer Santa Maria de la Cabeza, 2 · 03330 Crevillent (Alicante) · +34 966 10 78 87", yPie - 16, serif, 9, TINTA_SUAVE);

  return doc.save();
}
