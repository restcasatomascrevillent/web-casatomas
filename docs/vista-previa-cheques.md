# Vista previa del cheque regalo

La compra muestra primero el resumen de los datos y después la vista del PDF con las opciones de importe y dedicatoria y el botón de pago.

Al abrir el formulario se precargan, en paralelo, el diseño público guardado en el admin y el trazador del navegador. La plantilla se consulta una vez por compra. Cambiar las casillas genera la imagen localmente y reutiliza las variantes ya vistas; no consulta Supabase ni serializa un PDF.

El trazado de `diseno.ts` se comparte con el PDF que se envía por email, con las mismas métricas de fuente, logo y saltos de página. Solo se cargan las cuatro fuentes utilizadas. La caché de las vistas vive en la sesión del formulario y no usa almacenamiento persistente.

## Activación

Desde `casa-tomas-story`, con Supabase CLI autenticado:

```sh
git pull origin main
npx supabase functions deploy cheques-regalo-web --project-ref jeamoczmbfsnwkfjxcyo
```

No requiere migración SQL. La publicación de la web debe incluir el mismo commit. Hasta desplegar la función, el navegador conserva la compatibilidad con el endpoint de vista anterior cuando `/plantilla-vista` responde 404.

## Comprobaciones

- `VistaRegaloCompra.test.tsx`: una sola consulta, precarga compartida, cambios locales, caché, respuestas antiguas, fallos y compatibilidad.
- `Contacto.factura.test.tsx`: resumen y vista en pasos separados, pago solo al final, factura, opciones del regalo y foco del teclado.
- `diseno.test.ts`: paridad de la vista local con el trazado del PDF, cuatro combinaciones de opciones, caracteres especiales y textos de varias páginas.
- `cheques-regalo-web/index.test.ts`: precarga de campos públicos, sin compradores, compras ni Stripe.


La plantilla pública incluye `caducidad_meses` (12 por defecto). La vista calcula la fecha orientativa con meses naturales y horario de Madrid. La fecha definitiva `caduca_el` la asigna la base de datos al confirmar el pago, y el webhook utiliza la fila actualizada para enviar el correo y el PDF. La migración de caducidad se mantiene en `adminpanelct/supabase/migrations`; debe aplicarse antes de desplegar las tres funciones de cheques.
