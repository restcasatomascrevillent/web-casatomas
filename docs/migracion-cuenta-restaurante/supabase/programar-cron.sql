-- Vuelve a crear en el DESTINO los trabajos de pg_cron del origen, con las
-- URLs apuntando al proyecto nuevo. Los lee de :cron_origen, un fichero que
-- genera `migrar.sh volcar` (una línea `insert into _cron ...` por trabajo).
--
-- :cron_modo
--   todos     -> los mismos trabajos que el origen (producción).
--   internos  -> solo los que no llaman a Edge Functions ni a OpenAI (demo):
--                así una demo no manda recordatorios ni gasta en IA.
--
-- Borra antes los trabajos que ya hubiera en el destino, así que es repetible.

\set ON_ERROR_STOP on

begin;

select set_config('migracion.origen_ref', :'origen_ref', true),
       set_config('migracion.destino_ref', :'destino_ref', true),
       set_config('migracion.reemplazos', :'reemplazos', true),
       set_config('migracion.cron_modo', :'cron_modo', true)
\g /dev/null

create temporary table _cron (nombre text, horario text, comando text) on commit drop;

\i :cron_origen

update _cron
   set comando = replace(comando,
                         current_setting('migracion.origen_ref') || '.supabase.co',
                         current_setting('migracion.destino_ref') || '.supabase.co');

update _cron c
   set comando = replace(c.comando, btrim(split_part(par, '=>', 1)), btrim(split_part(par, '=>', 2)))
  from unnest(string_to_array(current_setting('migracion.reemplazos'), ';')) as par
 where position('=>' in par) > 0
   and btrim(split_part(par, '=>', 1)) <> ''
   and btrim(split_part(par, '=>', 2)) <> '';

select cron.unschedule(jobid) from cron.job \g /dev/null

do $$
declare
  t record;
  saltados int := 0;
  creados int := 0;
begin
  for t in select * from _cron order by nombre loop
    if current_setting('migracion.cron_modo') = 'internos'
       and t.comando ~ '(http_post|_despachar|reanudar_trabajos_ocr)' then
      raise notice 'cron omitido en modo internos: %', t.nombre;
      saltados := saltados + 1;
      continue;
    end if;
    perform cron.schedule(t.nombre, t.horario, t.comando);
    creados := creados + 1;
  end loop;
  raise notice 'cron: % trabajo(s) programados, % omitidos', creados, saltados;
end
$$;

commit;
