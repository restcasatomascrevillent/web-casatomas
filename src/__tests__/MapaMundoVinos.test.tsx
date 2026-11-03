/**
 * Comportamiento del popup de región: al consultar un origen del mapa, la
 * información de esa región (denominación de origen, vinos) tiene que salir
 * en un diálogo modal — no en un panel fijo bajo el mapa que antes obligaba
 * a desplazar la página (y en móvil quedaba fuera de la vista).
 */
import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    // Origen sin punto conocido (ni zona ni D.O. del respaldo de `denominaciones-vino.json`):
    // estos tests miran la lista de «sin ubicación puntual verificada».
    denominacion_origen: "D.O. de prueba sin geocodificar",
    ubicacion_pais: "España",
    ubicacion_region: "La Rioja",
  },
];

const renderComponent = (vinos: React.ComponentProps<typeof MapaMundoVinos>["vinos"] = RIOJA_VINOS) => {
  markerElements.length = 0;
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <MapaMundoVinos vinos={vinos} />
      </LanguageProvider>
    </MemoryRouter>,
  );
};

describe("MapaMundoVinos — popup de región al consultar un origen", () => {
  it("no muestra el popup antes de pulsar ninguna chincheta", () => {
    renderComponent();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abre un diálogo con la región y sus vinos al pulsar el origen", async () => {
    renderComponent();
    expect(markerElements.length).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "La Rioja (1)" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // El nombre de la región y el vino de esa región aparecen dentro del diálogo.
    expect(await screen.findByText("La Rioja")).toBeInTheDocument();
    expect(screen.getByText("Marqués de Riscal Reserva")).toBeInTheDocument();
  });

  it("se puede cerrar el popup (no queda como panel fijo en la página)", async () => {
    const user = userEvent.setup();
    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: "La Rioja (1)" }));
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});


it("filtra dentro de la chincheta y reinicia la paginación al cambiar de tipo", async () => {
  const vinos = [...RIOJA_VINOS, ...Array.from({ length: 7 }, (_, i) => ({
    ...RIOJA_VINOS[0], nombre: `Blanco de Rioja ${i}`, categoria: "BLANCOS",
  })), { ...RIOJA_VINOS[0], nombre: "Espumoso de Rioja", categoria: "ESPUMOSOS" }];
  renderComponent(vinos);
  fireEvent.click(screen.getByRole("button", { name: "La Rioja (9)" }));
  const dialog = within(await screen.findByRole("dialog"));
  fireEvent.click(dialog.getByRole("button", { name: /^Blancos\b/ }));
  expect(dialog.queryByText("Marqués de Riscal Reserva")).not.toBeInTheDocument();
  expect(dialog.queryByText("Espumoso de Rioja")).not.toBeInTheDocument();
  expect(dialog.queryByText("Blanco de Rioja 6")).not.toBeInTheDocument();
  fireEvent.click(dialog.getByRole("button", { name: "Mostrar más" }));
  expect(dialog.getByText("Blanco de Rioja 6")).toBeInTheDocument();
  fireEvent.click(dialog.getByRole("button", { name: /^Tintos\b/ }));
  expect(dialog.getByText("Marqués de Riscal Reserva")).toBeInTheDocument();
  expect(dialog.queryByText("Blanco de Rioja 0")).not.toBeInTheDocument();
  fireEvent.click(dialog.getByRole("button", { name: /Champagnes y espumosos/ }));
  expect(dialog.getByText("Espumoso de Rioja")).toBeInTheDocument();
});

it("actualiza el contador y los vinos de una región al añadir una referencia", async () => {
  const vista = renderComponent();
  expect(screen.getByRole("button", { name: "La Rioja (1)" })).toBeInTheDocument();
  vista.rerender(<MemoryRouter><LanguageProvider><MapaMundoVinos vinos={[
    ...RIOJA_VINOS, { ...RIOJA_VINOS[0], nombre: "Vino recién añadido" },
  ]} /></LanguageProvider></MemoryRouter>);
  expect(screen.getByRole("button", { name: "La Rioja (2)" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "La Rioja (2)" }));
  expect(await screen.findByText("Vino recién añadido")).toBeInTheDocument();
});

it("permite consultar los vinos cuyo origen aún no se ha podido situar", async () => {
  renderComponent([{ ...RIOJA_VINOS[0], nombre: "Vino de origen nuevo", ubicacion_region: "Región nueva", denominacion_origen: "" }]);
  fireEvent.click(await screen.findByRole("button", { name: "Región nueva (1)" }));
  expect(await screen.findByText("Vino de origen nuevo")).toBeInTheDocument();
});

 it("solo dibuja la bodega documentada y permite consultar su fuente", async () => {
  const registro = (await import("@/lib/bodegas-verificadas.json")).default;
  const [id, bodega] = Object.entries(registro)[0];
  renderComponent([{ ...RIOJA_VINOS[0], id, nombre: bodega.nombreVino, denominacion_origen: bodega.denominacion }]);
  expect(markerElements).toHaveLength(1);
  act(() => markerElements[0].click());
  const dialog = within(await screen.findByRole("dialog"));
  expect(dialog.getByRole("link")).toHaveAttribute("href", bodega.fuente);
 });
