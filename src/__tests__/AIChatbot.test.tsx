/**
 * Tests for AIChatbot component
 *
 * Strategy: the component renders via a React portal into document.body.
 * We wrap it in a minimal provider tree (LanguageProvider → already loads 'es'
 * synchronously from the module cache in tests) and interact with it using
 * @testing-library/user-event.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// AIChatbot calcula la URL de configBotWeb al importarse y ya no lleva una
// dirección de Supabase por defecto: se fija aquí, antes de cualquier import.
vi.hoisted(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://proyecto-test.supabase.co");
});

// ---------------------------------------------------------------------------
// Helpers — inline re-implementation of the pure functions in AIChatbot.tsx
// so we can unit-test them without rendering the full component.
// ---------------------------------------------------------------------------

/** Mirrors extractAssistantText from AIChatbot.tsx */
function extractAssistantText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      return extractAssistantText(parsed);
    } catch {
      return trimmed;
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = extractAssistantText(item);
      if (text) return text;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidates = [
      record.mensaje,
      record.message,
      record.respuesta,
      record.reply,
      record.output,
      record.text,
      record.response,
      record.body,
      record.data,
      record.result,
    ];
    for (const candidate of candidates) {
      const text = extractAssistantText(candidate);
      if (text) return text;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Unit tests — extractAssistantText
// ---------------------------------------------------------------------------

describe("extractAssistantText (pure function)", () => {
  it("returns a plain string as-is", () => {
    expect(extractAssistantText("Hola")).toBe("Hola");
  });

  it("returns null for empty string", () => {
    expect(extractAssistantText("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(extractAssistantText("   ")).toBeNull();
  });

  it("parses a JSON-encoded string and extracts the text", () => {
    expect(extractAssistantText(JSON.stringify("Respuesta"))).toBe("Respuesta");
  });

  it("extracts 'mensaje' from an object", () => {
    expect(extractAssistantText({ mensaje: "Hola desde mensaje" })).toBe("Hola desde mensaje");
  });

  it("extracts 'message' from an object", () => {
    expect(extractAssistantText({ message: "Hello" })).toBe("Hello");
  });

  it("extracts 'respuesta' from an object", () => {
    expect(extractAssistantText({ respuesta: "Texto" })).toBe("Texto");
  });

  it("extracts the first non-null item from an array", () => {
    expect(extractAssistantText([null, { message: "Found" }])).toBe("Found");
  });

  it("returns null for an empty array", () => {
    expect(extractAssistantText([])).toBeNull();
  });

  it("deeply nested: extracts from data.message", () => {
    expect(extractAssistantText({ data: { message: "Deep reply" } })).toBe("Deep reply");
  });

  it("handles a JSON string wrapping an object with 'output'", () => {
    const raw = JSON.stringify({ output: "Salida" });
    expect(extractAssistantText(raw)).toBe("Salida");
  });

  it("returns null for number input", () => {
    expect(extractAssistantText(42)).toBeNull();
  });

  it("returns null for null input", () => {
    expect(extractAssistantText(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Helpers — minimal wrappers for rendering the component
// ---------------------------------------------------------------------------

// We need to load the 'es' language pack before mounting the component because
// LanguageProvider renders a loading screen until the pack is ready. In tests we
// pre-populate the module-level cache by importing the pack directly.
import esPackModule from "@/i18n/languages/es";

// Forcibly prime the cache that LanguageProvider uses so it renders immediately.
// The cache is module-level (`languagePackCache`) — we reach it through the loader.
// Simpler approach: just mock the dynamic import so it resolves synchronously.
vi.mock("@/i18n/languages/es", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/languages/es")>("@/i18n/languages/es");
  return actual;
});
vi.mock("@/i18n/languages/en", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/languages/en")>("@/i18n/languages/en");
  return actual;
});
vi.mock("@/i18n/languages/fr", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/languages/fr")>("@/i18n/languages/fr");
  return actual;
});

// mapbox-gl cannot run in jsdom — mock the whole module.
vi.mock("mapbox-gl", () => ({
  default: {
    Map: vi.fn(),
    Marker: vi.fn(),
    NavigationControl: vi.fn(),
    accessToken: "",
  },
}));

import { LanguageProvider } from "@/i18n/LanguageProvider";
import AIChatbot from "@/components/AIChatbot";

import { CHAT_WEB_URL } from "@/lib/supabase-functions";

// El chatbot ya no habla con n8n: habla con la Edge Function `chat-web`. Las
// dos llamadas que hace el componente viven bajo el MISMO host de Supabase, asi
// que no se pueden distinguir por "supabase" en la URL como antes.
/** Llamada al chatbot (Edge Function). */
const esLlamadaChat = (url: unknown) => String(url).includes("/functions/v1/chat-web");
/** Llamada a la configuracion del bot (PostgREST). */
const esLlamadaConfig = (url: unknown) => String(url).includes("configBotWeb");

/** Respuesta de `chat-web`: `{ success, respuesta }`, opcionalmente con `codigo`. */
const respuestaChat = (respuesta: string, status = 200, codigo?: string) =>
  new Response(JSON.stringify({ success: status === 200, respuesta, ...(codigo ? { codigo } : {}) }), {
    status,
  });

/**
 * Enruta el `fetch` por path en vez de por orden de llamada.
 *
 * Importa: al abrirse, el componente pide la configuracion DOS veces (primero
 * filtrando por idioma y, si no hay fila, sin filtro). Encadenar
 * `mockResolvedValueOnce` hace que la segunda consulta se coma la respuesta
 * pensada para el chat y el test acabe probando el camino de error sin querer.
 */
function mockPorRuta(respuestaDelChat: () => Response | Promise<Response>) {
  vi.mocked(fetch).mockImplementation((url) => {
    if (esLlamadaConfig(url)) {
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    }
    return Promise.resolve(respuestaDelChat());
  });
}

function renderChatbot(props: { isOpen: boolean; onClose?: () => void; initialInput?: string }) {
  const onClose = props.onClose ?? vi.fn();
  const { rerender } = render(
    <MemoryRouter>
      <LanguageProvider>
        <AIChatbot
          isOpen={props.isOpen}
          onClose={onClose}
          initialGreeting="Hola test"
          initialInput={props.initialInput}
        />
      </LanguageProvider>
    </MemoryRouter>
  );
  return { onClose, rerender };
}

// ---------------------------------------------------------------------------
// Helper: type a message and click the Send button
// ---------------------------------------------------------------------------

async function sendChatMessage(text: string) {
  const input = screen.getByPlaceholderText(/escribe un mensaje/i);
  await act(async () => {
    fireEvent.change(input, { target: { value: text } });
  });
  // The Send button is the last button in the chat footer (icon-only, no aria-label)
  // We find it by querying all buttons and picking the icon button that is enabled.
  const allButtons = screen.getAllByRole("button");
  const sendBtn = allButtons[allButtons.length - 1];
  await act(async () => {
    fireEvent.click(sendBtn);
  });
}

// ---------------------------------------------------------------------------
// Component tests — AIChatbot
// ---------------------------------------------------------------------------

describe("AIChatbot component", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the chat header when isOpen is true", async () => {
    // Supabase config fetch returns empty → falls back to initialGreeting
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 })
    );

    renderChatbot({ isOpen: true });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /casa tomás ai/i })).toBeInTheDocument();
    });
  });

  it("does not render the chat panel when isOpen is false", () => {
    renderChatbot({ isOpen: false });
    expect(screen.queryByRole("heading", { name: /casa tomás ai/i })).toBeNull();
  });

  it("shows the initial greeting message when the config fetch returns empty", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 })
    );

    renderChatbot({ isOpen: true });

    await waitFor(() => {
      expect(screen.getByText("Hola test")).toBeInTheDocument();
    });
  });

  it("uses the welcome message from Supabase config when available", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify([{ mensaje_bienvenida: "Bienvenido desde config" }]),
        { status: 200 }
      )
    );

    renderChatbot({ isOpen: true });

    await waitFor(() => {
      expect(screen.getByText("Bienvenido desde config")).toBeInTheDocument();
    });
  });

  it("falls back to initialGreeting when Supabase config request fails", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    renderChatbot({ isOpen: true });

    await waitFor(() => {
      expect(screen.getByText("Hola test")).toBeInTheDocument();
    });
  });

  it("sends a user message, shows it in chat, and clears the input", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Respuesta del bot" }), { status: 200 }));

    renderChatbot({ isOpen: true });
    await waitFor(() => expect(screen.getByText("Hola test")).toBeInTheDocument());

    await sendChatMessage("Teneis menu");

    await waitFor(() => {
      expect(screen.getByText("Teneis menu")).toBeInTheDocument();
    });

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/escribe un mensaje/i);
      expect((input as HTMLInputElement).value).toBe("");
    });
  });

  it("displays the assistant reply after a successful webhook call", async () => {
    // Mock por ruta: config y chatbot comparten host, solo cambia el path.
    vi.mocked(fetch).mockImplementation((url) => {
      if (esLlamadaConfig(url)) {
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      }
      return Promise.resolve(respuestaChat("El menu cuesta 15 euros"));
    });

    renderChatbot({ isOpen: true });
    await waitFor(() => screen.getByText("Hola test"));

    await sendChatMessage("Precio menu");

    await waitFor(() => {
      expect(screen.getByText("El menu cuesta 15 euros")).toBeInTheDocument();
    });
  });

  it("shows the error reply when the webhook returns a non-OK status", async () => {
    // Un 500 con `text/plain` de la pasarela NO es un mensaje para el visitante:
    // se descarta y se usa el texto propio del componente.
    mockPorRuta(() => new Response("Server error", { status: 500 }));

    renderChatbot({ isOpen: true });
    await waitFor(() => screen.getByText("Hola test"));

    await sendChatMessage("Mensaje cualquiera");

    await waitFor(() => {
      expect(
        screen.getByText(/ahora mismo no puedo responder/i)
      ).toBeInTheDocument();
    });
  });

  it("NUNCA ensena un 404 de la pasarela de Supabase (clave `message` en ingles) al visitante", async () => {
    // Reproduce el cuerpo real que devuelve Supabase cuando `chat-web` no
    // esta desplegada: JSON con `message` en ingles y SIN `respuesta`,
    // `mensaje` ni `codigo` conocido. Antes de la correccion, extractAssistantText
    // aceptaba la clave generica `message` y el bot repetia ese texto tal cual.
    mockPorRuta(
      () =>
        new Response(
          JSON.stringify({ code: "NOT_FOUND", message: "Requested function was not found" }),
          { status: 404 }
        )
    );

    renderChatbot({ isOpen: true });
    await waitFor(() => screen.getByText("Hola test"));

    await sendChatMessage("Mensaje cualquiera");

    await waitFor(() => {
      expect(
        screen.getByText(/ahora mismo no puedo responder/i)
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/requested function was not found/i)).toBeNull();
  });

  it("tampoco ensena un `message` en ingles cuando el 404 SI trae un `codigo` conocido pero sin respuesta/mensaje", async () => {
    // Defensa en profundidad: un `codigo` valido por si solo no basta si no
    // viene acompanado del texto propio en `respuesta`/`mensaje`.
    mockPorRuta(
      () =>
        new Response(
          JSON.stringify({ codigo: "rate_limited", message: "Too Many Requests" }),
          { status: 404 }
        )
    );

    renderChatbot({ isOpen: true });
    await waitFor(() => screen.getByText("Hola test"));

    await sendChatMessage("Mensaje cualquiera");

    await waitFor(() => {
      expect(
        screen.getByText(/ahora mismo no puedo responder/i)
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/too many requests/i)).toBeNull();
  });

  it("shows the error reply when the webhook call throws a network error", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockRejectedValueOnce(new Error("fetch failed"));

    renderChatbot({ isOpen: true });
    await waitFor(() => screen.getByText("Hola test"));

    await sendChatMessage("Otro mensaje");

    await waitFor(() => {
      expect(
        screen.getByText(/ahora mismo no puedo responder/i)
      ).toBeInTheDocument();
    });
  });

  it("the send button is disabled when the input is empty", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 })
    );

    renderChatbot({ isOpen: true });
    await waitFor(() => screen.getByText("Hola test"));

    // The Send button has no accessible name, so we find it by its role + disabled state
    const buttons = screen.getAllByRole("button");
    const sendButton = buttons.find(
      (btn) => (btn as HTMLButtonElement).disabled && btn.tagName === "BUTTON"
    );
    expect(sendButton).toBeDefined();
  });

  it("calls onClose when the Escape key is pressed", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 })
    );

    const onClose = vi.fn();
    renderChatbot({ isOpen: true, onClose });

    await waitFor(() => screen.getByText("Hola test"));

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("es un diálogo modal con nombre y el foco entra en el campo de mensaje al abrir", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    renderChatbot({ isOpen: true });
    await waitFor(() => screen.getByText("Hola test"));

    const dialogo = screen.getByRole("dialog", { name: "Casa Tomás AI" });
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByPlaceholderText("Escribe un mensaje...")));
  });

  it("al cerrarlo el foco vuelve al botón que lo abrió", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    const lanzador = document.createElement("button");
    lanzador.textContent = "Abrir chat";
    document.body.appendChild(lanzador);
    lanzador.focus();

    const { rerender, onClose } = renderChatbot({ isOpen: true });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByPlaceholderText("Escribe un mensaje...")));

    rerender(
      <MemoryRouter>
        <LanguageProvider>
          <AIChatbot isOpen={false} onClose={onClose} initialGreeting="Hola test" />
        </LanguageProvider>
      </MemoryRouter>
    );
    expect(document.activeElement).toBe(lanzador);
    lanzador.remove();
  });

  it("Esc marca el evento (preventDefault) para que el menú y el aviso de cookies no se cierren a la vez", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    const onClose = vi.fn();
    renderChatbot({ isOpen: true, onClose });
    await waitFor(() => screen.getByText("Hola test"));

    const evento = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    await act(async () => { document.body.dispatchEvent(evento); });

    expect(onClose).toHaveBeenCalledOnce();
    expect(evento.defaultPrevented).toBe(true);
  });

  it("calls onClose when the close button is clicked", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 })
    );

    const user = userEvent.setup();
    const onClose = vi.fn();
    renderChatbot({ isOpen: true, onClose });

    await waitFor(() => screen.getByText("Hola test"));

    const closeButton = screen.getByRole("button", { name: /cerrar chatbot/i });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("manda el mensaje a chat-web como JSON, con id e idioma", async () => {
    mockPorRuta(() => respuestaChat("ok"));

    renderChatbot({ isOpen: true });
    await waitFor(() => screen.getByText("Hola test"));

    await sendChatMessage("Hola bot");

    await waitFor(() => {
      const llamada = vi.mocked(fetch).mock.calls.find(([url]) => esLlamadaChat(url));
      expect(llamada).toBeDefined();
      expect(String(llamada![0])).toBe(CHAT_WEB_URL);

      const cuerpo = JSON.parse(llamada![1]?.body as string);
      expect(cuerpo.mensaje).toBe("Hola bot");
      expect(cuerpo.idiom).toBe("es");
      expect(typeof cuerpo.id).toBe("string");
      expect(cuerpo.id.length).toBeGreaterThan(0);
    });
  });

  it("no manda la cabecera X-Webhook-Secret (rompia el preflight CORS de chat-web)", async () => {
    mockPorRuta(() => respuestaChat("ok"));

    renderChatbot({ isOpen: true });
    await waitFor(() => screen.getByText("Hola test"));

    await sendChatMessage("Hola bot");

    await waitFor(() => {
      const llamada = vi.mocked(fetch).mock.calls.find(([url]) => esLlamadaChat(url));
      expect(llamada).toBeDefined();

      const cabeceras = (llamada![1]?.headers ?? {}) as Record<string, string>;
      const nombres = Object.keys(cabeceras).map((nombre) => nombre.toLowerCase());
      expect(nombres).not.toContain("x-webhook-secret");
      expect(cabeceras["Content-Type"]).toBe("application/json");
    });
  });

  it("guarda el sessionToken firmado que devuelve chat-web y lo manda como id la siguiente vez", async () => {
    // El id de sesion sin firmar dejaba leer la conversacion de otro
    // pasando su id (index.ts:757). Ahora chat-web es quien decide el id
    // real y lo firma; el frontend solo debe guardar y reenviar ese token.
    let numeroLlamadaChat = 0;
    vi.mocked(fetch).mockImplementation((url) => {
      if (esLlamadaConfig(url)) {
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      }
      numeroLlamadaChat += 1;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            respuesta: `Respuesta ${numeroLlamadaChat}`,
            sessionToken: "id-emitido-por-el-servidor.firmaDeEjemplo",
          }),
          { status: 200 }
        )
      );
    });

    renderChatbot({ isOpen: true });
    await waitFor(() => screen.getByText("Hola test"));

    await sendChatMessage("Primer mensaje");
    await waitFor(() => screen.getByText("Respuesta 1"));

    await sendChatMessage("Segundo mensaje");
    await waitFor(() => screen.getByText("Respuesta 2"));

    const llamadasChat = vi.mocked(fetch).mock.calls.filter(([url]) => esLlamadaChat(url));
    expect(llamadasChat).toHaveLength(2);

    const cuerpoPrimeraLlamada = JSON.parse(llamadasChat[0][1]?.body as string);
    const cuerpoSegundaLlamada = JSON.parse(llamadasChat[1][1]?.body as string);

    // El primer mensaje todavia manda el id "de arranque" generado en el
    // cliente (distinto del token que emite el servidor)...
    expect(cuerpoPrimeraLlamada.id).not.toBe("id-emitido-por-el-servidor.firmaDeEjemplo");
    // ...y a partir de ahi, SIEMPRE el token firmado que devolvio chat-web.
    expect(cuerpoSegundaLlamada.id).toBe("id-emitido-por-el-servidor.firmaDeEjemplo");
  });

  it("ensena el mensaje del servidor cuando chat-web responde 429 rate_limited", async () => {
    mockPorRuta(() => respuestaChat("Vas muy rapido, dame un segundo.", 429, "rate_limited"));

    renderChatbot({ isOpen: true });
    await waitFor(() => screen.getByText("Hola test"));

    await sendChatMessage("Hola hola hola");

    await waitFor(() => {
      expect(screen.getByText("Vas muy rapido, dame un segundo.")).toBeInTheDocument();
    });
    expect(screen.queryByText(/ahora mismo no puedo responder/i)).toBeNull();
  });

  it("ensena el mensaje del servidor cuando chat-web responde 503 rate_limit_unavailable", async () => {
    mockPorRuta(() =>
      respuestaChat("Ahora mismo no puedo atenderte, prueba en un momento.", 503, "rate_limit_unavailable")
    );

    renderChatbot({ isOpen: true });
    await waitFor(() => screen.getByText("Hola test"));

    await sendChatMessage("Otra consulta");

    await waitFor(() => {
      expect(
        screen.getByText("Ahora mismo no puedo atenderte, prueba en un momento.")
      ).toBeInTheDocument();
    });
  });

  it("limita el campo de texto a los 500 caracteres que acepta chat-web", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 })
    );

    renderChatbot({ isOpen: true });
    await waitFor(() => screen.getByText("Hola test"));

    const input = screen.getByPlaceholderText(/escribe un mensaje/i) as HTMLInputElement;
    expect(input.maxLength).toBe(500);
  });

  it("recorta el initialInput a 500 caracteres y enseña el contador cerca del límite", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 })
    );

    renderChatbot({ isOpen: true, initialInput: "a".repeat(700) });
    await waitFor(() => screen.getByText("Hola test"));

    const input = screen.getByPlaceholderText(/escribe un mensaje/i) as HTMLInputElement;
    await waitFor(() => expect(input.value).toHaveLength(500));
    expect(screen.getByText("500/500")).toBeInTheDocument();
  });

  it("solo enseña el contador cuando se pasan los 400 caracteres", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 })
    );

    renderChatbot({ isOpen: true });
    await waitFor(() => screen.getByText("Hola test"));

    // Se vuelve a buscar el campo en cada paso: el panel puede remontarlo al cargar el saludo.
    const escribir = async (valor: string) => {
      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText(/escribe un mensaje/i), { target: { value: valor } });
      });
    };
    await escribir("b".repeat(400));
    expect(screen.queryByText("400/500")).not.toBeInTheDocument();
    await escribir("b".repeat(432));
    expect(await screen.findByText("432/500")).toBeInTheDocument();
  });
});
