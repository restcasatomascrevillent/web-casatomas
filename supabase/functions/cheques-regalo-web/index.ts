import { calcularCaducidad } from "../_shared/cheques-regalo/caducidad.ts";
import { calcularGastosGestion, leerConfigGastosGestion } from "../_shared/cheques-regalo/gastos-gestion.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
// `npm:` y no esm.sh: ver el comentario en `stripe-webhook-cheques-regalo`.
import type Stripe from "npm:stripe@23.0.0";
import { resolverUrlSitio } from "../_shared/cheques-regalo/origen.ts";
import { PLANTILLA_REGALO } from "../_shared/cheques-regalo/plantilla.ts";
import { LOGO_CASA_TOMAS_PNG_BASE64 } from "../_shared/cheques-regalo/logo-base64.ts";

/**
 * Venta de cheques regalo desde casa-tomas-story: crea la fila "pendiente" en
 * `cheques_regalo` y la sesión de Stripe Checkout que la cobra. El webhook
 * que confirma el pago, genera el código y manda el email vive aparte, en
 * `stripe-webhook-cheques-regalo` — tiene un modelo de auth totalmente
 * distinto (firma de Stripe, no apikey de Supabase) y por eso no comparte
 * función con esta.
 *
 * Mismo patrón de rutas que `reservas-web` (un solo `Deno.serve`, sub-rutas
 * por `url.pathname`): `/crear` inicia el pago, `/plantilla-vista` prepara
 * el diseño público y `/vista-previa` conserva la compatibilidad anterior.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Mejor una clave restringida (`rk_…`) que la secreta (`sk_…`): aquí solo se
// crean sesiones de Checkout, así que basta con "Checkout Sessions: escritura".
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const CHEQUES_REGALO_ALLOWED_ORIGIN = Deno.env.get("CHEQUES_REGALO_ALLOWED_ORIGIN") || "*";
// Para construir `success_url`/`cancel_url`: el `Origin` de la petición solo se
// usa si coincide con CHEQUES_REGALO_ALLOWED_ORIGIN (lista separada por comas)
// o con este sitio; en cualquier otro caso se redirige a este sitio.
const SITE_URL_FALLBACK = Deno.env.get("CHEQUES_REGALO_SITE_URL") || "https://restaurantecasatomascrevillente.es";

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  global: { headers: { "x-audit-source": "cheques-regalo-web" } },
});
// Stripe y pdf-lib solo se cargan para pagar o generar el PDF antiguo, no para preparar la vista.
let stripePromise: Promise<Stripe> | undefined;
function cargarStripe(): Promise<Stripe> {
  return stripePromise ??= import("npm:stripe@23.0.0").then(({ default: Stripe }) =>
    new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-09-30.endive", httpClient: Stripe.createFetchHttpClient() }));
}

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
  ocultar_importe?: unknown;
  incluir_dedicatoria?: unknown;
  solicita_factura?: unknown;
  datos_factura?: { nombre?: unknown; nif?: unknown; direccion?: unknown };
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
  if (!STRIPE_SECRET_KEY) {
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

  const solicitaFactura = payload.solicita_factura === true;
  const datosFactura = solicitaFactura ? {
    nombre: textoOpcional(payload.datos_factura?.nombre, 200),
    nif: textoOpcional(payload.datos_factura?.nif, 30),
    direccion: textoOpcional(payload.datos_factura?.direccion, 300),
  } : null;
  if (solicitaFactura) {
    if (!datosFactura?.nombre || !datosFactura.nif || !datosFactura.direccion) {
      return json({ mensaje: "Completa nombre, NIF y dirección fiscal para recibir la factura." }, 422);
    }
    const { data: plantilla, error } = await supabase.from("plantilla_factura_cheques")
      .select("emisor_nombre, emisor_nif, emisor_direccion").eq("id", true).single();
    if (error || !plantilla?.emisor_nombre || !plantilla.emisor_nif || !plantilla.emisor_direccion) {
      return json({ mensaje: "La facturación no está disponible todavía. Contacta con el restaurante." }, 503);
    }
  }

  const compradorTelefono = textoOpcional(payload.comprador_telefono, 40);
  const destinatarioNombre = textoOpcional(payload.destinatario_nombre, 200);
  const mensaje = payload.incluir_dedicatoria === false ? null : textoOpcional(payload.mensaje, 500);
  const fechaEntregaDeseada = textoOpcional(payload.fecha_entrega_deseada, 10);

  // Gastos de gestión: los activa el panel (apagados por defecto). Si la
  // configuración no se puede leer se cobra sin gastos: nunca de más.
  const { data: configGastos, error: errorGastos } = await supabase.from("plantilla_cheques_regalo")
    .select("gastos_gestion_activos, gastos_gestion_porcentaje, gastos_gestion_fijo_eur").eq("id", true).single();
  if (errorGastos) console.error("[cheques-regalo-web] no se pudo leer la configuración de gastos de gestión:", errorGastos);
  const importeCheque = Math.round(importe * 100) / 100;
  const gastosGestion = errorGastos ? 0 : calcularGastosGestion(importeCheque, leerConfigGastosGestion(configGastos));

  const { data: fila, error: errorInsert } = await supabase
    .from("cheques_regalo")
    .insert({
      importe_eur: importeCheque,
      gastos_gestion_eur: gastosGestion,
      solicita_factura: solicitaFactura,
      datos_factura: datosFactura,
      comprador_nombre: compradorNombre,
      comprador_email: compradorEmail,
      comprador_telefono: compradorTelefono,
      destinatario_nombre: destinatarioNombre,
      mensaje,
      ocultar_importe: payload.ocultar_importe === true,
      fecha_entrega_deseada: fechaEntregaDeseada,
    })
    .select("id")
    .single();

  if (errorInsert || !fila) {
    console.error("[cheques-regalo-web] insert falló:", errorInsert);
    return json({ motivo: "error_servidor", mensaje: "No se pudo registrar el cheque regalo." }, 500);
  }

  // CT-REM-FN-08: el `Origin` solo vale si está en la lista de permitidos.
  const siteUrl = resolverUrlSitio(req.headers.get("origin"), Deno.env.get("CHEQUES_REGALO_ALLOWED_ORIGIN"), SITE_URL_FALLBACK);

  try {
    // Sin `payment_method_types`: Stripe enseña los métodos activados en el
    // Dashboard (tarjeta, Apple Pay, Google Pay…) que encajen con cada
    // comprador. Si se activa alguno que confirma más tarde (adeudo SEPA), el
    // webhook ya espera a `async_payment_succeeded` antes de dar el código.
    const stripe = await cargarStripe();
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
            unit_amount: Math.round(importeCheque * 100),
            product_data: {
              name: "Cheque regalo Casa Tomás",
              description: destinatarioNombre ? `Para: ${destinatarioNombre}` : undefined,
            },
          },
        },
        // Línea aparte para que el comprador vea en Stripe qué es el cheque y
        // qué son los gastos, igual que en el resumen de la web.
        ...(gastosGestion > 0 ? [{
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: Math.round(gastosGestion * 100),
            product_data: { name: "Gastos de gestión", description: "Compra online, iguales para cualquier forma de pago" },
          },
        }] : []),
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
    return json({ url: session.url, factura_solicitada: solicitaFactura, ocultar_importe: payload.ocultar_importe === true });
  } catch (error) {
    console.error("[cheques-regalo-web] Stripe checkout falló:", error);
    await supabase.from("cheques_regalo").update({ estado: "cancelado" }).eq("id", fila.id);
    return json({ motivo: "stripe_error", mensaje: "No se pudo iniciar el pago. Inténtalo de nuevo." }, 502);
  }
}

/**
 * Solo los campos públicos del diseño; nunca datos de compradores ni texto del email.
 * También los gastos de gestión: la web solo los enseña si se los da ESTA función,
 * que es la que los cobra en `/crear`, así una versión antigua nunca los anuncia sin cobrarlos.
 */
