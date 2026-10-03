import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import es from "@/i18n/languages/es";
vi.mock("@/i18n/LanguageProvider", () => ({ useTranslations: () => ({ t: es.translations, language: "es" }) }));
vi.mock("@/components/TelLink", () => ({ TelLink: () => <span>Teléfono</span> }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/supabase-functions", () => ({ CHEQUES_REGALO_CREAR_URL: "https://example.com/crear", functionHeaders: () => ({ "Content-Type": "application/json" }), leerCuerpo: async (r: Response) => r.json() }));
import ContactoSection from "@/components/ContactoSection";
const c = es.translations.contacto;
function continuar() { fireEvent.click(screen.getByRole("button", { name: "Continuar" })); }
async function abrir() {
  render(<ContactoSection />);
  fireEvent.click(screen.getByRole("button", { name: "100€" }));
  fireEvent.click(screen.getByRole("button", { name: c.giftButton }));
  fireEvent.change(screen.getByLabelText(c.giftFormBuyerName), { target: { value: "Ana" } });
  continuar();
  fireEvent.change(screen.getByLabelText(c.giftFormBuyerEmail), { target: { value: "ana@example.com" } });
  continuar();
  for (let i = 0; i < 4; i++) continuar();
}
function pedirFactura() {
  fireEvent.click(screen.getByRole("button", { name: c.giftInvoiceRequest }));
  expect(screen.getByRole("button", { name: c.giftInvoiceRequest })).toHaveAttribute("aria-pressed", "true");
  continuar();
  expect((screen.getByLabelText(c.giftInvoiceName) as HTMLInputElement).value).toBe("Ana");
  continuar();
}
function completarFactura() {
  fireEvent.change(screen.getByLabelText(c.giftInvoiceTaxId), { target: { value: " 12345678Z " } });
  continuar();
  fireEvent.change(screen.getByLabelText(c.giftInvoiceAddress), { target: { value: " Calle Mayor, 1, 03330 Crevillent " } });
  continuar();
}
describe("Compra guiada del cheque", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ mensaje: "Prueba sin cobrar" }) })); });
  it("permite elegir factura, valida cada paso y conserva datos al retroceder", async () => {
    await abrir(); pedirFactura();
    continuar();
    expect(await screen.findByRole("alert")).toHaveTextContent(c.giftInvoiceMissingData);
    expect(fetch).not.toHaveBeenCalled();
    completarFactura();
    fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.getByLabelText(c.giftInvoiceAddress)).toHaveValue(" Calle Mayor, 1, 03330 Crevillent ");
    continuar();
    fireEvent.click(screen.getByRole("button", { name: c.giftFormSubmit }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const body=JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.solicita_factura).toBe(true);
    expect(body.datos_factura).toEqual({ nombre: "Ana", nif: "12345678Z", direccion: "Calle Mayor, 1, 03330 Crevillent" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Prueba sin cobrar");
  });
  it("no lleva al pago si el backend antiguo no registra la factura", async () => {
    await abrir(); pedirFactura(); completarFactura();
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ url: "https://checkout.stripe.com/test" }) } as Response);
    fireEvent.click(screen.getByRole("button", { name: c.giftFormSubmit }));
    expect(await screen.findByRole("alert")).toHaveTextContent(c.giftInvoiceNotReady);
  });
  it("sin factura, omite las preguntas fiscales", async () => {
    await abrir(); continuar();
    expect(screen.queryByLabelText(c.giftInvoiceTaxId)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: c.giftFormSubmit }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const body=JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.solicita_factura).toBe(false); expect(body.datos_factura).toBeUndefined();
  });
  it("ajusta el diálogo al espacio visible cuando se abre el teclado", async () => {
    const viewport = new EventTarget() as EventTarget & { height: number; offsetTop: number };
    viewport.height = 760; viewport.offsetTop = 0;
    vi.stubGlobal("visualViewport", viewport);
    render(<ContactoSection />);
    fireEvent.click(screen.getByRole("button", { name: "100€" }));
    fireEvent.click(screen.getByRole("button", { name: c.giftButton }));
    continuar();
    expect(await screen.findByRole("alert")).toHaveTextContent(c.toasts.giftMissingName);
    viewport.height = 320; viewport.offsetTop = 20;
    act(() => { viewport.dispatchEvent(new Event("resize")); });
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveStyle({ top: "180px", height: "296px", maxHeight: "296px" }));
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
    vi.unstubAllGlobals();
  });
});
