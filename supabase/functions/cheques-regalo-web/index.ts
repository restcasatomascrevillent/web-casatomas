import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
// `npm:` y no esm.sh: ver el comentario en `stripe-webhook-cheques-regalo`.
import Stripe from "npm:stripe@23.0.0";

/**
 * Venta de cheques regalo desde casa-tomas-story: crea la fila "pendiente" en
 * `cheques_regalo` y la sesión de Stripe Checkout que la cobra. El webhook
 * que confirma el pago, genera el código y manda el email vive aparte, en
 * `stripe-webhook-cheques-regalo` — tiene un modelo de auth totalmente
 * distinto (firma de Stripe, no apikey de Supabase) y por eso no comparte
 * función con esta.
 *
 * Mismo patrón de rutas que `reservas-web` (un solo `Deno.serve`, sub-rutas
 * por `url.pathname`): hoy solo hay `/crear`, pero deja sitio para añadir
 * `/estado/:codigo` el día que el panel quiera consultarlo desde aquí.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Mejor una clave restringida (`rk_…`) que la secreta (`sk_…`): aquí solo se
// crean sesiones de Checkout, así que basta con "Checkout Sessions: escritura".
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const CHEQUES_REGALO_ALLOWED_ORIGIN = Deno.env.get("CHEQUES_REGALO_ALLOWED_ORIGIN") || "*";
// Para construir `success_url`/`cancel_url`. Si no se define, se usa el
// `Origin` de la propia petición (el navegador lo manda siempre en un fetch
// cross-origin), y como último recurso el dominio de producción.
const SITE_URL_FALLBACK = Deno.env.get("CHEQUES_REGALO_SITE_URL") || "https://restaurantecasatomascrevillente.es";

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-09-30.endive", httpClient: Stripe.createFetchHttpClient() })
  : null;

const corsHeaders = {
  "Access-Control-Allow-Origin": CHEQUES_REGALO_ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IMPORTE_MIN = 10;
const IMPORTE_MAX = 1000;

interface CrearPayload {
  importe_eur?: unknown;
  comprador_nombre?: unknown;
  comprador_email?: unknown;
  comprador_telefono?: unknown;
  destinatario_nombre?: unknown;
  mensaje?: unknown;
  fecha_entrega_deseada?: unknown;
}

/** Recorta y descarta strings vacíos — para que queden `null` en vez de `""`. */
function textoOpcional(valor: unknown, maxLen: number): string | null {
  if (typeof valor !== "string") return null;
  const recortado = valor.trim().slice(0, maxLen);
  return recortado || null;
}

async function handleCrear(req: Request): Promise<Response> {
  if (!stripe) {
    return json({ motivo: "configuracion", mensaje: "Stripe no está configurado todavía." }, 503);
  }

  let payload: CrearPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ motivo: "payload_invalido", mensaje: "Cuerpo de la petición ilegible." }, 400);
  }

  const importe = Number(payload.importe_eur);
  const compradorNombre = textoOpcional(payload.comprador_nombre, 200);
  const compradorEmail = typeof payload.comprador_email === "string" ? payload.comprador_email.trim().slice(0, 320) : "";

  if (!Number.isFinite(importe) || importe < IMPORTE_MIN || importe > IMPORTE_MAX) {
    return json(
      { motivo: "importe_invalido", mensaje: `El importe debe estar entre ${IMPORTE_MIN}€ y ${IMPORTE_MAX}€.` },
      422,
    );
  }
  if (!compradorNombre) {
    return json({ motivo: "nombre_requerido", mensaje: "Falta el nombre de quien compra el cheque." }, 422);
  }
  if (!EMAIL_RE.test(compradorEmail)) {
    return json({ motivo: "email_invalido", mensaje: "El email del comprador no es válido." }, 422);
  }

  const compradorTelefono = textoOpcional(payload.comprador_telefono, 40);
  const destinatarioNombre = textoOpcional(payload.destinatario_nombre, 200);
  const mensaje = textoOpcional(payload.mensaje, 500);
  const fechaEntregaDeseada = textoOpcional(payload.fecha_entrega_deseada, 10);

  const { data: fila, error: errorInsert } = await supabase
    .from("cheques_regalo")
    .insert({
      importe_eur: importe,
      comprador_nombre: compradorNombre,
      comprador_email: compradorEmail,
      comprador_telefono: compradorTelefono,
      destinatario_nombre: destinatarioNombre,
      mensaje,
      fecha_entrega_deseada: fechaEntregaDeseada,
    })
    .select("id")
    .single();

  if (errorInsert || !fila) {
    console.error("[cheques-regalo-web] insert falló:", errorInsert);
    return json({ motivo: "error_servidor", mensaje: "No se pudo registrar el cheque regalo." }, 500);
  }

  const origin = req.headers.get("origin") || SITE_URL_FALLBACK;
  const siteUrl = origin.replace(/\/+$/, "");

  try {
    // Sin `payment_method_types`: Stripe enseña los métodos activados en el
    // Dashboard (tarjeta, Apple Pay, Google Pay…) que encajen con cada
    // comprador. Si se activa alguno que confirma más tarde (adeudo SEPA), el
    // webhook ya espera a `async_payment_succeeded` antes de dar el código.
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Etiqueta fija para filtrar en el Dashboard las sesiones de este flujo.
      integration_identifier: "cheques_regalo_web_qzmhtkvb",
      customer_email: compradorEmail,
      client_reference_id: fila.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: Math.round(importe * 100),
            product_data: {
              name: "Cheque regalo Casa Tomás",
              description: destinatarioNombre ? `Para: ${destinatarioNombre}` : undefined,
            },
          },
        },
      ],
      metadata: { cheque_regalo_id: fila.id },
      success_url: `${siteUrl}/?cheque_regalo=exito&session_id={CHECKOUT_SESSION_ID}#contacto`,
      cancel_url: `${siteUrl}/?cheque_regalo=cancelado#contacto`,
    });

    const { error: errorUpdate } = await supabase
      .from("cheques_regalo")
      .update({ stripe_session_id: session.id })
      .eq("id", fila.id);
    if (errorUpdate) console.error("[cheques-regalo-web] no se pudo guardar stripe_session_id:", errorUpdate);

    if (!session.url) throw new Error("Stripe no devolvió url de checkout");
    return json({ url: session.url });
  } catch (error) {
    console.error("[cheques-regalo-web] Stripe checkout falló:", error);
    await supabase.from("cheques_regalo").update({ estado: "cancelado" }).eq("id", fila.id);
    return json({ motivo: "stripe_error", mensaje: "No se pudo iniciar el pago. Inténtalo de nuevo." }, 502);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const ruta = url.pathname.replace(/^\/cheques-regalo-web/, "") || "/";

  if (req.method === "POST" && ruta === "/crear") return handleCrear(req);

  return json({ motivo: "no_encontrado", mensaje: "Ruta no soportada." }, 404);
});
