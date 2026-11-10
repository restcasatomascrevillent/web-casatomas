import { describe, expect, it, vi } from "vitest";
import { esErrorDeVersionAntigua, instalarRecargaPorVersion, recargarUnaVez } from "@/lib/recarga-por-version";

const almacen = () => {
  const datos = new Map<string, string>();
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
};

describe("recarga por versión antigua", () => {
  it("reconoce los fallos de import() y de precarga de CSS de los tres navegadores", () => {
    expect(esErrorDeVersionAntigua(new TypeError("Failed to fetch dynamically imported module: https://x/assets/a-1.js"))).toBe(true);
    expect(esErrorDeVersionAntigua(new Error("Unable to preload CSS for /assets/EspaciosGallery-CmTTVDlw.css"))).toBe(true);
    expect(esErrorDeVersionAntigua(new TypeError("Importing a module script failed."))).toBe(true);
    expect(esErrorDeVersionAntigua(new TypeError("error loading dynamically imported module"))).toBe(true);
    expect(esErrorDeVersionAntigua(new Error("Cannot read properties of undefined"))).toBe(false);
  });

  it("recarga una sola vez por versión, y otra vez con una versión nueva", () => {
    const storage = almacen();
    const recargar = vi.fn();
    expect(recargarUnaVez({ storage, recargar, version: "abc123" })).toBe(true);
    expect(recargarUnaVez({ storage, recargar, version: "abc123" })).toBe(false);
    expect(recargar).toHaveBeenCalledTimes(1);
    expect(recargarUnaVez({ storage, recargar, version: "def456" })).toBe(true);
    expect(recargar).toHaveBeenCalledTimes(2);
  });

  it("sin almacenamiento disponible recarga igual", () => {
    const recargar = vi.fn();
    const storage = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => undefined };
    expect(recargarUnaVez({ storage, recargar, version: "abc" })).toBe(true);
    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it("escucha vite:preloadError y recarga al recibirlo", () => {
    const objetivo = new EventTarget();
    const recargar = vi.fn();
    const storage = almacen();
    instalarRecargaPorVersion(objetivo as unknown as Window, () => ({ storage, recargar, version: "v1" }));
    objetivo.dispatchEvent(new Event("vite:preloadError"));
    objetivo.dispatchEvent(new Event("vite:preloadError"));
    expect(recargar).toHaveBeenCalledTimes(1);
  });
});
