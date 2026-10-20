import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
// `npm:` y no esm.sh: el build de esm.sh mete el polyfill de Node de
// deno.land/std, que llenaba los logs de "Deno.core.runMicrotasks() is not
// supported" cada vez que el worker se apagaba.
import Stripe from "npm:stripe@23.0.0";
import { generarCodigo } from "../_shared/cheques-regalo/codigo.ts";
import { enviarEmailCheque } from "../_shared/cheques-regalo/email.ts";
import { prepararChequeEmail } from "../_shared/cheques-regalo/preparar-email.ts";
import type { ChequeParaEmail } from "../_shared/cheques-regalo/tipos.ts";
import { enviarFacturaCheque } from "../_shared/enviar-factura-cheque.ts";

/**
 * Webhook de Stripe para los cheques regalo: confirma el pago, genera el
 * código y manda el email con él. Función APARTE de `cheques-regalo-web`
 * (que crea la sesión de pago) porque su auth es otra por completo — Stripe
 * firma la petición con `STRIPE_WEBHOOK_SECRET`, nunca manda el apikey de
 * Supabase, así que `verify_jwt` tiene que estar desactivado aquí.
 *
 * Eventos que el endpoint tiene que tener suscritos en Stripe:
 * - `checkout.session.completed`: pago hecho → código + email. Con un método
 *   que confirma más tarde (adeudo SEPA) llega con `payment_status: "unpaid"`
 *   y todavía no se entrega nada: la fila sigue "pendiente".
 * - `checkout.session.async_payment_succeeded`: ese pago diferido se cobró →
 *   código + email.
 * - `checkout.session.async_payment_failed`: ese pago diferido falló → la fila
 *   pasa a "cancelado".
 * - `checkout.session.expired`: el comprador no llegó a pagar → la fila
 *   "pendiente" pasa a "cancelado" en vez de quedarse colgada.
 * - `charge.refunded`: reembolso TOTAL → el cheque pasa a "cancelado" y deja
 *   de valer.
 *
 * Idempotente a propósito: Stripe reintenta un webhook si no responde 2xx, y
 * puede mandar el mismo evento más de una vez (incluso a la vez). Nunca se
 * genera un segundo código para el mismo cheque.
 *
 * Responde 500 cuando reintentar puede arreglar el fallo (base de datos que no
 * responde, email que no sale): Stripe vuelve a mandar el evento en vez de
 * darlo por entregado con el cliente cobrado y sin su código. Lo que un
 * reintento no arregla (sesión sin cheque, cheque inexistente) se registra en
 * el log y se responde 200.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
// Solo para leer la comisión del cobro (balance_transaction.fee) después de
// darlo por pagado — guardarComisionStripe() más abajo. Verificar la firma
// del evento, que es lo crítico, sigue sin necesitarla.
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { global: { headers: { "x-audit-source": "stripe-webhook-cheques-regalo" } } });
const cryptoProvider = Stripe.createSubtleCryptoProvider();
let stripeClient: Stripe | null = null;
function obtenerStripe(): Stripe | null {
  if (!STRIPE_SECRET_KEY) return null;
  return stripeClient ??= new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-09-30.endive", httpClient: Stripe.createFetchHttpClient() });
}

/**
 * Comisión real que cobró Stripe por este cobro, para el panel de métricas de
 * cheques regalo (pestaña "Stripe"). SIEMPRE "a mejor esfuerzo": si falla
 * (clave no configurada, fallo de red, cobro sin balance_transaction todavía)
 * se registra el error y se sigue sin más — el código y el email del cheque
 * YA se entregaron antes de llamar a esto y no dependen de que esto funcione.
 * Si queda sin guardar, el panel estima la comisión con la tarifa estándar.
 */
