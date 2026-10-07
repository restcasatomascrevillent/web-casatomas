import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../../supabase/functions/_shared/factura-cheque-pdf.ts", () => ({ generarPdfFactura: vi.fn().mockResolvedValue("pdf-base64") }));
import { enviarFacturaCheque } from "../../supabase/functions/_shared/enviar-factura-cheque";
function database(message?: string, sent = false) {
  const record = { id: "factura-1", numero: "CT-00000001", emisor: { email_mensaje: message }, cliente: { email: "cliente@example.com" }, email_enviado_en: sent ? "2026-10-03" : null };
  const mark = vi.fn().mockResolvedValue({ error: null });
  return { rpc: vi.fn().mockResolvedValue({ data: record, error: null }), from: vi.fn().mockReturnValue({ update: vi.fn().mockReturnValue({ eq: mark }) }) };
}
afterEach(() => vi.unstubAllGlobals());
describe("Mensaje del email de factura", () => {
  it.each([
    ["  Hola, gracias.\nTu factura está adjunta.  ", "Hola, gracias.\nTu factura está adjunta."],
    [undefined, "Gracias por tu compra. Adjuntamos la factura de tu cheque regalo de Casa Tomás."],
  ])("envía el texto guardado y mantiene compatibilidad con facturas antiguas", async (message, expected) => {
    vi.stubGlobal("Deno", { env: { get: () => "clave-ficticia" } });
    const send = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", send);
    const db = database(message);
    await enviarFacturaCheque(db as unknown as Parameters<typeof enviarFacturaCheque>[0], "cheque-1");
    const body = JSON.parse(send.mock.calls[0][1].body);
    expect(body.text).toBe(expected);
    expect(body.attachments[0]).toEqual({ filename: "Factura-CT-00000001.pdf", content: "pdf-base64" });
    expect(db.from).toHaveBeenCalledWith("facturas_cheques");
  });
  it("no reenvía una factura que ya se envió", async () => {
    const send = vi.fn(); vi.stubGlobal("fetch", send);
    await enviarFacturaCheque(database("Nuevo texto", true) as unknown as Parameters<typeof enviarFacturaCheque>[0], "cheque-1");
    expect(send).not.toHaveBeenCalled();
  });
});
