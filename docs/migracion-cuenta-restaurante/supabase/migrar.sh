#!/usr/bin/env bash
# Duplica el Supabase de Casa Tomás (proyecto origen, cuenta oficiososia) en un
# proyecto de la cuenta del restaurante. Del origen SOLO LEE: pg_dump, la API
# de Storage en lectura y la Management API en GET.
#
# Uso:  migrar.sh <paso> [<paso>...]      (en el orden en que se escriban)
#
#   volcar        pg_dump del origen + lo que el volcado no trae (políticas y
#                 triggers sobre auth/storage, publicación realtime, cron,
#                 extensiones, historial de migraciones) en $TRABAJO
#   restaurar     carga el volcado en un destino VACÍO
#   gestionados   políticas/triggers de auth y storage + publicación realtime
#   ajustar       URLs del proyecto viejo en datos y funciones SQL
#   cron          pg_cron con las URLs nuevas ($CRON_MODO: todos | internos)
#   secretos      secretos de las Edge Functions + Vault (mismos valores)
#   storage       ficheros de los buckets
#   funciones     las 41 Edge Functions, con el mismo verify_jwt que el origen
#   auth          configuración de Auth (Site URL, redirecciones, SMTP…)
#   clientes      SOLO DEMO: vacía reservas, newsletter, chats, cheques…
#   recargar      vuelve a cargar SOLO los datos sobre un destino ya montado
#                 (para el corte final); pide CONFIRMAR=<ref del destino>
#   verificar     compara recuentos y objetos origen/destino
#
#   Primera vez (prod):  volcar restaurar storage gestionados ajustar cron secretos funciones auth verificar
#   Primera vez (demo):  lo mismo + clientes antes de verificar, con CRON_MODO=internos
#   Corte final (prod):  volcar recargar ajustar storage verificar
#
#   storage va ANTES que gestionados: gestionados crea el trigger de auditoría
#   de storage.objects, y con él cada fichero copiado sumaría una fila nueva a
#   audit_log que el origen no tiene.
#
# Variables (en GitHub Actions llegan como secrets; ver README.md):
#   DESTINO_REF                         haqmmdfdzzatdnrrcgez (prod) | sfonaclosuafvlhutkon (demo)
#   SUPABASE_ACCESS_TOKEN               token personal de la cuenta del RESTAURANTE
#   SUPABASE_ACCESS_TOKEN_ORIGEN        token personal de la cuenta OFICIOSOSIA
#   ORIGEN_DB_URL, DESTINO_DB_URL       opcionales. Sin ellas no hacen falta contraseñas:
#                                       cada conexión pide a la Management API un rol
#                                       temporal (5 min), de SOLO LECTURA en el origen.
#   SECRETOS_FUNCIONES                  .env con las claves externas (Stripe, Resend, OpenAI…)
#   REEMPLAZOS                          "url_vieja=>url_nueva;..." para las webs y el panel
#   REPO_PANEL, REPO_WEB                checkouts de admin-casatomas y web-casatomas
#   CRON_MODO                           todos (prod, por defecto) | internos (demo)
#   SMTP_PASS                           si el origen usa SMTP propio para Auth
#
# Nunca imprime valores de secretos ni filas de datos: solo nombres y recuentos.

set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORIGEN_REF="${ORIGEN_REF:-jeamoczmbfsnwkfjxcyo}"
PROD_REF="haqmmdfdzzatdnrrcgez"
DEMO_REF="sfonaclosuafvlhutkon"
TRABAJO="${TRABAJO:-$AQUI/.volcado}"
API="${SUPABASE_API_URL:-https://api.supabase.com}/v1"
REEMPLAZOS="${REEMPLAZOS:-}"
CRON_MODO="${CRON_MODO:-todos}"
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

log() { printf '\n== %s\n' "$*"; }
falta() {
  local v
  for v in "$@"; do
    [ -n "${!v:-}" ] || { echo "Falta la variable $v" >&2; exit 2; }
  done
}
ocultar() { [ -n "${GITHUB_ACTIONS:-}" ] && [ -n "${1:-}" ] && echo "::add-mask::$1"; return 0; }

