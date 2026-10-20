import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import MenuDiarioCards from "@/components/espacios/MenuDiarioCards";

const flags = vi.hoisted(() => ({ menu: true, tapas: true }));
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
    flags.menu = true; flags.tapas = true;
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
});
