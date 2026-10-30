/**
 * CartaDelDia con las props opcionales del menú de una novedad (historia
 * «Maridajes y catas en el menú de las novedades», C3 y C5 en la web):
 *
 *  - `maridajes`: la bebida va bajo SU plato, al final de la columna de texto
 *    (alineada con el nombre); los platos sin maridaje no llevan línea.
 *  - `seccionesExtra` con `lineas`: la cata, en una lista ordenada.
 *  - Sin esas props, el HTML es exactamente el de siempre (el menú del día no
 *    cambia; `CartaDelDia.test.tsx` lo cubre sin tocarlo).
 */
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import CartaDelDia from "@/components/espacios/CartaDelDia";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { parsearMenuNovedad, type MenuNovedad } from "@/lib/menu-novedad";

import FIXTURE_CATA from "./fixtures/menu-novedad-v2-cata.json";
import FIXTURE_MARIDAJE from "./fixtures/menu-novedad-v2-maridaje.json";

/** Por el texto entero del párrafo: el prefijo «Maridaje:» va en su propio `<span>`. */
const textoDe = (texto: string) => (_: string, nodo: Element | null) =>
  nodo?.tagName === "P" && nodo.textContent === texto;

const leer = (valor: unknown): MenuNovedad => {
  const menu = parsearMenuNovedad(valor, "es", "n");
  if (!menu) throw new Error("el fixture debería leerse");
  return menu;
};

const pintar = (ui: React.ReactNode) =>
  render(
    <MemoryRouter>
      <LanguageProvider initialLanguage="es">{ui}</LanguageProvider>
    </MemoryRouter>,
  );

/** El `<li>` del plato con ese nombre. */
const filaDe = (nombre: string) => {
  const li = screen.getByText(nombre).closest("li");
  if (!li) throw new Error(`sin fila para ${nombre}`);
  return li;
};

describe("CartaDelDia — maridajes y cata", () => {
  it("maridaje: la bebida va bajo su plato, tras el nombre y en su misma columna", () => {
    const menu = leer(FIXTURE_MARIDAJE);
    pintar(
      <CartaDelDia
        menu={menu}
        titulo={<h3>Menú maridaje</h3>}
        maridajes={menu.maridajes}
        seccionesExtra={[{ clave: "bebidas", titulo: "Bebidas", items: menu.bebidas }]}
      />,
    );

    const gamba = filaDe("Gamba roja de Santa Pola");
    const linea = gamba.querySelector("[data-linea-bebida='maridaje']");
    expect(linea).not.toBeNull();
    expect(within(gamba).getByText(textoDe("Maridaje: Cava brut nature"))).toBeInTheDocument();
    expect(within(gamba).getByText("Bien frío")).toBeInTheDocument();
    expect(within(gamba).getByText("Contiene sulfitos")).toBeInTheDocument();

    // Misma columna que el nombre (mismo borde izquierdo) y después de él.
    const nombre = within(gamba).getByText("Gamba roja de Santa Pola");
    expect(linea?.parentElement).toBe(nombre.parentElement);
    expect(nombre.compareDocumentPosition(linea as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Y después de los alérgenos plegados del plato.
    const alergenos = gamba.querySelector("details");
    expect(alergenos?.compareDocumentPosition(linea as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    const turron = filaDe("Turrón de Jijona");
    expect(within(turron).getByText(textoDe("Maridaje: Fondillón"))).toBeInTheDocument();

    // Sin maridaje: ni el arroz ni las bebidas llevan línea.
    expect(filaDe("Arroz a banda").querySelector("[data-linea-bebida]")).toBeNull();
    expect(filaDe("Agua mineral").querySelector("[data-linea-bebida]")).toBeNull();
    expect(screen.getAllByText(/^Maridaje:/)).toHaveLength(2);
  });

  it("sin `maridajes` (o vacío) el HTML es el de siempre", () => {
    const menu = leer(FIXTURE_MARIDAJE);
    const sin = pintar(<CartaDelDia menu={menu} titulo={<h3>Menú</h3>} />);
    const htmlSin = sin.container.innerHTML;
    expect(sin.container.querySelector("[data-linea-bebida]")).toBeNull();
    expect(sin.container).not.toHaveTextContent("Maridaje");
    sin.unmount();

    const vacio = pintar(<CartaDelDia menu={menu} titulo={<h3>Menú</h3>} maridajes={{}} />);
    expect(vacio.container.innerHTML).toBe(htmlSin);
  });

  it("cata: sección con las bebidas en una lista ordenada y en su orden", () => {
    const menu = leer(FIXTURE_CATA);
    const { container } = pintar(
      <CartaDelDia
        menu={menu}
        titulo={<h3>Cata de destilados</h3>}
        seccionesExtra={[{ clave: "cata", titulo: "Cata", lineas: menu.cata }]}
      />,
    );

    const seccion = screen.getByRole("heading", { name: "Cata" }).closest("section");
    if (!seccion) throw new Error("sin sección Cata");
    const lista = within(seccion).getByRole("list");
    expect(lista.tagName).toBe("OL");
    const filas = within(lista).getAllByRole("listitem");
    expect(filas.map((fila) => fila.querySelector("p")?.textContent)).toEqual([
      "Whisky de malta 12 años",
      "Fondillón",
      "Ginebra de Mahón",
    ]);
    // Solo el Fondillón declara sulfitos.
    expect(within(filas[1]).getByText("Contiene sulfitos")).toBeInTheDocument();
    expect(within(filas[0]).queryByText("Contiene sulfitos")).toBeNull();
    expect(within(filas[2]).queryByText("Contiene sulfitos")).toBeNull();
    // En la cata no hay prefijo ni platos.
    expect(container).not.toHaveTextContent("Maridaje");
    expect(container.querySelectorAll("section")).toHaveLength(1);
  });

  it("una sección de líneas vacía no se pinta", () => {
    const menu = leer(FIXTURE_MARIDAJE);
    pintar(
      <CartaDelDia
        menu={menu}
        titulo={<h3>Menú</h3>}
        seccionesExtra={[{ clave: "cata", titulo: "Cata", lineas: [] }]}
      />,
    );
    expect(screen.queryByRole("heading", { name: "Cata" })).toBeNull();
  });
});
