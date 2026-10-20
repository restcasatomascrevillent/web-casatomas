// Días sin reservas del calendario de la web (2026-10-13).
import { describe, it, expect, vi, afterEach } from "vitest";
import { diasCerradosEnteros, diasCerradosPorDefecto, leerDiasCerrados } from "@/lib/cierres-reserva";

afterEach(() => vi.unstubAllGlobals());

describe("cierres de reservas en la web", () => {
  it("por defecto: lunes y jueves cerrados enteros; el domingo (solo sin cena) se puede elegir", () => {
    const dias = diasCerradosPorDefecto(new Date(2026, 9, 12), 6); // lunes 12 -> domingo 18
    expect([...dias]).toEqual(["2026-10-12", "2026-10-15"]);
  });
  it("de la ruta: solo las fechas con los dos servicios cerrados", () => {
    const dias = diasCerradosEnteros([
      { fecha: "2026-10-15", turno: "comida" },
      { fecha: "2026-10-15", turno: "cena" },
      { fecha: "2026-10-18", turno: "cena" },
    ]);
    expect([...dias]).toEqual(["2026-10-15"]);
  });
  it("usa la respuesta de reservas-web/cierres (un jueves abierto a mano no sale)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, cierres: [] }) }));
    expect((await leerDiasCerrados(new Date(2026, 9, 12), 6)).size).toBe(0);
  });
  it("si la ruta falla, cae a la regla por defecto", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
    expect([...(await leerDiasCerrados(new Date(2026, 9, 12), 6))]).toEqual(["2026-10-12", "2026-10-15"]);
  });
});
