// Por qué no sale el correo del cheque: falta de RESEND_API_KEY y respuesta de
// Resend, en el log y en el resultado. Test Deno (`deno test`).
import { datosCheque, enviarEmailCheque, enviarEmailChequeConDetalle } from "./email.ts";
import { CHEQUE_EJEMPLO, PLANTILLA_REGALO } from "./plantilla.ts";

const assert = (v: unknown, mensaje = "Resultado incorrecto") => { if (!v) throw new Error(mensaje); };
const cheque = { ...CHEQUE_EJEMPLO, comprador_email: "ana@example.com", plantilla_cheque: PLANTILLA_REGALO };

async function conEntorno(clave: string | undefined, respuesta: Response | null, prueba: (logs: string[], peticiones: RequestInit[]) => Promise<void>) {
  const fetchOriginal = globalThis.fetch;
  const errorOriginal = console.error;
  const claveOriginal = Deno.env.get("RESEND_API_KEY");
  const logs: string[] = [];
  const peticiones: RequestInit[] = [];
  console.error = (...args: unknown[]) => { logs.push(args.map(String).join(" ")); };
  globalThis.fetch = (_url, init) => { peticiones.push(init ?? {}); return Promise.resolve(respuesta ?? new Response("{}")); };
  if (clave) Deno.env.set("RESEND_API_KEY", clave); else Deno.env.delete("RESEND_API_KEY");
  try {
    await prueba(logs, peticiones);
  } finally {
    globalThis.fetch = fetchOriginal;
    console.error = errorOriginal;
    if (claveOriginal) Deno.env.set("RESEND_API_KEY", claveOriginal); else Deno.env.delete("RESEND_API_KEY");
  }
}

Deno.test("sin RESEND_API_KEY: no llama a Resend, lo dice en el log y en el resultado", async () => {
  await conEntorno(undefined, null, async (logs, peticiones) => {
    const r = await enviarEmailChequeConDetalle(cheque, { ocultarImporte: false });
    assert(!r.ok && r.motivo === "sin_resend" && r.detalle.includes("RESEND_API_KEY"));
    assert(peticiones.length === 0);
    assert(logs.some((l) => l.includes("falta RESEND_API_KEY") && l.includes(cheque.id)), logs.join("\n"));
    assert(await enviarEmailCheque(cheque, { ocultarImporte: false }) === false);
  });
});

Deno.test("si Resend rechaza el envío, se registra su explicación recortada y sin emails", async () => {
  const cuerpo = JSON.stringify({ statusCode: 403, name: "validation_error", message: "You can only send testing emails to your own email address (dueno@example.com)." });
  await conEntorno("clave-de-prueba", new Response(cuerpo, { status: 403 }), async (logs) => {
    const r = await enviarEmailChequeConDetalle(cheque, { ocultarImporte: false });
    assert(!r.ok && r.motivo === "resend");
    assert(!r.ok && r.detalle.startsWith("403 validation_error: You can only send testing emails"), !r.ok ? r.detalle : "");
    const todo = logs.join("\n") + (!r.ok ? r.detalle : "");
    assert(todo.includes("[email]") && !todo.includes("dueno@example.com") && !todo.includes("clave-de-prueba"), todo);
  });
});

Deno.test("la clave de idempotencia es la del primer envío salvo que se pase otra (reenvío)", async () => {
  await conEntorno("clave-de-prueba", null, async (_logs, peticiones) => {
    assert((await enviarEmailChequeConDetalle(cheque, { ocultarImporte: false })).ok);
    assert((await enviarEmailChequeConDetalle(cheque, { ocultarImporte: false }, "cheque-regalo-reenvio-x")).ok);
    const claves = peticiones.map((p) => new Headers(p.headers).get("Idempotency-Key"));
    assert(claves[0] === "cheque-regalo-" + cheque.id && claves[1] === "cheque-regalo-reenvio-x", claves.join(","));
  });
});

Deno.test("el correo resume para quién es, el importe, hasta cuándo vale y cómo se canjea", async () => {
  await conEntorno("clave-de-prueba", null, async (_logs, peticiones) => {
    assert((await enviarEmailChequeConDetalle(cheque, { ocultarImporte: false })).ok);
    const cuerpo = JSON.parse(String(peticiones[0].body)) as { html: string; text: string };
    for (const parte of ["Para", "María", "Importe", "100,00 €", "Válido hasta", "Cómo canjearlo", "canjearse una vez", cheque.codigo]) {
      assert(cuerpo.html.includes(parte) && cuerpo.text.includes(parte), parte);
    }
  });
});

Deno.test("si el comprador oculta el importe, el resumen no lo enseña", () => {
  const datos = datosCheque({ ...cheque, destinatario_nombre: null }, { ocultarImporte: true }, PLANTILLA_REGALO);
  assert(!datos.some(([e]) => e === "Importe" || e === "Para"), JSON.stringify(datos));
  assert(datos.some(([e]) => e === "Válido hasta") && datos.some(([e]) => e === "Cómo canjearlo"));
});
