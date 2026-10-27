with f as (
  select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as sig,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as autenticado,
    has_function_privilege('service_role', p.oid, 'EXECUTE') as servidor
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public','private','inventory') and p.prokind in ('f','p')
)
select md5(string_agg(sig || ':' || anon::int || autenticado::int || servidor::int, ';' order by sig)) as huella,
  count(*) as funciones, count(*) filter (where anon) as anon_si,
  count(*) filter (where autenticado) as autenticado_si, count(*) filter (where servidor) as servidor_si
from f