comprobar_destino() {
  falta DESTINO_REF
  [ -n "${DESTINO_DB_URL:-}" ] || falta SUPABASE_ACCESS_TOKEN
  case "$DESTINO_REF" in
    "$PROD_REF"|"$DEMO_REF") ;;
    *) echo "DESTINO_REF debe ser $PROD_REF (prod) o $DEMO_REF (demo)" >&2; exit 2 ;;
  esac
  if [ -n "${DESTINO_DB_URL:-}" ]; then
    if [[ "$DESTINO_DB_URL" == *"$ORIGEN_REF"* ]]; then
      echo "DESTINO_DB_URL apunta al proyecto ORIGEN: no se escribe nada ahí." >&2
      exit 2
    fi
    if [[ "$DESTINO_DB_URL" != *"$DESTINO_REF"* ]]; then
      echo "DESTINO_DB_URL no es del proyecto $DESTINO_REF (¿secret cambiado?)." >&2
      exit 2
    fi
  fi
}

comprobar_origen() {
  if [ -n "${ORIGEN_DB_URL:-}" ]; then
    if [[ "$ORIGEN_DB_URL" != *"$ORIGEN_REF"* ]]; then
      echo "ORIGEN_DB_URL no es del proyecto $ORIGEN_REF." >&2
      exit 2
    fi
  else
    falta SUPABASE_ACCESS_TOKEN_ORIGEN
  fi
}

# Deja en URL_TEMPORAL una conexión Session pooler con un rol temporal de la
# Management API (el mismo mecanismo que usa el CLI; la contraseña sirve 5 min
# para entrar). <ref> <token> <solo_lectura: true|false>
#
# El pooler tarda unos segundos en aceptar una contraseña recién creada
# ("password authentication failed" justo después de pedirla): se prueba con
# reintentos antes de devolverla, y se reutiliza 4 minutos para no pedir una
# nueva en cada consulta.
URL_TEMPORAL=""
declare -A URL_CACHE=() URL_CACHE_DESDE=()
url_temporal() {
  local ref="$1" token="$2" solo_lectura="$3" clave_cache="$1:$3" rol clave host intento
  if [ -n "${URL_CACHE[$clave_cache]:-}" ] && (( $(date +%s) - URL_CACHE_DESDE[$clave_cache] < 240 )); then
    URL_TEMPORAL="${URL_CACHE[$clave_cache]}"
    return
  fi
  read -r rol clave < <(curl -fsS -X POST "$API/projects/$ref/cli/login-role" \
      -H "Authorization: Bearer $token" -H "Content-Type: application/json" \
      -d "{\"read_only\": $solo_lectura}" | jq -r '"\(.role) \(.password | @uri)"')
  host="$(curl -fsS "$API/projects/$ref/config/database/pooler" -H "Authorization: Bearer $token" |
    jq -r '([.[] | select(.database_type == "PRIMARY")][0] // .[0]).db_host')"
  [ -n "$rol" ] && [ -n "$clave" ] && [ -n "$host" ] || { echo "No se pudo obtener el rol temporal de $ref." >&2; exit 1; }
  ocultar "$clave"
  URL_TEMPORAL="postgresql://$rol.$ref:$clave@$host:5432/postgres?sslmode=require"
  for intento in 1 2 3 4 5 6 7 8 9 10; do
    if psql -X -q -At -c 'select 1' "$URL_TEMPORAL" >/dev/null 2>&1; then
      URL_CACHE[$clave_cache]="$URL_TEMPORAL"
      URL_CACHE_DESDE[$clave_cache]=$(date +%s)
      return
    fi
    sleep $((intento * 2))
  done
  echo "El rol temporal de $ref no consigue entrar tras 10 intentos:" >&2
  psql -X -q -At -c 'select 1' "$URL_TEMPORAL" >/dev/null
  exit 1
}

# psql contra el origen: SOLO LECTURA (supabase_read_only_user salta RLS, así
# que los recuentos son completos, y no puede escribir).
sql_origen() {
  if [ -n "${ORIGEN_DB_URL:-}" ]; then "${PSQL[@]}" "$@" "$ORIGEN_DB_URL"; return; fi
  url_temporal "$ORIGEN_REF" "$SUPABASE_ACCESS_TOKEN_ORIGEN" true
  "${PSQL[@]}" -c 'SET ROLE supabase_read_only_user' "$@" "$URL_TEMPORAL"
}

# psql contra el destino, como postgres (igual que la guía de Supabase).
sql_destino() {
  if [ -n "${DESTINO_DB_URL:-}" ]; then "${PSQL[@]}" "$@" "$DESTINO_DB_URL"; return; fi
  url_temporal "$DESTINO_REF" "$SUPABASE_ACCESS_TOKEN" false
  "${PSQL[@]}" -c 'SET ROLE postgres' "$@" "$URL_TEMPORAL"
}

