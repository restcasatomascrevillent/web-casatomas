import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { PLANTILLA_REGALO, CHEQUE_EJEMPLO, textoRegalo } from "./plantilla.ts";
import { generarPdfRegalo, generarVistaRegalo } from "./pdf-plantilla.ts";
import { construirHtml, enviarEmailCheque } from "./email.ts";
import { LOGO_CASA_TOMAS_PNG_BASE64 } from "./logo-base64.ts";
const logo = "data:image/png;base64," + LOGO_CASA_TOMAS_PNG_BASE64;
const assert = (valor: unknown, mensaje = "No se cumple la comprobación") => { if (!valor) throw new Error(mensaje); };

Deno.test("PDF real, logo, ocultación de importe y paginación de texto largo", async () => {
  const corto = await generarPdfRegalo(CHEQUE_EJEMPLO, PLANTILLA_REGALO, logo);
  assert((await PDFDocument.load(corto)).getPageCount() === 1);
  const largo = await generarPdfRegalo({ ...CHEQUE_EJEMPLO, ocultar_importe: true, destinatario_nombre: "A".repeat(200), mensaje: "PalabraLarga".repeat(45) }, { ...PLANTILLA_REGALO, pdf_instrucciones: "Instrucciones de uso ".repeat(40), pdf_pie: "Contacto ".repeat(40) }, logo);
  const doc = await PDFDocument.load(largo); assert(doc.getPageCount() > 1);
  assert(doc.getPage(0).getWidth() > 595 && doc.getTitle()?.includes(CHEQUE_EJEMPLO.codigo));
});

Deno.test("tokens y HTML seguros, sin volver a interpretar valores del comprador", () => {
  assert(textoRegalo("{comprador} {codigo}", { ...CHEQUE_EJEMPLO, comprador_nombre: "{codigo}" }) === "{codigo} CT-EJEMPLO");
  assert(textoRegalo("Valor {importe}", CHEQUE_EJEMPLO, true) === "Valor ");
  const html = construirHtml({ ...CHEQUE_EJEMPLO, comprador_nombre: '<script>alert("x")</script>' }, { ocultarImporte: true }, PLANTILLA_REGALO);
  assert(!html.includes("<script>")); assert(html.includes("&lt;script&gt;")); assert(!html.includes("100,00"));
});

Deno.test("reintentos usan el mismo PDF, asunto editable, destinatario y clave de envío", async () => {
  const originalFetch = globalThis.fetch; const originalKey = Deno.env.get("RESEND_API_KEY");
  Deno.env.set("RESEND_API_KEY", "test-no-email");
  const requests: Array<{ body: Record<string, unknown>; key: string }> = [];
  globalThis.fetch = (_input, init) => {
    requests.push({ body: JSON.parse(String(init?.body)), key: new Headers(init?.headers).get("Idempotency-Key") || "" });
    return Promise.resolve(new Response('{"id":"fake"}', { status: 200 }));
  };
  try {
    const cheque = { ...CHEQUE_EJEMPLO, plantilla_cheque: { ...PLANTILLA_REGALO, email_asunto: "Regalo para {destinatario}" } };
    assert(await enviarEmailCheque(cheque, { ocultarImporte: false }));
    assert(await enviarEmailCheque(cheque, { ocultarImporte: false }));
    assert(requests.length === 2); assert(requests[0].key === requests[1].key);
    assert(requests[0].body.subject === "Regalo para María");
    assert(String(requests[0].body.text).includes("Válido hasta el 08/10/2027 (incluido)"));
    assert(JSON.stringify(requests[0].body) === JSON.stringify(requests[1].body), "El PDF y cuerpo deben ser estables entre reintentos");
  } finally { globalThis.fetch = originalFetch; if (originalKey) Deno.env.set("RESEND_API_KEY", originalKey); else Deno.env.delete("RESEND_API_KEY"); }
});

Deno.test("vista y PDF aplican las cuatro combinaciones elegidas en la compra", async () => {
  for (const ocultar_importe of [false, true]) for (const dedicatoria of [false, true]) {
    const cheque = { ...CHEQUE_EJEMPLO, ocultar_importe, mensaje: dedicatoria ? CHEQUE_EJEMPLO.mensaje : null };
    const vista = await generarVistaRegalo(cheque, PLANTILLA_REGALO, logo);
    const svg = vista.paginas.join("");
    assert(svg.includes("100,00 €") === !ocultar_importe);
    assert(svg.includes("¡Feliz cumpleaños!") === dedicatoria);
    assert(svg.includes(cheque.codigo));
    assert((await PDFDocument.load(vista.pdf)).getPageCount() === 1);
    const html = construirHtml(cheque, { ocultarImporte: ocultar_importe }, PLANTILLA_REGALO);
    assert(html.includes("100,00 €") === !ocultar_importe);
    assert(html.includes("Válido hasta el 08/10/2027 (incluido)"));
    // Condiciones en soporte duradero: devolución en 30 días y enlace a las condiciones completas.
    assert(html.includes("30 días"));
    assert(html.includes("/condiciones#cheques-regalo"));
    assert(svg.includes("Válido hasta el 08/10/2027 (incluido)"));
  }
});
