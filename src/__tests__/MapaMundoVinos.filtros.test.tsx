/**
 * El mapa sigue los filtros de la carta: enseña solo los vinos que le llegan,
 * conserva la misma instancia de Mapbox al cambiar de filtro, encuadra lo que
 * queda (sin animar con `prefers-reduced-motion`) y avisa si no hay nada que situar.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageProvider";

const mapbox = vi.hoisted(() => {
  type Marcador = { remove: ReturnType<typeof vi.fn>; coords?: number[] };
  const marcadores: Marcador[] = [];
  const instancia = {
    on: vi.fn((evento: string, cb: () => void) => { if (evento === "load") cb(); }),
    addControl: vi.fn(),
    remove: vi.fn(),
    flyTo: vi.fn(),
    easeTo: vi.fn(),
    fitBounds: vi.fn(),
    scrollZoom: { disable: vi.fn() },
    resize: vi.fn(),
  };
  return { marcadores, instancia };
});

vi.mock("mapbox-gl", () => ({
  default: {
    Map: vi.fn(() => mapbox.instancia),
    Marker: vi.fn(() => {
      const marcador: (typeof mapbox.marcadores)[number] = { remove: vi.fn() };
      const api = {
        setLngLat: vi.fn((coords: number[]) => { marcador.coords = coords; return api; }),
        addTo: vi.fn(() => api),
        setRotationAlignment: vi.fn(() => api),
        setPitchAlignment: vi.fn(() => api),
        remove: marcador.remove,
      };
      mapbox.marcadores.push(marcador);
      return api;
    }),
    NavigationControl: vi.fn(),
    accessToken: "",
  },
}));

import mapboxgl from "mapbox-gl";
import MapaMundoVinos from "@/components/carta/MapaMundoVinos";

const base = { precio_eur: 30, ubicacion_pais: "España" };
const RIOJA = { ...base, nombre: "Rioja tinto", categoria: "VINOS TINTOS — RIOJA", ubicacion_region: "Rioja" };
const CHAMPAGNE = { ...base, nombre: "Champagne brut", categoria: "CHAMPAGNES", ubicacion_pais: "Francia", ubicacion_region: "Champagne" };
const GALICIA = { ...base, nombre: "Albariño", categoria: "VINOS BLANCOS — RIAS BAIXAS", ubicacion_region: "Galicia" };
const PUNTO_RIOJA = [-2.43967, 42.46612];
const PUNTO_CHAMPAGNE = [3.95287, 49.04256];

type Props = React.ComponentProps<typeof MapaMundoVinos>;
const pintar = (props: Props) => (
  <MemoryRouter><LanguageProvider><MapaMundoVinos {...props} /></LanguageProvider></MemoryRouter>
);
const vivos = () => mapbox.marcadores.filter(marcador => marcador.remove.mock.calls.length === 0);
const movimientoReducido = (activo: boolean) => {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: activo && query.includes("prefers-reduced-motion"),
    media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
};

beforeEach(() => {
  mapbox.marcadores.length = 0;
  for (const mock of [mapbox.instancia.easeTo, mapbox.instancia.fitBounds, mapbox.instancia.remove, vi.mocked(mapboxgl.Map)]) mock.mockClear();
  movimientoReducido(false);
});
afterEach(() => movimientoReducido(false));

describe("MapaMundoVinos con los filtros de la carta", () => {
  it("sin filtros dibuja todos los vinos situables y no mueve la cámara al montar", () => {
    render(pintar({ vinos: [RIOJA, CHAMPAGNE, GALICIA] }));
    expect(vivos().map(m => m.coords)).toEqual([PUNTO_RIOJA, PUNTO_CHAMPAGNE]);
    expect(screen.getByRole("button", { name: "Galicia (1)" })).toBeInTheDocument();
    expect(mapbox.instancia.fitBounds).not.toHaveBeenCalled();
    expect(mapbox.instancia.easeTo).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("al filtrar cambia marcadores y vinos sin ubicar, sobre el mismo mapa", () => {
    const vista = render(pintar({ vinos: [RIOJA, CHAMPAGNE, GALICIA], claveFiltro: "Todos\0" }));
    vista.rerender(pintar({ vinos: [RIOJA], filtroActivo: true, claveFiltro: "tipo:tinto\0" }));
    expect(vivos().map(m => m.coords)).toEqual([PUNTO_RIOJA]);
    expect(screen.queryByRole("button", { name: /Galicia/ })).not.toBeInTheDocument();
    expect(vi.mocked(mapboxgl.Map)).toHaveBeenCalledTimes(1);
    expect(mapbox.instancia.remove).not.toHaveBeenCalled();

    vista.rerender(pintar({ vinos: [RIOJA, CHAMPAGNE, GALICIA], claveFiltro: "Todos\0" }));
    expect(vivos()).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Galicia (1)" })).toBeInTheDocument();
  });

  it("encuadra los vinos que quedan con animación, sin pasar de zoom de región", () => {
    const vista = render(pintar({ vinos: [RIOJA, CHAMPAGNE], claveFiltro: "Todos\0" }));
    vista.rerender(pintar({ vinos: [RIOJA], filtroActivo: true, claveFiltro: "tipo:tinto\0" }));
    expect(mapbox.instancia.fitBounds).toHaveBeenLastCalledWith(
      [PUNTO_RIOJA, PUNTO_RIOJA], expect.objectContaining({ maxZoom: 6, duration: 900 }),
    );
    vista.rerender(pintar({ vinos: [RIOJA, CHAMPAGNE], filtroActivo: true, claveFiltro: "buscar\0" }));
    expect(mapbox.instancia.fitBounds).toHaveBeenLastCalledWith(
      [[PUNTO_RIOJA[0], PUNTO_RIOJA[1]], [PUNTO_CHAMPAGNE[0], PUNTO_CHAMPAGNE[1]]], expect.objectContaining({ duration: 900 }),
    );
  });

  it("con prefers-reduced-motion la cámara salta sin animación", () => {
    movimientoReducido(true);
    const vista = render(pintar({ vinos: [RIOJA, CHAMPAGNE], claveFiltro: "Todos\0" }));
    vista.rerender(pintar({ vinos: [RIOJA], filtroActivo: true, claveFiltro: "tipo:tinto\0" }));
    expect(mapbox.instancia.fitBounds).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ duration: 0 }));
    vista.rerender(pintar({ vinos: [RIOJA, CHAMPAGNE], claveFiltro: "Todos\0" }));
    expect(mapbox.instancia.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ duration: 0 }));
  });

  it("al quitar los filtros vuelve a la vista general", () => {
    const vista = render(pintar({ vinos: [RIOJA], filtroActivo: true, claveFiltro: "tipo:tinto\0" }));
    vista.rerender(pintar({ vinos: [RIOJA, CHAMPAGNE], claveFiltro: "Todos\0" }));
    expect(mapbox.instancia.easeTo).toHaveBeenLastCalledWith({ center: [0, 30], zoom: 1.5, duration: 900 });
  });

  it("un refresco del catálogo con el mismo filtro redibuja los marcadores pero no mueve la cámara", () => {
    const vista = render(pintar({ vinos: [RIOJA], filtroActivo: true, claveFiltro: "tipo:tinto\0" }));
    mapbox.instancia.fitBounds.mockClear();
    vista.rerender(pintar({ vinos: [RIOJA, { ...RIOJA, nombre: "Rioja nuevo", ubicacion_region: "Rioja" }], filtroActivo: true, claveFiltro: "tipo:tinto\0" }));
    expect(mapbox.instancia.fitBounds).not.toHaveBeenCalled();
    expect(vivos()).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /\(/ })).not.toBeInTheDocument();
  });

  it("un mapa que carga con el filtro ya puesto se coloca de golpe", () => {
    render(pintar({ vinos: [CHAMPAGNE], filtroActivo: true, claveFiltro: "tipo:espumoso\0" }));
    expect(mapbox.instancia.fitBounds).toHaveBeenCalledTimes(1);
    expect(mapbox.instancia.fitBounds).toHaveBeenCalledWith([PUNTO_CHAMPAGNE, PUNTO_CHAMPAGNE], expect.objectContaining({ duration: 0 }));
  });

  it("avisa cuando ningún vino de la selección tiene ubicación y deja la cámara quieta", () => {
    const vista = render(pintar({ vinos: [RIOJA, GALICIA], claveFiltro: "Todos\0" }));
    mapbox.instancia.fitBounds.mockClear();
    vista.rerender(pintar({ vinos: [GALICIA], filtroActivo: true, claveFiltro: "tipo:blanco\0" }));
    expect(screen.getByRole("status")).toHaveTextContent(/no tienen ubicación puntual verificada en el mapa/);
    expect(screen.getByRole("button", { name: "Galicia (1)" })).toBeInTheDocument();
    expect(vivos()).toHaveLength(0);
    expect(mapbox.instancia.fitBounds).not.toHaveBeenCalled();
    // Con un vino situable el aviso desaparece.
    vista.rerender(pintar({ vinos: [RIOJA, GALICIA], filtroActivo: true, claveFiltro: "buscar\0" }));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("avisa cuando ningún vino pasa los filtros", () => {
    render(pintar({ vinos: [], filtroActivo: true, claveFiltro: "tipo:rosado\0" }));
    expect(screen.getByRole("status")).toHaveTextContent("Ningún vino coincide con los filtros.");
    expect(screen.queryByText("Vinos sin ubicación puntual verificada")).not.toBeInTheDocument();
  });

  it("sin filtro no añade aviso aunque no haya nada situable", () => {
    render(pintar({ vinos: [GALICIA] }));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
