// CT-REM-FN-03 · la IP que se registra en auditoría (x-audit-ip) no la elige el
// cliente con un X-Forwarded-For prefijado. Test Deno (`deno test`).
import { contextoAuditoria } from "./admin-auth.ts";
const igual = (a: unknown, b: unknown) => { if (a !== b) throw new Error(`Esperaba ${JSON.stringify(b)} y llegó ${JSON.stringify(a)}`); };
const pedir = (h: Record<string, string>) => new Request("https://e.test/cheques-regalo-admin", { headers: h });

Deno.test("x-audit-ip usa cf-connecting-ip aunque el cliente mande XFF", () => {
  igual(contextoAuditoria(pedir({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "6.6.6.6" }))["x-audit-ip"], "203.0.113.7");
});

Deno.test("x-audit-ip usa el último salto de XFF, no el que pone el cliente delante", () => {
  igual(contextoAuditoria(pedir({ "x-forwarded-for": "6.6.6.6, 198.51.100.9" }))["x-audit-ip"], "198.51.100.9");
});

Deno.test("el resto del contexto de auditoría no cambia", () => {
  const c = contextoAuditoria(pedir({ "x-client-info": "adminpanel/dispositivo-1", "user-agent": "UA" }));
  igual(c["x-audit-source"], "cheques-regalo-admin");
  igual(c["x-audit-device-id"], "dispositivo-1");
  igual(c["x-audit-user-agent"], "UA");
  igual(c["x-client-info"], "adminpanel/dispositivo-1");
  igual(c["x-audit-ip"], "");
  igual(typeof c["x-audit-request-id"], "string");
});
