# Migración a la cuenta del restaurante (Casa Tomás)

Objetivo: duplicar **exactamente** lo que funciona hoy en la cuenta *oficiososia*
(GitHub, Vercel, Supabase) en la cuenta del restaurante, **sin tocar lo actual**,
que sigue en marcha hasta el día del corte.

Inventario comprobado el **26-10-2026** contra las cuentas reales.

## 1. Lo que hay hoy (cuenta oficiososia)

| Pieza | GitHub | Vercel (equipo `oficiososias-projects`) | URL |
|---|---|---|---|
| Web Casa Tomás | `oficiososia/casa-tomas-story` (privado, `main` + `staging`) | `casatomas` · Vite · Node 22 · `fra1` | https://casa-tomas-story.vercel.app |
| Panel | `oficiososia/adminpanelct` (privado, **`main`** + `staging`; la rama por defecto es `Reinicio`, que está desfasada) | `admin-panel` · Vite · Node 24 | https://admin-panel-alpha-eight-66.vercel.app |
| Web Touza | `oficiososia/touza-restaurant-website` (privado, `main`) | `touza-restaurant-website` · Vite · Node 24 | https://touza-restaurant-website.vercel.app |

Ningún proyecto Vercel tiene dominio propio. `restaurantecasatomascrevillente.es`
se usa como URL canónica, pero no está conectado a Vercel.

**Las tres apps comparten un único Supabase**: `jeamoczmbfsnwkfjxcyo` (Postgres 17, eu-west-1):

- 123 tablas en `public` y 3 en `inventory` (más funciones en `private`); 63 MB. Las más grandes:
  `audit_log` (5.887 filas), `reservas` (1.241), `Vinos` (244), `Platos` (153).
- 4 usuarios de Auth (email + contraseña).
- 41 Edge Functions: 36 viven en `adminpanelct/supabase/functions`, 4 en
  `casa-tomas-story/supabase/functions` y `get-mapbox-token` no está en ningún
  repo (ninguna app la llama ya).
- 10 buckets, 315 ficheros (unos 90 MB): `platos` 58 MB, `facturas-originales` 17 MB, `vinos` 13 MB.
- 11 trabajos de `pg_cron`, 3 secretos en Vault y 11 tablas en Realtime.
- 38 políticas RLS sobre `storage` y 7 triggers sobre `auth.users`/`storage.objects`.
  El volcado normal no los incluye, así que el kit los copia aparte.
- 4 funciones SQL con la URL del proyecto escrita a mano: `ocr_despachar`,
  `novedades_limpiar_foto`, `productos_despachar_clasificacion` y
  `openai_despachar_sincronizacion_costes`.
- Extensiones: `pg_cron`, `pg_net`, `http`, `vector`, `unaccent`, `pg_trgm`,
  `pgcrypto`, `uuid-ossp`, `supabase_vault`, `pg_stat_statements`.

Variables de Vercel actuales (sin valores):

| Proyecto | Variables |
|---|---|
| `casatomas` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_MAPBOX_TOKEN` (las 4 en production, preview y development) |
| `admin-panel` | `VITE_SUPABASE_URL` (todos), `VITE_SUPABASE_ANON_KEY` (production), `VITE_SUPABASE_METRICS_URL`, `VITE_SUPABASE_METRICS_PUBLISHABLE_KEY` y `VITE_SUPABASE_METRICS_PROJECT_ID` (sensibles, production y preview) |
| `touza-restaurant-website` | `VITE_SITE_URL` (production y preview), `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (production) |

## 2. A dónde va (cuenta del restaurante)

| Pieza | GitHub | Vercel (Hobby "Casa tomas") | Supabase |
|---|---|---|---|
| Web | `restcasatomascrevillent/web-casatomas` | `web-casatomas` | prod `haqmmdfdzzatdnrrcgez` · demo `sfonaclosuafvlhutkon` |
| Panel | `restcasatomascrevillent/admin-casatomas` | `admin-casatomas` | ídem |
| Touza | **falta crear el repo** | **falta crear el proyecto** | ídem |

Estado de lo nuevo a 26-10-2026:

- Los repos nuevos son **públicos** (los viejos son privados) y tienen un único
  commit, "Initial import", del 20-10. Al panel solo le falta el último commit;
  a la web le faltan 48 ficheros de cambios posteriores. No contienen secretos:
  solo la clave anon pública del proyecto viejo, que es pública por diseño.
- `web-casatomas.vercel.app` y `admin-casatomas-o9ep.vercel.app` responden
  **`DEPLOYMENT_NOT_FOUND`**: no hay ningún despliegue servido, y por eso no salen
  los favicons (los ficheros sí están en los repos). La web aborta el build a
  propósito si faltan las variables de Supabase o si la carta está vacía
  (`scripts/carta-ssg.mjs`), así que **Supabase tiene que estar copiado antes**.
- Supabase prod y demo están vacíos.

Entornos: **Production** de cada proyecto Vercel (rama `main`) va contra
Supabase **prod**; **Preview** (rama `staging`) va contra Supabase **demo**.

