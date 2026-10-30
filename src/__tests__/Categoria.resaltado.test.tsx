/**
 * Llegada a un plato desde «Échale un vistazo» (`/carta/<categoría>#plato-<id>`).
 *
 *  - Cada tarjeta lleva `id="plato-<id>"` y `scroll-mt-28`: el desplazamiento
 *    al `#` (lo hace `Header`, no esta página) la deja bajo la cabecera fija.
 *  - El plato del `#` se resalta un momento y luego vuelve a como siempre.
 *  - En el primer render no hay resaltado: el HTML del SSG y la hidratación
 *    tienen que coincidir.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import type { Language } from "@/i18n/types";

vi.mock("virtual:carta-ssg", () => ({
  default: {
    generadoEn: "2026-10-28T08:00:00.000Z",
    platos: [
      { id: "12", nombre: "Ensaladilla de pulpo", categoria: "ENTRANTES FRÍOS", precio_eur: 14 },
      { id: "13", nombre: "Gazpacho", categoria: "ENTRANTES FRÍOS", precio_eur: 8 },
    ],
    resumen: { vinos: { total: 0, categorias: [] }, bebidas: { total: 0, categorias: [] } },
  },
}));

// `Seo` usa `Head` de vite-react-ssg, que necesita su provider.
vi.mock("@/components/Seo", () => ({ Seo: () => null }));
// Ninguna consulta real: el interruptor de fotos no importa aquí.
vi.mock("@/hooks/useMostrarFotosPlatos", () => ({ useMostrarFotosPlatos: () => true }));

import CartaCategoria, { DURACION_RESALTADO_MS } from "@/pages/carta/Categoria";

const pagina = (entrada: string, idioma: Language) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[entrada]}>
        <LanguageProvider initialLanguage={idioma}>
          <Routes>
            <Route path="/carta/:categoria" element={<CartaCategoria />} />
            <Route path="/en/carta/:categoria" element={<CartaCategoria />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>
);

const montar = (entrada: string, idioma: Language = "es") => render(pagina(entrada, idioma));

describe("/carta/:categoria — ancla y resaltado del plato", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("cada plato tiene su ancla con margen para la cabecera fija", () => {
    const { container } = montar("/carta/entrantes-frios");
    for (const id of ["plato-12", "plato-13"]) {
      const tarjeta = container.querySelector(`#${id}`);
      expect(tarjeta).not.toBeNull();
      expect(tarjeta).toHaveClass("scroll-mt-28");
    }
    // Sin `#`, nada resaltado.
    expect(container.querySelector("[data-resaltado]")).toBeNull();
  });

  it("resalta solo el plato del # durante un momento", async () => {
    const { container } = montar("/en/carta/entrantes-frios#plato-12", "en");
    const resaltado = () => container.querySelector("[data-resaltado]");

    expect(resaltado()?.id).toBe("plato-12");
    expect(resaltado()?.querySelector(".ring-accent")).not.toBeNull();
    expect(container.querySelector("#plato-13 .ring-accent")).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(DURACION_RESALTADO_MS + 50);
    });
    expect(resaltado()).toBeNull();
    expect(container.querySelector("#plato-12 .ring-accent")).toBeNull();
  });

  it("el HTML del servidor (SSG) sale sin resaltar aunque la URL traiga el #", () => {
    const html = renderToString(pagina("/carta/entrantes-frios#plato-12", "es"));
    expect(html).toContain('id="plato-12"');
    expect(html).not.toContain("data-resaltado");
    // El anillo del resaltado, no el del foco (`focus-visible:ring-accent`).
    expect(html).not.toMatch(/[\s"]ring-accent[\s"]/);
  });

  it("un # que no es de plato (p. ej. #carta) no resalta nada", () => {
    const { container } = montar("/carta/entrantes-frios#carta");
    expect(container.querySelector("[data-resaltado]")).toBeNull();
  });
});
