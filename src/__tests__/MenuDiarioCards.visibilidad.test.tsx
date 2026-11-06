import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import MenuDiarioCards from "@/components/espacios/MenuDiarioCards";

const flags = vi.hoisted(() => ({ menu: true, tapas: true } as { menu: boolean; tapas: boolean; horarioMenu?: unknown; horarioTapas?: unknown }));
vi.mock("@/hooks/useVisibilidadMenuTapas", () => ({ useVisibilidadMenuTapas: () => flags }));

const pintar = () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["menus_diarios", "es"], []);
  client.setQueryData(["tapas", "es"], []);
  return render(<QueryClientProvider client={client}><LanguageProvider><MenuDiarioCards /></LanguageProvider></QueryClientProvider>);
};

describe("Visibilidad independiente de menú y tapas", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 8, 12)); // Jueves: ambos disponibles.
    flags.menu = true; flags.tapas = true; flags.horarioMenu = undefined; flags.horarioTapas = undefined;
  });
  afterEach(() => vi.useRealTimers());
  it("oculta el menú y conserva las tapas", () => {
    flags.menu = false;
    pintar();
    expect(screen.queryByRole("button", { name: /menú/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tapas/i })).toBeInTheDocument();
  });
  it("oculta las tapas y conserva el menú", () => {
    flags.tapas = false;
    pintar();
    expect(screen.getByRole("button", { name: /menú/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tapas/i })).not.toBeInTheDocument();
  });
  it("elimina la franja completa si ambos están desactivados", () => {
    flags.menu = false; flags.tapas = false;
    const { container } = pintar();
    expect(container).toBeEmptyDOMElement();
  });
  it("permite volver a activar un botón sin modificar el contenido", () => {
    flags.menu = false;
    const view = pintar();
    expect(screen.queryByRole("button", { name: /menú/i })).not.toBeInTheDocument();
    flags.menu = true;
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    client.setQueryData(["menus_diarios", "es"], []); client.setQueryData(["tapas", "es"], []);
    view.rerender(<QueryClientProvider client={client}><LanguageProvider><MenuDiarioCards /></LanguageProvider></QueryClientProvider>);
    expect(screen.getByRole("button", { name: /menú/i })).toBeInTheDocument();
  });
  it("respeta los días y las horas del panel (04/11/2026)", () => {
    // Jueves 08/10/2026 a las 11:00 de Madrid (09:00 UTC): el menú sale de 13:00 a 16:00 y las tapas los viernes.
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 8, 9)));
    flags.horarioMenu = { dias: [4], desde: "13:00", hasta: "16:00" };
    flags.horarioTapas = { dias: [5], desde: null, hasta: null };
    const { container } = pintar();
    expect(container).toBeEmptyDOMElement();
  });
  it("dentro del horario sale con sus días y horas en la etiqueta", () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 8, 12))); // jueves 14:00 de Madrid
    flags.horarioMenu = { dias: [1, 4], desde: "13:00", hasta: "16:00" };
    pintar();
    expect(screen.getByRole("button", { name: /menú/i })).toBeInTheDocument();
    expect(screen.getByText(/lun, jue · 13:00–16:00/)).toBeInTheDocument();
  });
});

