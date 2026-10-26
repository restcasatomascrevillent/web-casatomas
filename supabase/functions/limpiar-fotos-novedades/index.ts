import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Borra del bucket `novedades` las fotos que ya no usa ninguna novedad.
 *
 * Postgres no puede borrar ficheros de Storage (`storage.protect_delete`
 * impide tocar `storage.objects` a mano), así que el trigger
 * `trg_novedades_limpiar_foto` solo apunta la ruta en
 * `novedades_fotos_por_borrar` al eliminar una novedad o cambiarle la foto, y
 * llama a esta función (pg_net) para que la borre por la API de Storage.
 *
 * `verify_jwt` va desactivado porque pg_net llama sin sesión. Es seguro: la
 * función no recibe rutas, solo procesa la cola, que únicamente escribe ese
 * trigger (RLS sin políticas). Quien la llame desde fuera, como mucho, adelanta
 * un borrado que ya estaba pendiente.
 *
 * Antes de borrar comprueba que ninguna novedad siga usando la foto (dos
 * novedades pueden compartirla). Solo toca el bucket `novedades`: una foto de
 * la carta (bucket `platos`) reutilizada en una novedad no entra nunca en la
 * cola.
 */

const BUCKET = "novedades";
const PREFIJO_URL = `/storage/v1/object/public/${BUCKET}/`;
const LOTE = 100;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const decodificar = (ruta: string) => {
  try {
    return decodeURIComponent(ruta);
  } catch {
    return ruta;
  }
};

/** `…/object/public/novedades/novedades/123.jpg?t=1` -> `novedades/123.jpg`. */
function rutaDeUrl(url: string | null): string | null {
  if (!url) return null;
  const i = url.indexOf(PREFIJO_URL);
  if (i === -1) return null;
  return decodificar(url.slice(i + PREFIJO_URL.length).split(/[?#]/)[0]);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
    // La auditoría del panel (`fn_identificar_actor_auditoria`) rechaza los
    // cambios del rol de servicio que no dicen qué proceso los hace.
    global: { headers: { "x-audit-source": "limpiar-fotos-novedades" } },
  });

  const { data: pendientes, error: errorCola } = await supabase
    .from("novedades_fotos_por_borrar")
    .select("ruta")
    .limit(LOTE);
  if (errorCola) return json({ error: errorCola.message }, 500);
  if (!pendientes?.length) return json({ borradas: [], conservadas: [] });

  const { data: novedades, error: errorNovedades } = await supabase
    .from("novedades")
    .select("imagen_url")
    .not("imagen_url", "is", null);
  if (errorNovedades) return json({ error: errorNovedades.message }, 500);

  const enUso = new Set((novedades ?? []).map((n) => rutaDeUrl(n.imagen_url)));
  const rutas: string[] = pendientes.map((p) => p.ruta);
  const conservadas = rutas.filter((r) => enUso.has(decodificar(r)));
  const aBorrar = rutas.filter((r) => !enUso.has(decodificar(r)));

  let borradas: string[] = [];
  if (aBorrar.length) {
    const { data, error } = await supabase.storage.from(BUCKET).remove(aBorrar.map(decodificar));
    // Si Storage falla, las rutas se quedan en la cola para el siguiente aviso.
    if (error) return json({ error: error.message }, 500);
    borradas = (data ?? []).map((o) => o.name);
  }

  const { error: errorVaciar } = await supabase.from("novedades_fotos_por_borrar").delete().in("ruta", rutas);
  if (errorVaciar) return json({ error: errorVaciar.message }, 500);

  console.log(`[limpiar-fotos-novedades] borradas=${borradas.length} conservadas=${conservadas.length}`);
  return json({ borradas, conservadas });
});
