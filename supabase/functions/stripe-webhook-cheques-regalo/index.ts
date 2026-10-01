import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

/**
 * Webhook de Stripe para los cheques regalo: confirma el pago, genera el
 * código y manda el email con él. Función APARTE de `cheques-regalo-web`
 * (que crea la sesión de pago) porque su auth es otra por completo — Stripe
 * firma la petición con `STRIPE_WEBHOOK_SECRET`, nunca manda el apikey de
 * Supabase, así que `verify_jwt` tiene que estar desactivado aquí.
 *
 * Idempotente a propósito: Stripe reintenta un webhook si no responde 200 a
 * tiempo, y puede mandar el mismo `checkout.session.completed` más de una
 * vez. Si la fila ya está "pagado" no se genera un segundo código ni se
 * manda un segundo email.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Casa Tomás <onboarding@resend.dev>";

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() });
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function generarCodigo(): string {
  // Sin 0/O/1/I: se lee en voz alta por teléfono y por WhatsApp sin
  // confusiones. 8 caracteres de un alfabeto de 32 ⇒ más que de sobra para
  // que un cheque regalo no choque con otro por azar.
  const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let codigo = "";
  for (let i = 0; i < 8; i++) codigo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return `CT-${codigo}`;
}

function formatearFecha(iso: string | null): string {
  if (!iso) return "";
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

async function enviarEmailCheque(fila: {
  comprador_email: string;
  comprador_nombre: string;
  destinatario_nombre: string | null;
  mensaje: string | null;
  fecha_entrega_deseada: string | null;
  importe_eur: number;
  codigo: string;
}): Promise<boolean> {
  if (!resend) {
    console.warn("[stripe-webhook-cheques-regalo] RESEND_API_KEY no configurada: email no enviado.");
    return false;
  }

  const paraQuien = fila.destinatario_nombre ? `para <strong>${fila.destinatario_nombre}</strong>` : "";
  const entrega = fila.fecha_entrega_deseada
    ? `<p>Entrega deseada: <strong>${formatearFecha(fila.fecha_entrega_deseada)}</strong></p>`
    : "";
  const mensajePersonal = fila.mensaje
    ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #b08968;color:#444;">${fila.mensaje}</blockquote>`
    : "";

  try {
    const { error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: fila.comprador_email,
      subject: "Tu cheque regalo de Casa Tomás ya está listo",
      html: `
        <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#5c3d2e;">¡Gracias, ${fila.comprador_nombre}!</h2>
          <p>Tu cheque regalo de <strong>${fila.importe_eur}€</strong> ${paraQuien} ya está pagado.</p>
          ${entrega}
          ${mensajePersonal}
          <p>Código para canjearlo en el restaurante:</p>
          <p style="font-size:28px;font-weight:bold;letter-spacing:2px;color:#5c3d2e;">${fila.codigo}</p>
          <p style="font-size:13px;color:#777;">Preséntalo (impreso o en el móvil) al pagar en Casa Tomás, Crevillente.</p>
        </div>
      `,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[stripe-webhook-cheques-regalo] envío de email falló:", error);
    return false;
  }
}

async function procesarPagoCompletado(session: Stripe.Checkout.Session): Promise<void> {
  const chequeId = session.client_reference_id || session.metadata?.cheque_regalo_id;
  if (!chequeId) {
    console.error("[stripe-webhook-cheques-regalo] sesión sin cheque_regalo_id:", session.id);
    return;
  }

  const { data: fila, error: errorLectura } = await supabase
    .from("cheques_regalo")
    .select("*")
    .eq("id", chequeId)
    .single();
  if (errorLectura || !fila) {
    console.error("[stripe-webhook-cheques-regalo] no se encontró el cheque:", chequeId, errorLectura);
    return;
  }
  if (fila.estado === "pagado") return; // Idempotencia: reintento de Stripe.

  let codigo = "";
  let guardado = false;
  for (let intento = 0; intento < 5 && !guardado; intento++) {
    codigo = generarCodigo();
    const { error } = await supabase
      .from("cheques_regalo")
      .update({
        estado: "pagado",
        codigo,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
      })
      .eq("id", chequeId)
      .eq("estado", "pendiente"); // también evita una carrera si dos eventos llegan a la vez
    if (!error) guardado = true;
    else if (!`${error.message}`.includes("duplicate")) {
      console.error("[stripe-webhook-cheques-regalo] update falló:", error);
      break;
    }
  }
  if (!guardado) return;

  const emailOk = await enviarEmailCheque({ ...fila, codigo });
  if (emailOk) {
    await supabase.from("cheques_regalo").update({ email_enviado_en: new Date().toISOString() }).eq("id", chequeId);
  }
}

Deno.serve(async (req) => {
  const firma = req.headers.get("stripe-signature");
  const cuerpo = await req.text();

  let evento: Stripe.Event;
  try {
    if (!firma || !STRIPE_WEBHOOK_SECRET) throw new Error("falta firma o STRIPE_WEBHOOK_SECRET");
    evento = await stripe.webhooks.constructEventAsync(cuerpo, firma, STRIPE_WEBHOOK_SECRET, undefined, cryptoProvider);
  } catch (error) {
    console.error("[stripe-webhook-cheques-regalo] firma inválida:", error);
    return new Response(JSON.stringify({ error: "firma inválida" }), { status: 400 });
  }

  if (evento.type === "checkout.session.completed") {
    await procesarPagoCompletado(evento.data.object as Stripe.Checkout.Session);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
