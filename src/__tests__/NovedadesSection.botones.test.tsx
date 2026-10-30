/**
 * NovedadesSection: botones al pie de las tarjetas (historia «Botones de
 * acción en las tarjetas de novedades», criterios 2 a 7 en la web).
 *
 *  - Llamar: el mismo `tel:` que el resto de la web, etiqueta traducida y el
 *    número visible solo desde `lg`.
 *  - Ver menú: modal con el título de la novedad y sus secciones; Bebidas solo
 *    si el dueño la marcó; X y Esc lo cierran y el foco vuelve al botón.
 *  - Échale un vistazo: enlace a la categoría del plato con su `#`, con el
 *    prefijo del idioma; sin botón si el plato no está en la carta del build.
 *  - Una novedad sin botones no tiene pie (se ve como siempre).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import type { Language } from "@/i18n/types";

const { filas } = vi.hoisted(() => {
  const linea = (id: string, nombre: string, extra: Record<string, unknown> = {}) => ({
    id,
    origen: "libre",
    platoId: null,
    nombre,
    descripcion: null,
    imagenUrl: null,
    imagenPosicionY: null,
    alergenos: [],
    alergenosInferidos: [],
    alergenosNotas: null,
    ...extra,
  });
  const menu = (incluyeBebidas: boolean) => ({
    version: 1,
    incluye_bebidas: incluyeBebidas,
    secciones: {
      primero: [
        linea("p1", "Ensaladilla de pulpo", {
          origen: "carta",
          platoId: "12",
          traducciones: { en: { nombre: "Octopus Russian salad", descripcion: null } },
        }),
      ],
      segundo: [linea("s1", "Sopa de picadillo de la casa")],
      postre: [],
      bebidas: [linea("b1", "Vino de la casa", { traducciones: { en: { nombre: "House wine" } } })],
    },
  });
  return {
    filas: [
      {
        id: "navidad",
        titulo: "Menú de Navidad",
        titulo_en: "Christmas menu",
        botones: ["ver_menu", "llamar"],
        menu: menu(true),
      },
      { id: "solo-comida", titulo: "Menú de empresa", botones: ["ver_menu"], menu: menu(false) },
      { id: "plato", titulo: "Nuevo plato", botones: ["ver_plato"], plato_id: "12" },
      { id: "retirado", titulo: "Plato retirado", botones: ["ver_plato", "llamar"], plato_id: "999" },
      { id: "borrado", titulo: "Plato borrado", botones: ["ver_plato"], plato_id: null },
      { id: "menu-vacio", titulo: "Menú vacío", botones: ["ver_menu"], menu: { secciones: {} } },
      { id: "de-siempre", titulo: "Novedad de siempre" },
    ],
  };
});

vi.mock("virtual:novedades-ssg", () => ({
  default: { generadoEn: "2026-10-28T08:00:00.000Z", novedades: filas },
}));

vi.mock("virtual:carta-ssg", () => ({
  default: {
    generadoEn: "2026-10-28T08:00:00.000Z",
    platos: [{ id: "12", nombre: "Ensaladilla de pulpo", categoria: "ENTRANTES FRÍOS", precio_eur: 14 }],
    resumen: { vinos: { total: 0, categorias: [] }, bebidas: { total: 0, categorias: [] } },
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          order: () => Promise.resolve({ data: filas, error: null }),
        }),
      }),
    }),
  },
}));

import NovedadesSection from "@/components/NovedadesSection";
import { PHONE_HREF, PHONE_NACIONAL } from "@/components/TelLink";

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

describe("NovedadesSection — botones de las tarjetas", () => {
  it("Llamar: tel: de la web, etiqueta en es/en/fr y número solo desde lg", () => {
    for (const [idioma, etiqueta] of [
      ["es", "Llamar"],
      ["en", "Call"],
      ["fr", "Appeler"],
    ] as const) {
      const { unmount } = montar(idioma);
      const titulo = idioma === "en" ? "Christmas menu" : "Menú de Navidad";
      const llamar = tarjeta(titulo).getByRole("link", { name: new RegExp(`^${etiqueta}`) });
      expect(llamar).toHaveAttribute("href", PHONE_HREF);
      expect(llamar).toHaveAttribute("href", "tel:+34966107887");
      expect(llamar).toHaveTextContent(etiqueta);
      const numero = within(llamar).getByText(PHONE_NACIONAL);
      expect(PHONE_NACIONAL).toBe("966 10 78 87");
      expect(numero).toHaveClass("hidden", "lg:inline");
      unmount();
    }
  });

  it("respeta el orden del dueño y cada botón mide al menos 44 px (min-h-11)", () => {
    montar();
    const pie = tarjeta("Menú de Navidad");
    const verMenu = pie.getByRole("button", { name: /^Ver menú/ });
    const llamar = pie.getByRole("link", { name: /^Llamar/ });
    expect(verMenu.compareDocumentPosition(llamar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const boton of [verMenu, llamar]) expect(boton).toHaveClass("min-h-11", "flex-auto");
    // El pie va abajo del todo de la tarjeta, que es columna flexible.
    expect(verMenu.parentElement).toHaveClass("mt-auto", "flex-wrap");
    expect(verMenu.closest(".rounded-lg")).toHaveClass("flex", "flex-col", "h-full");
  });

  it("Ver menú: abre el modal con el título y las secciones; Bebidas porque se marcó; X y Esc cierran y devuelven el foco", async () => {
    const usuario = userEvent.setup();
    montar();
    const boton = tarjeta("Menú de Navidad").getByRole("button", { name: "Ver menú — Menú de Navidad" });

    await usuario.click(boton);
    const modal = await screen.findByRole("dialog", { name: "Menú de Navidad" });
    expect(within(modal).getByText("Entrantes")).toBeInTheDocument();
    expect(within(modal).getByText("Principales")).toBeInTheDocument();
    expect(within(modal).queryByText(/^Postres?$/)).toBeNull();
    expect(within(modal).getByText("Bebidas")).toBeInTheDocument();
    expect(within(modal).getByText("Vino de la casa")).toBeInTheDocument();

    await usuario.click(within(modal).getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(boton).toHaveFocus();

    await usuario.click(boton);
    await screen.findByRole("dialog");
    await usuario.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(boton).toHaveFocus();
  });

  it("Ver menú con «Solo comida»: sin sección Bebidas", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(tarjeta("Menú de empresa").getByRole("button", { name: /^Ver menú/ }));
    const modal = await screen.findByRole("dialog", { name: "Menú de empresa" });
    expect(within(modal).getByText("Ensaladilla de pulpo")).toBeInTheDocument();
    expect(within(modal).queryByText("Bebidas")).toBeNull();
    expect(within(modal).queryByText("Vino de la casa")).toBeNull();
  });

  it("en inglés el modal usa la traducción de cada línea y, sin ella, el castellano", async () => {
    const usuario = userEvent.setup();
    montar("en");
    await usuario.click(tarjeta("Christmas menu").getByRole("button", { name: /^View menu/ }));
    const modal = await screen.findByRole("dialog", { name: "Christmas menu" });
    expect(within(modal).getByText("Octopus Russian salad")).toBeInTheDocument();
    expect(within(modal).getByText("Sopa de picadillo de la casa")).toBeInTheDocument();
    expect(within(modal).getByText("Drinks")).toBeInTheDocument();
    expect(within(modal).getByText("House wine")).toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("Échale un vistazo: enlace a la categoría del plato con su ancla, con prefijo de idioma", () => {
    for (const [idioma, etiqueta, ruta] of [
      ["es", "Échale un vistazo", "/carta/entrantes-frios#plato-12"],
      ["en", "Take a look", "/en/carta/entrantes-frios#plato-12"],
      ["fr", "Jetez un œil", "/fr/carta/entrantes-frios#plato-12"],
    ] as const) {
      const { unmount } = montar(idioma);
      const enlace = tarjeta("Nuevo plato").getByRole("link", { name: `${etiqueta} — Nuevo plato` });
      expect(enlace).toHaveAttribute("href", ruta);
      expect(enlace).toHaveClass("min-h-11");
      unmount();
    }
  });

  it("plato que no está en la carta o borrado: sin ese botón, sin enlaces rotos, el resto igual", () => {
    montar();
    const retirado = tarjeta("Plato retirado");
    expect(retirado.queryByRole("link", { name: /Échale un vistazo/ })).toBeNull();
    // El otro botón sigue, y pasa a ser el principal.
    expect(retirado.getByRole("link", { name: /^Llamar/ })).toHaveClass("bg-accent");

    const borrado = tarjeta("Plato borrado");
    expect(borrado.queryAllByRole("link")).toHaveLength(0);
    expect(borrado.queryAllByRole("button")).toHaveLength(0);
  });

  it("«Ver menú» sin ningún plato y novedad sin botones: sin pie", () => {
    montar();
    for (const titulo of ["Menú vacío", "Novedad de siempre"]) {
      const card = tarjeta(titulo);
      expect(card.queryAllByRole("button")).toHaveLength(0);
      expect(card.queryAllByRole("link")).toHaveLength(0);
    }
  });
});
