# Actividad y errores de la web (Super Admin › Logs)

La web manda **eventos estructurados** al panel: recorridos, operaciones completadas, peticiones técnicas y errores. La documentación completa (incidencias, Linear, estadísticas, configuración y puesta en marcha) está en el repo del panel: `admin-casatomas/docs/LOGS-WEB.md`.

## Qué hay en este repo

- `src/lib/actividad/registro.ts` es la API mínima para los componentes:

  ```ts
  registrarActividad("vino_abierto", { objetivo, props: { id, modo } });
  ```

  Nunca recibe valores de campos, textos que escribe el visitante, nombres, teléfonos ni correos.
- `src/lib/actividad/rastreador.ts` es el núcleo:
  - sesión y visitante seudónimos (`ct_actividad`, solo con consentimiento);
  - ids por evento y secuencia;
  - lotes cada 5 s o 20 eventos;
  - reintentos con los mismos ids;
  - topes por carga.
- `src/lib/actividad/instalar.ts` pone las escuchas: páginas, tiempo activo y scroll, clics y contacto, formularios con `data-track-form`, vídeos, peticiones a Supabase, recursos que no cargan y tiempos de carga.
- `src/components/SeguimientoActividad.tsx` lo instala cuando el navegador está ocioso tras hidratar y captura desde el arranque los errores de JavaScript y de promesas.
- **Consentimiento** (`src/lib/cookie-consent.ts`, `CookieConsent.tsx`):
  - categoría «Estadísticas de uso»;
  - las elecciones antiguas sin ella cuentan como «no»;
  - Global Privacy Control la desactiva.

  La política de privacidad lo explica en los tres idiomas.

## Cómo medir algo nuevo

- **Un botón o enlace** ya se registra solo. Para darle un nombre estable, ponle `data-track="nombre"`; para que no cuente, `data-track-ignorar`.
- **Un formulario**: `<form data-track-form="nombre">`. Se registran inicio, avance (n.º de campos), envío, error de validación y abandono estimado. El resultado lo apunta el código cuando el servidor responde, por ejemplo `registrarActividad("reserva_solicitada", …)`.
- **Un tipo de evento nuevo**: hay que añadirlo al catálogo en tres sitios:
  - la migración del panel (`web_eventos_catalogo`);
  - `supabase/functions/_shared/logs-web/eventos.ts` (panel);
  - el tipo `TipoActividad` de `registro.ts`.

  La función de ingesta rechaza lo que no esté en el catálogo.

## Rendimiento

El rastreador se descarga aparte (unos 6 KB comprimido) y en un momento ocioso. Las escuchas son pasivas y delegadas, y los envíos van por lotes `text/plain`, sin preflight CORS. Las pruebas e2e (`e2e/actividad-logs.e2e.ts`) comprueban también que los lotes son pocos para muchos eventos.
