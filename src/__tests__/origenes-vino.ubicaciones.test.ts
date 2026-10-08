import { afterEach, describe, expect, it, vi } from "vitest";
import { claveOrigen, coordenadasConocidas, localizarOrigen, nombreOrigen } from "@/lib/origenes-vino";

afterEach(() => vi.unstubAllGlobals());
const signal = () => new AbortController().signal;
const espana = (denominacion_origen: string, ubicacion_region = "Castilla y León") => ({ ubicacion_pais: "España", ubicacion_region, denominacion_origen });

describe("ubicación de vinos", () => {
  it("separa Ribera, Rueda y Toro aunque compartan comunidad autónoma", () => {
    const vinos = ["D.O. Ribera del Duero", "D.O. Rueda", "D.O. Toro"].map(d => espana(d));
    expect(new Set(vinos.map(claveOrigen)).size).toBe(3);
    expect(vinos.map(nombreOrigen)).toEqual(["Ribera del Duero", "Rueda", "Toro"]);
    expect(new Set(vinos.map(v => JSON.stringify(coordenadasConocidas(v)))).size).toBe(3);
  });
  it("unifica variantes de la misma D.O. sin duplicar chinchetas", () => {
    expect(claveOrigen(espana("D.O. Ribera del Duero"))).toBe(claveOrigen(espana("D.O. Ribera del Duero (estimado)", "Castilla y León (Ribera del Duero)")));
  });
  it("no sitúa todo el cava en Cataluña y respeta Alella y Penedès", () => {
    expect(coordenadasConocidas(espana("D.O. Cava", ""))).toBeNull();
    expect(nombreOrigen(espana("D.O. Cava", "Cataluña (Maresme, Barcelona)"))).toBe("Alella");
    expect(nombreOrigen(espana("D.O. Cava", "Cataluña (Penedès, Barcelona)"))).toBe("Penedès");
  });
  it("conserva Rioja Alavesa y resuelve el paréntesis erróneo de La Rioja por D.O.", () => {
    expect(nombreOrigen(espana("D.O.Ca. Rioja", "La Rioja/Álava (Rioja Alavesa)"))).toBe("Rioja Alavesa");
    expect(nombreOrigen(espana("D.O.Ca. Rioja", "La Rioja)"))).toBe("La Rioja");
  });
  it("sitúa Mosela en Alemania y Tokaj en Hungría", () => {
    expect(coordenadasConocidas({ ubicacion_pais: "Alemania", ubicacion_region: "Mosela" })).toEqual([7.06, 49.95]);
    expect(coordenadasConocidas({ ubicacion_pais: "Hungría", ubicacion_region: "Tokaj" })).toEqual([21.4, 48.2]);
    expect(coordenadasConocidas({ ubicacion_pais: "Francia", ubicacion_region: "Mosela" })).toBeNull();
  });
  it("no geocodifica datos pendientes o estimaciones", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    for (const vino of [
      { ubicacion_pais: "Por confirmar", ubicacion_region: "Por confirmar" },
      { ubicacion_pais: "Francia", ubicacion_region: "Borgoña (estimado)" },
      { ubicacion_pais: "España" },
    ]) expect(await localizarOrigen(vino, "token", signal())).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    ["MA", "place", "Nueva zona", [0, 25]],
    ["ES", "country", "Nueva zona", [-4, 40]],
    ["ES", "place", "Otro lugar", [-4, 40]],
    ["ES", "place", "Nueva zona", [0, 95]],
  ])("rechaza coincidencias con país, tipo, nombre o coordenadas incorrectas: %s/%s/%s", async (country, type, name, coordinates) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [{ geometry: { coordinates }, properties: { name, feature_type: type, context: { country: { country_code: country } } } }] }) }));
    expect(await localizarOrigen(espana("", "Nueva zona"), "token", signal())).toBeNull();
  });
  it("acepta un topónimo exacto del país solicitado y pasa la cancelación", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [{ geometry: { coordinates: [-4, 40] }, properties: { name: "Nueva zona", feature_type: "place", context: { country: { country_code: "ES" } } } }] }) });
    vi.stubGlobal("fetch", fetch);
    const abort = signal();
    expect(await localizarOrigen(espana("", "Nueva zona"), "token", abort)).toEqual([-4, 40]);
    expect(new URL(fetch.mock.calls[0][0]).searchParams.get("country")).toBe("es");
    expect(fetch.mock.calls[0][1].signal).toBe(abort);
  });
});