# supabase db dump del origen: con ORIGEN_DB_URL, o enlazando el proyecto con
# el token (el CLI gestiona él mismo su rol temporal).
volcado_origen() {
  if [ -n "${ORIGEN_DB_URL:-}" ]; then supabase db dump --db-url "$ORIGEN_DB_URL" "$@"; return; fi
  local enlace="$TRABAJO/enlace"
  if [ ! -f "$enlace/supabase/.temp/project-ref" ]; then
    mkdir -p "$enlace/supabase"
    printf 'project_id = "%s"\n' "$ORIGEN_REF" > "$enlace/supabase/config.toml"
    SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN_ORIGEN" \
      supabase link --project-ref "$ORIGEN_REF" --workdir "$enlace" </dev/null
  fi
  SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN_ORIGEN" supabase db dump --linked --workdir "$enlace" "$@"
}

clave_servicio() { # <ref> <token>: clave secreta del proyecto (sb_secret_ o service_role)
  curl -fsS "$API/projects/$1/api-keys?reveal=true" -H "Authorization: Bearer $2" |
    jq -r '([.[] | select(.type == "secret" and (.api_key // "") != "")][0].api_key)
           // ([.[] | select(.name == "service_role")][0].api_key) // empty'
}

paso_volcar() {
  comprobar_origen
  mkdir -p "$TRABAJO"
  chmod 700 "$TRABAJO"
  log "Volcando el origen $ORIGEN_REF (solo lectura)"
  volcado_origen -f "$TRABAJO/roles.sql" --role-only
  volcado_origen -f "$TRABAJO/schema.sql"
  # storage.objects va por la API de Storage (con los ficheros); vault.secrets
  # está cifrado con la clave del proyecto origen y no se puede descifrar en
  # otro; cron y pg_net se rehacen aparte con las URLs nuevas.
  volcado_origen -f "$TRABAJO/data.sql" --use-copy --data-only \
    -x storage.objects -x storage.buckets -x storage.buckets_vectors -x storage.vector_indexes \
    -x vault.secrets -x cron.job -x cron.job_run_details \
    -x net.http_request_queue -x net._http_response
  volcado_origen -f "$TRABAJO/historial_schema.sql" --schema supabase_migrations
  volcado_origen -f "$TRABAJO/historial_data.sql" --use-copy --data-only --schema supabase_migrations

  # Arreglos documentados por Supabase para restaurar en otro proyecto.
  # El rol temporal del CLI (cli_login_*) ya existe en el destino y es con el
  # que se restaura: ni se crea ni se toca.
  sed -i -E 's/^(.*"cli_login_[a-z_]+".*)$/-- \1/' "$TRABAJO/roles.sql"
  # supabase/cli#7315 (corregido el 26-10-2026, puede no estar publicado aún):
  # permisos sobre parámetros a roles reservados, que postgres no puede dar.
  sed -i -E 's/^(GRANT [A-Z ,]+ ON PARAMETER .* TO "supabase_[a-z_]+".*)$/-- \1/' "$TRABAJO/roles.sql"
  sed -i -E 's/^(ALTER .* OWNER TO "supabase_admin";)$/-- \1/' "$TRABAJO/schema.sql"

  log "Extensiones, políticas y triggers de auth/storage, realtime y cron del origen"
  sql_origen -At -f - > "$TRABAJO/extensiones.sql" <<'SQL'
select format('create extension if not exists %I with schema %I;', extname, extnamespace::regnamespace)
  from pg_extension
 where extname <> 'plpgsql'
 order by extname;
SQL
  sql_origen -At -f - > "$TRABAJO/gestionados.sql" <<'SQL'
select format('drop policy if exists %I on %I.%I;', policyname, schemaname, tablename) || E'\n' ||
       format('create policy %I on %I.%I as %s for %s to %s%s%s;',
              policyname, schemaname, tablename, permissive, cmd,
              (select string_agg(case when r = 'public' then 'public' else quote_ident(r) end, ', ')
                 from unnest(roles) as r),
              case when qual is not null then ' using (' || qual || ')' else '' end,
              case when with_check is not null then ' with check (' || with_check || ')' else '' end)
  from pg_policies
 where schemaname in ('auth', 'storage')
 order by schemaname, tablename, policyname;

select format('drop trigger if exists %I on %I.%I;', t.tgname, n.nspname, c.relname) || E'\n' ||
       pg_get_triggerdef(t.oid) || ';' ||
       case when t.tgenabled = 'D'
            then E'\n' || format('alter table %I.%I disable trigger %I;', n.nspname, c.relname, t.tgname)
            else '' end
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace pn on pn.oid = p.pronamespace
 where not t.tgisinternal
   and n.nspname in ('auth', 'storage')
   and pn.nspname not in ('auth', 'storage', 'realtime')
 order by n.nspname, c.relname, t.tgname;

select format($f$do $$ begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = %L and schemaname = %L and tablename = %L) then
    alter publication %I add table %I.%I;
  end if;
end $$;$f$, pubname, schemaname, tablename, pubname, schemaname, tablename)
  from pg_publication_tables
 where pubname = 'supabase_realtime'
 order by schemaname, tablename;
