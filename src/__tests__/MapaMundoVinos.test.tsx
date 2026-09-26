/**
 * Comportamiento del popup de región: al pulsar una chincheta del mapa, la
 * información de esa región (denominación de origen, vinos) tiene que salir
 * en un diálogo modal — no en un panel fijo bajo el mapa que antes obligaba
 * a desplazar la página (y en móvil quedaba fuera de la vista).
 */
import { describe, it, expect, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageProvider";

const markerElements: HTMLElement[] = [];

vi.mock("mapbox-gl", () => {
  const markerInstance = {
    setLngLat: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    setRotationAlignment: vi.fn().mockReturnThis(),
    setPitchAlignment: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  };

  const mapInstance = {
    on: vi.fn((event: string, cb: () => void) => {
      if (event === "load") cb();
    }),
    addControl: vi.fn(),
    remove: vi.fn(),
    flyTo: vi.fn(),
    scrollZoom: { disable: vi.fn() },
    resize: vi.fn(),
  };

  return {
    default: {
      Map: vi.fn(() => mapInstance),
      // Captura el elemento del marcador (el `<div>` que el componente crea
      // a mano y le pasa al constructor) para poder simular el click desde
      // el test — `addTo` está mockeado y nunca lo inserta en el DOM real.
      Marker: vi.fn((el: HTMLElement) => {
        markerElements.push(el);
        return markerInstance;
      }),
      NavigationControl: vi.fn(),
      accessToken: "",
    },
  };
});

import MapaMundoVinos from "@/components/carta/MapaMundoVinos";

const RIOJA_VINOS = [
  {
    nombre: "Marqués de Riscal Reserva",
    precio_eur: 35,
    categoria: "TINTO",
    denominacion_origen: "Rioja",
    ubicacion_pais: "España",
    ubicacion_region: "La Rioja",
  },
];

const renderComponent = () => {
  markerElements.length = 0;
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <MapaMundoVinos vinos={RIOJA_VINOS} />
      </LanguageProvider>
    </MemoryRouter>,
  );
};

describe("MapaMundoVinos — popup de región al pulsar una chincheta", () => {
  it("no muestra el popup antes de pulsar ninguna chincheta", () => {
    renderComponent();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abre un diálogo con la región y sus vinos al pulsar la chincheta", async () => {
    renderComponent();
    expect(markerElements.length).toBeGreaterThan(0);

    act(() => { markerElements[0].click(); });

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // El nombre de la región y el vino de esa región aparecen dentro del diálogo.
    expect(await screen.findByText("La Rioja")).toBeInTheDocument();
    expect(screen.getByText("Marqués de Riscal Reserva")).toBeInTheDocument();
  });

  it("se puede cerrar el popup (no queda como panel fijo en la página)", async () => {
    const user = userEvent.setup();
    renderComponent();
    act(() => { markerElements[0].click(); });
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
