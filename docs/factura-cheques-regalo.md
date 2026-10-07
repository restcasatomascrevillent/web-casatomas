# Factura opcional del cheque regalo

La compra ofrece solicitar factura y recoge nombre/razón social, NIF y dirección fiscal. El servidor valida esos datos y la configuración del emisor antes de crear la sesión de Stripe. Solo tras un cobro confirmado el webhook emite una factura numerada y envía el PDF al email del comprador mediante Resend.

El validador, la plantilla y la migración de base de datos están en `oficiososia/adminpanelct`: ver `docs/CHEQUES-REGALO.md`. Ambas aplicaciones deben usar el mismo proyecto Supabase.

Después de aplicar esa migración, desplegar desde este repositorio:

```sh
supabase functions deploy cheques-regalo-web
supabase functions deploy stripe-webhook-cheques-regalo --no-verify-jwt
```

Conservar las variables de Stripe y Resend existentes. La función de webhook autentica la firma de Stripe; `verify_jwt` debe permanecer desactivado para ella. La plantilla requiere datos fiscales reales y un logo PNG/JPG de hasta 200 KB. Se configura desde **Cheques → Plantilla de factura** en el panel.

La factura conserva los datos y el IVA vigentes al emitirse; editar la plantilla solo afecta a futuras facturas. El total coincide con el cobro; el IVA configurado se desglosa dentro de ese total. La numeración y la emisión son idempotentes en la base de datos; los reintentos de email reutilizan el PDF y la clave de idempotencia de Resend. El PDF normal ocupa una página; los datos largos continúan en otra para evitar solapamientos.

Pruebas: `npm test -- src/__tests__/Contacto.factura.test.tsx` y `deno test supabase/functions/_shared/factura-cheque-pdf.test.ts`.

La factura se manda en un email separado del código regalo. Un reembolso cancela el cheque según el webhook existente; no genera una factura rectificativa automáticamente.
