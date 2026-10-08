import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/LanguageProvider";

type Vino = { id: string; nombre: string; precio_eur: number; categoria: string; activado: boolean; restaurante: boolean; ubicacion_region: string; ubicacion_pais: string };
const mock = vi.hoisted(() => ({ filas: [] as Vino[], mapa: [] as Vino[], rangos: [] as number[][], error: false }));
vi.mock("@/lib/cookie-consent", () => ({ useMapsConsent: () => true, openCookiePreferences: vi.fn() }));
vi.mock("@/components/carta/MapaMundoVinos", () => ({ default: ({ vinos }: { vinos: Vino[] }) => {
  mock.mapa = vinos;
  return <div data-testid="mapa">{vinos.length}</div>;
} }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => {
  let desde = 0, hasta = 23;
  const filtros: [string, unknown][] = [];
  const query = {
    select: () => query, order: () => query,
    eq: (campo: string, valor: unknown) => { filtros.push([campo, valor]); return query; },
    is: (campo: string, valor: unknown) => { filtros.push([campo, valor]); return query; },
    range: (a: number, b: number) => { desde = a; hasta = b; mock.rangos.push([a, b]); return query; },
    then: (resolve: (valor: unknown) => unknown) => Promise.resolve({
      data: mock.error ? null : mock.filas.filter(v => filtros.every(([campo, valor]) => v[campo as keyof Vino] === valor)).slice(desde, hasta + 1),
      error: mock.error ? new Error("Error de lectura") : null,
    }).then(resolve),
  };
  return query;
} } }));

let CartaVinos: typeof import("@/components/carta/CartaVinos")["default"];
beforeAll(async () => {
  vi.stubEnv("VITE_MAPBOX_TOKEN", "token-de-prueba");
  CartaVinos = (await import("@/components/carta/CartaVinos")).default;
});
afterEach(() => vi.restoreAllMocks());
const original: Vino = { id: "1", nombre: "Original", precio_eur: 20, categoria: "Tintos", activado: true, restaurante: true, ubicacion_region: "La Rioja", ubicacion_pais: "España" };
beforeEach(() => {
  sessionStorage.setItem("edadVinosConfirmada", "true");
  mock.filas = [original]; mock.mapa = []; mock.rangos = []; mock.error = false;
});
const pintar = () => render(<LanguageProvider><CartaVinos initialVinos={{ Todos: [original] }} initialMapVinos={[original]} /></LanguageProvider>);

describe("Mapa conectado al catálogo vigente", () => {
  it("actualiza mapa y carta al volver a la ventana, excluyendo vinos desactivados o de otra carta", async () => {
    pintar();
    await screen.findByTestId("mapa");
    await waitFor(() => expect(mock.rangos.length).toBeGreaterThanOrEqual(2));
    mock.filas = [original, { ...original, id: "2", nombre: "Nuevo vino" }, { ...original, id: "3", activado: false }, { ...original, id: "4", restaurante: false }];
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(mock.mapa.map(v => v.id)).toEqual(["1", "2"]));
    await waitFor(() => expect(screen.getAllByText("Nuevo vino").length).toBeGreaterThan(0));
    mock.filas = [original];
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(mock.mapa.map(v => v.id)).toEqual(["1"]));
  });
  it("carga también los vinos posteriores al límite de 1000 filas", async () => {
    mock.filas = Array.from({ length: 1001 }, (_, i) => ({ ...original, id: String(i), nombre: `Vino ${i}` }));
    pintar();
    await waitFor(() => expect(mock.mapa.length).toBe(1001));
    expect(mock.rangos).toContainEqual([1000, 1999]);
  });
});