async function guardarComisionStripe(chequeId: string, paymentIntentId: string | null): Promise<void> {
  const stripe = obtenerStripe();
  if (!stripe || !paymentIntentId) return;
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge.balance_transaction"] });
    const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
    const balance = charge && typeof charge.balance_transaction === "object" ? charge.balance_transaction : null;
    if (!balance || typeof balance.fee !== "number") return;
    const { error } = await supabase.from("cheques_regalo").update({ stripe_fee_eur: balance.fee / 100 }).eq("id", chequeId);
    if (error) console.error("[stripe-webhook-cheques-regalo] no se pudo guardar stripe_fee_eur:", error);
  } catch (error) {
    console.error("[stripe-webhook-cheques-regalo] no se pudo obtener la comisión de Stripe:", error);
  }
}

/**
 * Lanza si el email no sale, para que Stripe reintente: el reintento encuentra
 * el cheque ya "pagado" sin `email_enviado_en` y lo reenvía con el MISMO código.
 *
 * El regalo conserva la selección de importe guardada antes del pago.
 */
async function enviarYMarcarEmail(fila: ChequeParaEmail): Promise<void> {
  const preparado = await prepararChequeEmail(supabase, fila);
  if (!(await enviarEmailCheque(preparado, { ocultarImporte: preparado.ocultar_importe === true })))
    throw new Error(`email del cheque ${fila.id} no enviado`);

  const { error } = await supabase
    .from("cheques_regalo")
    .update({ email_enviado_en: new Date().toISOString() })
    .eq("id", fila.id);
  // Sin `throw`: el email ya salió, y un reintento lo mandaría otra vez.
  if (error) console.error("[stripe-webhook-cheques-regalo] no se pudo guardar email_enviado_en:", error);
}

function chequeIdDeSesion(session: Stripe.Checkout.Session): string | null {
  return session.client_reference_id || session.metadata?.cheque_regalo_id || null;
}

