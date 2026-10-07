import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { prepararChequeEmail } from "../_shared/cheques-regalo/preparar-email.ts";
import { enviarEmailCheque } from "../_shared/cheques-regalo/email.ts";
import { verificarAdmin } from "../_shared/cheques-regalo/admin-auth.ts";
import type { ChequeParaEmail } from "../_shared/cheques-regalo/tipos.ts";

/**
 * Gestión de cheques regalo desde el panel (adminpanelct): listar los ya
 * expedidos, generar uno a mano (sin pasar por Stripe — p. ej. un cheque de
 * cortesía o uno cobrado por otro medio) y eliminar uno. Función APARTE de
 * `cheques-regalo-web` (venta pública) y `stripe-webhook-cheques-regalo`
 * (confirma el pago de Stripe): aquí SIEMPRE hace falta una sesión de
 * administrador, así que `verify_jwt` se queda en su valor por defecto
 * (`true`) — al revés que esas dos.
 *
 * Una sola acción por petición, en el cuerpo (`{ accion: "..." }`), como
 * `admin-delete-user` del panel — no rutas por `pathname` como
 * `cheques-regalo-web`, para que el panel llame siempre igual:
 * `supabase.functions.invoke("cheques-regalo-admin", { body: { accion, ... } })`.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

interface AccionListar {
  accion: "listar";
}

interface AccionCrearManual {
  accion: "crear_manual";
  solicitud_id?: string;
  pago_manual_metodo?: unknown;
  importe_eur?: unknown;
  comprador_nombre?: unknown;
  comprador_email?: unknown;
  comprador_telefono?: unknown;
  destinatario_nombre?: unknown;
  mensaje?: unknown;
  fecha_entrega_deseada?: unknown;
  ocultar_importe?: unknown;
}

interface AccionEliminar {
  accion: "eliminar";
  id?: unknown;
}

type Peticion = AccionListar | AccionCrearManual | AccionEliminar | { accion: "enviar_manual"; id?: unknown };

/**
 * Solo los expedidos de verdad: "pendiente" (carrito de Stripe abandonado,
 * sin código) y "cancelado" (pago que nunca llegó o se devolvió) no son
 * cheques reales — no tiene sentido que ensucien la lista del panel.
 */
async function handleListar(admin: SupabaseClient): Promise<Response> {
  const { data, error } = await admin
    .from("cheques_regalo")
    .select("*")
    .eq("estado", "pagado").not("codigo", "is", null)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[cheques-regalo-admin] listar falló:", error);
    return json({ motivo: "error_servidor", mensaje: "No se pudo cargar la lista de cheques." }, 500);
  }
  return json({ cheques: data ?? [] });
}

async function handleEnviarManual(admin: SupabaseClient, id: unknown): Promise<Response> {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return json({ mensaje: "ID inválido" }, 422);
  const { data: fila, error } = await admin.from("cheques_regalo").select("*")
    .eq("id", id).eq("origen", "manual").eq("estado", "pagado").single();
  if (error || !fila?.codigo) return json({ mensaje: "Cheque manual no encontrado" }, 404);
  if (fila.email_enviado_en) return json({ cheque: fila, email_enviado: true });
  try {
    const preparado = await prepararChequeEmail(admin, fila as ChequeParaEmail);
    const enviado = await enviarEmailCheque(preparado, { ocultarImporte: fila.ocultar_importe === true });
    if (enviado) {
      const { error: errorMarca } = await admin.from("cheques_regalo")
        .update({ email_enviado_en: new Date().toISOString() }).eq("id", id);
      if (errorMarca) throw new Error("No se ha confirmado el registro del envío");
    }
    return json({ cheque: fila, email_enviado: enviado });
  } catch (error) {
    console.error("[cheques-regalo-admin] envío falló:", error);
    return json({ mensaje: "El cheque está expedido; no se ha confirmado el envío", email_enviado: false }, 502);
  }
}

async function handleCrearManual(admin: SupabaseClient, usuario: SupabaseClient, payload: AccionCrearManual): Promise<Response> {
  if (!payload.solicitud_id) return json({ mensaje: "Falta la referencia de la compra manual" }, 422);
  const { data, error } = await usuario.rpc("crear_cheque_manual", {
    p_solicitud_id: payload.solicitud_id,
    p_datos: { ...payload, pago_manual_metodo: payload.pago_manual_metodo || "cortesia" },
  });
  if (error || !data?.id) return json({ mensaje: error?.message || "No se pudo crear el cheque" }, 422);
  return handleEnviarManual(admin, data.id);
}

async function handleEliminar(admin: SupabaseClient, payload: AccionEliminar): Promise<Response> {
  const id = typeof payload.id === "string" ? payload.id : "";
  if (!id) return json({ motivo: "id_requerido", mensaje: "Falta el id del cheque a eliminar." }, 422);

  const { error } = await admin.from("cheques_regalo").delete().eq("id", id);
  if (error) {
    console.error("[cheques-regalo-admin] eliminar falló:", error);
    return json({ motivo: "error_servidor", mensaje: "No se pudo eliminar el cheque." }, 500);
  }
  return json({ eliminado: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ motivo: "metodo_no_soportado", mensaje: "Solo POST." }, 405);

  let payload: Peticion;
  try {
    payload = await req.json();
  } catch {
    return json({ motivo: "payload_invalido", mensaje: "Cuerpo de la petición ilegible." }, 400);
  }

  if (!payload || typeof payload !== "object") return json({ mensaje: "Petición inválida" }, 400);
  const verificacion = await verificarAdmin(req, payload.accion === "listar" ? "view" : "edit");
  if (!verificacion.ok) return json({ motivo: "no_autorizado", mensaje: verificacion.mensaje }, verificacion.status);

  switch (payload.accion) {
    case "listar":
      return handleListar(verificacion.admin);
    case "crear_manual":
      return handleCrearManual(verificacion.admin, verificacion.usuario, payload);
    case "enviar_manual":
      return handleEnviarManual(verificacion.admin, payload.id);
    case "eliminar":
      return handleEliminar(verificacion.admin, payload);
    default:
      return json({ motivo: "accion_desconocida", mensaje: "Acción de cheques no reconocida." }, 400);
  }
});
