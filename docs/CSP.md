# Content-Security-Policy de la web

La CSP se sirve como cabecera desde `vercel.json` (`headers` → `/(.*)`), igual
que el resto de cabeceras de seguridad (HSTS, X-Frame-Options, etc.).

## Directivas actuales y por qué

- `default-src 'self'` — todo lo no declarado, solo del propio origen.
- `script-src 'self' 'unsafe-inline'` — scripts propios + inline (ver abajo).
- `style-src 'self' 'unsafe-inline'` — estilos propios + inline (componentes).
- `connect-src 'self' data: https://*.supabase.co https://api.mapbox.com https://events.mapbox.com`
  — fetch/XHR a Supabase (datos, reservas, cheques) y a Mapbox (mapa).
- `img-src 'self' data: blob: https:` — imágenes propias, data/blob y https.
- `media-src 'self' blob: https://*.supabase.co` — vídeo/audio.
- `worker-src blob:` — web workers desde blob.
- `object-src 'none'` — sin `<object>`/`<embed>` (anti-plugins).
- `base-uri 'self'` — no se puede reescribir la base de URLs relativas.
- `frame-ancestors 'self'` — **anti-clickjacking a nivel CSP** (más robusto que
  X-Frame-Options y respetado por los navegadores modernos; cubre apex y www).
- `form-action 'self'` — un `<form>` solo puede enviar al propio origen. Hoy
  ningún formulario hace envío nativo (todos usan `onSubmit`+`fetch`), así que
  es un cinturón de seguridad sin coste.
- `upgrade-insecure-requests` — fuerza https en cualquier sub-recurso.

## Por qué sigue `script-src 'unsafe-inline'` (y `style-src`)

`vite-react-ssg` incrusta en cada HTML prerenderizado dos scripts **inline** que
el hidratado necesita:

- `window.__staticRouterHydrationData = JSON.parse("…")` — datos de hidratación,
  distintos por página.
- `window.__VITE_REACT_SSG_HASH__ = '…'` — un hash que **cambia en cada build**.

En hosting estático (Vercel sirve ficheros HTML ya generados) no hay forma de
inyectar un **nonce por petición**, y usar **hashes** en la cabecera no es
mantenible: cambiarían en cada build (y por página), así que la cabecera
quedaría desincronizada y el navegador bloquearía el hidratado → web rota. Por
eso NO se quita `'unsafe-inline'` de `script-src`/`style-src` a la ligera.

El riesgo real que deja abierto es acotado: la app es un SPA prerenderizado,
React escapa por defecto y en el QA no se encontró ningún punto de inyección
(0/5 vectores). `'unsafe-inline'` resta defensa en profundidad, no abre un
agujero conocido.

## Cómo quitarlo bien (trabajo futuro, requiere validar en deploy)

Cualquiera de estas vías permite pasar a `script-src 'self'` sin inline:

1. **Nonce por petición con Edge Middleware**: `middleware.ts` (ya existe, hoy
   solo para `/404`) reescribiría el HTML añadiendo un `nonce` a cada `<script>`
   inline y emitiría la CSP con ese nonce. Coste: deja de ser estático puro en
   esas rutas; hay que medir latencia.
2. **Build Output API de Vercel** (`.vercel/output/config.json`): el build
   calcula el `sha256` de los scripts inline de cada página y los emite como
   cabeceras por ruta. Mantenible (se regenera en cada build) pero cambia el
   modelo de despliegue; probar en una preview antes.
3. **Externalizar los scripts de arranque** del SSG a ficheros `/assets/*.js`
   (si `vite-react-ssg` lo permite por configuración): entonces basta
   `script-src 'self'`.

Mientras tanto, las directivas añadidas (`frame-ancestors`, `form-action`,
`upgrade-insecure-requests`) endurecen la política sin tocar el hidratado.
