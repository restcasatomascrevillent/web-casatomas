#!/usr/bin/env bash
# Comprueba los accesos de los becarios (GitHub, Supabase, Vercel, Stripe y
# Resend) sin mostrar ningún valor secreto. Lee .claude/becarios.yaml, o la ruta
# que se pase, y en local carga ~/.config/becarios/<proyecto>.env si existe.
# Guía: reference/accesos.md de los becarios. Sale con 1 si falta algún acceso.
#
# Uso: bash comprobar-accesos.sh [ruta/a/becarios.yaml]

set -uo pipefail

CONFIG="${1:-.claude/becarios.yaml}"
if [ ! -f "$CONFIG" ]; then
  echo "❌ No existe $CONFIG: configura antes los becarios en este proyecto." >&2
  exit 2
fi

limpiar() { sed 's/[[:space:]]*#.*$//; s/^"//; s/"$//'; }
general() { sed -n "s/^$1:[[:space:]]*//p" "$CONFIG" | head -1 | limpiar; }
BLOQUE="$(awk '/^accesos:/ {d = 1; next} d && /^[^[:space:]#]/ {d = 0} d' "$CONFIG")"
acceso() { printf '%s\n' "$BLOQUE" | sed -n "s/^[[:space:]]*$1:[[:space:]]*//p" | head -1 | limpiar; }

PROYECTO="$(general proyecto)"
REPO="$(general repositorio)"
SB_DEMO="$(acceso supabase_demo)"
SB_PROD="$(acceso supabase_prod)"
VC_EQUIPO="$(acceso vercel_equipo)"
VC_PROYECTO="$(acceso vercel_proyecto)"
STRIPE="$(acceso stripe)"
RESEND="$(acceso resend)"

ENV_LOCAL="$HOME/.config/becarios/$PROYECTO.env"
if [ -n "$PROYECTO" ] && [ -f "$ENV_LOCAL" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_LOCAL"
  set +a
fi

CUERPO="$(mktemp)"
trap 'rm -f "$CUERPO"' EXIT
FALLOS=0
ok() { printf '✅ %s\n' "$1"; }
aviso() { printf '⚠️  %s\n' "$1"; }
falla() { printf '❌ %s\n' "$1"; FALLOS=$((FALLOS + 1)); }

# GET que devuelve el código HTTP y deja la respuesta en $CUERPO. Con token, la
# cabecera va por la entrada estándar para que no salga en la lista de procesos;
# sin token, la añade el secreto de red del entorno en la nube, si lo hay.
codigo() {
  if [ -n "${2:-}" ]; then
    printf 'header = "Authorization: Bearer %s"\n' "$2" \
      | curl -s -o "$CUERPO" -w '%{http_code}' --max-time 15 -K - "$1"
  else
    curl -s -o "$CUERPO" -w '%{http_code}' --max-time 15 "$1"
  fi
}

echo "[Becarios] Accesos de ${PROYECTO:-este proyecto}"

# GitHub: con token propio, también en la nube. Sin él, una sesión en la nube solo
# tiene la conexión de Claude (GH_TOKEN vale proxy-injected), que no basta.
if [ -n "$REPO" ]; then
  TOKEN_GH="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
  if ! command -v gh >/dev/null 2>&1; then
    falla "GitHub: falta la herramienta gh"
  elif [ -z "$TOKEN_GH" ] || [ "$TOKEN_GH" = proxy-injected ]; then
    falla "GitHub $REPO: falta GH_TOKEN (token fine-grained del proyecto)"
  else
    case "$(gh api "repos/$REPO" --jq '.permissions.push' 2>/dev/null)" in
      true) ok "GitHub $REPO: lectura y escritura con GH_TOKEN" ;;
      false) falla "GitHub $REPO: GH_TOKEN solo puede leer" ;;
      *) falla "GitHub $REPO: GH_TOKEN no llega al repositorio (revisa los repositorios del token)" ;;
    esac
  fi
fi

