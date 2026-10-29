# Accesos de los becarios

Para que los becarios no se paren a pedir permisos, cada proyecto deja preparados sus accesos una vez. En `.claude/becarios.yaml` (sección `accesos`) solo van identificadores: refs de proyectos, IDs de equipo, qué servicios hacen falta. Los tokens van en el entorno donde trabajan los becarios, con los **nombres fijos** de esta guía.

Comprobación: `bash .claude/becarios/scripts/comprobar-accesos.sh` (lee `.claude/becarios.yaml`; una línea por servicio, sin mostrar ningún valor).

## Reglas

- Nunca se pide un token por el chat ni se escribe en el repositorio, en Notion, en un PR o en un informe. Nunca se muestra su valor: nada de `echo $TOKEN`, `env`, `printenv` ni `set -x`.
- Un token por entorno y con el mínimo alcance: DEMO y PROD separados cuando el servicio lo permite. Caducidad de 90 días cuando el servicio la ofrece.
- **DEMO**: uso libre dentro de la historia.
- **PROD**: solo después del «sí» del usuario en la pausa del PR, y solo `delivery` (desplegar) y QA (lecturas no destructivas).
- Lo que un token no puede impedir lo impiden las reglas del proyecto (`reglas_repo`): por ejemplo, ningún token de GitHub distingue ramas, así que el push a la rama principal y la fusión de PR siguen prohibidos aunque el token lo permita.
- Si falta un acceso o no tiene permiso, el becario para con BLOQUEADO y nombra la variable y el apartado de esta guía.

## Dónde se guardan

### Sesiones en la nube (claude.ai/code)

Un **entorno en la nube por proyecto** (por ejemplo «Casa Tomás»): en el selector de entorno de una sesión nueva, **New environment**. Al empezar una sesión del proyecto, se elige ese entorno. Su nombre va en `accesos.entorno_nube`.

- **Secreto de red** (*Network secrets* → *Add secret*, tipo *Bearer*, cabecera `Authorization`): para los servicios con **una sola clave por dominio**. El proxy añade la clave a las peticiones de ese dominio y la sesión nunca la ve. Es la opción preferida.
- **Variable de entorno** (*Environment variables*): cuando hay **dos claves para el mismo dominio** (DEMO y PROD del mismo servicio), porque el proxy solo manda un secreto por dominio. La sesión sí ve el valor: usa tokens limitados y con caducidad, y un entorno personal, no compartido.
- **Acceso a red** (*Network access* → *Custom*, con *Also include default list…* marcado): añade los dominios de los servicios que van por variable de entorno. Los dominios de los secretos de red no hace falta añadirlos.

### En local

Fichero `~/.config/becarios/<proyecto>.env`, fuera del repositorio y con permisos `600`, con una línea `export NOMBRE=valor` por token. El script de comprobación lo carga solo; para los demás comandos, antepón `. ~/.config/becarios/<proyecto>.env &&`.

## Servicios

### GitHub

- **Nube**: no hace falta token. La sesión usa la conexión de Claude con tu cuenta (proxy de GitHub). `gh api` funciona; `gh pr` y `gh issue` no, porque usan GraphQL: usa `gh api repos/<owner>/<repo>/pulls` o las herramientas de GitHub.
- **Local**: token *fine-grained* en https://github.com/settings/personal-access-tokens/new. *Only select repositories* (los del proyecto); permisos de repositorio: *Contents*, *Pull requests*, *Actions* y *Workflows* en *Read and write*; *Commit statuses* y *Metadata* en *Read*. Variable `GH_TOKEN`.

### Supabase

Un token **por proyecto** en https://supabase.com/dashboard/account/tokens → *Generate new token* → elige la organización y **solo el proyecto** (DEMO o PROD). Permisos:

- *Read-write*: Database, Migrations, Edge Functions, Edge Function Secrets.
- *Read*: Project Settings, API Keys, API Key Secrets, Logs, Advisors.

| Entorno | Variable | Dónde (nube) |
| --- | --- | --- |
| DEMO | `SUPABASE_ACCESS_TOKEN_DEMO` | Variable de entorno (comparten dominio) |
| PROD | `SUPABASE_ACCESS_TOKEN_PROD` | Variable de entorno |

Dominios para *Network access*: `api.supabase.com` y `*.supabase.co`.

Uso, siempre con `--project-ref` explícito:

```bash
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN_DEMO" npx supabase functions deploy <función> --project-ref <ref de DEMO>
```

`supabase whoami` no funciona con tokens limitados; para comprobar, el script.

### Vercel

Token en https://vercel.com/account/settings/tokens → *Create* → *Scope*: el equipo del proyecto → *Expiration*: 90 días. Vercel no separa DEMO y PROD por token.

- **Nube**: secreto de red con dominio `api.vercel.com`. Los becarios usan la API o el conector de Vercel.
- **Local**: variable `VERCEL_TOKEN` (`npx vercel --token "$VERCEL_TOKEN" …`).

Sin el «sí», nada que cambie producción: variables de Production, dominios, *promote* o *rollback*.

### Stripe (solo si los becarios tocan pagos)

*Restricted keys* en https://dashboard.stripe.com/apikeys. Nunca la clave secreta completa (`sk_live_…`).

- DEMO: clave restringida en modo prueba o *sandbox* (`rk_test_…`), con escritura solo en lo que use el proyecto (Checkout Sessions, PaymentIntents, Webhook Endpoints…).
- PROD: clave restringida de **solo lectura** (`rk_live_…`), para comprobar pagos y eventos en QA PROD.

Con una sola clave, secreto de red en `api.stripe.com`. Con las dos, variables `STRIPE_API_KEY_DEMO` y `STRIPE_API_KEY_PROD`, y `api.stripe.com` en *Network access*.

### Resend (solo si los becarios envían o comprueban correos)

https://resend.com/api-keys → *Create API key* → *Permission*: *Sending access* → *Domain*: el del proyecto.

Con una sola clave, secreto de red en `api.resend.com`. Con dos, variables `RESEND_API_KEY_DEMO` y `RESEND_API_KEY_PROD`, y `api.resend.com` en *Network access*.

### Notion

Conector de Notion de la cuenta de Claude (ver `reference/notion.md`). No lleva token.
