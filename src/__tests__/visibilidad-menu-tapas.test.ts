import { afterEach, describe, expect, it, vi } from "vitest";
import { consultarVisibilidadMenuTapas } from "@/hooks/useVisibilidadMenuTapas";
import { HORARIO_POR_DEFECTO } from "@/lib/horario-web";
import { leerVisibilidadMenuTapas } from "../../scripts/carta-ssg.mjs";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("Configuración pública del menú y las tapas", () => {
  it("respeta en el navegador los dos valores guardados", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://x.test"); vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ mostrar_menu_dia_casa_tomas: false, mostrar_tapas_casa_tomas: true }] }));
    expect(await consultarVisibilidadMenuTapas()).toEqual({
      menu: false, tapas: true, horarioMenu: HORARIO_POR_DEFECTO.menu, horarioTapas: HORARIO_POR_DEFECTO.tapas,
    });
  });
  it("lee en el navegador los días y las horas guardados (04/11/2026)", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://x.test"); vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{
      mostrar_menu_dia_casa_tomas: true, mostrar_tapas_casa_tomas: true,
      horario_menu_dia_casa_tomas: { dias: [1, 2], desde: "13:00", hasta: "16:00" }, horario_tapas_casa_tomas: null,
    }] }));
    expect(await consultarVisibilidadMenuTapas()).toMatchObject({
      horarioMenu: { dias: [1, 2], desde: "13:00", hasta: "16:00" }, horarioTapas: HORARIO_POR_DEFECTO.tapas,
    });
  });
  it("el build respeta los mismos valores", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ mostrar_menu_dia_casa_tomas: true, mostrar_tapas_casa_tomas: false, horario_tapas_casa_tomas: { dias: [5], desde: null, hasta: null } }] }));
    expect(await leerVisibilidadMenuTapas("https://x.test", "key")).toEqual({
      mostrarMenuDelDia: true, mostrarTapas: false, horarioMenuDelDia: null, horarioTapas: { dias: [5], desde: null, hasta: null },
    });
  });
  it("mantiene el comportamiento anterior si aún no existen las columnas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: true }] }));
    expect(await leerVisibilidadMenuTapas("https://x.test", "key")).toEqual({ mostrarMenuDelDia: true, mostrarTapas: true, horarioMenuDelDia: null, horarioTapas: null });
  });
});
