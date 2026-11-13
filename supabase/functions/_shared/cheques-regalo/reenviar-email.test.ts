// «Reenviar correo al cliente» (acción `reenviar_email` de cheques-regalo-admin).
// Test Deno (`deno test`): base de datos y envío de mentira.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mensajeEnvioFallido, reenviarEmailChequeWeb } from "./reenviar-email.ts";
import { CHEQUE_EJEMPLO } from "./plantilla.ts";
import type { ResultadoEnvioCheque } from "./email.ts";
import type { ChequeParaEmail, OpcionesEnvioCheque } from "./tipos.ts";

const assert = (v: unknown, mensaje = "Resultado incorrecto") => { if (!v) throw new Error(mensaje); };
const ID = "0621b106-0000-4000-8000-000000000001";
const WEB = { ...CHEQUE_EJEMPLO, id: ID, origen: "web", estado: "pagado", codigo: "CT-ABCD-1234", email_enviado_en: null };

/** `from("cheques_regalo")`: lectura por id y la marca de `email_enviado_en`. */
function baseDeDatos(fila: unknown, errorMarca: unknown = null) {
  const marcas: Record<string, unknown>[] = [];
  const db = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: fila, error: null }) }) }),
      update: (valores: Record<string, unknown>) => ({ eq: () => { marcas.push(valores); return Promise.resolve({ error: errorMarca }); } }),
    }),
  } as unknown as SupabaseClient;
  return { db, marcas };
}

function envio(resultado: ResultadoEnvioCheque) {
  const llamadas: { cheque: ChequeParaEmail; opciones: OpcionesEnvioCheque; clave?: string }[] = [];
  return {
    llamadas,
    servicios: {
      prepararChequeEmail: (_db: SupabaseClient, c: ChequeParaEmail) => Promise.resolve({ ...c, ocultar_importe: true }),
      enviarEmailChequeConDetalle: (cheque: ChequeParaEmail, opciones: OpcionesEnvioCheque, clave?: string) => {
        llamadas.push({ cheque, opciones, clave });
        return Promise.resolve(resultado);
      },
    },
  };
}

Deno.test("reenvía el correo de un cheque web pagado, con otra clave de envío, y marca email_enviado_en", async () => {
  const { db, marcas } = baseDeDatos({ ...WEB, email_enviado_en: "2026-11-10T10:00:00Z" });
  const { llamadas, servicios } = envio({ ok: true });
  const r = await reenviarEmailChequeWeb(db, ID, "clave-panel-123", servicios);
  assert(r.ok && r.status === 200 && r.email_enviado);
  assert(llamadas.length === 1);
  // Mismo cheque y la selección guardada (ocultar importe) de la plantilla preparada.
  assert(llamadas[0].cheque.codigo === "CT-ABCD-1234" && llamadas[0].opciones.ocultarImporte === true);
  // Nunca la clave del primer envío: Resend devolvería aquella respuesta sin mandar nada.
  assert(llamadas[0].clave === `cheque-regalo-reenvio-${ID}-clave-panel-123`, String(llamadas[0].clave));
  assert(marcas.length === 1 && typeof marcas[0].email_enviado_en === "string");
});

Deno.test("sin clave del panel (o con una rara) se genera una nueva", async () => {
  const { db } = baseDeDatos(WEB);
  const { llamadas, servicios } = envio({ ok: true });
  await reenviarEmailChequeWeb(db, ID, "../../mal clave", servicios);
  await reenviarEmailChequeWeb(db, ID, undefined, servicios);
  assert(llamadas.every((l) => l.clave?.startsWith(`cheque-regalo-reenvio-${ID}-`) && !l.clave.includes(" ")));
  assert(llamadas[0].clave !== llamadas[1].clave);
});

Deno.test("sin RESEND_API_KEY (la demo): 503 y un mensaje que lo dice, sin marcar nada", async () => {
  const { db, marcas } = baseDeDatos(WEB);
  const { servicios } = envio({ ok: false, motivo: "sin_resend", detalle: "falta RESEND_API_KEY" });
  const r = await reenviarEmailChequeWeb(db, ID, undefined, servicios);
  assert(!r.ok && r.status === 503 && r.motivo === "sin_resend");
  assert(!r.ok && r.mensaje.includes("falta RESEND_API_KEY"), !r.ok ? r.mensaje : "");
  assert(marcas.length === 0);
});

Deno.test("si Resend lo rechaza: 502 con su explicación", async () => {
  const { db, marcas } = baseDeDatos(WEB);
  const { servicios } = envio({ ok: false, motivo: "resend", detalle: "403 validation_error: domain not verified" });
  const r = await reenviarEmailChequeWeb(db, ID, undefined, servicios);
  assert(!r.ok && r.status === 502 && r.mensaje.includes("domain not verified"));
  assert(marcas.length === 0);
});

Deno.test("solo cheques web pagados: manual, cancelado, pendiente, inexistente o id raro no envían nada", async () => {
  const casos: [unknown, unknown, number][] = [
    [{ ...WEB, origen: "manual" }, ID, 409],
    [{ ...WEB, estado: "cancelado" }, ID, 409],
    [{ ...WEB, estado: "pendiente", codigo: null }, ID, 409],
    [null, ID, 404],
    [WEB, "no-es-un-id", 422],
  ];
  for (const [fila, id, status] of casos) {
    const { db } = baseDeDatos(fila);
    const { llamadas, servicios } = envio({ ok: true });
    const r = await reenviarEmailChequeWeb(db, id, undefined, servicios);
    assert(!r.ok && r.status === status && !r.email_enviado, `${JSON.stringify(fila)} → ${r.status}`);
    assert(llamadas.length === 0);
  }
});

Deno.test("si el correo sale pero no se guarda la fecha, no se da por fallido (otro intento lo duplicaría)", async () => {
  const { db } = baseDeDatos(WEB, { message: "sin conexión" });
  const { servicios } = envio({ ok: true });
  const r = await reenviarEmailChequeWeb(db, ID, undefined, servicios);
  assert(r.ok && r.email_enviado && typeof r.aviso === "string");
});

Deno.test("mensajes legibles para cada motivo", () => {
  assert(mensajeEnvioFallido({ ok: false, motivo: "sin_caducidad", detalle: "" }).includes("fecha de caducidad"));
  assert(mensajeEnvioFallido({ ok: false, motivo: "excepcion", detalle: "sin red" }).includes("sin red"));
});