SQL
  sql_origen -At -f - > "$TRABAJO/cron.sql" <<'SQL'
select format('insert into _cron values (%L, %L, %L);', jobname, schedule, command)
  from cron.job
 where active
 order by jobid;
SQL
  echo "Volcado listo: $(grep -c '^COPY ' "$TRABAJO/data.sql") tablas con datos," \
       "$(grep -c '^create policy' "$TRABAJO/gestionados.sql") políticas y" \
       "$(grep -c '^CREATE TRIGGER' "$TRABAJO/gestionados.sql") triggers de auth/storage," \
       "$(grep -c '^insert into _cron' "$TRABAJO/cron.sql") trabajos de cron."
}

paso_restaurar() {
  comprobar_destino
  local tablas
  tablas="$(sql_destino -At -c \
    "select count(*) from pg_tables where schemaname in ('public', 'private', 'inventory')")"
  if [ "$tablas" != "0" ]; then
    echo "El destino ya tiene $tablas tablas: 'restaurar' es solo para un proyecto vacío." >&2
    echo "Para refrescar los datos de un destino ya montado usa el paso 'recargar'." >&2
    exit 1
  fi
  log "Restaurando en $DESTINO_REF"
  sql_destino -f "$TRABAJO/extensiones.sql"
  # -o /dev/null: el volcado trae SELECT set_config(...) cuya salida no aporta;
  # los errores siguen saliendo por stderr.
  sql_destino --single-transaction -o /dev/null \
    -f "$TRABAJO/roles.sql" \
    -f "$TRABAJO/schema.sql" \
    -c 'SET session_replication_role = replica' \
    -f "$TRABAJO/data.sql"
  sql_destino --single-transaction -o /dev/null \
    -f "$TRABAJO/historial_schema.sql" \
    -f "$TRABAJO/historial_data.sql"
  echo "Restaurado."
}

paso_gestionados() {
  comprobar_destino
  log "Políticas y triggers de auth/storage + publicación realtime en $DESTINO_REF"
  sql_destino --single-transaction -f "$TRABAJO/gestionados.sql"
  echo "Hecho."
}

paso_ajustar() {
  comprobar_destino
  log "Corrigiendo URLs del proyecto origen en datos y funciones SQL de $DESTINO_REF"
  sql_destino \
    -v origen_ref="$ORIGEN_REF" -v destino_ref="$DESTINO_REF" -v reemplazos="$REEMPLAZOS" \
    -f "$AQUI/ajustes-post-restauracion.sql"
}

paso_cron() {
  comprobar_destino
  log "pg_cron en $DESTINO_REF (modo $CRON_MODO)"
  sql_destino \
    -v origen_ref="$ORIGEN_REF" -v destino_ref="$DESTINO_REF" -v reemplazos="$REEMPLAZOS" \
    -v cron_modo="$CRON_MODO" -v cron_origen="$TRABAJO/cron.sql" \
    -f "$AQUI/programar-cron.sql"
}

paso_secretos() {
  comprobar_destino
  falta SUPABASE_ACCESS_TOKEN
  log "Secretos de Edge Functions y Vault en $DESTINO_REF"
  mkdir -p "$TRABAJO"
  local vault="$TRABAJO/vault.sql"
  DESTINO_REF="$DESTINO_REF" ORIGEN_REF="$ORIGEN_REF" VAULT_SQL="$vault" \
    node "$AQUI/preparar-secretos.mjs"
  sql_destino -f "$vault"
  rm -f "$vault"
}