## 3. Cambios de código ya hechos

En la web (`casa-tomas-story`, rama `claude/gifted-meitner-asrckf`). Son
compatibles con lo actual: con las variables viejas la web se comporta igual.

- `src/components/AIChatbot.tsx`: el saludo del chatbot iba a una URL fija del
  proyecto viejo con la clave del proyecto configurado. En la cuenta nueva habría
  dado 401. Ahora sale de `VITE_SUPABASE_URL`.
- `src/lib/carta-ssg.ts` y `vercel.json`: el optimizador de imágenes de Vercel
  acepta también las fotos de Storage de prod y demo.

El panel y Touza no necesitan cambios: ya leen Supabase de las variables de entorno.

## 4. El kit de Supabase (`supabase/`)

`migrar.sh` duplica el proyecto viejo en prod o demo. **Del origen solo lee.**
Se ejecuta desde GitHub Actions
([`github-actions/migracion-supabase.yml`](github-actions/migracion-supabase.yml)),
porque este entorno no llega al puerto de Postgres. También funciona en un Mac
con Docker, `psql` 17, Node y el CLI de Supabase.

| Paso | Qué hace |
|---|---|
| `volcar` | `supabase db dump` (roles, esquema, datos, historial de migraciones). Aparte saca lo que el volcado no trae: extensiones, políticas y triggers de auth/storage, Realtime y cron. |
| `restaurar` | Carga todo en una transacción. Si algo falla, el destino queda como estaba. Se niega a escribir en un destino que no esté vacío. |
| `storage` | Copia los 315 ficheros con la API de Storage. Va antes de `gestionados` para que el trigger de auditoría no meta filas que el origen no tiene. |
| `gestionados` | Las 38 políticas de storage, los 7 triggers de auth/storage y las 11 tablas de Realtime. |
| `ajustar` | Cambia `jeamoczmbfsnwkfjxcyo.supabase.co` por el host nuevo en todos los datos (fotos, enlaces) y en las 4 funciones SQL, sin disparar triggers. También cambia las URLs viejas de Vercel por las nuevas. Al final comprueba que no quede ninguna referencia al origen. |
| `cron` | Los 11 trabajos con la URL nueva. En demo (`CRON_MODO=internos`) solo los que no mandan correos ni gastan en IA. |
| `secretos` | Secretos de las funciones, con los mismos valores en el Vault (cron ↔ funciones). Genera los internos (HMAC, cabeceras de cron) si no los aportas. |
| `funciones` | Las 41 funciones con el **mismo `verify_jwt` que tienen desplegado**. Hay 7 donde `config.toml` dice `true` y en realidad están en `false`: manda lo desplegado. Después lo verifica contra la API. |
| `auth` | Site URL, redirecciones, plantillas de correo, SMTP y límites. Solo envía lo que difiere. |
| `clientes` | **Solo demo.** Vacía reservas, newsletter, chats, llamadas, cheques vendidos y auditoría. |
| `recargar` | Para el corte: sustituye **solo los datos** en una transacción. Pide `CONFIRMAR=<ref>`. |
| `verificar` | Compara recuentos de filas, funciones, políticas, triggers, índices, vistas, cron, Vault y extensiones entre origen y destino. |

Los scripts no imprimen filas de datos ni valores de secretos: solo nombres y recuentos.

Se ha probado contra un Postgres 16 local con esquemas `auth`/`storage`/`cron`/`vault`
simulados y un servidor HTTP falso para la Management API y Storage. Funcionan
volcado, restauración atómica, políticas y triggers (incluido uno desactivado),
reescritura de URLs, cron, Vault, secretos, Auth, Storage, `clientes`, `recargar`,
`verificar` y todas las protecciones (destino no vacío, destino = origen,
`clientes` en prod, `recargar` sin confirmar). **No se ha ejecutado aún contra
los proyectos reales.**

## 5. Plan por fases

**Fase 0 — accesos (los da el dueño).** Ver la sección 7.

**Fase 1 — GitHub.**
- Llevar a `web-casatomas` y `admin-casatomas` el historial completo de `main` y
  `staging`. Se hace con un merge (sin `push --force`) cuyo contenido queda
  idéntico al repo viejo, más los cambios de la sección 3.
- Crear `staging` en los repos nuevos.
- Subir Touza a su repo nuevo.
- Añadir el workflow de migración al panel.

**Fase 2 — Supabase demo.** Ejecutar el workflow con `destino=demo`, revisar la
salida de `verificar` y probar el panel y la web contra la demo.

**Fase 3 — Supabase prod.** Ejecutar el workflow con `destino=prod`. Es una
foto: hasta el corte, las reservas nuevas solo existen en el proyecto viejo.

**Fase 4 — Vercel** (con el conector apuntando a la cuenta del restaurante, o a mano con esta tabla):

