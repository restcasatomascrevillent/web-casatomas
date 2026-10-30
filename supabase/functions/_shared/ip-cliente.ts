// ============================================================================
//  IP del cliente detrás de la pasarela de Supabase (CT-REM-FN-03)
// ----------------------------------------------------------------------------
//  Las Edge Functions van detrás de Cloudflare:
//   · `cf-connecting-ip` lo pone la plataforma y sobrescribe lo que mande el
//     cliente → es la fuente preferida.
//   · `x-forwarded-for` NO es fiable en su PRIMERA posición: el cliente puede
//     mandar su propia cabecera y la plataforma CONCATENA la IP real al final
//     (https://github.com/orgs/supabase/discussions/34647). De ahí solo se usa
//     el ÚLTIMO salto.
//  Copia de `admin-casatomas/supabase/functions/_shared/ip-cliente.ts` (otro
//  repo, mismas reglas). Aquí la usa `cheques-regalo/admin-auth.ts` para la
//  cabecera `x-audit-ip`: antes tomaba el primer salto de XFF, así que el
//  cliente podía falsear la IP del registro de auditoría de Cheques.
// ============================================================================

const LONGITUD_MAXIMA = 128;

/** IP del cliente o "" si la petición no trae ninguna cabecera de IP. */
export function ipCliente(req: Request | Headers): string {
  const headers = req instanceof Headers ? req : req.headers;
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf.slice(0, LONGITUD_MAXIMA);
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const saltos = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (saltos.length) return saltos[saltos.length - 1].slice(0, LONGITUD_MAXIMA);
  }
  return "";
}
