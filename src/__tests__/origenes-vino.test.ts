import { afterEach, describe, expect, it, vi } from "vitest";
import { claveOrigen, coordenadasConocidas, localizarOrigen } from "@/lib/origenes-vino";

afterEach(() => vi.unstubAllGlobals());

describe("Orígenes de vinos nuevos", () => {
  it("reconoce regiones existentes con espacios, mayúsculas y acentos distintos", () => {
    expect(coordenadasConocidas({ ubicacion_region: "  LA RIOJA  ", ubicacion_pais: "España" })).toEqual([-2.5, 42.3]);
    expect(coordenadasConocidas({ ubicacion_region: "Cataluna (Penedes)", ubicacion_pais: "España" })).toEqual([1.5, 41.3]);
  });
  it("separa regiones del mismo nombre en países diferentes", () => {
    expect(claveOrigen({ ubicacion_region: "La Rioja", ubicacion_pais: "España" })).not.toBe(claveOrigen({ ubicacion_region: "La Rioja", ubicacion_pais: "Argentina" }));
    expect(coordenadasConocidas({ ubicacion_region: "La Rioja", ubicacion_pais: "Argentina" })).toBeNull();
  });
  it("busca una región nueva sin necesitar cambios en la lista fija", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [{ geometry: { coordinates: [-8.2, 42.1] } }] }) });
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;
    expect(await localizarOrigen({ ubicacion_region: "Nueva región", ubicacion_pais: "España" }, "token", signal)).toEqual([-8.2, 42.1]);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("q")).toBe("Nueva región, España");
    expect(url.searchParams.get("country")).toBe("es");
    expect(fetchMock.mock.calls[0][1].signal).toBe(signal);
  });
  it("no inventa coordenadas cuando el origen no se puede localizar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [] }) }));
    expect(await localizarOrigen({ ubicacion_region: "Desconocida" }, "token", new AbortController().signal)).toBeNull();
  });
});