# Supabase: un token por proyecto. Comprueba que llega a su proyecto, que ve las
# funciones y que no llega al proyecto del otro entorno.
comprobar_supabase() {
  local entorno="$1" ref="$2" var="$3" otro="$4"
  local token="${!var:-}"
  [ -n "$ref" ] || return 0
  if [ -z "$token" ]; then
    falla "Supabase $entorno ($ref): falta $var"
    return 0
  fi
  case "$(codigo "https://api.supabase.com/v1/projects/$ref" "$token")" in
    200) ;;
    401) falla "Supabase $entorno: $var no es válido o ha caducado"; return 0 ;;
    403 | 404) falla "Supabase $entorno: $var no llega al proyecto $ref"; return 0 ;;
    *) falla "Supabase $entorno: api.supabase.com no responde (¿está en Network access?)"; return 0 ;;
  esac
  if [ "$(codigo "https://api.supabase.com/v1/projects/$ref/functions" "$token")" != 200 ]; then
    aviso "Supabase $entorno: $var no ve las funciones (permiso Edge Functions)"
  fi
  if [ -n "$otro" ] && [ "$(codigo "https://api.supabase.com/v1/projects/$otro" "$token")" = 200 ]; then
    aviso "Supabase $entorno ($ref): acceso, pero $var también llega a $otro; limítalo a un solo proyecto"
  else
    ok "Supabase $entorno ($ref): acceso solo a este proyecto"
  fi
}
if [ -n "$SB_DEMO$SB_PROD" ] && { [ -z "$SB_DEMO" ] || [ -z "$SB_PROD" ]; }; then
  falla "Supabase: hacen falta los dos entornos; rellena supabase_demo y supabase_prod en accesos"
fi
comprobar_supabase DEMO "$SB_DEMO" SUPABASE_ACCESS_TOKEN_DEMO "$SB_PROD"
comprobar_supabase PROD "$SB_PROD" SUPABASE_ACCESS_TOKEN_PROD "$SB_DEMO"

# Vercel: VERCEL_TOKEN en local; en la nube, secreto de red en api.vercel.com.
if [ -n "$VC_PROYECTO" ]; then
  URL="https://api.vercel.com/v9/projects/$VC_PROYECTO"
  [ -n "$VC_EQUIPO" ] && URL="$URL?teamId=$VC_EQUIPO"
  ORIGEN="secreto de red"
  [ -n "${VERCEL_TOKEN:-}" ] && ORIGEN="VERCEL_TOKEN"
  case "$(codigo "$URL" "${VERCEL_TOKEN:-}")" in
    200) ok "Vercel ($VC_PROYECTO): acceso con $ORIGEN" ;;
    401 | 403) falla "Vercel: sin acceso (nube: secreto de red en api.vercel.com; local: VERCEL_TOKEN)" ;;
    404) falla "Vercel: el token no ve el proyecto $VC_PROYECTO (revisa el equipo del token)" ;;
    *) falla "Vercel: api.vercel.com no responde" ;;
  esac
fi

# Stripe: claves restringidas; prueba en DEMO y solo lectura en PROD.
comprobar_stripe() {
  local entorno="$1" var="$2"
  local token="${!var:-}" modo=desconocido
  [ -n "$token" ] || return 1
  case "$token" in
    rk_test_* | sk_test_*) modo=prueba ;;
    rk_live_* | sk_live_*) modo=real ;;
  esac
  [ "$entorno" = DEMO ] && [ "$modo" != prueba ] && aviso "Stripe DEMO: $var no es una clave de prueba"
  case "$token" in sk_live_*) aviso "Stripe $entorno: $var es la clave secreta completa; usa una restringida" ;; esac
  if [ "$(codigo "https://api.stripe.com/v1/events?limit=1" "$token")" = 200 ]; then
    ok "Stripe $entorno: acceso (modo $modo)"
  else
    falla "Stripe $entorno: $var no tiene acceso"
  fi
  return 0
}
if [ "$STRIPE" = true ]; then
  HAY=0
  comprobar_stripe DEMO STRIPE_API_KEY_DEMO && HAY=1
  comprobar_stripe PROD STRIPE_API_KEY_PROD && HAY=1
  if [ "$HAY" = 0 ]; then
    if [ "$(codigo "https://api.stripe.com/v1/events?limit=1")" = 200 ]; then
      ok "Stripe: acceso con secreto de red"
    else
      falla "Stripe: sin acceso (secreto de red en api.stripe.com o STRIPE_API_KEY_DEMO/PROD)"
    fi
  fi
fi

# Resend: una clave de solo envío no puede listar dominios y responde
# restricted_api_key; eso cuenta como acceso.
comprobar_resend() {
  local entorno="$1" token="${2:-}"
  case "$(codigo "https://api.resend.com/domains" "$token")" in
    200) ok "Resend $entorno: acceso completo" ;;
    401 | 403)
      if grep -q restricted_api_key "$CUERPO"; then
        ok "Resend $entorno: solo envío"
      else
        falla "Resend $entorno: sin acceso"
      fi
      ;;
    *) falla "Resend $entorno: api.resend.com no responde" ;;
  esac
}
if [ "$RESEND" = true ]; then
  if [ -n "${RESEND_API_KEY_DEMO:-}${RESEND_API_KEY_PROD:-}" ]; then
    [ -n "${RESEND_API_KEY_DEMO:-}" ] && comprobar_resend DEMO "$RESEND_API_KEY_DEMO"
    [ -n "${RESEND_API_KEY_PROD:-}" ] && comprobar_resend PROD "$RESEND_API_KEY_PROD"
  else
    comprobar_resend "(secreto de red)"
  fi
fi

if [ "$FALLOS" -eq 0 ]; then
  echo "[Becarios] Accesos listos ✅"
else
  echo "[Becarios] ⏸ Faltan $FALLOS accesos · guía: reference/accesos.md"
  exit 1
fi
