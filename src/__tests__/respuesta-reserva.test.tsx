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
  textosSinConexion,
  ErrorConexion,
  ENLACE_CONSULTAR_URL,
  ENLACE_EJECUTAR_URL,
  type RespuestaEnlace,
} from "@/lib/respuesta-reserva";
import { PHONE_DISPLAY } from "@/components/TelLink";

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

  it("el ErrorConexion dice de quién es la culpa", async () => {
    // 502 con cuerpo ilegible: llegó respuesta, así que el fallo es NUESTRO.
    await expect(
      llamarEnlace("consultar", "t", vi.fn().mockResolvedValue(new Response("boom", { status: 502 }))),
    ).rejects.toMatchObject({ tipo: "servidor" });

    // `fetch` que lanza con el dispositivo en línea: CORS o función caída, o
    // sea, también nuestro. Es el fallo que dejó el formulario mudo horas.
    await expect(
      llamarEnlace("consultar", "t", vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))),
    ).rejects.toMatchObject({ tipo: "servidor" });

    // Y solo sin red de verdad la culpa deja de ser nuestra. El espía se
    // restaura a mano: este fichero no tiene `restoreAllMocks` global y un
    // `navigator.onLine` falseado se colaría en los tests de abajo.
    const enLinea = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    try {
      await expect(
        llamarEnlace("consultar", "t", vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))),
      ).rejects.toMatchObject({ tipo: "sin_red" });
    } finally {
      enLinea.mockRestore();
    }
  });
});

describe("textosSinConexion", () => {
  it("fallo nuestro: lo admite, da el teléfono y NO le manda a mirar su conexión", () => {
    const { titulo, parrafos } = textosSinConexion("servidor", "consultar", PHONE_DISPLAY);

    expect(titulo).toBe("No es cosa tuya: el fallo es nuestro");
    expect(parrafos.join(" ")).toContain(PHONE_DISPLAY);
    // La regresión de hoy: "comprueba tu conexión" cuando la conexión va bien.
    expect(`${titulo} ${parrafos.join(" ")}`).not.toMatch(/comprueba tu conexi[oó]n/i);
  });

  it("fallo nuestro al ejecutar: avisa de que no sabe si la respuesta llegó", () => {
    const { parrafos } = textosSinConexion("servidor", "ejecutar", PHONE_DISPLAY);

    expect(parrafos[0]).toContain("No sabemos si tu respuesta ha llegado");
    expect(parrafos.join(" ")).toContain(PHONE_DISPLAY);
  });

  it("sin red: ahí sí se le habla de su conexión, y no se le da el teléfono como parche", () => {
    const sinRed = textosSinConexion("sin_red", "consultar", PHONE_DISPLAY);

    expect(sinRed.titulo).toBe("Parece que te has quedado sin conexión");
    expect(sinRed.parrafos.join(" ")).toMatch(/recuperes|recuperes la conexi[oó]n/i);
    expect(sinRed.parrafos.join(" ")).not.toContain(PHONE_DISPLAY);
  });

  it("los dos casos no cuentan lo mismo", () => {
    const nuestro = textosSinConexion("servidor", "ejecutar", PHONE_DISPLAY);
    const sinRed = textosSinConexion("sin_red", "ejecutar", PHONE_DISPLAY);

    expect(nuestro.titulo).not.toBe(sinRed.titulo);
    expect(nuestro.parrafos).not.toEqual(sinRed.parrafos);
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
    // Incluye el espía de `navigator.onLine`: sin esto, un `false` falseado se
    // colaría en los tests siguientes y cambiaría el texto que esperan.
    vi.restoreAllMocks();
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

  it("no enseña la sala aunque el servidor la mande: en Casa Tomás la decide el equipo", async () => {
    // DETALLES trae `espacio: "Salón"` a propósito: un servidor antiguo, o un
    // enlace ya enviado, puede seguir mandándolo y la página no debe pintarlo.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(respuesta())));
    await pintar();

    expect(await screen.findByRole("heading", { name: "Confirma tu reserva" })).toBeInTheDocument();
    expect(screen.getByText("Comensales")).toBeInTheDocument();
    expect(screen.queryByText("Espacio")).toBeNull();
    expect(screen.queryByText("Salón")).toBeNull();
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

  it("con el dispositivo en línea el fallo se cuenta como NUESTRO, con el teléfono", async () => {
    // `Failed to fetch` con red buena = CORS o función caída: nuestro.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await pintar();

    expect(
      await screen.findByRole("heading", { name: "No es cosa tuya: el fallo es nuestro" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/comprueba tu conexi[oó]n/i)).toBeNull();
    // El teléfono, en el propio aviso y no solo al pie de la tarjeta: es la
    // salida que de verdad le sirve cuando lo nuestro está caído.
    expect(
      screen.getByText(`Si sigue sin funcionar, llámanos al ${PHONE_DISPLAY} y lo resolvemos en un momento.`),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("sin red de verdad: se le dice que ha perdido la conexión", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await pintar();

    expect(
      await screen.findByRole("heading", { name: "Parece que te has quedado sin conexión" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
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
