import { afterEach, describe, expect, it, vi } from "vitest";
import { construirAvisoCompra, enviarAvisoCompra, type CompraParaAviso } from "../../supabase/functions/_shared/cheques-regalo/aviso-compra";

const COMPRA: CompraParaAviso = {
  id: "cheque-1",
  codigo: "CT-ABCD-1234",
  importe_eur: 50,
  gastos_gestion_eur: 1.0,
  comprador_nombre: "Ana García",
  comprador_email: "ana@example.com",
  comprador_telefono: "600 000 000",
  destinatario_nombre: "María",
  mensaje: "¡Feliz cumpleaños! <3",
  fecha_entrega_deseada: "2026-12-24",
  ocultar_importe: false,
  emitido_en: "2026-11-06T17:42:00Z",
  caduca_el: "2027-11-06",
  stripe_payment_intent_id: "pi_123",
};

function entorno(valores: Record<string, string | undefined>) {
  vi.stubGlobal("Deno", { env: { get: (k: string) => valores[k] } });
}

afterEach(() => vi.unstubAllGlobals());

describe("Aviso al restaurante de un cheque regalo comprado", () => {
  it("lleva todos los datos de la compra y va al correo del restaurante", () => {
    entorno({});
    const aviso = construirAvisoCompra(COMPRA);
    expect(aviso.para).toBe("casatomascrevillent@gmail.com");
    expect(aviso.asunto).toBe("Nuevo cheque regalo CT-ABCD-1234 · 50,00 € · Ana García");
    for (const dato of [
      "Código del cheque: CT-ABCD-1234", "Importe del cheque: 50,00 €", "Gastos de gestión: 1,00 €", "Total cobrado: 51,00 €",
      "Fecha de compra: 06/11/2026 18:42", "Válido hasta: 06/11/2027", "Comprador: Ana García", "Email del comprador: ana@example.com",
      "Teléfono: 600 000 000", "Para (destinatario): María", "Dedicatoria: ¡Feliz cumpleaños! <3", "Fecha de entrega deseada: 24/12/2026",
      "Importe visible en el regalo: Sí", "Pago en Stripe: pi_123",
    ]) expect(aviso.texto).toContain(dato);
    // El HTML escapa lo que escribe el comprador.
    expect(aviso.html).toContain("¡Feliz cumpleaños! &lt;3");
    expect(aviso.html).not.toContain("<3");
  });

  it("los datos opcionales vacíos salen como «—» y el importe oculto se indica", () => {
    entorno({});
    const aviso = construirAvisoCompra({ ...COMPRA, comprador_telefono: null, destinatario_nombre: "  ", mensaje: null, fecha_entrega_deseada: null, gastos_gestion_eur: null, ocultar_importe: true });
    expect(aviso.texto).toContain("Teléfono: —");
    expect(aviso.texto).toContain("Para (destinatario): —");
    expect(aviso.texto).toContain("Dedicatoria: —");
    expect(aviso.texto).toContain("Fecha de entrega deseada: —");
    expect(aviso.texto).toContain("Total cobrado: 50,00 €");
    expect(aviso.texto).toContain("Importe visible en el regalo: No (oculto)");
  });

  it("CHEQUES_REGALO_EMAIL_AVISOS cambia el destino solo si es un email válido", () => {
    entorno({ CHEQUES_REGALO_EMAIL_AVISOS: "otro@example.com" });
    expect(construirAvisoCompra(COMPRA).para).toBe("otro@example.com");
    entorno({ CHEQUES_REGALO_EMAIL_AVISOS: "no-es-un-email" });
    expect(construirAvisoCompra(COMPRA).para).toBe("casatomascrevillent@gmail.com");
  });

  it("se envía por Resend con idempotencia y respuesta al comprador", async () => {
    entorno({ RESEND_API_KEY: "clave-ficticia", RESEND_FROM_EMAIL: "Casa Tomás <cheques@example.com>" });
    const envio = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", envio);
    await expect(enviarAvisoCompra(COMPRA)).resolves.toBe(true);
    const [url, init] = envio.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers["Idempotency-Key"]).toBe("aviso-compra-cheque-cheque-1");
    const cuerpo = JSON.parse(init.body);
    expect(cuerpo).toMatchObject({ from: "Casa Tomás <cheques@example.com>", to: ["casatomascrevillent@gmail.com"], reply_to: "ana@example.com" });
    expect(cuerpo.subject).toContain("CT-ABCD-1234");
  });

  it("si el aviso no sale, no lanza: la compra sigue su curso", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    entorno({ RESEND_API_KEY: "clave-ficticia" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => "dominio no verificado" }));
    await expect(enviarAvisoCompra(COMPRA)).resolves.toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sin red")));
    await expect(enviarAvisoCompra(COMPRA)).resolves.toBe(false);
    entorno({});
    await expect(enviarAvisoCompra(COMPRA)).resolves.toBe(false);
  });
});