async function procesarPagoCompletado(session: Stripe.Checkout.Session): Promise<void> {
  // Pago diferido todavía sin cobrar: el código se da con `async_payment_succeeded`.
  if (session.payment_status !== "paid") return;

  const chequeId = chequeIdDeSesion(session);
  if (!chequeId) {
    console.error("[stripe-webhook-cheques-regalo] sesión sin cheque_regalo_id:", session.id);
    return;
  }

  const { data: fila, error: errorLectura } = await supabase
    .from("cheques_regalo")
    .select("*")
    .eq("id", chequeId)
    .maybeSingle();
  if (errorLectura) throw new Error(`no se pudo leer el cheque ${chequeId}: ${errorLectura.message}`);
  if (!fila) {
    console.error("[stripe-webhook-cheques-regalo] no se encontró el cheque:", chequeId);
    return;
  }

  if ((fila.stripe_session_id && fila.stripe_session_id !== session.id)
    || session.currency !== "eur" || session.amount_total !== Math.round(Number(fila.importe_eur) * 100)) {
    throw new Error(`La sesión de Stripe no coincide con el cheque ${chequeId}`);
  }

  if (fila.estado === "pagado") {
    // Reintento de Stripe. Si lo que falló la otra vez fue el email, se
    // reenvía con el código ya guardado; si salió, no queda nada por hacer.
    if (fila.codigo && !fila.email_enviado_en) await enviarYMarcarEmail({ ...fila, codigo: fila.codigo });
    await enviarFacturaCheque(supabase, chequeId);
    if (fila.stripe_fee_eur == null) await guardarComisionStripe(chequeId, fila.stripe_payment_intent_id);
    return;
  }
  if (fila.estado !== "pendiente") {
    console.error(
      `[stripe-webhook-cheques-regalo] pago recibido para el cheque ${chequeId} en estado "${fila.estado}": revisar a mano en Stripe.`,
    );
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

  let codigo: string | null = null;
  let chequeEmitido: ChequeParaEmail | null = null;
  for (let intento = 0; intento < 5 && !codigo; intento++) {
    const candidato = generarCodigo();
    const { data: actualizadas, error } = await supabase
      .from("cheques_regalo")
      .update({ estado: "pagado", codigo: candidato, stripe_payment_intent_id: paymentIntentId })
      .eq("id", chequeId)
      .eq("estado", "pendiente") // también evita una carrera si dos eventos llegan a la vez
      .select("*");
    if (error) {
      if (error.code === "23505") continue; // código ya usado por otro cheque (UNIQUE): se prueba otro
      throw new Error(`no se pudo marcar pagado el cheque ${chequeId}: ${error.message}`);
    }
    // 0 filas: otra entrega del mismo evento ganó la carrera y ya se encarga
    // del código y del email. Antes esto contaba como éxito y salía un segundo
    // email con un código que no estaba en la base.
    if (!actualizadas?.length) return;
    codigo = candidato;
    chequeEmitido = actualizadas[0] as ChequeParaEmail;
  }
  if (!codigo || !chequeEmitido) throw new Error(`5 códigos repetidos seguidos para el cheque ${chequeId}`);

  await enviarYMarcarEmail(chequeEmitido);
  await enviarFacturaCheque(supabase, chequeId);
  await guardarComisionStripe(chequeId, paymentIntentId);
}

/** Sesión caducada sin pagar, o pago diferido que al final falló. */
async function cancelarChequePendiente(session: Stripe.Checkout.Session): Promise<void> {
  const chequeId = chequeIdDeSesion(session);
  if (!chequeId) return;

  const { error } = await supabase
    .from("cheques_regalo")
    .update({ estado: "cancelado" })
    .eq("id", chequeId)
    .eq("estado", "pendiente");
  if (error) throw new Error(`no se pudo cancelar el cheque ${chequeId}: ${error.message}`);
}

async function procesarReembolso(charge: Stripe.Charge): Promise<void> {
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  // Solo un reembolso TOTAL anula el cheque. Con uno parcial el cheque sigue
  // valiendo lo que se pagó: qué hacer con la diferencia lo decide el
  // restaurante a mano.
  if (!charge.refunded) {
    console.warn("[stripe-webhook-cheques-regalo] reembolso parcial, el cheque sigue vigente:", paymentIntentId);
    return;
  }

  const { data: anulados, error } = await supabase
    .from("cheques_regalo")
    .update({ estado: "cancelado" })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .eq("estado", "pagado")
    .select("id, usado");
  if (error) throw new Error(`no se pudo anular el cheque del pago ${paymentIntentId}: ${error.message}`);

  for (const cheque of anulados ?? []) {
    if (cheque.usado) console.warn("[stripe-webhook-cheques-regalo] reembolsado un cheque que ya se había canjeado:", cheque.id);
  }
}

Deno.serve(async (req) => {
  const firma = req.headers.get("stripe-signature");
  const cuerpo = await req.text();

  let evento: Stripe.Event;
  try {
    if (!firma || !STRIPE_WEBHOOK_SECRET) throw new Error("falta firma o STRIPE_WEBHOOK_SECRET");
    evento = await Stripe.webhooks.constructEventAsync(cuerpo, firma, STRIPE_WEBHOOK_SECRET, undefined, cryptoProvider);
  } catch (error) {
    console.error("[stripe-webhook-cheques-regalo] firma inválida:", error);
    return new Response(JSON.stringify({ error: "firma inválida" }), { status: 400 });
  }

  try {
    switch (evento.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await procesarPagoCompletado(evento.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        await cancelarChequePendiente(evento.data.object as Stripe.Checkout.Session);
        break;
      case "charge.refunded":
        await procesarReembolso(evento.data.object as Stripe.Charge);
        break;
    }
  } catch (error) {
    console.error(`[stripe-webhook-cheques-regalo] ${evento.type} falló, Stripe lo reintentará:`, error);
    return new Response(JSON.stringify({ error: "no procesado" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});


