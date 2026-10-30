// CT-REM-FN-03 · IP de cliente no manipulable con un X-Forwarded-For prefijado.
// Test Deno (`deno test`), como el resto de supabase/functions.
import { ipCliente } from "./ip-cliente.ts";
const igual = (a: unknown, b: unknown) => { if (a !== b) throw new Error(`Esperaba ${JSON.stringify(b)} y llegó ${JSON.stringify(a)}`); };
const pedir = (h: Record<string, string>) => new Request("https://e.test/x", { headers: h });

Deno.test("cf-connecting-ip manda sobre cualquier XFF", () => {
  igual(ipCliente(pedir({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "1.1.1.1, 203.0.113.7" })), "203.0.113.7");
});

Deno.test("sin cf-connecting-ip se usa el ÚLTIMO salto de XFF, no el primero", () => {
  igual(ipCliente(pedir({ "x-forwarded-for": "1.1.1.1, 2.2.2.2 , 198.51.100.9" })), "198.51.100.9");
});

Deno.test("31 XFF prefijados distintos con la misma IP real dan una sola IP", () => {
  const ips = new Set<string>();
  for (let i = 0; i < 31; i++) ips.add(ipCliente(pedir({ "x-forwarded-for": `10.0.0.${i}, 198.51.100.9` })));
  igual(ips.size, 1);
  for (let i = 0; i < 31; i++) ips.add(ipCliente(pedir({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": `10.0.0.${i}` })));
  igual(ips.size, 2);
});

Deno.test("cabeceras vacías o con saltos vacíos no rompen y se recortan a 128", () => {
  igual(ipCliente(pedir({})), "");
  igual(ipCliente(pedir({ "x-forwarded-for": " , ," })), "");
  igual(ipCliente(pedir({ "x-forwarded-for": "1.1.1.1,," })), "1.1.1.1");
  igual(ipCliente(new Headers({ "cf-connecting-ip": "x".repeat(300) })).length, 128);
});
