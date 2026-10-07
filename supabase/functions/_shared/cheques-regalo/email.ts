import { Resend } from "https://esm.sh/resend@2.0.0";
import { generarPdfCheque } from "./pdf.ts";
import { LOGO_CASA_TOMAS_PNG_BASE64 } from "./logo-base64.ts";
import type { ChequeParaEmail, OpcionesEnvioCheque } from "./tipos.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Casa Tomás <onboarding@resend.dev>";
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function base64AUint8Array(base64: string): Uint8Array {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function uint8ArrayABase64(bytes: Uint8Array): string {
  let binario = "";
  const TAMANO_BLOQUE = 0x8000; // trocea para no reventar el límite de argumentos de String.fromCharCode
  for (let i = 0; i < bytes.length; i += TAMANO_BLOQUE) {
    binario += String.fromCharCode(...bytes.subarray(i, i + TAMANO_BLOQUE));
  }
  return btoa(binario);
}

// Copia de `src/assets/logo/logo-casa-tomas-512.png`, en base64 dentro del
// propio módulo (`logo-base64.ts`) en vez de un `.png` junto a este fichero:
// así no depende de que el empaquetado de la función incluya ficheros
// binarios sueltos de `_shared`, sea cual sea la vía de despliegue.
const logoPng = base64AUint8Array(LOGO_CASA_TOMAS_PNG_BASE64);

/** El nombre, el mensaje y el destinatario los escribe el comprador o el personal, y van dentro del HTML del email. */
function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatearFecha(iso: string | null): string {
  if (!iso) return "";
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

/**
 * Cuerpo del email: mismos tokens de color que el PDF (ver `pdf.ts`), con
 * "Casa Tomás restaurante" como cabecera tipográfica en vez del logo — un
 * `<img>` incrustado depende de que el cliente de correo cargue imágenes
 * remotas o de "Content-ID" (soporte más reciente del SDK de Resend, no
 * verificado aquí); el logo real, sin ese riesgo, va en el PDF adjunto.
 */
function construirHtml(cheque: ChequeParaEmail, opciones: OpcionesEnvioCheque): string {
  const paraQuien = cheque.destinatario_nombre ? `para <strong>${escaparHtml(cheque.destinatario_nombre)}</strong>` : "";
  const entrega = cheque.fecha_entrega_deseada
    ? `<p style="margin:4px 0;">Entrega deseada: <strong>${formatearFecha(cheque.fecha_entrega_deseada)}</strong></p>`
    : "";
  const mensajePersonal = cheque.mensaje
    ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #b08968;color:#444;font-style:italic;">${escaparHtml(cheque.mensaje)}</blockquote>`
    : "";
  const importe = opciones.ocultarImporte
    ? ""
    : `<p style="margin:4px 0;">Tu cheque regalo de <strong>${cheque.importe_eur}€</strong> ${paraQuien} ya está pagado.</p>`;
  const sinImporte = opciones.ocultarImporte
    ? `<p style="margin:4px 0;">Tu cheque regalo ${paraQuien} ya está listo.</p>`
    : "";

  return `
    <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:8px;">
      <div style="text-align:center;border-bottom:2px solid #b6852f;padding-bottom:16px;margin-bottom:20px;">
        <p style="font-size:26px;margin:0;color:#3a4148;">Casa Tomás</p>
        <p style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#6a6360;margin:4px 0 0;">restaurante</p>
      </div>
      <h2 style="color:#5c3d2e;">¡Gracias, ${escaparHtml(cheque.comprador_nombre)}!</h2>
      ${importe}
      ${sinImporte}
      ${entrega}
      ${mensajePersonal}
      <p>Código para canjearlo en el restaurante:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:2px;color:#5c3d2e;">${cheque.codigo}</p>
      <p style="font-size:13px;color:#777;">Preséntalo (impreso o en el móvil) al pagar en Casa Tomás, Crevillente. Lo llevas también adjunto en PDF, listo para imprimir o reenviar.</p>
    </div>
  `;
}

/**
 * Genera el PDF de marca y manda el email del cheque regalo con él adjunto.
 * `false` sin lanzar: igual que antes, para que quien llama decida si eso
 * amerita un reintento (ver `enviarYMarcarEmail` en el webhook).
 */
export async function enviarEmailCheque(cheque: ChequeParaEmail, opciones: OpcionesEnvioCheque): Promise<boolean> {
  if (!resend) {
    console.warn("[cheques-regalo] RESEND_API_KEY no configurada: email no enviado.");
    return false;
  }

  try {
    const pdfBytes = await generarPdfCheque(cheque, opciones, logoPng);
    const { error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: cheque.comprador_email,
      subject: "Tu cheque regalo de Casa Tomás ya está listo",
      html: construirHtml(cheque, opciones),
      attachments: [
        {
          filename: `cheque-regalo-${cheque.codigo}.pdf`,
          content: uint8ArrayABase64(pdfBytes),
        },
      ],
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[cheques-regalo] envío de email falló:", error);
    return false;
  }
}
