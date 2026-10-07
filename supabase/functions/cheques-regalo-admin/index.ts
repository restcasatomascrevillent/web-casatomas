import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generarCodigo } from "../_shared/cheques-regalo/codigo.ts";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IMPORTE_MIN = 10;
const IMPORTE_MAX = 1000;

/** Recorta y descarta strings vacíos — para que queden `null` en vez de `""`. Mismo criterio que `cheques-regalo-web`. */
function textoOpcional(valor: unknown, maxLen: number): string | null {
  if (typeof valor !== "string") return null;
  const recortado = valor.trim().slice(0, maxLen);
  return recortado || null;
}

interface AccionListar {
  accion: "listar";
}

interface AccionCrearManual {
  accion: "crear_manual";
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

type Peticion = AccionListar | AccionCrearManual | AccionEliminar;

/**
 * Solo los expedidos de verdad: "pendiente" (carrito de Stripe abandonado,
 * sin código) y "cancelado" (pago que nunca llegó o se devolvió) no son
 * cheques reales — no tiene sentido que ensucien la lista del panel.
 */
async function handleListar(admin: SupabaseClient): Promise<Response> {
  const { data, error } = await admin
    .from("cheques_regalo")
    .select("*")
    .eq("estado", "pagado")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[cheques-regalo-admin] listar falló:", error);
    return json({ motivo: "error_servidor", mensaje: "No se pudo cargar la lista de cheques." }, 500);
  }
  return json({ cheques: data ?? [] });
}

async function handleCrearManual(admin: SupabaseClient, payload: AccionCrearManual): Promise<Response> {
  const importe = Number(payload.importe_eur);
  const compradorNombre = textoOpcional(payload.comprador_nombre, 200);
  const compradorEmail = typeof payload.comprador_email === "string" ? payload.comprador_email.trim().slice(0, 320) : "";

  if (!Number.isFinite(importe) || importe < IMPORTE_MIN || importe > IMPORTE_MAX) {
    return json({ motivo: "importe_invalido", mensaje: `El importe debe estar entre ${IMPORTE_MIN}€ y ${IMPORTE_MAX}€.` }, 422);
  }
  if (!compradorNombre) {
    return json({ motivo: "nombre_requerido", mensaje: "Falta el nombre de quien recibe el cheque." }, 422);
  }
  if (!EMAIL_RE.test(compradorEmail)) {
    return json({ motivo: "email_invalido", mensaje: "El email no es válido." }, 422);
  }

  const compradorTelefono = textoOpcional(payload.comprador_telefono, 40);
  const destinatarioNombre = textoOpcional(payload.destinatario_nombre, 200);
  const mensaje = textoOpcional(payload.mensaje, 500);
  const fechaEntregaDeseada = textoOpcional(payload.fecha_entrega_deseada, 10);
  const ocultarImporte = payload.ocultar_importe === true;

  // Mismo reintento ante choque de código (UNIQUE) que en el webhook de Stripe.
  let fila: ChequeParaEmail | null = null;
  for (let intento = 0; intento < 5 && !fila; intento++) {
    const candidato = generarCodigo();
    const { data, error } = await admin
      .from("cheques_regalo")
      .insert({
        importe_eur: importe,
        comprador_nombre: compradorNombre,
        comprador_email: compradorEmail,
        comprador_telefono: compradorTelefono,
        destinatario_nombre: destinatarioNombre,
        mensaje,
        fecha_entrega_deseada: fechaEntregaDeseada,
        estado: "pagado",
        codigo: candidato,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") continue; // código ya usado por otro cheque: se prueba otro
      console.error("[cheques-regalo-admin] insert falló:", error);
      return json({ motivo: "error_servidor", mensaje: "No se pudo crear el cheque." }, 500);
    }
    fila = data;
  }
  if (!fila) return json({ motivo: "error_servidor", mensaje: "5 códigos repetidos seguidos, inténtalo otra vez." }, 500);

  const emailEnviado = await enviarEmailCheque(fila, { ocultarImporte });
  if (emailEnviado) {
    const { error: errorUpdate } = await admin
      .from("cheques_regalo")
      .update({ email_enviado_en: new Date().toISOString() })
      .eq("id", fila.id);
    if (errorUpdate) console.error("[cheques-regalo-admin] no se pudo guardar email_enviado_en:", errorUpdate);
  } else {
    console.error("[cheques-regalo-admin] el cheque se creó pero el email no salió:", fila.id);
  }

  return json({ cheque: fila, email_enviado: emailEnviado });
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

  const verificacion = await verificarAdmin(req);
  if (!verificacion.ok) return json({ motivo: "no_autorizado", mensaje: verificacion.mensaje }, verificacion.status);

  let payload: Peticion;
  try {
    payload = await req.json();
  } catch {
    return json({ motivo: "payload_invalido", mensaje: "Cuerpo de la petición ilegible." }, 400);
  }

  switch (payload.accion) {
    case "listar":
      return handleListar(verificacion.admin);
    case "crear_manual":
      return handleCrearManual(verificacion.admin, payload);
    case "eliminar":
      return handleEliminar(verificacion.admin, payload);
    default:
      return json({ motivo: "accion_desconocida", mensaje: "accion debe ser listar, crear_manual o eliminar." }, 400);
  }
});
