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

- Repos nuevos: ya son **privados** y tienen el historial completo de `main` y
  `staging` de los viejos (26-10-2026). Se unieron con un merge sobre el
  "Initial import" del 20-10, sin `push --force`. El `staging` de la web
  conserva tus arreglos de TypeScript/ESLint del 20-10 (`1ff0821`). Falta el
  repo de Touza.
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
porque este entorno no llega al puerto de Postgres. **No necesita contraseñas
de base de datos**: cada conexión pide a la Management API un rol temporal de
5 minutos, el mismo mecanismo que usa el CLI de Supabase. En el origen ese rol
es de **solo lectura** (`supabase_read_only_user`, que salta RLS para que los
recuentos salgan completos); probado que un `INSERT` con él falla. También funciona en un Mac
con Docker, `psql` 17, Node y el CLI de Supabase.

| Paso | Qué hace |
|---|---|
| `volcar` | `supabase db dump` (roles, esquema, datos, historial de migraciones). Aparte saca lo que el volcado no trae: extensiones, políticas y triggers de auth/storage, Realtime y cron. |
| `restaurar` | Carga todo en una transacción. Si algo falla, el destino queda como estaba. Se niega a escribir en un destino que no esté vacío. |
| `storage` | Copia los 315 ficheros con la API de Storage. Va antes de `gestionados` para que el trigger de auditoría no meta filas que el origen no tiene. |
| `gestionados` | Las 38 políticas de storage, los 7 triggers de auth/storage y las 11 tablas de Realtime. |
| `ajustar` | Cambia `jeamoczmbfsnwkfjxcyo.supabase.co` por el host nuevo en todos los datos (fotos, enlaces) y en las 4 funciones SQL, sin disparar triggers. También cambia las URLs viejas de Vercel por las nuevas. Al final comprueba que no quede ninguna referencia al origen. |
| `cron` | Los 11 trabajos con la URL nueva. Con `CRON_MODO=internos` (demo siempre; prod hasta el corte) solo los que no mandan correos ni gastan en IA. |
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

Decisiones del 26-10-2026:
- La demo lleva **copia completa** de los datos. No se ejecuta el paso
  `clientes`, y el cron de la demo va en modo `internos`. Recomendado: no poner
  las claves de Resend en `SECRETOS_FUNCIONES_DEMO`, para que la demo no pueda
  escribir a clientes reales.
- La base de métricas `yfnrkmxnmtrqmdtfvqix` **no se migra**: la cuenta nueva
  sigue usando la misma, con los mismos valores en `VITE_SUPABASE_METRICS_*` y
  `METRICS_SUPABASE_*`.
- Servicios externos: **las mismas cuentas y claves** de ahora.

**Fase 1 — GitHub.**
- Llevar a `web-casatomas` y `admin-casatomas` el historial completo de `main` y
  `staging`. Se hace con un merge (sin `push --force`) cuyo contenido queda
  idéntico al repo viejo, más los cambios de la sección 3.
- Crear `staging` en los repos nuevos.
- Subir Touza a su repo nuevo.
- Añadir el workflow de migración al panel.

**Fase 2 — Supabase demo.** Ejecutar el workflow con `destino=demo`, revisar la
salida de `verificar` y probar el panel y la web contra la demo.

**Fase 3 — Supabase prod.** Ejecutar el workflow con `destino=prod` y
`cron=internos`. Es una foto: hasta el corte, las reservas nuevas solo existen
en el proyecto viejo, y es el viejo el que manda los correos y llama a OpenAI y
Google. Con todos los cron activos en los dos, cada correo saldría dos veces.

**Fase 4 — Vercel** (con el conector apuntando a la cuenta del restaurante, o a mano con esta tabla):

| Proyecto | Production (`main`) → prod | Preview (`staging`) → demo |
|---|---|---|
| `web-casatomas` | `VITE_SUPABASE_URL=https://haqmmdfdzzatdnrrcgez.supabase.co`, `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_Q6SY…`, `VITE_SUPABASE_PROJECT_ID=haqmmdfdzzatdnrrcgez`, `VITE_MAPBOX_TOKEN` (el mismo de ahora), `VITE_TOUZA_URL` (la URL nueva de Touza) | lo mismo con `sfonaclosuafvlhutkon` y `sb_publishable_Vs5s…` |
| `admin-casatomas` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (vale la publishable) y `VITE_SUPABASE_METRICS_*` con los mismos valores de ahora (esa base no se migra) | ídem demo |
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
1. Pasos `volcar recargar ajustar storage cron verificar` contra prod, con
   `cron=todos`. En ese momento se desprograman los cron del proyecto viejo
   (`select cron.unschedule(jobname) from cron.job;`, desde su SQL Editor) para
   que no manden nada dos veces. Es el único cambio que se hace en él.
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
- **Autores de commits en Vercel (plan Hobby).** Vercel bloquea (`BLOCKED`) el
  despliegue de un commit cuyo autor tiene cuenta de Vercel pero no es del
  equipo, también cuando lo lanza un *deploy hook*, que compila el último
  commit de la rama. Le pasó a Touza con el último commit traído del repo
  viejo. Los commits que se traigan del repo viejo necesitan detrás uno de
  alguien del equipo.
- **Demo con datos reales.** Al ser copia completa, cualquier acción en la demo
  que mande correos (confirmar o cancelar una reserva, newsletter) llegaría a
  clientes reales si la demo tiene las claves de Resend.

## 7. Lo que necesita el dueño

Hecho el 26-10-2026:
- App de Claude instalada en `restcasatomascrevillent` y repos en privado.
- Repo de Touza creado (`restcasatomascrevillent/touza-casatomas`).
- Claves *legacy* activas en los dos proyectos nuevos (comprobado por API).
- Conector de Vercel con la cuenta del restaurante.

Secretos del proyecto viejo: son 31 propios. Supabase no deja leer sus
valores. La copia directa de servidor a servidor, con una función temporal en
el proyecto viejo, la ha bloqueado el control de permisos de la sesión. Queda
la plantilla [`secretos-funciones.plantilla.env`](secretos-funciones.plantilla.env)
con esos 31 nombres exactos; los internos los genera el kit.

Hecho el 27-10-2026:
- Acceso de Claude a `touza-casatomas`, de Vercel al equipo y secrets de
  GitHub Actions.
- Demo y prod migradas, con `verificar` sin diferencias salvo los cron. Prod va
  con `cron=internos` hasta el corte.
- Web, panel y Touza publicados en Vercel, en `main` (prod) y `staging` (demo).
- *Deploy hooks* de `main` y `staging` en `web-casatomas` y `touza-casatomas`.
  Los de `main` están guardados como secrets en prod y los de `staging` en la
  demo (`VERCEL_DEPLOY_HOOK_CASA_TOMAS`, `VERCEL_DEPLOY_HOOK_TOUZA`). Probados.
- URLs del panel nuevo en las redirecciones permitidas de Auth (prod y demo).

Pendiente:

1. Claves externas en `SECRETOS_FUNCIONES_PROD` y `SECRETOS_FUNCIONES_DEMO`, y
   repetir el paso `secretos`.
2. `VERCEL_ANALYTICS_TOKEN` y los IDs de proyecto nuevos en
   `trafico_web_sync_estado`.
3. El corte (fase 7).
4. Al terminar la migración: revocar los tokens que se pegaron en el chat y crear otros.
