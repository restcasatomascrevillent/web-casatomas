import { afterEach, describe, expect, it, vi } from "vitest";
import { consultarVisibilidadMenuTapas } from "@/hooks/useVisibilidadMenuTapas";
import { leerVisibilidadMenuTapas } from "../../scripts/carta-ssg.mjs";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("Configuración pública del menú y las tapas", () => {
  it("respeta en el navegador los dos valores guardados", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://x.test"); vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ mostrar_menu_dia_casa_tomas: false, mostrar_tapas_casa_tomas: true }] }));
    expect(await consultarVisibilidadMenuTapas()).toEqual({ menu: false, tapas: true });
  });
  it("el build respeta los mismos valores", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ mostrar_menu_dia_casa_tomas: true, mostrar_tapas_casa_tomas: false }] }));
    expect(await leerVisibilidadMenuTapas("https://x.test", "key")).toEqual({ mostrarMenuDelDia: true, mostrarTapas: false });
  });
  it("mantiene el comportamiento anterior si aún no existen las columnas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: true }] }));
    expect(await leerVisibilidadMenuTapas("https://x.test", "key")).toEqual({ mostrarMenuDelDia: true, mostrarTapas: true });
  });
});
