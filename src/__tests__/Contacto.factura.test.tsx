import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import es from "@/i18n/languages/es";
vi.mock("@/i18n/LanguageProvider", () => {
  const valor = { t: es.translations, language: "es" };
  return { useTranslations: () => valor, useOptionalTranslations: () => valor };
});
vi.mock("@/components/TelLink", () => ({ TelLink: () => <span>Teléfono</span> }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/supabase-functions", () => ({ CHEQUES_REGALO_CREAR_URL: "https://example.com/crear", functionHeaders: () => ({ "Content-Type": "application/json" }), leerCuerpo: async (r: Response) => r.json() }));
vi.mock("@/components/VistaRegaloCompra", () => ({ VistaRegaloCompra: () => <div>Vista PDF</div> }));
const APAGADOS = { activos: false, porcentaje: 0, fijo_eur: 0 };
const gastosMock = vi.hoisted(() => ({ config: { activos: false, porcentaje: 0, fijo_eur: 0 } }));
vi.mock("@/lib/cheques/vista-regalo", () => ({ crearSesionVistaRegalo: () => ({ preparar: vi.fn().mockResolvedValue([]), gastos: vi.fn(async () => gastosMock.config) }) }));
import ContactoSection from "@/components/ContactoSection";
const c = es.translations.contacto;
function continuar() { fireEvent.click(screen.getByRole("button", { name: "Continuar" })); }
async function abrir() {
  render(<MemoryRouter><ContactoSection /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "100€" }));
  fireEvent.click(screen.getByRole("button", { name: c.giftButton }));
  fireEvent.change(screen.getByLabelText(c.giftFormBuyerName), { target: { value: "Ana" } });
  continuar();
  fireEvent.change(screen.getByLabelText(c.giftFormBuyerEmail), { target: { value: "ana@example.com" } });
  continuar();
  for (let i = 0; i < 3; i++) continuar(); // teléfono, destinatario y dedicatoria: queda en la fecha de entrega
}
describe("Compra guiada del cheque", () => {
  beforeEach(() => { gastosMock.config = APAGADOS; vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ mensaje: "Prueba sin cobrar" }) })); });
  it("sin gastos de gestión el resumen no añade nada al importe", async () => {
    await abrir(); continuar();
    expect(screen.getByText("Revisa la información de compra")).toBeTruthy();
    expect(screen.queryByText("Gastos de gestión")).toBeNull();
    expect(screen.getByText("100 €")).toBeTruthy();
  });
  it("con gastos de gestión enseña el desglose y el total antes de pagar", async () => {
    gastosMock.config = { activos: true, porcentaje: 1.5, fijo_eur: 0.25 };
    await abrir(); continuar();
    expect(await screen.findByText("Gastos de gestión")).toBeTruthy();
    expect(screen.getByText(/^1,78\s€$/)).toBeTruthy();
    expect(screen.getAllByText(/^101,78\s€$/)).toHaveLength(2); // cabecera del diálogo y total del resumen
    expect(screen.getByText(/iguales para cualquier forma de pago/)).toBeTruthy();
  });
  it("no ofrece pedir la factura: de la fecha de entrega pasa directo al resumen", async () => {
    await abrir();
    expect(screen.getByText("Paso 6 de 8")).toBeInTheDocument();
    continuar();
    expect(screen.getByRole("heading", { name: "Revisa la información de compra" })).toBeInTheDocument();
    expect(screen.queryByText(/necesito factura|factura por email/i)).toBeNull();
    expect(screen.queryByLabelText(/NIF/)).toBeNull();
  });
  it("el resumen avisa de que la factura se pide al canjear, en el restaurante o por email", async () => {
    await abrir(); continuar();
    const aviso = screen.getByRole("note");
    expect(aviso).toHaveTextContent(c.giftInvoiceWarningTitle);
    expect(aviso).toHaveTextContent(/se canjee el cheque: en el propio restaurante o escribiendo a casatomascrevillent@gmail\.com con el código del cheque y tus datos fiscales/);
    expect(screen.getByRole("link", { name: "casatomascrevillent@gmail.com" })).toHaveAttribute("href", "mailto:casatomascrevillent@gmail.com");
    // Solo en el resumen: la vista previa del pago no lo repite.
    continuar();
    expect(screen.queryByRole("note")).toBeNull();
  });
  it("la nota de validez enlaza las condiciones de compra de los cheques", () => {
    render(<MemoryRouter><ContactoSection /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Condiciones de compra y devolución en 30 días" })).toHaveAttribute("href", "/condiciones#cheques-regalo");
  });
  it("junto al botón de pago enlaza las condiciones de compra (30 días) y la política, en pestaña nueva", async () => {
    await abrir(); continuar();
    expect(screen.queryByTestId("cheque-aviso-legal")).toBeNull(); // solo en el último paso, junto al botón
    continuar();
    const aviso = screen.getByTestId("cheque-aviso-legal");
    expect(aviso).toHaveTextContent(/Al continuar al pago aceptas las condiciones de compra .*30 días para devolverlo/);
    const condiciones = screen.getByRole("link", { name: /condiciones de compra/ });
    expect(condiciones).toHaveAttribute("href", "/condiciones#cheques-regalo");
    expect(condiciones).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: /política de privacidad/ })).toHaveAttribute("href", "/politica-privacidad");
  });
  it("la compra no manda datos de factura", async () => {
    await abrir(); continuar(); continuar();
    fireEvent.click(screen.getByRole("button", { name: c.giftFormSubmit }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body).not.toHaveProperty("solicita_factura");
    expect(body).not.toHaveProperty("datos_factura");
    expect(body).toMatchObject({ importe_eur: 100, comprador_nombre: "Ana", comprador_email: "ana@example.com" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Prueba sin cobrar");
  });
  it("permite elegir sin importe ni dedicatoria antes del pago", async () => {
    await abrir(); continuar(); continuar();
    fireEvent.click(screen.getByRole("checkbox", { name: "Mostrar el importe en el regalo y en el PDF" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Incluir dedicatoria en el PDF" }));
    fireEvent.click(screen.getByRole("button", { name: c.giftFormSubmit }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.ocultar_importe).toBe(true);
    expect(body.incluir_dedicatoria).toBe(false);
    expect(body.mensaje).toBeUndefined();
    expect(body.importe_eur).toBe(100);
  });
  it("evita cobrar si el servidor antiguo ignora la selección de importe oculto", async () => {
    await abrir(); continuar(); continuar();
    fireEvent.click(screen.getByRole("checkbox", { name: "Mostrar el importe en el regalo y en el PDF" }));
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ url: "https://checkout.stripe.com/test" }) } as Response);
    fireEvent.click(screen.getByRole("button", { name: c.giftFormSubmit }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo confirmar que el importe quede oculto");
  });
  it("separa la información de compra de la vista previa y el pago", async () => {
    await abrir(); continuar();
    expect(screen.getByRole("heading", { name: "Revisa la información de compra" })).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.queryByText("Vista PDF")).toBeNull();
    expect(screen.queryByRole("button", { name: c.giftFormSubmit })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    continuar();
    expect(screen.getByText("Vista PDF")).toBeInTheDocument();
    expect(screen.queryByText("ana@example.com")).toBeNull();
    expect(screen.getByRole("button", { name: c.giftFormSubmit })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: c.giftFormSubmit })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("mantiene el campo montado y el foco al continuar", () => {
    render(<MemoryRouter><ContactoSection /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "100€" }));
    fireEvent.click(screen.getByRole("button", { name: c.giftButton }));
    const input = screen.getByLabelText(c.giftFormBuyerName);
    input.focus();
    fireEvent.change(input, { target: { value: "Ana" } });
    continuar();
    expect(screen.getByLabelText(c.giftFormBuyerEmail)).toBe(input);
    expect(screen.getByLabelText(c.giftFormBuyerEmail)).toHaveFocus();
  });
  it("conserva el mismo campo al pasar al mensaje y evita perder foco con el toque", () => {
    render(<MemoryRouter><ContactoSection /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "100€" }));
    fireEvent.click(screen.getByRole("button", { name: c.giftButton }));
    const field = screen.getByLabelText(c.giftFormBuyerName);
    fireEvent.change(field, { target: { value: "Ana" } }); continuar();
    fireEvent.change(screen.getByLabelText(c.giftFormBuyerEmail), { target: { value: "ana@example.com" } }); continuar();
    continuar();
    const next = screen.getByRole("button", { name: "Continuar" });
    expect(fireEvent.pointerDown(next, { pointerType: "touch" })).toBe(false);
    continuar();
    expect(screen.getByLabelText(c.giftFormMessage)).toBe(field);
    expect(field).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.getByLabelText(c.giftFormRecipientName)).toBe(field);
    expect(field).toHaveFocus();
  });
  it("ajusta el diálogo al espacio visible cuando se abre el teclado", async () => {
    const viewport = new EventTarget() as EventTarget & { height: number; offsetTop: number };
    viewport.height = 760; viewport.offsetTop = 0;
    vi.stubGlobal("visualViewport", viewport);
    render(<MemoryRouter><ContactoSection /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "100€" }));
    fireEvent.click(screen.getByRole("button", { name: c.giftButton }));
    continuar();
    expect(await screen.findByRole("alert")).toHaveTextContent(c.toasts.giftMissingName);
    viewport.height = 320; viewport.offsetTop = 20;
    act(() => { viewport.dispatchEvent(new Event("resize")); });
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveStyle({ top: "180px", maxHeight: "296px", "--alto-visible": "296px" }));
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
    vi.unstubAllGlobals();
  });
});
