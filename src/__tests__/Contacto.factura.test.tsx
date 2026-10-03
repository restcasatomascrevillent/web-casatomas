import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import es from "@/i18n/languages/es";
vi.mock("@/i18n/LanguageProvider", () => ({ useTranslations: () => ({ t: es.translations }) }));
vi.mock("@/components/TelLink", () => ({ TelLink: () => <span>Teléfono</span> }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/supabase-functions", () => ({ CHEQUES_REGALO_CREAR_URL: "https://example.com/crear", functionHeaders: () => ({ "Content-Type": "application/json" }), leerCuerpo: async (r: Response) => r.json() }));
import ContactoSection from "@/components/ContactoSection";
async function abrir() {
  render(<ContactoSection />);
  fireEvent.click(screen.getByRole("button", { name: "100€" }));
  fireEvent.click(screen.getByRole("button", { name: es.translations.contacto.giftButton }));
  fireEvent.change(screen.getByLabelText(es.translations.contacto.giftFormBuyerName), { target: { value: "Ana" } });
  fireEvent.change(screen.getByLabelText(es.translations.contacto.giftFormBuyerEmail), { target: { value: "ana@example.com" } });
}
describe("Solicitud de factura del cheque", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ mensaje: "Prueba sin cobrar" }) })); });
  it("exige los datos fiscales solo cuando se marca la factura", async () => {
    await abrir();
    fireEvent.click(screen.getByLabelText(es.translations.contacto.giftInvoiceRequest));
    expect((screen.getByLabelText(es.translations.contacto.giftInvoiceName) as HTMLInputElement).value).toBe("Ana");
    fireEvent.click(screen.getByRole("button", { name: es.translations.contacto.giftFormSubmit }));
    expect(await screen.findByRole("alert")).toHaveTextContent(es.translations.contacto.giftInvoiceMissingData);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(es.translations.contacto.giftInvoiceTaxId), { target: { value: " 12345678Z " } });
    fireEvent.change(screen.getByLabelText(es.translations.contacto.giftInvoiceAddress), { target: { value: " Calle Mayor, 1, 03330 Crevillent " } });
    fireEvent.click(screen.getByRole("button", { name: es.translations.contacto.giftFormSubmit }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const body=JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.solicita_factura).toBe(true);
    expect(body.datos_factura).toEqual({ nombre: "Ana", nif: "12345678Z", direccion: "Calle Mayor, 1, 03330 Crevillent" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Prueba sin cobrar");
  });
  it("no lleva al pago si el backend antiguo no registra la factura", async () => {
    await abrir();
    fireEvent.click(screen.getByLabelText(es.translations.contacto.giftInvoiceRequest));
    fireEvent.change(screen.getByLabelText(es.translations.contacto.giftInvoiceTaxId), { target: { value: "12345678Z" } });
    fireEvent.change(screen.getByLabelText(es.translations.contacto.giftInvoiceAddress), { target: { value: "Calle Mayor, 1, 03330 Crevillent" } });
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ url: "https://checkout.stripe.com/test" }) } as Response);
    fireEvent.click(screen.getByRole("button", { name: es.translations.contacto.giftFormSubmit }));
    expect(await screen.findByRole("alert")).toHaveTextContent(es.translations.contacto.giftInvoiceNotReady);
  });
  it("sin factura, mantiene la compra sin datos fiscales", async () => {
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: es.translations.contacto.giftFormSubmit }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const body=JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.solicita_factura).toBe(false);expect(body.datos_factura).toBeUndefined();
  });
});
