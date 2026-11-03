/**
 * Página `/tienda` (escaparate, sin compra por internet): lo que sale con la
 * semilla del build, los precios con el descuento del panel, los filtros, el
 * bloque «Cómo comprar» (dirección, horario, teléfono pulsable, texto
 * `recogida` y `aviso` del panel), la tienda apagada y los enlaces del menú y
 * del pie. `fetch` simula PostgREST (configuración y vinos).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { idiomaDeRuta } from "@/i18n/routing";

const mocks = vi.hoisted(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://demo.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "clave-publica");
  const vinos = [
    { id: "v1", nombre: "Macán Clásico 2020", nombre_en: "Macán Classic 2020", categoria: "VINOS TINTOS — RIOJA", precio_eur: 45, denominacion_origen: "D.O.Ca. Rioja", ubicacion_region: "Rioja", ubicacion_pais: "España" },
    { id: "v2", nombre: "Albariño Pazo", categoria: "VINOS BLANCOS — RÍAS BAIXAS", precio_eur: 20 },
    { id: "v3", nombre: "Excluido de la tienda", categoria: "VINOS TINTOS — RIOJA", precio_eur: 30 },
    { id: "v4", nombre: "Sin precio", categoria: "VINOS TINTOS — RIOJA", precio_eur: 0 },
  ];
  const config = {
    id: true,
    activa: true,
    descuento_pct: 30,
    vinos_excluidos: ["v3"],
    aviso: "Esta semana, la tienda solo por la tarde.",
    recogida: "Pide las botellas en la barra o resérvalas por teléfono.",
  };
  return { vinos, config, vivo: { config: config as Record<string, unknown> } };
});

vi.mock("virtual:carta-ssg/vinos", () => ({ default: { generadoEn: "", vinos: mocks.vinos } }));
vi.mock("virtual:carta-ssg/tienda", () => ({ default: { generadoEn: "", config: mocks.config } }));
// `Seo` usa `Head` de vite-react-ssg (necesita su provider).
vi.mock("@/components/Seo", () => ({ Seo: () => null }));
vi.mock("@/components/JsonLd", () => ({ JsonLd: () => null }));

import TiendaPagina from "@/pages/Tienda";
import { useConfigTienda } from "@/hooks/useTienda";

const json = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });

const fetchFalso = vi.fn(async (entrada: RequestInfo | URL, _opciones?: RequestInit) => {
  const url = String(entrada);
  if (url.includes("/rest/v1/configuracion_tienda")) return json(200, [mocks.vivo.config]);
  if (url.includes("/rest/v1/Vinos")) return json(200, mocks.vinos.filter((v) => v.precio_eur > 0));
  return json(200, []);
});

const pintar = (url = "/tienda") => {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[url]}>
        <LanguageProvider initialLanguage={idiomaDeRuta(url)}>
          <TiendaPagina />
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const tarjeta = (nombre: string) => screen.getByRole("article", { name: nombre });

const fetchOriginal = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = fetchFalso as typeof fetch;
  mocks.vivo.config = mocks.config;
  fetchFalso.mockClear();
});
afterEach(() => {
  // No `vi.unstubAllGlobals()`: se llevaría también los `ResizeObserver` e
  // `IntersectionObserver` falsos de `setup.ts`.
  globalThis.fetch = fetchOriginal;
});

describe("/tienda: escaparate", () => {
  it("cabecera y vinos a la venta con precio de carta tachado, precio tienda e insignia", async () => {
    pintar();
    expect(screen.getByRole("heading", { level: 1, name: "Tienda de vinos" })).toBeInTheDocument();
    expect(screen.getByText("-30 % sobre precio de carta")).toBeInTheDocument();
    expect(screen.getByText("Se compran en el restaurante")).toBeInTheDocument();

    const macan = tarjeta("Macán Clásico 2020");
    expect(within(macan).getByText("45,00 €").tagName).toBe("S");
    expect(within(macan).getByText("31,50 €")).toBeInTheDocument();
    expect(within(macan).getByText("-30 %")).toBeInTheDocument();
    expect(within(macan).getByText("30 % de descuento")).toHaveClass("sr-only");
    expect(within(macan).getByText("Tintos · Rioja")).toBeInTheDocument();
    // Escaparate: ni botones de compra ni formularios.
    expect(within(macan).queryByRole("button")).toBeNull();
    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();

    // Excluido en el panel y sin precio: no se venden.
    expect(screen.queryByText("Excluido de la tienda")).toBeNull();
    expect(screen.queryByText("Sin precio")).toBeNull();
    expect(screen.getByText("2 vinos a la venta")).toBeInTheDocument();
    await waitFor(() => expect(fetchFalso).toHaveBeenCalledWith(expect.stringContaining("/rest/v1/Vinos"), expect.anything()));
  });

  it("«Cómo comprar»: en el restaurante, con el texto del panel, dirección, horario y teléfono pulsable", () => {
    pintar();
    const bloque = screen.getByRole("region", { name: "Cómo comprar" });
    expect(within(bloque).getByText(/no vendemos por internet/)).toBeInTheDocument();
    expect(within(bloque).getByText("Pide las botellas en la barra o resérvalas por teléfono.")).toBeInTheDocument();
    expect(within(bloque).getByText("Carrer Santa Maria de la Cabeza, 2")).toBeInTheDocument();
    expect(within(bloque).getByText("Martes - Jueves")).toBeInTheDocument();
    expect(within(bloque).getByRole("link", { name: "Llamar para reservar botellas" })).toHaveAttribute("href", "tel:+34966107887");
    expect(within(bloque).getByRole("link", { name: /^\+34 966 10 78 87/ })).toHaveAttribute("href", "tel:+34966107887");
    expect(within(bloque).getByRole("link", { name: "Cómo llegar" })).toHaveAttribute("href", expect.stringContaining("google.com/maps"));
    expect(within(bloque).getByText(/Venta solo a mayores de 18 años/)).toBeInTheDocument();
    // El aviso del panel, encima.
    expect(screen.getByText("Esta semana, la tienda solo por la tarde.")).toBeInTheDocument();
  });

  it("buscador y filtro por tipo", async () => {
    const user = userEvent.setup();
    pintar();
    await user.type(screen.getByRole("searchbox", { name: "Buscar vinos..." }), "albar");
    await waitFor(() => expect(screen.queryByRole("article", { name: "Macán Clásico 2020" })).toBeNull());
    expect(tarjeta("Albariño Pazo")).toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox"));
    await user.click(screen.getByRole("button", { name: /^Tintos 1/ }));
    expect(await screen.findByRole("article", { name: "Macán Clásico 2020" })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Albariño Pazo" })).toBeNull();
  });

  it("el descuento y las exclusiones que cambian en el panel se ven sin esperar a un deploy", async () => {
    mocks.vivo.config = { ...mocks.config, descuento_pct: 20, vinos_excluidos: ["v2"] };
    pintar();
    await waitFor(() => expect(screen.queryByRole("article", { name: "Albariño Pazo" })).toBeNull());
    expect(within(tarjeta("Macán Clásico 2020")).getByText("36,00 €")).toBeInTheDocument();
    expect(within(tarjeta("Macán Clásico 2020")).getByText("-20 %")).toBeInTheDocument();
  });

  it("en inglés: nombre traducido y textos en inglés", () => {
    pintar("/en/tienda");
    expect(screen.getByRole("heading", { level: 1, name: "Wine shop" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Macán Classic 2020" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "How to buy" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Call to reserve bottles" })).toHaveAttribute("href", "tel:+34966107887");
  });
});

describe("/tienda no disponible o sin configuración", () => {
  it("con `activa = false` en vivo: aviso amable, sin vinos", async () => {
    mocks.vivo.config = { ...mocks.config, activa: false, aviso: "Volvemos en enero." };
    pintar();
    expect(await screen.findByRole("heading", { name: "La tienda no está disponible ahora" })).toBeInTheDocument();
    expect(screen.getByText("Volvemos en enero.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver la carta de vinos" })).toHaveAttribute("href", "/carta/vinos");
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("sin la tabla en ese entorno (404): no disponible", async () => {
    globalThis.fetch = vi.fn(async (entrada: RequestInfo | URL) =>
      String(entrada).includes("configuracion_tienda") ? json(404, { code: "PGRST205" }) : json(200, mocks.vinos),
    ) as typeof fetch;
    pintar();
    expect(await screen.findByRole("heading", { name: "La tienda no está disponible ahora" })).toBeInTheDocument();
  });

  it("sin semilla del build: «cargando» hasta que contesta Supabase (nunca «no disponible» de entrada)", async () => {
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const envoltorio = ({ children }: { children: ReactNode }) => <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
    let responder: (r: Response) => void = () => {};
    globalThis.fetch = vi.fn(() => new Promise<Response>((ok) => (responder = ok))) as typeof fetch;
    const { result } = renderHook(() => useConfigTienda(null), { wrapper: envoltorio });
    expect(result.current).toEqual({ pendiente: true, config: null });
    await act(async () => responder(json(404, { code: "PGRST205" })));
    await waitFor(() => expect(result.current.pendiente).toBe(false));
    expect(result.current.config).toBeNull();
  });
});

describe("enlaces a la tienda", () => {
  it.each([
    ["/tienda", "Tienda", "Tienda de vinos", "/tienda"],
    ["/en/tienda", "Shop", "Wine shop", "/en/tienda"],
    ["/fr/tienda", "Boutique", "Boutique de vins", "/fr/tienda"],
  ])("%s: «%s» en el menú (página actual) y «%s» en el pie", (url, menu, pie, href) => {
    const { container } = pintar(url);
    const cabecera = container.querySelector("header.site-header") as HTMLElement;
    const enlaces = within(cabecera).getAllByRole("link", { name: menu });
    expect(enlaces.length).toBeGreaterThan(0);
    for (const enlace of enlaces) {
      expect(enlace).toHaveAttribute("href", href);
      expect(enlace).toHaveAttribute("aria-current", "page");
    }
    expect(within(container.querySelector("footer") as HTMLElement).getByRole("link", { name: pie })).toHaveAttribute("href", href);
  });
});
