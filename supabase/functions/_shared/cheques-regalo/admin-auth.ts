import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Mismo criterio que `admin-delete-user` del panel (adminpanelct):
 * `is_admin` (RPC, rol en `user_roles`) o el correo en `SUPER_ADMIN_EMAILS`
 * — lo que sea más laxo de los dos vale, igual que allí. Una sola fuente de
 * verdad para "quién puede tocar cheques regalo a mano" en vez de reinventar
 * el criterio en cada función nueva.
 */
const SUPER_ADMIN_EMAILS = (
  Deno.env.get("SUPER_ADMIN_EMAILS") ?? "miguelsantiagores@gmail.com,info@casatomas.es,admin@admin.com"
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const isSuperAdminEmail = (email?: string | null) => !!email && SUPER_ADMIN_EMAILS.includes(email.toLowerCase());

export type VerificacionAdmin =
  | { ok: true; admin: SupabaseClient }
  | { ok: false; status: number; mensaje: string };

/**
 * Comprueba que quien llama es un admin de verdad y, si lo es, devuelve un
 * cliente con la service role key para hacer la operación — el mismo patrón
 * que ya usa `admin-delete-user`.
 */
export async function verificarAdmin(req: Request): Promise<VerificacionAdmin> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { ok: false, status: 401, mensaje: "No autorizado" };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user: currentUser },
    error: userError,
  } = await supabaseUser.auth.getUser();
  if (userError || !currentUser) return { ok: false, status: 401, mensaje: "Usuario no autenticado" };

  if (isSuperAdminEmail(currentUser.email)) return { ok: true, admin: supabaseAdmin };

  const { data: isAdminResult, error: adminCheckError } = await supabaseAdmin.rpc("is_admin", {
    _user_id: currentUser.id,
  });
  if (adminCheckError || !isAdminResult) {
    return { ok: false, status: 403, mensaje: "Solo administradores pueden gestionar cheques regalo" };
  }

  return { ok: true, admin: supabaseAdmin };
}
