import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { prepararChequeEmail } from "./preparar-email.ts";
import { enviarEmailCheque } from "./email.ts";
import { enviarFacturaCheque } from "../enviar-factura-cheque.ts";
import type { ChequeParaEmail } from "./tipos.ts";

type CompraManual = ChequeParaEmail & { email_enviado_en?: string | null; solicita_factura?: boolean };
const envio = { prepararChequeEmail, enviarEmailCheque, enviarFacturaCheque };

/** Reintenta los envíos pendientes, conservando el código y la factura existentes. */
export async function enviarCompraManual(db: SupabaseClient, compra: CompraManual, servicios = envio) {
  let emailEnviado = !!compra.email_enviado_en;
  let facturaEnviada = false;
  if (!emailEnviado) {
    try {
      const preparado = await servicios.prepararChequeEmail(db, compra);
      if (await servicios.enviarEmailCheque(preparado, { ocultarImporte: compra.ocultar_importe === true })) {
        const { error } = await db.from("cheques_regalo").update({ email_enviado_en: new Date().toISOString() }).eq("id", compra.id);
        if (error) throw new Error("No se pudo registrar el envío del cheque");
        emailEnviado = true;
      }
    } catch (error) { console.error("[cheques-regalo-admin] envío del cheque falló:", error); }
  }
  if (compra.solicita_factura) {
    try { await servicios.enviarFacturaCheque(db, compra.id); facturaEnviada = true; }
    catch (error) { console.error("[cheques-regalo-admin] envío de factura falló:", error); }
  }
  return { email_enviado: emailEnviado, factura_solicitada: compra.solicita_factura === true, factura_enviada: facturaEnviada };
}
