/**
 * Un vino dado de alta desde el panel con la región genérica («Galicia») y una
 * D.O. conocida se coloca en el mapa en el centro de la D.O., en vez de caer en
 * «Vinos sin ubicación puntual verificada».
 */
import { describe, it, expect, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageProvider";

const marcadores: Array<{ el: HTMLElement; lngLat: [number, number] | null }> = [];

vi.mock("mapbox-gl", () => {
  const mapa = {
    on: vi.fn((evento: string, cb: () => void) => { if (evento === "load") cb(); }),
    addControl: vi.fn(), remove: vi.fn(), flyTo: vi.fn(), scrollZoom: { disable: vi.fn() }, resize: vi.fn(),
  };
  return {
    default: {
      Map: vi.fn(() => mapa),
      Marker: vi.fn((el: HTMLElement) => {
        const marcador = { el, lngLat: null as [number, number] | null };
        marcadores.push(marcador);
        const instancia = {
          setLngLat: vi.fn((c: [number, number]) => { marcador.lngLat = c; return instancia; }),
          addTo: vi.fn(() => instancia), setRotationAlignment: vi.fn(() => instancia), setPitchAlignment: vi.fn(() => instancia), remove: vi.fn(),
        };
        return instancia;
      }),
      NavigationControl: vi.fn(),
      accessToken: "",
    },
  };
});

import MapaMundoVinos from "@/components/carta/MapaMundoVinos";

const TERRAS_VELLAS = {
  id: "8978d75e-503b-4cfd-bc07-ad3a48828dcb", nombre: "Terras Vellas Albariño Crianza sobre Lías", precio_eur: 28, categoria: "BLANCOS",
  denominacion_origen: "D.O. Rías Baixas", ubicacion_region: "Galicia", ubicacion_pais: "España",
};

const pintar = (vinos: Array<typeof TERRAS_VELLAS>) => {
  marcadores.length = 0;
  return render(<MemoryRouter><LanguageProvider><MapaMundoVinos vinos={vinos} /></LanguageProvider></MemoryRouter>);
};

describe("MapaMundoVinos — respaldo por denominación", () => {
  it("coloca en el mapa el vino con solo «Galicia» y D.O. Rías Baixas, y no lo deja en «sin ubicación»", async () => {
    pintar([TERRAS_VELLAS]);
    expect(screen.queryByText("Vinos sin ubicación puntual verificada")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Galicia/ })).not.toBeInTheDocument();
    expect(marcadores).toHaveLength(1);
    expect(marcadores[0].lngLat).toEqual([-8.60414, 42.42806]);
    expect(marcadores[0].el).toHaveAttribute("title", "D.O. Rías Baixas");
    act(() => marcadores[0].el.click());
    const dialogo = within(await screen.findByRole("dialog"));
    expect(dialogo.getByText("D.O. Rías Baixas", { selector: "h2" })).toBeInTheDocument();
    expect(dialogo.getByText("Terras Vellas Albariño Crianza sobre Lías")).toBeInTheDocument();
  });

  it("dos vinos de la misma D.O. con regiones distintas comparten un solo marcador", () => {
    pintar([TERRAS_VELLAS, { ...TERRAS_VELLAS, id: "otro", nombre: "Otro albariño", ubicacion_region: "Meaño, Pontevedra", denominacion_origen: "Rías Baixas" }]);
    expect(marcadores).toHaveLength(1);
    expect(marcadores[0].el).toHaveTextContent("2");
  });

  it("un vino de la misma D.O. con subzona conocida sigue en su propio punto", () => {
    pintar([TERRAS_VELLAS, { ...TERRAS_VELLAS, id: "salnes", nombre: "Albariño del Salnés", ubicacion_region: "Val do Salnés, Pontevedra" }]);
    expect(marcadores.map((m) => m.lngLat).sort()).toEqual([[-8.60414, 42.42806], [-8.79768, 42.51932]].sort());
  });
});
