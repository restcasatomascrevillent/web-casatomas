/**
 * Interruptor «Fotos de platos en Casa Tomás» (panel → Gestor Web → Carta).
 *
 *  - En build (`scripts/carta-ssg.mjs`): solo un `false` explícito en
 *    `configuracion_web` apaga las fotos; cualquier fallo leyéndolo (tabla sin
 *    crear, red, fila ausente) deja las fotos como siempre.
 *  - JSON-LD (`platosParaJsonLd`): apagado, sin foto ni encuadre.
 *  - En el navegador (`useMostrarFotosPlatos`): se relee al cargar aunque el
 *    deploy sea reciente, para que el interruptor se note sin redeploy.
 *  - En la tarjeta: apagado, ni ojo, ni foto, ni hueco de «sin foto».
 */
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import ProductoCard from "@/components/carta/ProductoCard";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { resolveTranslatedItem } from "@/lib/carta-i18n";
import { platosParaJsonLd } from "@/lib/carta-ssg";
import type { PlatoSSG } from "@/lib/carta-ssg-types";
import { useMostrarFotosPlatos } from "@/hooks/useMostrarFotosPlatos";
import { leerMostrarFotosPlatos } from "../../scripts/carta-ssg.mjs";

const FOTO = "https://ejemplo.test/storage/v1/object/public/platos/pulpo.webp";

const plato: PlatoSSG = {
  id: "plato-1",
  nombre: "Pulpo a la brasa",
  categoria: "PESCADOS",
  precio_eur: 18,
  imagen_url: FOTO,
  imagen_posicion_y: 40,
  alergenos_oficiales: ["moluscos"],
};

const respuesta = (ok: boolean, cuerpo: unknown, status = ok ? 200 : 404) =>
  ({ ok, status, json: async () => cuerpo }) as Response;

describe("leerMostrarFotosPlatos (build)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("oculta las fotos solo con un false explícito", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respuesta(true, [{ mostrar_fotos_platos_casa_tomas: false }])));
    await expect(leerMostrarFotosPlatos("https://x.test", "k")).resolves.toBe(false);
  });

  it("con true las muestra", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respuesta(true, [{ mostrar_fotos_platos_casa_tomas: true }])));
    await expect(leerMostrarFotosPlatos("https://x.test", "k")).resolves.toBe(true);
  });

  it("falla abierto: tabla sin crear (404), sin fila o sin red → fotos visibles", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn(async () => respuesta(false, { code: "PGRST205" })));
    await expect(leerMostrarFotosPlatos("https://x.test", "k")).resolves.toBe(true);

    vi.stubGlobal("fetch", vi.fn(async () => respuesta(true, [])));
    await expect(leerMostrarFotosPlatos("https://x.test", "k")).resolves.toBe(true);

    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("ECONNRESET"))));
    await expect(leerMostrarFotosPlatos("https://x.test", "k")).resolves.toBe(true);
  });
});

describe("platosParaJsonLd", () => {
  it("encendido deja los platos tal cual", () => {
    expect(platosParaJsonLd([plato], true)).toEqual([plato]);
  });

  it("apagado quita la foto y su encuadre, y nada más", () => {
    const [sinFoto] = platosParaJsonLd([plato], false);
    expect(sinFoto).not.toHaveProperty("imagen_url");
    expect(sinFoto).not.toHaveProperty("imagen_posicion_y");
    expect(sinFoto).toMatchObject({ id: "plato-1", nombre: "Pulpo a la brasa", precio_eur: 18 });
  });
});

describe("useMostrarFotosPlatos (navegador)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://x.test");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "k");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const envoltorio = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  };

  it("arranca con el valor del build (fuera del build: fotos visibles) y relee al montar", async () => {
    const fetchMock = vi.fn(async (_url: string) => respuesta(true, [{ mostrar_fotos_platos_casa_tomas: false }]));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useMostrarFotosPlatos(), { wrapper: envoltorio() });

    expect(result.current).toBe(true);
    await waitFor(() => expect(result.current).toBe(false));
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("https://x.test/rest/v1/configuracion_web");
  });

  it("si la lectura falla se queda con el valor del build", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respuesta(false, { code: "PGRST205" })));
    const { result } = renderHook(() => useMostrarFotosPlatos(), { wrapper: envoltorio() });
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current).toBe(true);
  });
});

const pintar = (mostrarFoto?: boolean) =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <ProductoCard
          plato={resolveTranslatedItem(plato, "es")}
          categoria="Pescados"
          {...(mostrarFoto === undefined ? {} : { mostrarFoto })}
        />
      </LanguageProvider>
    </MemoryRouter>,
  );

describe("ProductoCard — interruptor de fotos", () => {
  it("por defecto ofrece el ojo y enseña la foto al pulsarlo (lo de siempre)", () => {
    pintar();
    // El ojo sale en las dos caras de la tarjeta (delante y en la de info, tras la "i"):
    // con cualquiera de los dos se enseña la foto, basta con el primero. La imagen
    // expandida también se pinta en las dos caras (para no perderla al girar a info).
    fireEvent.click(screen.getAllByRole("button", { name: /ver foto/i })[0]);
    const fotos = screen.getAllByRole("img", { name: "Pulpo a la brasa — Pescados, Casa Tomás Restaurante" });
    expect(fotos.length).toBeGreaterThan(0);
    for (const foto of fotos) expect(foto).toHaveAttribute("src", FOTO);
  });

  it("apagado no hay ojo ni foto, y la tarjeta sigue con nombre y precio", () => {
    pintar(false);
    expect(screen.queryByRole("button", { name: /ver foto/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getAllByText("Pulpo a la brasa").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/18€/).length).toBeGreaterThan(0);
  });

  it("sin foto el ojo sigue saliendo, pero deshabilitado", () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <ProductoCard
            plato={resolveTranslatedItem({ ...plato, imagen_url: null }, "es")}
            categoria="Pescados"
          />
        </LanguageProvider>
      </MemoryRouter>,
    );
    const ojo = screen.getAllByRole("button", { name: /sin foto/i })[0];
    expect(ojo).toBeDisabled();
  });

  it("al abrir la información (la 'i') el ojo sigue disponible si hay foto", () => {
    pintar();
    // La "i" también sale en las dos caras (para poder volver desde la de info);
    // cualquiera de las dos abre la información.
    fireEvent.click(screen.getAllByRole("button", { name: /ver ingredientes y alérgenos/i })[0]);
    expect(screen.getAllByRole("button", { name: /ver foto/i }).length).toBeGreaterThan(0);
  });
});
