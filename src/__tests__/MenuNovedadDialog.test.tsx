/**
 * MenuNovedadDialog con el menú v2 (historia «Maridajes y catas en el menú de
 * las novedades», C3, C5, C6 y C8 en la web):
 *
 *  - Cata: solo la sección «Cata» / «Tasting» / «Dégustation», con las
 *    bebidas en su orden; ni platos ni Bebidas.
 *  - Menú con maridaje: la bebida bajo su plato y Bebidas como hoy.
 *  - Lo de siempre: 92 % de ancho en móvil, X fija, y cierre con X, Esc y
 *    pulsando fuera devolviendo el foco al botón.
 */
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import MenuNovedadDialog from "@/components/novedades/MenuNovedadDialog";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import type { Language } from "@/i18n/types";
import { parsearMenuNovedad } from "@/lib/menu-novedad";

import FIXTURE_CATA from "./fixtures/menu-novedad-v2-cata.json";
import FIXTURE_MARIDAJE from "./fixtures/menu-novedad-v2-maridaje.json";

/** Por el texto entero del párrafo: el prefijo «Maridaje:» va en su propio `<span>`. */
const textoDe = (texto: string) => (_: string, nodo: Element | null) =>
  nodo?.tagName === "P" && nodo.textContent === texto;

const abrir = async (fixture: unknown, titulo: string, idioma: Language = "es") => {
  const usuario = userEvent.setup();
  const menu = parsearMenuNovedad(fixture, idioma, "n");
  if (!menu) throw new Error("el fixture debería leerse");
  const vista = render(
    <MemoryRouter>
      <LanguageProvider initialLanguage={idioma}>
        <MenuNovedadDialog titulo={titulo} menu={menu}>
          <button type="button">Abrir</button>
        </MenuNovedadDialog>
      </LanguageProvider>
    </MemoryRouter>,
  );
  const boton = screen.getByRole("button", { name: "Abrir" });
  await usuario.click(boton);
  const modal = await screen.findByRole("dialog", { name: titulo });
  return { usuario, boton, modal, unmount: vista.unmount };
};

/** El `<li>` del plato con ese nombre dentro del modal. */
const filaDe = (modal: HTMLElement, nombre: string) => {
  const li = within(modal).getByText(nombre).closest("li");
  if (!li) throw new Error(`sin fila para ${nombre}`);
  return li;
};

describe("MenuNovedadDialog — cata", () => {
  it("solo la sección Cata, con las bebidas en orden, en es, en y fr", async () => {
    for (const [idioma, rotulo, nombres, sulfitos] of [
      ["es", "Cata", ["Whisky de malta 12 años", "Fondillón", "Ginebra de Mahón"], "Contiene sulfitos"],
      ["en", "Tasting", ["12-year-old malt whisky", "Fondillón", "Ginebra de Mahón"], "Contains sulphites"],
      ["fr", "Dégustation", ["Whisky de malta 12 años", "Fondillón", "Ginebra de Mahón"], "Contient des sulfites"],
    ] as const) {
      const { modal, unmount } = await abrir(FIXTURE_CATA, "Cata de destilados", idioma);
      const secciones = modal.querySelectorAll("section");
      expect(secciones).toHaveLength(1);
      expect(within(modal).getByRole("heading", { name: rotulo })).toBeInTheDocument();

      const lista = within(secciones[0]).getByRole("list");
      expect(lista.tagName).toBe("OL");
      const filas = within(lista).getAllByRole("listitem");
      expect(filas.map((fila) => fila.querySelector("p")?.textContent)).toEqual(nombres);
      expect(within(filas[1]).getByText(sulfitos)).toBeInTheDocument();
      expect(within(modal).getAllByText(sulfitos)).toHaveLength(1);
      unmount();
    }
  });
});

describe("MenuNovedadDialog — menú con maridaje", () => {
  it("la bebida bajo su plato, con sulfitos, y Bebidas como hoy", async () => {
    const { modal } = await abrir(FIXTURE_MARIDAJE, "Menú maridaje");
    const gamba = filaDe(modal, "Gamba roja de Santa Pola");
    expect(within(gamba).getByText(textoDe("Maridaje: Cava brut nature"))).toBeInTheDocument();
    expect(within(gamba).getByText("Contiene sulfitos")).toBeInTheDocument();
    expect(within(filaDe(modal, "Turrón de Jijona")).getByText(textoDe("Maridaje: Fondillón"))).toBeInTheDocument();
    expect(filaDe(modal, "Arroz a banda").querySelector("[data-linea-bebida]")).toBeNull();

    expect(within(modal).getByRole("heading", { name: "Bebidas" })).toBeInTheDocument();
    expect(filaDe(modal, "Agua mineral").querySelector("[data-linea-bebida]")).toBeNull();
    expect(within(modal).queryByRole("heading", { name: "Cata" })).toBeNull();
  });

  it("en inglés y en francés: prefijo, bebida y sulfitos traducidos", async () => {
    for (const [idioma, linea, sulfitos] of [
      ["en", "Pairing: Brut nature cava", "Contains sulphites"],
      ["fr", "Accord : Cava brut nature", "Contient des sulfites"],
    ] as const) {
      const { modal, unmount } = await abrir(FIXTURE_MARIDAJE, "Menu", idioma);
      expect(within(modal).getByText(textoDe(linea))).toBeInTheDocument();
      // Gamba y turrón: los dos maridajes llevan sulfitos.
      expect(within(modal).getAllByText(sulfitos)).toHaveLength(2);
      unmount();
    }
  });
});

describe("MenuNovedadDialog — lo de siempre", () => {
  it("92 % de ancho en móvil, scroll por dentro y la X en la franja fija", async () => {
    const { modal } = await abrir(FIXTURE_CATA, "Cata de destilados");
    expect(modal).toHaveClass("w-[92vw]", "sm:max-w-lg", "overflow-y-auto");
    const cerrar = within(modal).getByRole("button", { name: "Cerrar" });
    expect(cerrar).toHaveClass("h-11", "w-11");
    expect(cerrar.closest(".sticky")).not.toBeNull();
  });

  it("se cierra con la X, con Esc y pulsando fuera, y el foco vuelve al botón", async () => {
    const { usuario, boton, modal } = await abrir(FIXTURE_CATA, "Cata de destilados");
    await usuario.click(within(modal).getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(boton).toHaveFocus();

    await usuario.click(boton);
    await screen.findByRole("dialog");
    await usuario.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(boton).toHaveFocus();

    await usuario.click(boton);
    const otraVez = await screen.findByRole("dialog");
    // El velo de Radix: abierto, fuera del diálogo y que no es el botón.
    const velo = [...document.querySelectorAll<HTMLElement>("div[data-state='open']")].find(
      (nodo) => !otraVez.contains(nodo) && nodo !== otraVez,
    );
    if (!velo) throw new Error("sin velo del diálogo");
    await usuario.click(velo);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(boton).toHaveFocus();
  });
});