paso_storage() {
  comprobar_destino
  falta SUPABASE_ACCESS_TOKEN SUPABASE_ACCESS_TOKEN_ORIGEN
  log "Copiando Storage $ORIGEN_REF -> $DESTINO_REF"
  local clave_origen clave_destino
  clave_origen="$(clave_servicio "$ORIGEN_REF" "$SUPABASE_ACCESS_TOKEN_ORIGEN")"
  clave_destino="$(clave_servicio "$DESTINO_REF" "$SUPABASE_ACCESS_TOKEN")"
  ocultar "$clave_origen"
  ocultar "$clave_destino"
  [ -n "$clave_origen" ] && [ -n "$clave_destino" ] || { echo "No se pudieron obtener las claves de servicio." >&2; exit 1; }
  ORIGEN_URL="https://$ORIGEN_REF.supabase.co" ORIGEN_SERVICE_KEY="$clave_origen" \
  DESTINO_URL="https://$DESTINO_REF.supabase.co" DESTINO_SERVICE_KEY="$clave_destino" \
    node "$AQUI/copiar-storage.mjs"
}

paso_funciones() {
  falta DESTINO_REF SUPABASE_ACCESS_TOKEN REPO_PANEL REPO_WEB
  # 40 funciones leen SUPABASE_SERVICE_ROLE_KEY y 20 SUPABASE_ANON_KEY: la
  # plataforma solo las inyecta si el proyecto tiene activas las claves legacy.
  local legacy
  legacy="$(curl -fsS "$API/projects/$DESTINO_REF/api-keys" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" |
    jq -r '[.[] | select(.type == "legacy" or .name == "anon" or .name == "service_role") | .name] | sort | join(",")')"
  if [[ "$legacy" != *service_role* || "$legacy" != *anon* ]]; then
    echo "AVISO: $DESTINO_REF no tiene activas las claves legacy (anon/service_role)." >&2
    echo "  Sin ellas casi todas las funciones fallan. Actívalas en Settings → API Keys → Legacy API keys." >&2
  fi

  log "Desplegando Edge Functions en $DESTINO_REF"
  local slug repo vj dir flags tmp fallos=0
  while IFS=$'\t' read -r slug repo vj; do
    [[ -z "$slug" || "$slug" == \#* ]] && continue
    flags=(--project-ref "$DESTINO_REF" --use-api)
    [ "$vj" = "false" ] && flags+=(--no-verify-jwt)
    case "$repo" in
      panel) dir="$REPO_PANEL" ;;
      web) dir="$REPO_WEB" ;;
      ninguno)
        if [ -z "${SUPABASE_ACCESS_TOKEN_ORIGEN:-}" ]; then
          echo "  $slug: sin código en los repos y sin token del origen; se omite (no la llama ninguna app)."
          continue
        fi
        tmp="$(mktemp -d)"
        mkdir -p "$tmp/supabase"
        printf 'project_id = "%s"\n' "$DESTINO_REF" > "$tmp/supabase/config.toml"
        if ! SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN_ORIGEN" \
             supabase functions download "$slug" --project-ref "$ORIGEN_REF" --workdir "$tmp" --use-api >/dev/null 2>&1; then
          echo "  AVISO $slug: no se pudo descargar del origen; se omite (no la llama ninguna app)."
          continue
        fi
        dir="$tmp"
        ;;
      *) echo "Repo desconocido '$repo' para $slug" >&2; exit 2 ;;
    esac
    if supabase functions deploy "$slug" "${flags[@]}" --workdir "$dir" >/dev/null; then
      echo "  $slug (verify_jwt=$vj)"
    else
      echo "  FALLO al desplegar $slug" >&2
      fallos=$((fallos + 1))
    fi
  done < "$AQUI/funciones.tsv"

  log "Comprobando verify_jwt contra el origen"
  curl -fsS "$API/projects/$DESTINO_REF/functions" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" |
    jq -r '.[] | "\(.slug)\t\(.verify_jwt)"' | sort > "$TRABAJO/funciones-destino.tsv"
  grep -v '^#' "$AQUI/funciones.tsv" | awk -F'\t' 'NF==3 {print $1"\t"$3}' | sort > "$TRABAJO/funciones-esperadas.tsv"
  if diff "$TRABAJO/funciones-esperadas.tsv" "$TRABAJO/funciones-destino.tsv"; then
    echo "Las $(wc -l < "$TRABAJO/funciones-esperadas.tsv") funciones coinciden con el origen."
  else
    echo "Diferencias arriba (< esperado en el origen, > lo que hay en el destino)." >&2
    fallos=$((fallos + 1))
  fi
  [ "$fallos" -eq 0 ]
}

