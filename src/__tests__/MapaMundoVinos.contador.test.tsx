/**
 * Contador de cargas del mapa de vinos: Mapbox cobra por cada mapa que se
 * dibuja y no tiene API para saber cuántos van, así que la web suma una carga
 * en la base de datos cada vez que crea el mapa (el panel lo lee en Servicios ›
 * Mapbox). Antes no se contaba nada y el panel enseñaba siempre 0.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageProvider";

const contar = vi.hoisted(() => vi.fn());
const Mapa = vi.hoisted(() => vi.fn());

vi.mock("mapbox-gl", () => ({
  default: {
    Map: Mapa.mockImplementation(() => ({ on: vi.fn(), addControl: vi.fn(), remove: vi.fn(), flyTo: vi.fn(), scrollZoom: { disable: vi.fn() }, resize: vi.fn() })),
    Marker: vi.fn(),
    NavigationControl: vi.fn(),
    accessToken: "",
  },
}));
vi.mock("@/lib/supabase-functions", async (original) => ({ ...(await original<typeof import("@/lib/supabase-functions")>()), contarCargaMapaVinos: contar }));

import MapaMundoVinos from "@/components/carta/MapaMundoVinos";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("contador de cargas del mapa de vinos", () => {
  it("suma una carga por cada mapa que se crea, no por cada repintado", () => {
    const vista = (vinos: Array<{ nombre: string; precio_eur: number }>) => (
      <MemoryRouter>
        <LanguageProvider>
          <MapaMundoVinos vinos={vinos} />
        </LanguageProvider>
      </MemoryRouter>
    );
    const { rerender } = render(vista([]));
    expect(Mapa).toHaveBeenCalledTimes(1);
    expect(contar).toHaveBeenCalledTimes(1);
    // Cambian los vinos (filtro, refresco del catálogo): el mapa es el mismo, no hay carga nueva.
    rerender(vista([{ nombre: "Otro", precio_eur: 10 }]));
    expect(contar).toHaveBeenCalledTimes(Mapa.mock.calls.length);
    expect(Mapa).toHaveBeenCalledTimes(1);
  });

  it("llama a la RPC sin ningún dato del visitante y nunca rompe el mapa", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://proyecto.supabase.co/");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "clave-publica");
    const fetchFalso = vi.fn().mockRejectedValue(new Error("sin red"));
    vi.stubGlobal("fetch", fetchFalso);
    vi.resetModules();
    const real = await vi.importActual<typeof import("@/lib/supabase-functions")>("@/lib/supabase-functions");
    expect(() => real.contarCargaMapaVinos()).not.toThrow();
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://proyecto.supabase.co/rest/v1/rpc/mapa_vinos_contar_carga");
    expect(init).toMatchObject({ method: "POST", body: "{}", keepalive: true });
    expect(new Headers(init.headers).get("apikey")).toBe("clave-publica");

    fetchFalso.mockImplementation(() => { throw new Error("bloqueado"); });
    expect(() => real.contarCargaMapaVinos()).not.toThrow();
  });

  it("sin la URL de Supabase (tests, previsualización suelta) no llama a nada", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    vi.resetModules();
    const real = await vi.importActual<typeof import("@/lib/supabase-functions")>("@/lib/supabase-functions");
    real.contarCargaMapaVinos();
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});
