import { fechaCaducidad } from "./caducidad.ts";
import { generarPdfCheque } from "./pdf.ts";
import { LOGO_CASA_TOMAS_PNG_BASE64 } from "./logo-base64.ts";
import { PLANTILLA_REGALO, textoRegalo, type PlantillaRegalo } from "./plantilla.ts";
import type { ChequeParaEmail, OpcionesEnvioCheque } from "./tipos.ts";

function escaparHtml(texto: string): string {
  return texto.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
export function construirHtml(cheque: ChequeParaEmail, opciones: OpcionesEnvioCheque, plantilla: PlantillaRegalo): string {
  const mensaje = escaparHtml(textoRegalo(plantilla.email_mensaje, cheque, opciones.ocultarImporte)).replace(/\r?\n/g,"<br>");
  const acento = /^#[\da-f]{6}$/i.test(plantilla.color_acento) ? plantilla.color_acento : PLANTILLA_REGALO.color_acento;
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:auto;padding:28px;color:#343434;">
    <div style="border-bottom:2px solid ${acento};padding-bottom:18px;margin-bottom:24px;text-align:center;"><strong style="font-size:28px;">Casa Tomás</strong><p style="font-size:11px;letter-spacing:3px;">RESTAURANTE · CREVILLENT</p></div>
    <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;">${mensaje}</p>
    <div style="margin:24px 0;padding:20px;background:#faf7f1;text-align:center;"><p style="font-size:11px;">CÓDIGO DEL CHEQUE</p><strong style="font-size:26px;color:${acento};">${escaparHtml(cheque.codigo)}</strong>${opciones.ocultarImporte ? "" : `<p>${Number(cheque.importe_eur).toFixed(2).replace(".",",")} €</p>`}</div>
    <p style="font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">Válido hasta el ${fechaCaducidad(cheque.caduca_el)} (incluido). Después de esa fecha no podrá canjearse.</p>
    <p style="font-family:Arial,sans-serif;font-size:13px;color:#6a6360;">Encontrarás tu cheque regalo adjunto en PDF, listo para imprimir o compartir.</p>
  </div>`;
}

/** La clave de idempotencia evita duplicar un envío si falla el registro posterior. */
export async function enviarEmailCheque(cheque: ChequeParaEmail, opciones: OpcionesEnvioCheque): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key || !cheque.caduca_el) return false;
  try {
    const plantilla = { ...PLANTILLA_REGALO, ...cheque.plantilla_cheque };
    const logo = Uint8Array.from(atob(LOGO_CASA_TOMAS_PNG_BASE64), c => c.charCodeAt(0));
    const bytes = await generarPdfCheque(cheque, opciones, logo);
    let binario = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i,i + 0x8000));
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", "Idempotency-Key": "cheque-regalo-" + cheque.id },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "Casa Tomás <onboarding@resend.dev>", to: [cheque.comprador_email],
        subject: textoRegalo(plantilla.email_asunto, cheque, opciones.ocultarImporte),
        text: textoRegalo(plantilla.email_mensaje, cheque, opciones.ocultarImporte) + "\n\nCódigo: " + cheque.codigo + "\nVálido hasta el " + fechaCaducidad(cheque.caduca_el) + " (incluido). Después de esa fecha no podrá canjearse.",
        html: construirHtml(cheque, opciones, plantilla),
        attachments: [{ filename: "Cheque-" + cheque.codigo + ".pdf", content: btoa(binario) }],
      }),
    });
    if (!response.ok) { console.error("[cheques-regalo] envío falló:", response.status); return false; }
    return true;
  } catch (error) { console.error("[cheques-regalo] no se pudo enviar el cheque:", error); return false; }
}
