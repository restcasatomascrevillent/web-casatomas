-- Al eliminar una novedad, o al cambiarle la foto, se borra del bucket
-- `novedades` la foto que deja de usarse.
--
-- Postgres no puede borrar ficheros de Storage (`storage.protect_delete`), así
-- que el trigger apunta la ruta en una cola y avisa por pg_net a la edge
-- function `limpiar-fotos-novedades`, que la borra por la API de Storage solo
-- si ninguna otra novedad la sigue usando. pg_net envía la petición al
-- confirmarse la transacción: si el borrado se deshace, no sale nada.
begin;

create table if not exists public.novedades_fotos_por_borrar (
  ruta text primary key,
  creado_en timestamptz not null default now()
);

comment on table public.novedades_fotos_por_borrar is
  'Fotos del bucket novedades pendientes de borrar. Solo la escribe trg_novedades_limpiar_foto y solo la procesa la edge function limpiar-fotos-novedades.';

-- RLS sin políticas: ni anon ni authenticated la ven. La edge function entra
-- con el rol de servicio y el trigger es SECURITY DEFINER.
alter table public.novedades_fotos_por_borrar enable row level security;
revoke all on public.novedades_fotos_por_borrar from anon, authenticated;

create or replace function public.novedades_limpiar_foto()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  c_url constant text := 'https://jeamoczmbfsnwkfjxcyo.supabase.co/functions/v1/limpiar-fotos-novedades';
  v_ruta text;
begin
  if tg_op = 'UPDATE' and new.imagen_url is not distinct from old.imagen_url then
    return null;
  end if;

  -- Solo fotos del bucket `novedades`: una foto de la carta (bucket `platos`)
  -- reutilizada en una novedad no se toca nunca.
  v_ruta := substring(old.imagen_url from '/storage/v1/object/public/novedades/([^?#]+)');
  if v_ruta is null then
    return null;
  end if;

  insert into public.novedades_fotos_por_borrar (ruta) values (v_ruta)
  on conflict (ruta) do nothing;

  -- Un fallo al avisar nunca debe impedir borrar o editar la novedad: la ruta
  -- se queda en la cola y sale con el siguiente aviso.
  begin
    perform net.http_post(
      url := c_url,
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000);
  exception when others then
    raise warning 'novedades_limpiar_foto: no se pudo avisar a limpiar-fotos-novedades: %', sqlerrm;
  end;

  return null;
end;
$$;

revoke all on function public.novedades_limpiar_foto() from public, anon, authenticated;

create or replace trigger trg_novedades_limpiar_foto
  after delete or update of imagen_url on public.novedades
  for each row execute function public.novedades_limpiar_foto();

commit;
