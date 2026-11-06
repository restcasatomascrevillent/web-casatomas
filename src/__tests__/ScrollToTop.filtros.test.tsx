import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { MemoryRouter, useNavigate, type NavigateFunction } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";

// Dueño, 04/11/2026: «cuando pulsas los filtros de la carta te mueve al hero». Los filtros
// (`useFiltrosCarta`) cambian `?dietas=` con navigate(..., { replace: true }) en la MISMA página.
let navegar: NavigateFunction;
const Capturar = () => { navegar = useNavigate(); return null; };
const pintar = (inicio: string) =>
  render(<MemoryRouter initialEntries={[inicio]}><ScrollToTop /><Capturar /></MemoryRouter>);

describe("ScrollToTop y los filtros de la carta", () => {
  let scrollTo: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("filtrar en la portada no sube al hero", () => {
    pintar("/");
    scrollTo.mockClear();
    act(() => navegar({ pathname: "/", search: "dietas=vegetariano" }, { replace: true, preventScrollReset: true }));
    act(() => navegar({ pathname: "/", search: "dietas=vegetariano,celiaquia" }, { replace: true, preventScrollReset: true }));
    act(() => navegar({ pathname: "/", search: "" }, { replace: true, preventScrollReset: true }));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("filtrar en una categoría de la carta tampoco", () => {
    pintar("/carta/entrantes");
    scrollTo.mockClear();
    act(() => navegar({ pathname: "/carta/entrantes", search: "dietas=lactosa" }, { replace: true }));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("ir a otra página sí sube arriba (también con los filtros puestos)", () => {
    pintar("/?dietas=vegetariano");
    scrollTo.mockClear();
    act(() => navegar("/carta/entrantes?dietas=vegetariano"));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "instant" });
    scrollTo.mockClear();
    act(() => navegar({ pathname: "/carta/postres" }, { replace: true }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "instant" });
  });
});
