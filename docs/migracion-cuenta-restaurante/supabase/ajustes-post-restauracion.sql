-- Ajustes tras restaurar el volcado del proyecto origen en un proyecto nuevo.
--
-- La copia sale idéntica, así que sigue apuntando al proyecto viejo en dos
-- sitios: datos (URLs de fotos de Storage, enlaces a las webs…) y funciones
-- SQL que llaman a Edge Functions por pg_net con la URL escrita a mano
-- (ocr_despachar, novedades_limpiar_foto, productos_despachar_clasificacion,
-- openai_despachar_sincronizacion_costes). Esto lo corrige en el DESTINO.
-- El cron y el Vault van aparte (migrar.sh), porque leen del origen o usan
-- valores secretos.
--
-- Uso (lo lanza migrar.sh):
--   psql "$DESTINO_DB_URL" -v origen_ref=jeamoczmbfsnwkfjxcyo \
--        -v destino_ref=haqmmdfdzzatdnrrcgez \
--        -v reemplazos='https://casa-tomas-story.vercel.app=>https://web-casatomas.vercel.app' \
--        -f ajustes-post-restauracion.sql
--
-- Solo imprime nombres de tabla/columna y recuentos, nunca contenido de filas.
-- Es repetible: una segunda pasada no encuentra nada que cambiar.

\set ON_ERROR_STOP on

begin;

select set_config('migracion.origen_ref', :'origen_ref', true),
       set_config('migracion.destino_ref', :'destino_ref', true),
       set_config('migracion.reemplazos', :'reemplazos', true)
\g /dev/null

-- Es una corrección de la copia, no un cambio del restaurante: que no salten
-- los triggers de auditoría, updated_at ni avisos.
set local session_replication_role = replica;

create temporary table _reemplazos (orden int, antes text, despues text) on commit drop;

insert into _reemplazos
values (0,
        current_setting('migracion.origen_ref') || '.supabase.co',
        current_setting('migracion.destino_ref') || '.supabase.co');

insert into _reemplazos
select ordinality, btrim(split_part(par, '=>', 1)), btrim(split_part(par, '=>', 2))
  from unnest(string_to_array(current_setting('migracion.reemplazos'), ';')) with ordinality as t(par, ordinality)
 where position('=>' in par) > 0
   and btrim(split_part(par, '=>', 1)) <> ''
   and btrim(split_part(par, '=>', 2)) <> '';

-- 1) Datos: toda columna de texto/json de los esquemas propios.
do $$
declare
  c record;
  r record;
  n bigint;
  total bigint := 0;
begin
  for c in
    select ns.nspname as esquema, cl.relname as tabla, a.attname as columna,
           format_type(a.atttypid, a.atttypmod) as tipo
      from pg_attribute a
      join pg_class cl on cl.oid = a.attrelid
      join pg_namespace ns on ns.oid = cl.relnamespace
     where ns.nspname in ('public', 'private', 'inventory')
       and cl.relkind in ('r', 'p')
       and a.attnum > 0
       and not a.attisdropped
       and a.attgenerated = ''
       and a.atttypid in ('text'::regtype, 'varchar'::regtype, 'bpchar'::regtype,
                          'json'::regtype, 'jsonb'::regtype, 'text[]'::regtype)
     order by 1, 2, 3
  loop
    for r in select * from _reemplazos order by orden loop
      execute format(
        'update %I.%I set %I = replace(%I::text, $1, $2)::%s where strpos(%I::text, $1) > 0',
        c.esquema, c.tabla, c.columna, c.columna, c.tipo, c.columna)
        using r.antes, r.despues;
      get diagnostics n = row_count;
      if n > 0 then
        raise notice 'datos: % fila(s) en %.%.% (% -> %)', n, c.esquema, c.tabla, c.columna, r.antes, r.despues;
        total := total + n;
      end if;
    end loop;
  end loop;
  raise notice 'datos: % fila(s) corregidas en total', total;
end
$$;

-- 2) Funciones SQL con la URL del proyecto (o de las webs) escrita en el cuerpo.
do $$
declare
  f record;
  r record;
  def text;
begin
  for f in
    select p.oid, ns.nspname, p.proname
      from pg_proc p
      join pg_namespace ns on ns.oid = p.pronamespace
     where ns.nspname in ('public', 'private', 'inventory')
       and p.prokind in ('f', 'p')
       and exists (select 1 from _reemplazos x where strpos(p.prosrc, x.antes) > 0)
  loop
    def := pg_get_functiondef(f.oid);
    for r in select * from _reemplazos order by orden loop
      def := replace(def, r.antes, r.despues);
    end loop;
    execute def;
    raise notice 'función reescrita: %.%', f.nspname, f.proname;
  end loop;
end
$$;

-- 3) Comprobación: nada de lo propio debe seguir nombrando al proyecto origen.
do $$
declare
  c record;
  n bigint;
  restos int := 0;
begin
  for c in
    select ns.nspname as esquema, cl.relname as tabla, a.attname as columna
      from pg_attribute a
      join pg_class cl on cl.oid = a.attrelid
      join pg_namespace ns on ns.oid = cl.relnamespace
     where ns.nspname in ('public', 'private', 'inventory')
       and cl.relkind in ('r', 'p')
       and a.attnum > 0
       and not a.attisdropped
       and a.atttypid in ('text'::regtype, 'varchar'::regtype, 'bpchar'::regtype,
                          'json'::regtype, 'jsonb'::regtype, 'text[]'::regtype)
  loop
    execute format('select count(*) from %I.%I where strpos(%I::text, $1) > 0',
                   c.esquema, c.tabla, c.columna)
      into n using current_setting('migracion.origen_ref');
    if n > 0 then
      raise warning 'sigue apareciendo el proyecto origen en %.%.% (% fila(s))', c.esquema, c.tabla, c.columna, n;
      restos := restos + 1;
    end if;
  end loop;

  for c in
    select ns.nspname as esquema, p.proname as tabla
      from pg_proc p
      join pg_namespace ns on ns.oid = p.pronamespace
     where ns.nspname in ('public', 'private', 'inventory')
       and strpos(p.prosrc, current_setting('migracion.origen_ref')) > 0
  loop
    raise warning 'la función %.% sigue nombrando al proyecto origen', c.esquema, c.tabla;
    restos := restos + 1;
  end loop;

  raise notice 'comprobación: % sitio(s) con referencias al proyecto origen', restos;
end
$$;

commit;
