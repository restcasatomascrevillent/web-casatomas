import { afterEach, describe, expect, it, vi } from "vitest";
import { idleImport } from "@/lib/lazyIdle";

describe("idleImport", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Object.defineProperty(document, "readyState", { value: "complete", configurable: true });
  });

  it("sin window (SSG), resuelve al momento", async () => {
    const original = globalThis.window;
    // @ts-expect-error — simula el prerenderizado en Node.
    delete globalThis.window;
    try {
      const cargar = vi.fn().mockResolvedValue("modulo");
      await expect(idleImport(cargar)()).resolves.toBe("modulo");
      expect(cargar).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.window = original;
    }
  });

  it("con requestIdleCallback, lo usa", async () => {
    const ric = vi.fn((cb: IdleRequestCallback) => {
      cb({ didTimeout: false, timeRemaining: () => 50 });
      return 1;
    });
    vi.stubGlobal("requestIdleCallback", ric);

    const cargar = vi.fn().mockResolvedValue("modulo");
    await expect(idleImport(cargar)()).resolves.toBe("modulo");
    expect(ric).toHaveBeenCalledTimes(1);
  });

  it("sin requestIdleCallback y la página ya cargada, no espera a `load`", async () => {
    Object.defineProperty(document, "readyState", { value: "complete", configurable: true });
    const cargar = vi.fn().mockResolvedValue("modulo");
    await expect(idleImport(cargar)()).resolves.toBe("modulo");
  });

  it("sin requestIdleCallback y la página aún cargando, espera al evento `load` (el bug: antes disparaba a los 200ms sin más, compitiendo con el hero)", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });
    const cargar = vi.fn().mockResolvedValue("modulo");

    let resuelto = false;
    const promesa = idleImport(cargar)().then((valor) => {
      resuelto = true;
      return valor;
    });

    // Antes de `load`, el loader no se ha llamado todavía.
    await new Promise((r) => setTimeout(r, 10));
    expect(cargar).not.toHaveBeenCalled();
    expect(resuelto).toBe(false);

    window.dispatchEvent(new Event("load"));
    await expect(promesa).resolves.toBe("modulo");
    expect(cargar).toHaveBeenCalledTimes(1);
  });
  it("hydrates after the deadline even if a slow resource never fires load", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });
    const cargar = vi.fn().mockResolvedValue("ready");
    const pending = idleImport(cargar, 100)();
    await vi.advanceTimersByTimeAsync(100);
    await expect(pending).resolves.toBe("ready");
    window.dispatchEvent(new Event("load"));
    await vi.runAllTimersAsync();
    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it("cancels the deadline after load so the section is imported only once", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });
    const cargar = vi.fn().mockResolvedValue("ready");
    const pending = idleImport(cargar, 100)();
    window.dispatchEvent(new Event("load"));
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toBe("ready");
    expect(cargar).toHaveBeenCalledTimes(1);
  });

});

