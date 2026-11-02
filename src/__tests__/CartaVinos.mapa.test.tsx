/**
 * Los filtros de la carta (tipo, denominación y buscador) llegan al mapa: este
 * recibe todos los vinos que los cumplen —no solo la página cargada en la
 * cuadrícula— y, sin filtros, el catálogo entero.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

vi.hoisted(() => { vi.stubEnv("VITE_MAPBOX_TOKEN", "pk.test"); });

vi.mock("@/lib/cookie-consent", async (importarOriginal) => ({
  ...(await importarOriginal<typeof import("@/lib/cookie-consent")>()),
  useMapsConsent: () => true,
}));

// El mapa real (Mapbox) no corre en jsdom: se sustituye por un espía de sus props.
vi.mock("@/components/carta/MapaMundoVinos", () => ({
  default: ({ vinos, filtroActivo, claveFiltro }: { vinos: { nombre: string }[]; filtroActivo?: boolean; claveFiltro?: string }) => (
    <div data-testid="mapa" data-filtro-activo={String(Boolean(filtroActivo))} data-clave={claveFiltro}>
      {vinos.map(vino => vino.nombre).join("|")}
    </div>
  ),
}));

import { LanguageProvider } from "@/i18n/LanguageProvider";
import CartaVinos from "@/components/carta/CartaVinos";

type Fila = { id: string; nombre: string; nombre_en?: string; categoria: string; precio_eur: number };
const datos = vi.hoisted(() => ({ vinos: [] as Fila[], selects: [] as string[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => {
  let categorias: string[] | null = null;
  let desde = 0, hasta = 23;
  const consulta = {
    select: (columnas: string) => { datos.selects.push(columnas); return consulta; }, is: () => consulta, order: () => consulta,
    eq: (campo: string, valor: string) => { if (campo === 'categoria') categorias = [valor]; return consulta; },
    in: (_campo: string, valores: string[]) => { categorias = valores; return consulta; },
    range: (a: number, b: number) => { desde = a; hasta = b; return consulta; },
    then: (resolver: (valor: unknown) => unknown) => Promise.resolve({ data: datos.vinos.filter(v => !categorias || categorias.includes(v.categoria)).slice(desde, hasta + 1), error: null }).then(resolver),
  };
  return consulta;
} } }));

describe("Los filtros de la carta de vinos llegan al mapa", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.localStorage.setItem("language", "es");
    datos.selects = [];
    datos.vinos = [
      { id: 'r1', nombre: 'Reserva Ribera', categoria: 'VINOS TINTOS — RIBERA DEL DUERO', precio_eur: 35 },
      { id: 'r2', nombre: 'Crianza Rioja', nombre_en: 'Aged Rioja', categoria: 'VINOS TINTOS — RIOJA', precio_eur: 25 },
      { id: 'c1', nombre: 'Champagne Brut', categoria: 'VINOS ESPUMOSOS — CHAMPAGNE', precio_eur: 60 },
      // Más de una página (24) de blancos: el mapa no puede quedarse con la primera.
      ...Array.from({ length: 30 }, (_, i) => ({ id: `b${i}`, nombre: `Blanco ${i}`, categoria: 'VINOS BLANCOS — RUEDA', precio_eur: 10 })),
    ];
  });

  const nombresDelMapa = () => (screen.getByTestId("mapa").textContent ?? "").split("|").filter(Boolean);
  const pintar = async () => {
    render(<LanguageProvider><CartaVinos initialVinos={{ Todos: datos.vinos.slice(0, 24) }} initialMapVinos={datos.vinos} /></LanguageProvider>);
    fireEvent.click(await screen.findByRole('button', { name: /tengo 18/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    return within(screen.getByRole('group', { name: 'Filtrar vinos por tipo' }));
  };

  it("por defecto el mapa lleva todos los vinos y sin filtro activo", async () => {
    await pintar();
    expect(nombresDelMapa()).toHaveLength(datos.vinos.length);
    expect(screen.getByTestId("mapa")).toHaveAttribute("data-filtro-activo", "false");
  });

  it("el filtro por tipo deja en el mapa todos los vinos del tipo, aunque la cuadrícula sea paginada", async () => {
    const tipos = await pintar();
    fireEvent.click(tipos.getByRole('button', { name: 'Blancos' }));
    await waitFor(() => expect(nombresDelMapa()).toHaveLength(30));
    expect(nombresDelMapa()).not.toContain('Champagne Brut');
    expect(screen.getByTestId("mapa")).toHaveAttribute("data-filtro-activo", "true");
    // La cuadrícula, en cambio, solo ha cargado la primera página.
    await waitFor(() => expect(screen.getAllByText('Blanco 23').length).toBeGreaterThan(0));
    expect(screen.queryByText('Blanco 29')).not.toBeInTheDocument();

    fireEvent.click(tipos.getByRole('button', { name: 'Tintos' }));
    await waitFor(() => expect(nombresDelMapa()).toEqual(['Reserva Ribera', 'Crianza Rioja']));
  });

  it("la denominación y el buscador acotan el mapa, y «Todos» lo devuelve a todos los vinos", async () => {
    const tipos = await pintar();
    fireEvent.click(tipos.getByRole('button', { name: 'Tintos' }));
    fireEvent.click(within(await screen.findByRole('group', { name: 'Filtrar vinos por denominación' })).getByRole('button', { name: 'Rioja' }));
    await waitFor(() => expect(nombresDelMapa()).toEqual(['Crianza Rioja']));

    fireEvent.click(within(screen.getByRole('group', { name: 'Filtrar vinos por denominación' })).getByRole('button', { name: 'Todas' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ribera' } });
    await waitFor(() => expect(nombresDelMapa()).toEqual(['Reserva Ribera']));
    expect(screen.getByTestId("mapa").dataset.clave).toContain('ribera');

    fireEvent.click(tipos.getByRole('button', { name: 'Todos' }));
    await waitFor(() => expect(nombresDelMapa()).toEqual(['Reserva Ribera']));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    await waitFor(() => expect(nombresDelMapa()).toHaveLength(datos.vinos.length));
    expect(screen.getByTestId("mapa")).toHaveAttribute("data-filtro-activo", "false");
  });

  it("el catálogo del mapa trae los nombres traducidos para que el buscador filtre en cualquier idioma", async () => {
    await pintar();
    await waitFor(() => expect(datos.selects.some(columnas => columnas.includes('nombre_en') && columnas.includes('nombre_fr'))).toBe(true));
  });
});