async function handlePlantillaVista(): Promise<Response> {
  const { data, error } = await supabase.from("plantilla_cheques_regalo")
    .select("pdf_titulo,pdf_subtitulo,pdf_instrucciones,pdf_pie,logo_data,color_acento,color_fondo,caducidad_meses,gastos_gestion_activos,gastos_gestion_porcentaje,gastos_gestion_fijo_eur").eq("id", true).single();
  if (error || !data) return json({ mensaje: "No se pudo cargar la vista previa" }, 503);
  const { gastos_gestion_activos: _a, gastos_gestion_porcentaje: _p, gastos_gestion_fijo_eur: _f, ...plantilla } = data;
  return json({ plantilla, gastos_gestion: leerConfigGastosGestion(data) });
}

/** Solo usa los datos introducidos y el diseño público del PDF; no consulta compras. */
async function handleVistaPrevia(req: Request): Promise<Response> {
  try {
    const payload: CrearPayload = await req.json();
    const importe = Number(payload.importe_eur);
    if (!Number.isFinite(importe) || importe < IMPORTE_MIN || importe > IMPORTE_MAX) return json({ mensaje: "Importe inválido" }, 422);
    const { data, error } = await supabase.from("plantilla_cheques_regalo")
      .select("pdf_titulo,pdf_subtitulo,pdf_instrucciones,pdf_pie,logo_data,color_acento,color_fondo,caducidad_meses").eq("id", true).single();
    if (error || !data) return json({ mensaje: "No se pudo cargar la vista previa" }, 503);
    const { generarVistaRegalo } = await import("../_shared/cheques-regalo/pdf-plantilla.ts");
    const vista = await generarVistaRegalo({
      id: "ejemplo", codigo: "CT-EJEMPLO", caduca_el: calcularCaducidad(data.caducidad_meses), importe_eur: Math.round(importe * 100) / 100,
      comprador_nombre: textoOpcional(payload.comprador_nombre, 200) || "", comprador_email: "",
      destinatario_nombre: textoOpcional(payload.destinatario_nombre, 200),
      mensaje: payload.incluir_dedicatoria === false ? null : textoOpcional(payload.mensaje, 500),
      ocultar_importe: payload.ocultar_importe === true, fecha_entrega_deseada: null,
    }, { ...PLANTILLA_REGALO, ...data }, "data:image/png;base64," + LOGO_CASA_TOMAS_PNG_BASE64);
    return json({ paginas: vista.paginas });
  } catch { return json({ mensaje: "No se pudo generar la vista previa" }, 400); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const ruta = url.pathname.replace(/^\/cheques-regalo-web/, "") || "/";

  if (req.method === "POST" && ruta === "/plantilla-vista") return handlePlantillaVista();
  if (req.method === "POST" && ruta === "/vista-previa") return handleVistaPrevia(req);
  if (req.method === "POST" && ruta === "/crear") return handleCrear(req);

  return json({ motivo: "no_encontrado", mensaje: "Ruta no soportada." }, 404);
});