paso_auth() {
  falta DESTINO_REF SUPABASE_ACCESS_TOKEN SUPABASE_ACCESS_TOKEN_ORIGEN
  log "Configuración de Auth $ORIGEN_REF -> $DESTINO_REF"
  ORIGEN_REF="$ORIGEN_REF" DESTINO_REF="$DESTINO_REF" node "$AQUI/copiar-auth.mjs"
}

paso_clientes() {
  comprobar_destino
  if [ "$DESTINO_REF" != "$DEMO_REF" ]; then
    echo "'clientes' vacía tablas: solo se permite en la demo ($DEMO_REF)." >&2
    exit 2
  fi
  log "Vaciando datos de clientes en la demo"
  sql_destino -f "$AQUI/vaciar-datos-clientes.sql"
  echo "Hecho."
}

paso_recargar() {
  comprobar_destino
  if [ "${CONFIRMAR:-}" != "$DESTINO_REF" ]; then
    echo "'recargar' sustituye TODOS los datos de $DESTINO_REF por los del volcado." >&2
    echo "Repite con CONFIRMAR=$DESTINO_REF." >&2
    exit 2
  fi
  log "Recargando datos en $DESTINO_REF"
  # Se borran exactamente las tablas que trae el volcado y se cargan en la
  # misma transacción: si algo falla, el destino queda como estaba.
  local borrar="$TRABAJO/borrar-antes-de-recargar.sql"
  grep -oE '^COPY "[^"]+"\."[^"]+"' "$TRABAJO/data.sql" | sed -E 's/^COPY (.*)$/delete from \1;/' > "$borrar"
  sql_destino --single-transaction -o /dev/null \
    -c 'SET session_replication_role = replica' \
    -f "$borrar" \
    -f "$TRABAJO/data.sql"
  echo "Recargadas $(wc -l < "$borrar") tablas."
}

paso_verificar() {
  comprobar_origen
  comprobar_destino
  log "Verificación $ORIGEN_REF vs $DESTINO_REF"
  local consulta
  read -r -d '' consulta <<'SQL' || true
select 'filas ' || table_schema || '.' || table_name || ' ' ||
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text
  from information_schema.tables
 where table_type = 'BASE TABLE'
   and table_schema in ('public', 'private', 'inventory', 'auth')
union all select 'objetos funciones ' || count(*) from pg_proc where pronamespace::regnamespace::text in ('public', 'private', 'inventory')
union all select 'objetos politicas ' || count(*) from pg_policies where schemaname in ('public', 'private', 'inventory', 'storage', 'auth')
union all select 'objetos triggers ' || count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid where not t.tgisinternal and c.relnamespace::regnamespace::text in ('public', 'private', 'inventory', 'auth', 'storage')
union all select 'objetos indices ' || count(*) from pg_indexes where schemaname in ('public', 'private', 'inventory')
union all select 'objetos vistas ' || count(*) from pg_views where schemaname in ('public', 'private', 'inventory')
union all select 'objetos realtime ' || count(*) from pg_publication_tables where pubname = 'supabase_realtime'
union all select 'objetos cron ' || count(*) from cron.job
union all select 'objetos vault ' || count(*) from vault.secrets
union all select 'objetos extensiones ' || string_agg(extname, ',' order by extname) from pg_extension
order by 1;
SQL
  sql_origen -At -c "$consulta" > "$TRABAJO/verificar-origen.txt"
  sql_destino -At -c "$consulta" > "$TRABAJO/verificar-destino.txt"
  if diff "$TRABAJO/verificar-origen.txt" "$TRABAJO/verificar-destino.txt"; then
    echo "Origen y destino coinciden en recuentos y objetos."
  else
    echo "(< origen, > destino). En la demo con 'clientes' es normal que difieran las tablas vaciadas."
    echo "Las tablas auth.* de sesiones/auditoría pueden diferir: se rellenan solas al usar el proyecto."
  fi
}

[ "$#" -gt 0 ] || { sed -n '2,45p' "$0"; exit 2; }
for paso in "$@"; do
  case "$paso" in
    volcar|restaurar|gestionados|ajustar|cron|secretos|storage|funciones|auth|clientes|recargar|verificar)
      "paso_$paso" ;;
    *) echo "Paso desconocido: $paso" >&2; exit 2 ;;
  esac
done
