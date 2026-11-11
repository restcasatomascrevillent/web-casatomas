/**
 * Carta de Bebidas en la web con su interruptor del panel (Gestor web › Carta › Bebidas, 11/11/2026,
 * petición del dueño: «Desactiva de la web la carta de Bebidas… por defecto no»).
 *
 *  - Apagada: `/carta/bebidas` lleva a la carta (en su idioma) y su HTML lleva `noindex`; la píldora
 *    «Bebidas» de las categorías desaparece.
 *  - Encendida: todo como siempre.
 *  - La lectura en el navegador: solo un `true` explícito la enciende; sin fila, vale lo del build.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import type { Language } from "@/i18n/types";

const h = vi.hoisted(() => ({ mostrar: false, seo: [] as Array<{ noindex?: boolean; title?: string }> }));
vi.mock("@/hooks/useMostrarCartaBebidas", async (original) => ({
  ...(await original<typeof import("@/hooks/useMostrarCartaBebidas")>()),
  useMostrarCartaBebidas: () => h.mostrar,
}));
vi.mock("@/components/Seo", () => ({
  Seo: (props: { noindex?: boolean; title?: string }) => {
    h.seo.push(props);
    return null;
  },
}));
vi.mock("@/hooks/useMostrarFotosPlatos", () => ({ useMostrarFotosPlatos: () => true }));
vi.mock("virtual:carta-ssg", () => ({
  default: {
    generadoEn: "2026-11-11T08:00:00.000Z",
    platos: [{ id: "1", nombre: "Cochinillo", categoria: "CARNES", categoria_en: "Meats", precio_eur: 26 }],
    resumen: { vinos: { total: 0, categorias: [] }, bebidas: { total: 0, categorias: [] } },
  },
}));

import CartaBebidasPagina from "@/pages/carta/Bebidas";
import CartaCategoria from "@/pages/carta/Categoria";
import { consultarMostrarCartaBebidas } from "@/hooks/useMostrarCartaBebidas";

const Ruta = () => <p data-testid="ruta">{useLocation().pathname}</p>;
const pintar = (entrada: string, idioma: Language = "es") =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[entrada]}>
        <LanguageProvider initialLanguage={idioma}>
          <Routes>
            <Route path="/carta/bebidas" element={<CartaBebidasPagina />} />
            <Route path="/en/carta/bebidas" element={<CartaBebidasPagina />} />
            <Route path="/carta/:categoria" element={<CartaCategoria />} />
            <Route path="*" element={<Ruta />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  h.mostrar = false;
  h.seo = [];
});

describe("/carta/bebidas según el interruptor del panel", () => {
  it("apagada: lleva a la carta y la página va con noindex", async () => {
    pintar("/carta/bebidas");
    expect(await screen.findByTestId("ruta")).toHaveTextContent(/^\/carta$/);
    expect(h.seo[0]?.noindex).toBe(true);
  });

  it("apagada en inglés: lleva a la carta en inglés", async () => {
    pintar("/en/carta/bebidas", "en");
    expect(await screen.findByTestId("ruta")).toHaveTextContent(/^\/en\/carta$/);
  });

  it("encendida: se ve la página de bebidas, indexable", async () => {
    h.mostrar = true;
    pintar("/carta/bebidas");
    expect(await screen.findByRole("heading", { level: 1, name: "Bebidas" })).toBeInTheDocument();
    expect(screen.queryByTestId("ruta")).not.toBeInTheDocument();
    expect(h.seo.every((p) => !p.noindex)).toBe(true);
  });
});

describe("Enlaces a la carta de Bebidas", () => {
  it("la píldora «Bebidas» de una categoría solo sale con la carta encendida", async () => {
    pintar("/carta/carnes");
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Bebidas" })).not.toBeInTheDocument();
  });

  it("encendida, la píldora vuelve", async () => {
    h.mostrar = true;
    pintar("/carta/carnes");
    expect(await screen.findByRole("link", { name: "Bebidas" })).toHaveAttribute("href", "/carta/bebidas");
  });
});

describe("Lectura del interruptor en el navegador", () => {
  const fila = (valor: unknown) =>
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(valor), { status: 200 }));
  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://supabase.test");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "clave-publica");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("solo un true explícito la enciende", async () => {
    fila([{ id: true, mostrar_carta_bebidas_casa_tomas: true }]);
    expect(await consultarMostrarCartaBebidas()).toBe(true);
    fila([{ id: true, mostrar_carta_bebidas_casa_tomas: false }]);
    expect(await consultarMostrarCartaBebidas()).toBe(false);
    // Sin la columna (migración sin aplicar): apagada.
    fila([{ id: true, mostrar_fotos_platos_casa_tomas: true }]);
    expect(await consultarMostrarCartaBebidas()).toBe(false);
  });

  it("sin fila vale lo del build (aquí, sin config: apagada)", async () => {
    fila([]);
    expect(await consultarMostrarCartaBebidas()).toBe(false);
  });

  it("un error de red se propaga (el hook se queda con lo del build)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 503 }));
    await expect(consultarMostrarCartaBebidas()).rejects.toThrow(/503/);
  });
});
