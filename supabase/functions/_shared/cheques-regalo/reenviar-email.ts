import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { prepararChequeEmail } from "./preparar-email.ts";
import { enviarEmailChequeConDetalle, type ResultadoEnvioCheque } from "./email.ts";
import type { ChequeParaEmail } from "./tipos.ts";

/**
 * «Reenviar correo al cliente» del panel (acción `reenviar_email` de
 * `cheques-regalo-admin`): vuelve a mandar al comprador el correo con el PDF
 * de un cheque comprado en la WEB y ya pagado. Mismo código, mismo correo y
 * mismo diseño que la primera vez (la plantilla guardada en el cheque al
 * primer envío, `prepararChequeEmail`).
 *
 * La clave de idempotencia es otra que la del primer envío: con la misma,
 * Resend devolvería la respuesta de entonces sin mandar nada. El panel manda
 * una por confirmación (`clave_envio`), así un doble clic o un reintento de
 * red no manda dos correos.
 */

type FilaCheque = ChequeParaEmail & { origen?: string | null; estado?: string | null; email_enviado_en?: string | null };
type EnvioFallido = Extract<ResultadoEnvioCheque, { ok: false }>;

export type ResultadoReenvio =
  | { ok: true; status: 200; email_enviado: true; email_enviado_en: string; aviso?: string }
  | { ok: false; status: number; motivo: string; mensaje: string; email_enviado: false };

const UUID = /^[0-9a-f-]{36}$/i;
const CLAVE_ENVIO = /^[A-Za-z0-9_-]{8,64}$/;

const servicios = { prepararChequeEmail, enviarEmailChequeConDetalle };

/** Lo que ve el panel si el correo no sale: en español y con el motivo real. */
export function mensajeEnvioFallido(envio: EnvioFallido): string {
  switch (envio.motivo) {
    case "sin_resend":
      return "No se ha enviado: falta RESEND_API_KEY en los secretos de Supabase de este entorno. En la demo es lo normal: no manda correos.";
    case "sin_caducidad":
      return "No se ha enviado: el cheque no tiene fecha de caducidad y no se puede generar el PDF.";
    case "resend":
      return `No se ha enviado: Resend no ha aceptado el correo (${envio.detalle}).`;
    default:
      return `No se ha enviado: falló al preparar o mandar el correo (${envio.detalle}).`;
  }
}

function fallo(status: number, motivo: string, mensaje: string): ResultadoReenvio {
  return { ok: false, status, motivo, mensaje, email_enviado: false };
}

export async function reenviarEmailChequeWeb(
  db: SupabaseClient,
  id: unknown,
  claveEnvio?: unknown,
  s = servicios,
): Promise<ResultadoReenvio> {
  if (typeof id !== "string" || !UUID.test(id)) return fallo(422, "id_invalido", "ID inválido");

  const { data, error } = await db.from("cheques_regalo").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("[cheques-regalo-admin] reenviar_email: no se pudo leer el cheque:", error);
    return fallo(500, "error_servidor", "No se pudo leer el cheque. Vuelve a intentarlo.");
  }
  const fila = data as FilaCheque | null;
  if (!fila) return fallo(404, "no_encontrado", "No se encontró el cheque.");
  if (fila.origen === "manual") {
    return fallo(409, "compra_manual", "Es una compra manual: su correo se reintenta desde «Compra manual».");
  }
  if (fila.estado !== "pagado" || !fila.codigo) {
    return fallo(409, "no_pagado", "Solo se puede reenviar el correo de un cheque pagado.");
  }

  let preparado: ChequeParaEmail;
  try {
    preparado = await s.prepararChequeEmail(db, fila);
  } catch (e) {
    console.error("[cheques-regalo-admin] reenviar_email: no se pudo preparar el correo:", e);
    return fallo(500, "error_servidor", `No se ha enviado: no se pudo preparar el correo (${e instanceof Error ? e.message : String(e)}).`);
  }

  const clave = typeof claveEnvio === "string" && CLAVE_ENVIO.test(claveEnvio) ? claveEnvio : crypto.randomUUID();
  const envio = await s.enviarEmailChequeConDetalle(
    preparado,
    { ocultarImporte: preparado.ocultar_importe === true },
    `cheque-regalo-reenvio-${id}-${clave}`,
  );
  if (!envio.ok) {
    const status = envio.motivo === "sin_resend" ? 503 : envio.motivo === "sin_caducidad" ? 422 : 502;
    return fallo(status, envio.motivo, mensajeEnvioFallido(envio));
  }

  const ahora = new Date().toISOString();
  const { error: errorMarca } = await db.from("cheques_regalo").update({ email_enviado_en: ahora }).eq("id", id);
  if (errorMarca) {
    // El correo ya salió: no se da por fallido (otro intento lo mandaría otra vez).
    console.error("[cheques-regalo-admin] reenviar_email: no se pudo guardar email_enviado_en:", errorMarca);
    return { ok: true, status: 200, email_enviado: true, email_enviado_en: ahora, aviso: "El correo ha salido, pero no se pudo guardar la fecha de envío." };
  }
  return { ok: true, status: 200, email_enviado: true, email_enviado_en: ahora };
}
