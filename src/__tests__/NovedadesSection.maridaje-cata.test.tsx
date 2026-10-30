/**
 * NovedadesSection con el menú v2 (historia «Maridajes y catas en el menú de
 * las novedades», C3, C5 y C7 en la web), con los fixtures canónicos:
 *
 *  - Una cata SIN comida sí lleva «Ver menú» (L3: basta una línea) y el modal
 *    enseña la sección «Cata».
 *  - Un menú con maridaje lleva «Ver menú» y la bebida bajo su plato.
 *  - Una cata sin ninguna bebida no tiene botón (ni pie).
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import type { Language } from "@/i18n/types";

const { filasDePrueba } = vi.hoisted(() => ({
  filasDePrueba: async () => {
    const [cata, maridaje] = await Promise.all([
      import("./fixtures/menu-novedad-v2-cata.json"),
      import("./fixtures/menu-novedad-v2-maridaje.json"),
    ]);
    return [
      {
        id: "cata",
        titulo: "Cata de destilados",
        titulo_en: "Spirits tasting",
        botones: ["ver_menu"],
        menu: cata.default,
      },
      { id: "maridaje", titulo: "Menú maridaje", botones: ["ver_menu", "llamar"], menu: maridaje.default },
      {
        id: "cata-vacia",
        titulo: "Cata sin bebidas",
        botones: ["ver_menu"],
        menu: {
          version: 2,
          tipo: "cata",
          incluye_bebidas: false,
          maridaje: false,
          secciones: { primero: [], segundo: [], postre: [], bebidas: [], cata: [{ nombre: "  " }] },
        },
      },
    ];
  },
}));

vi.mock("virtual:novedades-ssg", async () => ({
  default: { generadoEn: "2026-10-30T08:00:00.000Z", novedades: await filasDePrueba() },
}));

vi.mock("virtual:carta-ssg", () => ({
  default: {
    generadoEn: "2026-10-30T08:00:00.000Z",
    platos: [],
    resumen: { vinos: { total: 0, categorias: [] }, bebidas: { total: 0, categorias: [] } },
  },
}));

vi.mock("@/integrations/supabase/client", async () => {
  const filas = await filasDePrueba();
  return {
    supabase: {
      from: () => ({
        select: () => ({
          order: () => ({
            order: () => Promise.resolve({ data: filas, error: null }),
          }),
        }),
      }),
    },
  };
});

import NovedadesSection from "@/components/NovedadesSection";

/** Por el texto entero del párrafo: el prefijo «Maridaje:» va en su propio `<span>`. */
const textoDe = (texto: string) => (_: string, nodo: Element | null) =>
  nodo?.tagName === "P" && nodo.textContent === texto;

const montar = (idioma: Language = "es") => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false, retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <LanguageProvider initialLanguage={idioma}>
          <NovedadesSection />
        </LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

/** La tarjeta (el `Card`) que contiene ese título. */
const tarjeta = (titulo: string) => {
  const encabezado = screen.getByRole("heading", { name: titulo });
  const card = encabezado.closest(".rounded-lg");
  if (!(card instanceof HTMLElement)) throw new Error(`sin tarjeta para ${titulo}`);
  return within(card);
};

describe("NovedadesSection — maridaje y cata", () => {
  it("una cata sin comida SÍ muestra «Ver menú» y abre la sección Cata", async () => {
    const usuario = userEvent.setup();
    montar();
    const boton = tarjeta("Cata de destilados").getByRole("button", { name: "Ver menú — Cata de destilados" });
    expect(boton).toHaveClass("min-h-11");

    await usuario.click(boton);
    const modal = await screen.findByRole("dialog", { name: "Cata de destilados" });
    expect(within(modal).getByRole("heading", { name: "Cata" })).toBeInTheDocument();
    expect(within(modal).getAllByRole("listitem")).toHaveLength(3);
    expect(within(modal).queryByText("Entrantes")).toBeNull();
  });

  it("en inglés: «View menu» y «Tasting» en la cata", async () => {
    const usuario = userEvent.setup();
    montar("en");
    await usuario.click(tarjeta("Spirits tasting").getByRole("button", { name: /^View menu/ }));
    const modal = await screen.findByRole("dialog", { name: "Spirits tasting" });
    expect(within(modal).getByRole("heading", { name: "Tasting" })).toBeInTheDocument();
    expect(within(modal).getByText("12-year-old malt whisky")).toBeInTheDocument();
  });

  it("un menú con maridaje muestra «Ver menú» y la bebida bajo su plato", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(tarjeta("Menú maridaje").getByRole("button", { name: /^Ver menú/ }));
    const modal = await screen.findByRole("dialog", { name: "Menú maridaje" });
    const gamba = within(modal).getByText("Gamba roja de Santa Pola").closest("li");
    if (!gamba) throw new Error("sin fila de la gamba");
    expect(within(gamba).getByText(textoDe("Maridaje: Cava brut nature"))).toBeInTheDocument();
    expect(within(modal).getByText("Agua mineral")).toBeInTheDocument();
  });

  it("una cata sin ninguna bebida con nombre no tiene botón ni pie", () => {
    montar();
    const card = tarjeta("Cata sin bebidas");
    expect(card.queryAllByRole("button")).toHaveLength(0);
    expect(card.queryAllByRole("link")).toHaveLength(0);
  });
});
