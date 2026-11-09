import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import VotoVinoFavorito, { codigoErrorVoto, DURACION_AVISO_ENCUESTA_MS } from "@/components/carta/VotoVinoFavorito";
import { estadoEncuestaDesdeFila, formatearDiaEncuesta, hoyEnEspana } from "@/hooks/useEncuestaVinos";

const mocks = vi.hoisted(() => ({ toast: vi.fn(), rpc: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));

const vinos = [
  { id: "t1", nombre: "Mauro", categoria: "VINOS TINTOS — IGP CASTILLA Y LEÓN" },
  { id: "b1", nombre: "Ossian", nombre_en: "Ossian (EN)", categoria: "VINOS BLANCOS — IGP CASTILLA Y LEÓN" },
];

/** Último día para votar dentro de plazo (el año que viene). */
const FIN = `${new Date().getFullYear() + 1}-06-30`;

const abierta = (activa: boolean, fila: Record<string, unknown> = { encuesta_vinos_premio: "Una botella de Mauro", encuesta_vinos_fin: FIN }) => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://x.test");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ encuesta_vinos_activa: activa, ...fila }] }));
};

const pintar = (listo = true) =>
  render(<MemoryRouter><VotoVinoFavorito vinos={vinos} listo={listo} language="es" /></MemoryRouter>);

beforeEach(() => { localStorage.clear(); mocks.toast.mockClear(); mocks.rpc.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("«Vota tu vino favorito» en la carta de vinos", () => {
  it("con la votación cerrada no sale nada", async () => {
    abierta(false);
    const { container } = pintar();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("abierta: aviso de 3 segundos con «Votar» y botón para votar", async () => {
    abierta(true);
    pintar();
    expect(await screen.findByRole("button", { name: /Vota tu vino favorito y gana un sorteo/ })).toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledTimes(1);
    expect(DURACION_AVISO_ENCUESTA_MS).toBe(3000);
    expect(mocks.toast.mock.calls[0][0]).toMatchObject({ title: expect.stringContaining("Vota tu vino favorito"), duration: 3000 });
  });

  it("abierta en el panel pero sin premio o con el último día ya pasado: no se ofrece votar (sin bases completas)", async () => {
    for (const fila of [{ encuesta_vinos_fin: FIN }, { encuesta_vinos_premio: "Una botella", encuesta_vinos_fin: "2020-01-31" }, {}]) {
      abierta(true, fila);
      const { container, unmount } = pintar();
      await waitFor(() => expect(fetch).toHaveBeenCalled());
      expect(container).toBeEmptyDOMElement();
      unmount();
      vi.unstubAllGlobals();
    }
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("el diálogo enseña el premio y el último día, y la casilla pide la mayoría de edad y enlaza las bases y la política en pestaña nueva", async () => {
    abierta(true);
    const user = userEvent.setup();
    pintar();
    await user.click(await screen.findByRole("button", { name: /Vota tu vino favorito y gana un sorteo/ }));
    expect(screen.getByText(`Premio: Una botella de Mauro. Puedes votar hasta el 30/06/${new Date().getFullYear() + 1} (incluido).`)).toBeInTheDocument();
    const casilla = screen.getByRole("checkbox", { name: /Soy mayor de 18 años/ });
    expect(casilla).not.toBeChecked();
    const bases = screen.getByRole("link", { name: /bases/ });
    expect(bases).toHaveAttribute("href", "/condiciones#sorteo");
    expect(bases).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: /Política de privacidad/ })).toHaveAttribute("href", "/politica-privacidad");
  });

  it("estado de la votación: abierta solo con premio y un último día que no ha pasado (hora de España)", () => {
    const ahora = new Date("2026-12-15T22:30:00Z"); // 23:30 del 15 en España
    expect(hoyEnEspana(ahora)).toBe("2026-12-15");
    expect(estadoEncuestaDesdeFila({ encuesta_vinos_activa: true, encuesta_vinos_premio: " Cena ", encuesta_vinos_fin: "2026-12-15" }, ahora))
      .toEqual({ activa: true, premio: "Cena", fin: "2026-12-15" });
    expect(estadoEncuestaDesdeFila({ encuesta_vinos_activa: true, encuesta_vinos_premio: "Cena", encuesta_vinos_fin: "2026-12-14" }, ahora).activa).toBe(false);
    expect(estadoEncuestaDesdeFila({ encuesta_vinos_activa: true, encuesta_vinos_premio: "  ", encuesta_vinos_fin: "2026-12-15" }, ahora).activa).toBe(false);
    expect(estadoEncuestaDesdeFila({ encuesta_vinos_activa: false, encuesta_vinos_premio: "Cena", encuesta_vinos_fin: "2026-12-15" }, ahora).activa).toBe(false);
    expect(estadoEncuestaDesdeFila(null, ahora)).toEqual({ activa: false, premio: null, fin: null });
    expect(formatearDiaEncuesta("2026-03-05", "en")).toBe("05/03/2026");
  });

  it("no avisa hasta confirmar la edad", async () => {
    abierta(true);
    const { container } = pintar(false);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("si este navegador ya votó, no avisa y lo dice", async () => {
    abierta(true);
    localStorage.setItem("ct_voto_vino_favorito", "1");
    pintar();
    expect(await screen.findByText(/Ya has votado tu vino favorito/)).toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("vota: vino, nombre, contacto y bases; da las gracias y no vuelve a pedirlo", async () => {
    abierta(true);
    mocks.rpc.mockResolvedValue({ data: { ok: true, vino: "Mauro" }, error: null });
    const user = userEvent.setup();
    pintar();
    await user.click(await screen.findByRole("button", { name: /Vota tu vino favorito y gana un sorteo/ }));
    await user.selectOptions(screen.getByLabelText("Tu vino favorito"), "t1");
    await user.type(screen.getByLabelText("Tu nombre"), "Ana");
    await user.type(screen.getByLabelText("Email o teléfono"), "ana@example.com");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Enviar mi voto" }));
    expect(mocks.rpc).toHaveBeenCalledWith("votar_vino_favorito", {
      p_vino_id: "t1", p_nombre: "Ana", p_contacto: "ana@example.com", p_acepta_bases: true, p_idioma: "es",
    });
    expect(await screen.findByRole("status")).toHaveTextContent("¡Gracias! Tu voto por Mauro está registrado.");
    expect(localStorage.getItem("ct_voto_vino_favorito")).toBe("1");
  });

  it("explica cada error de la base de datos", async () => {
    abierta(true);
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "ya_participado" } });
    const user = userEvent.setup();
    pintar();
    await user.click(await screen.findByRole("button", { name: /Vota tu vino favorito y gana un sorteo/ }));
    await user.click(screen.getByRole("button", { name: "Enviar mi voto" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Elige un vino.");
    expect(mocks.rpc).not.toHaveBeenCalled();
    await user.selectOptions(screen.getByLabelText("Tu vino favorito"), "b1");
    await user.click(screen.getByRole("button", { name: "Enviar mi voto" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Ya has participado/);
    expect(codigoErrorVoto({ message: "encuesta_cerrada" })).toBe("encuesta_cerrada");
    expect(codigoErrorVoto(new TypeError("Failed to fetch"))).toBe("generico");
  });
});
