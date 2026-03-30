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

const WEBHOOK_URL = "https://n8npersonal.miguelbenito.space/webhook/chatbotweb";
const SUPABASE_CONFIG_URL = "https://jeamoczmbfsnwkfjxcyo.supabase.co/rest/v1/configBotWeb";

function renderChatbot(props: { isOpen: boolean; onClose?: () => void }) {
  const onClose = props.onClose ?? vi.fn();
  const { rerender } = render(
    <MemoryRouter>
      <LanguageProvider>
        <AIChatbot isOpen={props.isOpen} onClose={onClose} initialGreeting="Hola test" />
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
    // Use a URL-based mock so Supabase config and chatbot webhook get their own responses
    vi.mocked(fetch).mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.includes("supabase") || urlStr.includes("configBotWeb")) {
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      }
      return Promise.resolve(
        new Response(JSON.stringify({ message: "El menu cuesta 15 euros" }), { status: 200 })
      );
    });

    renderChatbot({ isOpen: true });
    await waitFor(() => screen.getByText("Hola test"));

    await sendChatMessage("Precio menu");

    await waitFor(() => {
      expect(screen.getByText("El menu cuesta 15 euros")).toBeInTheDocument();
    });
  });

  it("shows the error reply when the webhook returns a non-OK status", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response("Server error", { status: 500 }));

    renderChatbot({ isOpen: true });
    await waitFor(() => screen.getByText("Hola test"));

    await sendChatMessage("Mensaje cualquiera");

    await waitFor(() => {
      expect(
        screen.getByText(/ahora mismo no puedo responder/i)
      ).toBeInTheDocument();
    });
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

  it("includes the session_id in the webhook request body", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "ok" }), { status: 200 }));

    renderChatbot({ isOpen: true });
    await waitFor(() => screen.getByText("Hola test"));

    await sendChatMessage("Hola bot");

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      const webhookCall = calls.find(([url]) =>
        typeof url === "string" && url.includes("chatbotweb")
      );
      expect(webhookCall).toBeDefined();
      const body = webhookCall![1]?.body as string;
      expect(body).toMatch(/id=/);
    });
  });
});
