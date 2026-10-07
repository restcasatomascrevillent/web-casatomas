import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { VistaRegaloCompra } from "@/components/VistaRegaloCompra";
vi.mock("@/lib/supabase-functions", () => ({ CHEQUES_REGALO_VISTA_URL: "https://example.com/vista-previa", functionHeaders: () => ({ "Content-Type": "application/json" }) }));
const props = { importe: "100", nombre: "Ana", destinatario: "María", mensaje: "Felicidades", ocultarImporte: false, incluirDedicatoria: true,
  texto: { preview: "Vista PDF", loading: "Generando", previewError: "No disponible", sample: "Código de ejemplo" } };
describe("Vista PDF en la compra web", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ paginas: ['<svg xmlns="http://www.w3.org/2000/svg"></svg>'] }) })));
  afterEach(() => vi.unstubAllGlobals());
  it("actualiza la vista con las selecciones y no inserta el SVG como HTML", async () => {
    const { rerender, container } = render(<VistaRegaloCompra {...props} />);
    expect(await screen.findByRole("img")).toHaveAttribute("src", expect.stringContaining("data:image/svg+xml"));
    rerender(<VistaRegaloCompra {...props} ocultarImporte incluirDedicatoria={false} />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(JSON.parse(vi.mocked(fetch).mock.calls[1][1]?.body as string)).toMatchObject({ importe_eur: 100, ocultar_importe: true, incluir_dedicatoria: false, mensaje: null });
    expect(container.querySelector("svg,iframe,object")).toBeNull();
  });
  it("informa de un fallo de preview sin bloquear la compra", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, json: async () => ({ mensaje: "Error" }) } as Response);
    render(<VistaRegaloCompra {...props} />);
    expect(await screen.findByRole("status")).toHaveTextContent("Generando");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("No disponible"));
  });
});
