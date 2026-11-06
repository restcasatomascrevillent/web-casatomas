import { CASA_TOMAS } from "../casa-tomas.ts";
import { fechaCaducidad } from "./caducidad.ts";

/**
 * Aviso al restaurante de cada cheque regalo comprado en la web, con todos los
 * datos de la compra. Lo manda `stripe-webhook-cheques-regalo` justo después
 * del email del comprador, cuando el pago ya está confirmado y el código existe.
 *
 * Va al correo del restaurante (`CASA_TOMAS.email`); `CHEQUES_REGALO_EMAIL_AVISOS`
 * lo cambia sin tocar código. «Responder» contesta directamente al comprador.
 */
export interface CompraParaAviso {
  id: string;
  codigo: string;
  importe_eur: number | string;
  gastos_gestion_eur?: number | string | null;
  comprador_nombre: string;
  comprador_email: string;
  comprador_telefono?: string | null;
  destinatario_nombre?: string | null;
  mensaje?: string | null;
  fecha_entrega_deseada?: string | null;
  ocultar_importe?: boolean | null;
  emitido_en?: string | null;
  caduca_el?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_session_id?: string | null;
}

export interface AvisoCompra {
  para: string;
  asunto: string;
  texto: string;
  html: string;
}

const euros = (n: number) => n.toFixed(2).replace(".", ",") + " €";

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** «06/11/2026 18:42», en hora de Crevillent. */
function fechaHoraMadrid(iso?: string | null): string {
  const fecha = iso ? new Date(iso) : new Date();
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(fecha).replace(",", "");
}

export function destinoAvisos(): string {
  const configurado = Deno.env.get("CHEQUES_REGALO_EMAIL_AVISOS")?.trim();
  return configurado && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configurado) ? configurado : CASA_TOMAS.email;
}

export function construirAvisoCompra(compra: CompraParaAviso, para = destinoAvisos()): AvisoCompra {
  const importe = Number(compra.importe_eur) || 0;
  const gastos = Number(compra.gastos_gestion_eur) || 0;
  const filas: [string, string][] = [
    ["Código del cheque", compra.codigo],
    ["Importe del cheque", euros(importe)],
    ["Gastos de gestión", euros(gastos)],
    ["Total cobrado", euros(importe + gastos)],
    ["Fecha de compra", fechaHoraMadrid(compra.emitido_en)],
    ["Válido hasta", fechaCaducidad(compra.caduca_el)],
    ["Comprador", compra.comprador_nombre],
    ["Email del comprador", compra.comprador_email],
    ["Teléfono", compra.comprador_telefono?.trim() || "—"],
    ["Para (destinatario)", compra.destinatario_nombre?.trim() || "—"],
    ["Dedicatoria", compra.mensaje?.trim() || "—"],
    ["Fecha de entrega deseada", fechaCaducidad(compra.fecha_entrega_deseada)],
    ["Importe visible en el regalo", compra.ocultar_importe ? "No (oculto)" : "Sí"],
    ["Factura", "No se emite al comprar. Si la pide, será al canjear el cheque."],
    ["Pago en Stripe", compra.stripe_payment_intent_id || compra.stripe_session_id || "—"],
  ];

  const asunto = `Nuevo cheque regalo ${compra.codigo} · ${euros(importe)} · ${compra.comprador_nombre}`;
  const texto = "Se ha comprado un cheque regalo en la web.\n\n"
    + filas.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`).join("\n")
    + "\n\nEl cheque ya está en el panel (Cheques regalo) y el comprador lo ha recibido por email.";
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#343434;">
    <h2 style="font-family:Georgia,serif;margin:0 0 4px;">Nuevo cheque regalo</h2>
    <p style="margin:0 0 18px;color:#6a6360;">Se ha comprado un cheque regalo en la web.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${filas.map(([etiqueta, valor]) =>
      `<tr><th style="text-align:left;vertical-align:top;padding:7px 12px 7px 0;border-bottom:1px solid #e8e2d9;color:#6a6360;font-weight:normal;white-space:nowrap;">${escaparHtml(etiqueta)}</th>`
      + `<td style="padding:7px 0;border-bottom:1px solid #e8e2d9;white-space:pre-wrap;">${escaparHtml(valor)}</td></tr>`).join("")}</table>
    <p style="margin:18px 0 0;font-size:13px;color:#6a6360;">El cheque ya está en el panel (Cheques regalo) y el comprador lo ha recibido por email. Si respondes a este correo, le escribes al comprador.</p>
  </div>`;
  return { para, asunto, texto, html };
}

/**
 * Nunca lanza: si el aviso no sale, se registra y la compra sigue su curso (el
 * comprador ya tiene su cheque y el pago está en el panel). Así un fallo del
 * aviso no hace que Stripe reintente el webhook ni que se reenvíe nada al cliente.
 * La clave de idempotencia evita un aviso repetido si el mismo envío se reintenta.
 */
export async function enviarAvisoCompra(compra: CompraParaAviso): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.error("[cheques-regalo] aviso de compra no enviado: falta RESEND_API_KEY");
    return false;
  }
  try {
    const aviso = construirAvisoCompra(compra);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", "Idempotency-Key": "aviso-compra-cheque-" + compra.id },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "Casa Tomás <onboarding@resend.dev>",
        to: [aviso.para],
        reply_to: compra.comprador_email,
        subject: aviso.asunto,
        text: aviso.texto,
        html: aviso.html,
      }),
    });
    if (!response.ok) {
      console.error("[cheques-regalo] aviso de compra no enviado:", response.status, await response.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (error) {
    console.error("[cheques-regalo] aviso de compra no enviado:", error);
    return false;
  }
}
