import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { ChequeParaEmail } from "./tipos.ts";

/** Guarda el diseño antes del primer envío: los reintentos conservan el mismo regalo. */
export async function prepararChequeEmail(db: SupabaseClient, cheque: ChequeParaEmail): Promise<ChequeParaEmail> {
  if (cheque.plantilla_cheque) return cheque;
  const { data: plantilla, error } = await db.from("plantilla_cheques_regalo").select("*").eq("id", true).single();
  if (error || !plantilla) throw new Error("No se pudo cargar la plantilla del cheque");
  const { data: actualizado, error: errorGuardar } = await db.from("cheques_regalo")
    .update({ plantilla_cheque: plantilla }).eq("id", cheque.id).is("plantilla_cheque", null).select("*").maybeSingle();
  if (errorGuardar) throw new Error("No se pudo guardar la plantilla del cheque");
  if (actualizado) return actualizado as ChequeParaEmail;
  const { data: existente, error: errorLectura } = await db.from("cheques_regalo").select("*").eq("id", cheque.id).single();
  if (errorLectura || !existente?.plantilla_cheque) throw new Error("No se pudo recuperar la plantilla del cheque");
  return existente as ChequeParaEmail;
}
