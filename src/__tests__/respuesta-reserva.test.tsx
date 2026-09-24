/**
 * Página /reserva/respuesta (enlaces de los correos de reserva) y su contrato
 * con la Edge Function emails-reserva (src/lib/respuesta-reserva.ts).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import {
  leerToken,
  normalizarRespuesta,
  llamarEnlace,
  formatearFecha,
  textosEstado,
  ErrorConexion,
  ENLACE_CONSULTAR_URL,
  ENLACE_EJECUTAR_URL,
  type RespuestaEnlace,
} from "@/lib/respuesta-reserva";

vi.mock("@/components/Seo", () => ({ Seo: () => null }));

const NEGOCIO = { marca: "casa_tomas", nombre: "Casa Tomás", telefonoTexto: "966 10 78 87", telefonoDigits: "966107887", web: "https://x" };
const DETALLES = { nombre: "Ana", fecha: "2026-10-03", hora: "21:30", comensales: 4, espacio: "Salón" };

const respuesta = (over: Partial<RespuestaEnlace> = {}): RespuestaEnlace => ({
  ok: true,
  estado: "pendiente",
  tipo: "propuesta",
  accion: "aceptar",
  negocio: NEGOCIO,
  detalles: DETALLES,
  ...over,
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("leerToken", () => {
  it("lee ?token= y descarta vacíos o enormes", () => {
    expect(leerToken("?token=abc.def")).toBe("abc.def");
    expect(leerToken("?token=a%2Bb")).toBe("a+b");
    expect(leerToken("")).toBeNull();
    expect(leerToken("?token=")).toBeNull();
    expect(leerToken(`?token=${"x".repeat(3000)}`)).toBeNull();
  });
});

describe("normalizarRespuesta", () => {
  it("acepta el contrato y limpia el teléfono", () => {
    const r = normalizarRespuesta({ ...respuesta(), negocio: { ...NEGOCIO, telefonoDigits: "966 10-78 87" } });
    expect(r?.estado).toBe("pendiente");
    expect(r?.negocio?.telefonoDigits).toBe("966107887");
    expect(r?.detalles?.espacio).toBe("Salón");
  });
  it("rechaza lo que no es el contrato", () => {
    expect(normalizarRespuesta(null)).toBeNull();
    expect(normalizarRespuesta("<!DOCTYPE html>")).toBeNull();
    expect(normalizarRespuesta({ estado: "otro" })).toBeNull();
  });
});

describe("llamarEnlace", () => {
  it("hace POST JSON con el token a la ruta correcta", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse(respuesta()));
    await llamarEnlace("consultar", "tok", fetchMock);
    expect(fetchMock).toHaveBeenCalledWith(ENLACE_CONSULTAR_URL, expect.objectContaining({ method: "POST", body: JSON.stringify({ token: "tok" }) }));
    await llamarEnlace("ejecutar", "tok", fetchMock);
    expect(fetchMock).toHaveBeenLastCalledWith(ENLACE_EJECUTAR_URL, expect.objectContaining({ method: "POST" }));
    expect(ENLACE_EJECUTAR_URL).toMatch(/\/functions\/v1\/emails-reserva\/enlace\/ejecutar$/);
  });
  it("lanza ErrorConexion sin red o con respuesta que no es el contrato", async () => {
    await expect(llamarEnlace("consultar", "t", vi.fn().mockRejectedValue(new TypeError("fail")))).rejects.toBeInstanceOf(ErrorConexion);
    await expect(llamarEnlace("consultar", "t", vi.fn().mockResolvedValue(new Response("boom", { status: 502 })))).rejects.toBeInstanceOf(ErrorConexion);
  });
});

describe("formatearFecha", () => {
  it("fecha larga en español sin desfase de zona", () => {
    expect(formatearFecha("2026-10-03")).toBe("sábado, 3 de octubre de 2026");
    expect(formatearFecha("nada")).toBe("nada");
  });
});

describe("textosEstado", () => {
  it("cubre todos los estados en español", () => {
    expect(textosEstado(respuesta(), "Casa Tomás")).toMatchObject({ titulo: "Confirma tu reserva", boton: "Sí, confirmo la reserva" });
    expect(textosEstado(respuesta({ accion: "rechazar" }), "Casa Tomás").boton).toBe("Sí, rechazar la propuesta");
    expect(textosEstado(respuesta({ estado: "hecho" }), "Touza").parrafos[0]).toContain("Touza");
    expect(textosEstado(respuesta({ estado: "hecho", accion: "rechazar", tipo: "contraoferta" }), "X").titulo).toBe("Reserva cancelada");
    expect(textosEstado(respuesta({ estado: "ya_hecho" }), "X").titulo).toBe("Tu reserva ya está confirmada");
    expect(textosEstado(respuesta({ estado: "sin_aforo" }), "X").parrafos.join(" ")).toContain("te llamará");
    expect(textosEstado(respuesta({ estado: "invalido" }), "X").titulo).toBe("Este enlace ya no es válido");
    expect(textosEstado(respuesta({ estado: "fecha_pasada" }), "X").titulo).toBe("Esta propuesta ha caducado");
    expect(textosEstado(respuesta({ estado: "recibida" }), "X").titulo).toBe("Hemos recibido tu respuesta");
    expect(textosEstado(respuesta({ estado: "error" }), "X").titulo).toMatch(/No hemos podido/);
  });
});

describe("<RespuestaReserva />", () => {
  const original = window.location;
  beforeEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: { ...original, search: "?token=tok123" } });
  });
  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: original });
    vi.unstubAllGlobals();
  });

  const pintar = async () => {
    const { default: RespuestaReserva } = await import("@/pages/RespuestaReserva");
    return render(
      <MemoryRouter>
        <RespuestaReserva />
      </MemoryRouter>,
    );
  };

  it("dos pasos: al abrir solo consulta; ejecuta solo tras el clic", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(respuesta()))
      .mockResolvedValueOnce(jsonResponse(respuesta({ estado: "hecho" })));
    vi.stubGlobal("fetch", fetchMock);

    await pintar();
    expect(await screen.findByRole("heading", { name: "Confirma tu reserva" })).toBeInTheDocument();
    expect(screen.getByText("sábado, 3 de octubre de 2026")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(ENLACE_CONSULTAR_URL);

    await userEvent.click(screen.getByRole("button", { name: "Sí, confirmo la reserva" }));
    expect(await screen.findByRole("heading", { name: "¡Reserva confirmada!" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(ENLACE_EJECUTAR_URL);
  });

  it("enlace no válido sin datos personales", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(respuesta({ ok: false, estado: "invalido", detalles: null }))));
    await pintar();
    expect(await screen.findByRole("heading", { name: "Este enlace ya no es válido" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirmo/ })).toBeNull();
  });

  it("sin conexión ofrece reintentar", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("offline")).mockResolvedValueOnce(jsonResponse(respuesta()));
    vi.stubGlobal("fetch", fetchMock);
    await pintar();
    await userEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Confirma tu reserva" })).toBeInTheDocument());
  });

  it("sin token no llama a la función", async () => {
    Object.defineProperty(window, "location", { configurable: true, value: { ...original, search: "" } });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await pintar();
    expect(await screen.findByRole("heading", { name: "Falta el enlace de tu correo" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
