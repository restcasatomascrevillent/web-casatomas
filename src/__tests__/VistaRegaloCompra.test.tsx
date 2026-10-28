import { render, screen, waitFor, act } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { VistaRegaloCompra } from "@/components/VistaRegaloCompra";
import { crearSesionVistaRegalo } from "@/lib/cheques/vista-regalo";
import { calcularCaducidad, fechaCaducidad } from "../../supabase/functions/_shared/cheques-regalo/caducidad";
import { PLANTILLA_REGALO } from "../../supabase/functions/_shared/cheques-regalo/plantilla";
vi.mock("@/lib/supabase-functions", () => ({ CHEQUES_REGALO_PLANTILLA_VISTA_URL: "https://example.com/plantilla-vista", CHEQUES_REGALO_VISTA_URL: "https://example.com/vista-previa", functionHeaders: () => ({ "Content-Type": "application/json" }) }));
const props = { importe: "100", nombre: "Ana", destinatario: "María", mensaje: "Felicidades", ocultarImporte: false, incluirDedicatoria: true,
  texto: { preview: "Vista PDF", loading: "Generando", previewError: "No disponible", sample: "Código de ejemplo" } };
const decode = (src: string) => decodeURIComponent(src.split(",").slice(1).join(","));
describe("Vista PDF en la compra web", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ plantilla: PLANTILLA_REGALO }) })));
  afterEach(() => vi.unstubAllGlobals());
  it("actualiza las opciones en local, sin otra petición ni insertar SVG como HTML", async () => {
    const { rerender, container } = render(<VistaRegaloCompra {...props} />);
    const image = await screen.findByRole("img");
    const initial = image.getAttribute("src")!;
    expect(decode(initial)).toContain("100,00 €"); expect(decode(initial)).toContain("Felicidades");
    rerender(<VistaRegaloCompra {...props} ocultarImporte incluirDedicatoria={false} />);
    await waitFor(() => expect(image).not.toHaveAttribute("src", initial));
    expect(decode(image.getAttribute("src")!)).not.toContain("100,00 €");
    expect(decode(image.getAttribute("src")!)).not.toContain("Felicidades");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][1]?.body).toBe("{}");
    expect(container.querySelector("svg,iframe,object")).toBeNull();
  });
  it("comparte la precarga en curso y reutiliza versiones ya generadas", async () => {
    const sesion = crearSesionVistaRegalo();
    const carga = sesion.preparar();
    const vista = sesion.generar(props);
    await carga;
    const initial = await vista;
    await sesion.generar({ ...props, ocultarImporte: true });
    expect(await sesion.generar(props)).toBe(initial);
    expect(fetch).toHaveBeenCalledTimes(1);
    const otraCompra = crearSesionVistaRegalo();
    await otraCompra.preparar();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("ignora una respuesta antigua y conserva la imagen mientras actualiza", async () => {
    const primera = ["data:image/svg+xml,primera"], ultima = ["data:image/svg+xml,ultima"];
    let resolver!: (p: string[]) => void;
    const generar = vi.fn().mockResolvedValueOnce(primera).mockImplementationOnce(() => new Promise<string[]>(r => { resolver = r; })).mockResolvedValueOnce(ultima);
    const sesion = { preparar: vi.fn(), generar, gastos: vi.fn() };
    const { rerender } = render(<VistaRegaloCompra {...props} sesion={sesion} />);
    const image = await screen.findByRole("img");
    rerender(<VistaRegaloCompra {...props} sesion={sesion} ocultarImporte />);
    expect(image).toHaveAttribute("src", primera[0]);
    rerender(<VistaRegaloCompra {...props} sesion={sesion} ocultarImporte incluirDedicatoria={false} />);
    await waitFor(() => expect(image).toHaveAttribute("src", ultima[0]));
    await act(async () => resolver(["data:image/svg+xml,obsoleta"]));
    expect(image).toHaveAttribute("src", ultima[0]);
  });
  it("informa de un fallo de preview sin bloquear la compra y permite reintentar", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ mensaje: "Error" }) } as Response);
    const { rerender } = render(<VistaRegaloCompra {...props} />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("No disponible"));
    rerender(<VistaRegaloCompra {...props} ocultarImporte />);
    expect(await screen.findByRole("img")).toBeInTheDocument();
  });
  it("mantiene la vista con la función anterior hasta desplegar la nueva", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 404 } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ paginas: ['<svg xmlns="http://www.w3.org/2000/svg"></svg>'] }) } as Response);
    render(<VistaRegaloCompra {...props} />);
    expect(await screen.findByRole("img")).toHaveAttribute("src", expect.stringContaining("data:image/svg+xml"));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe("https://example.com/vista-previa");
  });
  it("muestra la fecha calculada con el plazo configurado en el panel", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ plantilla: { ...PLANTILLA_REGALO, caducidad_meses: 6 } }) } as Response);
    const paginas = await crearSesionVistaRegalo().generar(props);
    expect(decode(paginas[0])).toContain("Válido hasta el " + fechaCaducidad(calcularCaducidad(6)) + " (incluido)");
  });

});
