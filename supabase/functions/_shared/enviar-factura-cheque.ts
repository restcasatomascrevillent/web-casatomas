import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generarPdfFactura, type FacturaCheque } from "./factura-cheque-pdf.ts";

export async function enviarFacturaCheque(db: SupabaseClient, chequeId: string): Promise<void> {
  const { data, error } = await db.rpc("emitir_factura_cheque", { p_cheque_id: chequeId });
  if (error) throw new Error("No se pudo emitir factura: " + error.message);
  if (!data || data.email_enviado_en) return;
  const factura = data as FacturaCheque;
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("Falta RESEND_API_KEY para enviar la factura");
  const content = await generarPdfFactura(factura);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json",
      "Idempotency-Key": "factura-cheque-" + factura.id },
    body: JSON.stringify({
      from: Deno.env.get("RESEND_FROM_EMAIL") || "Casa Tomás <onboarding@resend.dev>",
      to: [factura.cliente.email],
      subject: "Factura " + factura.numero + " · Cheque regalo Casa Tomás",
      text: "Gracias por tu compra. Adjuntamos la factura de tu cheque regalo de Casa Tomás.",
      attachments: [{ filename: "Factura-" + factura.numero + ".pdf", content }],
    }),
  });
  if (!response.ok) throw new Error("No se pudo enviar la factura: " + response.status);
  const { error: markError } = await db.from("facturas_cheques")
    .update({ email_enviado_en: new Date().toISOString() }).eq("id", factura.id);
  if (markError) throw new Error("No se pudo registrar el envio de la factura: " + markError.message);
}