| Proyecto | Production (`main`) → prod | Preview (`staging`) → demo |
|---|---|---|
| `web-casatomas` | `VITE_SUPABASE_URL=https://haqmmdfdzzatdnrrcgez.supabase.co`, `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_Q6SY…`, `VITE_SUPABASE_PROJECT_ID=haqmmdfdzzatdnrrcgez`, `VITE_MAPBOX_TOKEN` (el mismo de ahora), `VITE_TOUZA_URL` (la URL nueva de Touza) | lo mismo con `sfonaclosuafvlhutkon` y `sb_publishable_Vs5s…` |
| `admin-casatomas` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (vale la publishable) y, si sigue en uso, `VITE_SUPABASE_METRICS_*` | ídem demo |
| Touza (nuevo) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL` (la URL viva de ahora hasta el corte, para no duplicar el canonical) | ídem demo |

También en esta fase:
- Node 22 para la web y Node 24 para el panel y Touza, como ahora.
- Un alias fijo para `staging`.
- *Deploy hooks* para `rebuild-webs` (`VERCEL_DEPLOY_HOOK_CASA_TOMAS` y `VERCEL_DEPLOY_HOOK_TOUZA`).
- Un token para `sync-trafico-web` (`VERCEL_ANALYTICS_TOKEN`) y los IDs de proyecto nuevos en `trafico_web_sync_estado`.

**Fase 5 — servicios externos** (en sus paneles, con el proyecto viejo intacto):
- **Stripe:** un webhook **nuevo** a `https://haqmmdfdzzatdnrrcgez.supabase.co/functions/v1/stripe-webhook-cheques-regalo`; su `whsec_` va a `STRIPE_WEBHOOK_SECRET`. En demo, claves y webhook de modo test.
- **Resend:** un webhook nuevo a `…/functions/v1/resend-webhook`; su secreto va a `RESEND_WEBHOOK_SECRET`.
- **Mapbox:** si el token restringe URLs, añadir los dominios nuevos.
- **VAPI** (teléfono) y **n8n:** apuntar a las URLs nuevas el día del corte.

**Fase 6 — pruebas** en demo y luego en prod: carta, vinos, reservas (crear,
confirmar y cancelar desde el correo), cheque regalo en modo test, panel
(login de los 4 usuarios, facturas/OCR, novedades con foto) y chatbot.

**Fase 7 — corte** (unos 10–15 min, de noche):
1. Paso `volcar recargar ajustar storage verificar` contra prod.
2. Cambiar los webhooks de Stripe, Resend, VAPI y n8n a lo nuevo.
3. Conectar el dominio al Vercel nuevo.
4. Pasar `VITE_SITE_URL` de Touza a la URL definitiva.

El proyecto viejo se deja vivo unas semanas por si hay que volver atrás. Los
enlaces de correos ya enviados (bajas de newsletter, confirmaciones) apuntan a
él y siguen funcionando mientras exista.

## 6. Riesgos conocidos

- **Claves legacy.** 40 funciones usan `SUPABASE_SERVICE_ROLE_KEY` y 20
  `SUPABASE_ANON_KEY`. Si los proyectos nuevos no tienen activas las claves
  legacy, hay que activarlas (Settings → API Keys → Legacy API keys) o adaptar
  las funciones. El paso `funciones` lo comprueba y avisa.
- **Secretos.** Supabase no deja leer el valor de ningún secreto, tampoco al
  dueño. Los externos (Stripe, Resend, OpenAI, Google, VAPI, Mapbox…) tienen que
  salir de sus paneles o de donde estén guardados.
- **Base de métricas `yfnrkmxnmtrqmdtfvqix`.** La usa el panel
  (`VITE_SUPABASE_METRICS_*`, `METRICS_SUPABASE_*`) y no está en esta cuenta.
  Hay que decidir si se migra.
- **Repos públicos.** Los logs de GitHub Actions de un repo público los ve
  cualquiera. El kit no imprime datos, pero un error de Postgres puede citar un
  valor. Hay que pasarlos a privados antes de ejecutar nada.

## 7. Lo que necesita el dueño

Ver el mensaje de la sesión; resumen:

1. Instalar la app **Claude** de GitHub en `restcasatomascrevillent` (repos
   `web-casatomas`, `admin-casatomas` y el nuevo de Touza).
2. Crear el repo vacío de Touza.
3. Pasar los tres repos a privados.
4. En `admin-casatomas` → Settings → Secrets → Actions, crear:
   - `ORIGEN_DB_URL`, `PROD_DB_URL`, `DEMO_DB_URL`
   - `SUPABASE_ACCESS_TOKEN`, `SUPABASE_ACCESS_TOKEN_ORIGEN`
   - `SECRETOS_FUNCIONES_PROD`, `SECRETOS_FUNCIONES_DEMO`
   - si hace falta, `SMTP_PASS` y `GH_TOKEN_LECTURA`
5. Vercel: reconectar el conector con la cuenta del restaurante, o configurarlo a mano con la tabla de la fase 4.
6. Decisiones: datos de la demo, base de métricas, servicios externos y fecha del corte.
