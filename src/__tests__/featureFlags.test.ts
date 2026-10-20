import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { esFlagActivo, leerQaChatbot } from "@/lib/featureFlags";

describe("esFlagActivo", () => {
  it("solo el string exacto 'true' activa el flag", () => {
    expect(esFlagActivo("true")).toBe(true);
    for (const valor of [undefined, "", "false", "TRUE", "1", "yes", " true", true]) {
      expect(esFlagActivo(valor)).toBe(false);
    }
  });
});

describe("leerQaChatbot", () => {
  it("interpreta ?tomy=1 / ?tomy=0 y devuelve null si no aparece", () => {
    expect(leerQaChatbot("?tomy=1")).toBe(true);
    expect(leerQaChatbot("?lang=en&tomy=1")).toBe(true);
    expect(leerQaChatbot("?tomy=0")).toBe(false);
    expect(leerQaChatbot("?tomy=si")).toBeNull();
    expect(leerQaChatbot("")).toBeNull();
  });
});

describe("CHATBOT_PUBLICO", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("se activa con VITE_CHATBOT_PUBLICO='true'", async () => {
    vi.stubEnv("VITE_CHATBOT_PUBLICO", "true");
    vi.resetModules();
    const { CHATBOT_PUBLICO } = await import("@/lib/featureFlags");
    expect(CHATBOT_PUBLICO).toBe(true);
  });

  it("queda apagado con cualquier otro valor", async () => {
    vi.stubEnv("VITE_CHATBOT_PUBLICO", "1");
    vi.resetModules();
    const { CHATBOT_PUBLICO } = await import("@/lib/featureFlags");
    expect(CHATBOT_PUBLICO).toBe(false);
  });
});

describe("useChatbotVisible (flag apagado)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  const cargarHook = async () => {
    vi.stubEnv("VITE_CHATBOT_PUBLICO", "");
    vi.resetModules();
    return (await import("@/hooks/useChatbotVisible")).useChatbotVisible;
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("oculta el chatbot sin la puerta de QA", async () => {
    const useChatbotVisible = await cargarHook();
    const { result } = renderHook(() => useChatbotVisible());
    expect(result.current).toBe(false);
  });

  it("?tomy=1 lo muestra y se recuerda en la sesión; ?tomy=0 lo olvida", async () => {
    const useChatbotVisible = await cargarHook();

    window.history.replaceState(null, "", "/carta?tomy=1");
    const primero = renderHook(() => useChatbotVisible());
    await waitFor(() => expect(primero.result.current).toBe(true));

    window.history.replaceState(null, "", "/carta/entrantes");
    const segundo = renderHook(() => useChatbotVisible());
    await waitFor(() => expect(segundo.result.current).toBe(true));

    window.history.replaceState(null, "", "/?tomy=0");
    const tercero = renderHook(() => useChatbotVisible());
    await waitFor(() => expect(tercero.result.current).toBe(false));

    window.history.replaceState(null, "", "/");
    const cuarto = renderHook(() => useChatbotVisible());
    expect(cuarto.result.current).toBe(false);
  });
});
