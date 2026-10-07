import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type VerificacionAdmin =
  | { ok: true; admin: SupabaseClient; usuario: SupabaseClient }
  | { ok: false; status: number; mensaje: string };

/** Los permisos de Cheques se comprueban en el servidor para cada operación. */
export async function verificarAdmin(req: Request, permiso: "view" | "edit" = "edit"): Promise<VerificacionAdmin> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { ok: false, status: 401, mensaje: "No autorizado" };
  const url = Deno.env.get("SUPABASE_URL")!;
  const usuario = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } }, auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error } = await usuario.auth.getUser();
  if (error || !user) return { ok: false, status: 401, mensaje: "Usuario no autenticado" };
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    global: { headers: { "x-audit-actor-id": user.id, "x-audit-actor-email": user.email || "" } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: permitido, error: errorPermiso } = await admin.rpc("has_section_permission", {
    _user_id: user.id, _section: "cheques", _permission: permiso,
  });
  if (errorPermiso || permitido !== true) return { ok: false, status: 403, mensaje: "No tienes permiso para esta operación de Cheques" };
  return { ok: true, admin, usuario };
}
