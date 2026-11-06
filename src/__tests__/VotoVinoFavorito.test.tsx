import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import VotoVinoFavorito, { codigoErrorVoto, DURACION_AVISO_ENCUESTA_MS } from "@/components/carta/VotoVinoFavorito";

const mocks = vi.hoisted(() => ({ toast: vi.fn(), rpc: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));

const vinos = [
  { id: "t1", nombre: "Mauro", categoria: "VINOS TINTOS — IGP CASTILLA Y LEÓN" },
  { id: "b1", nombre: "Ossian", nombre_en: "Ossian (EN)", categoria: "VINOS BLANCOS — IGP CASTILLA Y LEÓN" },
];

const abierta = (activa: boolean) => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://x.test");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ encuesta_vinos_activa: activa }] }));
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
