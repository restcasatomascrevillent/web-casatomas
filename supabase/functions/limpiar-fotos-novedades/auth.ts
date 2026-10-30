import { compararTiempoConstante } from "../_shared/tiempo-constante.ts";

/**
 * CT-REM-FN-11. La función la llama el trigger de `novedades` por pg_net con la
 * cabecera `x-webhook-secret`. FALLA CERRADO: sin LIMPIAR_FOTOS_WEBHOOK_SECRET
 * configurado responde 500; sin cabecera o con otra distinta, 401.
 */
export function autorizarLlamada(
  secretoConfigurado: string | undefined | null,
  cabecera: string | null,
): { ok: true } | { ok: false; status: 401 | 500; error: string } {
  if (!secretoConfigurado) return { ok: false, status: 500, error: "secreto_no_configurado" };
  if (!cabecera || !compararTiempoConstante(cabecera, secretoConfigurado)) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  return { ok: true };
}
