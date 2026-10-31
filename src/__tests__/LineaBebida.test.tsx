/**
 * LineaBebida: una bebida del menú de una novedad (historia «Maridajes y catas
 * en el menú de las novedades», criterios C3, C5, C6 y C8 en la web).
 *
 *  - Maridaje: «Maridaje: <bebida>» en es/en/fr, con la traducción de la
 *    línea y el castellano de respaldo.
 *  - Cata: solo el nombre, sin prefijo.
 *  - Descripción solo si la hay; «Contiene sulfitos» solo con `sulfitos`.
 *  - En móvil el texto se parte (min-w-0 + overflow-wrap) y la copa es
 *    decorativa.
 *
 * Las líneas salen de los fixtures canónicos leídos con `parsearMenuNovedad`.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import LineaBebida from "@/components/novedades/LineaBebida";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import type { Language } from "@/i18n/types";
import { parsearMenuNovedad, type LineaBebida as DatosLineaBebida } from "@/lib/menu-novedad";

import FIXTURE_CATA from "./fixtures/menu-novedad-v2-cata.json";
import FIXTURE_MARIDAJE from "./fixtures/menu-novedad-v2-maridaje.json";

/** Por el texto entero del párrafo: el prefijo «Maridaje:» va en su propio `<span>`. */
const textoDe = (texto: string) => (_: string, nodo: Element | null) =>
  nodo?.tagName === "P" && nodo.textContent === texto;

const pintar = (linea: DatosLineaBebida, variante: "maridaje" | "cata", idioma: Language = "es") =>
  render(
    <MemoryRouter>
      <LanguageProvider initialLanguage={idioma}>
        <LineaBebida linea={linea} variante={variante} />
      </LanguageProvider>
    </MemoryRouter>,
  );

/** El maridaje de la gamba (primer plato del fixture), en ese idioma. */
const maridajeGamba = (idioma: Language) => {
  const menu = parsearMenuNovedad(FIXTURE_MARIDAJE, idioma, "n");
  if (!menu) throw new Error("el fixture de maridaje debería leerse");
  return menu.maridajes[menu.secciones.primero[0].id];
};

const lineaCata = (indice: number, idioma: Language = "es") => {
  const menu = parsearMenuNovedad(FIXTURE_CATA, idioma, "n");
  if (!menu) throw new Error("el fixture de cata debería leerse");
  return menu.cata[indice];
};

describe("LineaBebida", () => {
  it("maridaje: prefijo, nombre, descripción y sulfitos en es, en y fr", () => {
    for (const [idioma, nombre, descripcion, sulfitos] of [
      ["es", "Maridaje: Cava brut nature", "Bien frío", "Contiene sulfitos"],
      ["en", "Pairing: Brut nature cava", "Well chilled", "Contains sulphites"],
      ["fr", "Accord : Cava brut nature", "Bien frais", "Contient des sulfites"],
    ] as const) {
      const { unmount } = pintar(maridajeGamba(idioma), "maridaje", idioma);
      expect(screen.getByText(textoDe(nombre))).toBeInTheDocument();
      expect(screen.getByText(descripcion)).toHaveClass("italic");
      expect(screen.getByText(sulfitos)).toBeInTheDocument();
      unmount();
    }
  });

  it("cata: solo el nombre, sin prefijo; sin descripción ni sulfitos si no los tiene", () => {
    const { container } = pintar(lineaCata(0), "cata");
    expect(screen.getByText("Whisky de malta 12 años")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("Maridaje");
    expect(container).not.toHaveTextContent("sulfitos");
    // Nombre y nada más: ni una línea de descripción vacía.
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("cata: con descripción y sulfitos cuando el panel los guardó", () => {
    pintar(lineaCata(1), "cata");
    expect(screen.getByText("Fondillón")).toBeInTheDocument();
    expect(screen.getByText("Alicante, dulce")).toHaveClass("italic");
    expect(screen.getByText("Contiene sulfitos")).toHaveClass("[font-variant-caps:all-small-caps]");
  });

  it("en inglés usa la traducción y, sin ella, el castellano", () => {
    const { unmount } = pintar(lineaCata(0, "en"), "cata", "en");
    expect(screen.getByText("12-year-old malt whisky")).toBeInTheDocument();
    unmount();
    pintar(lineaCata(2, "en"), "cata", "en");
    expect(screen.getByText("Ginebra de Mahón")).toBeInTheDocument();
  });

  it("sulfitos: false no pinta la etiqueta aunque la bebida sea un vino", () => {
    const linea: DatosLineaBebida = { id: "x", nombre: "Tinto joven", descripcion: null, sulfitos: false };
    const { container } = pintar(linea, "maridaje");
    expect(screen.getByText(textoDe("Maridaje: Tinto joven"))).toBeInTheDocument();
    expect(container).not.toHaveTextContent("Contiene sulfitos");
  });

  it("móvil: el texto se parte en su columna y la copa es decorativa", () => {
    const largo = "Vino-dulce-de-uva-monastrell-envejecido-en-toneles-de-roble-durante-décadas";
    const { container } = pintar({ id: "l", nombre: largo, descripcion: null, sulfitos: true }, "maridaje");
    const bloque = container.querySelector("[data-linea-bebida='maridaje']");
    expect(bloque).toHaveClass("flex", "min-w-0");
    const columna = screen.getByText(textoDe(`Maridaje: ${largo}`)).parentElement;
    expect(columna).toHaveClass("min-w-0", "flex-1", "[overflow-wrap:anywhere]");
    const copa = container.querySelector("svg");
    expect(copa).toHaveAttribute("aria-hidden", "true");
    expect(copa).toHaveClass("shrink-0");
  });
});
