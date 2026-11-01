/**
 * La carta del menú del día, tal y como la ve el visitante.
 *
 * `menu-dia.test.ts` ya cubre la LECTURA del jsonb. Aquí se prueba lo que se
 * PINTA, que es donde estaban los fallos que los tests de librería no veían:
 *
 *  - Los alérgenos no salen de entrada. El dueño primero dijo de quitarlos y
 *    luego rectificó ("déjalo como está, y lo de alérgenos lo pondría solo si
 *    entran a verlo"): van detrás de un gesto, disponibles pero no en primer
 *    plano.
 *  - Un plato ESCRITO A MANO enseña sus alérgenos igual que uno de la carta.
 *    Es el requisito literal del encargo.
 *  - Una foto que no carga cae en el rombo de la casa. Como el menú guarda una
 *    COPIA de la url, un menú viejo puede apuntar a un fichero ya borrado; sin
 *    esto el navegador pinta el recuadro roto del `<img>` (visto en el
 *    navegador, no en los tests).
 *  - Un menú heredado (v1) no repite "no consta" bajo cada plato.
 */
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import CartaDelDia from "@/components/espacios/CartaDelDia";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { parsearMenuDiario, type ItemMenu, type MenuDelDia } from "@/lib/menu-dia";

const FOTO = "https://ejemplo.test/storage/v1/object/public/platos/pulpo.webp";

const itemCarta = {
  id: "it-1",
  origen: "carta",
  platoId: "plato-1",
  nombre: "Ensaladilla de pulpo",
  descripcion: "Con pan al carbón",
  imagenUrl: FOTO,
  imagenPosicionY: 40,
  alergenos: ["gluten", "moluscos"],
  alergenosInferidos: ["sulfitos"],
  alergenosNotas: null,
};

const itemLibre = {
  id: "it-2",
  origen: "libre",
  platoId: null,
  nombre: "Sopa de picadillo de la casa",
  descripcion: null,
  imagenUrl: null,
  imagenPosicionY: null,
  alergenos: ["huevos"],
  alergenosInferidos: [],
  alergenosNotas: null,
};

const menuV2 = (): MenuDelDia => {
  const menu = parsearMenuDiario({
    id: "fila-1",
    fecha: "2026-09-29",
    menu: {
      v: 2,
      primero: "Ensaladilla de pulpo\nSopa de picadillo de la casa",
      segundo: "",
      postre: "",
      secciones: { primero: [itemCarta, itemLibre], segundo: [], postre: [] },
    },
  });
  if (!menu) throw new Error("el menú de prueba debería poder pintarse");
  return menu;
};

const menuV1 = (): MenuDelDia => {
  const menu = parsearMenuDiario({
    id: "fila-vieja",
    fecha: "2026-03-12",
    menu: { primero: "Ensalada de parmesano", segundo: "Codillo asado", postre: "Tarta de queso" },
  });
  if (!menu) throw new Error("el menú heredado debería poder pintarse");
  return menu;
};

const pintar = (menu: MenuDelDia) =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <CartaDelDia menu={menu} titulo={<h3>Menú de hoy</h3>} subtitulo="martes 29 septiembre" />
      </LanguageProvider>
    </MemoryRouter>,
  );

describe("CartaDelDia — los alérgenos están, pero no de entrada", () => {
  it("no enseña ningún alérgeno hasta que se abre el desplegable", () => {
    pintar(menuV2());

    // El nombre del plato sí se lee desde el primer momento.
    expect(screen.getByText("Ensaladilla de pulpo")).toBeInTheDocument();

    // El detalle existe en el DOM (es un <details>), pero CERRADO.
    const desplegables = screen.getAllByRole("group");
    expect(desplegables.length).toBeGreaterThan(0);
    for (const detalle of desplegables) {
      expect((detalle as HTMLDetailsElement).open).toBe(false);
    }
  });

  it("al abrirlo distingue lo declarado de lo deducido", () => {
    pintar(menuV2());
    const detalle = screen.getAllByRole("group")[0] as HTMLDetailsElement;

    fireEvent.click(within(detalle).getByText(/alérgenos/i, { selector: "summary, summary *" }));
    detalle.open = true;

    expect(within(detalle).getByText(/declarados por el restaurante/i)).toBeInTheDocument();
    expect(within(detalle).getByText(/deducidos de los ingredientes/i)).toBeInTheDocument();
    // Declarado y deducido no se mezclan en la misma lista.
    expect(within(detalle).getByText("Gluten")).toBeInTheDocument();
    expect(within(detalle).getByText("Sulfitos")).toBeInTheDocument();
  });
});

describe("CartaDelDia — un plato escrito a mano vale lo mismo que uno de la carta", () => {
  it("enseña los alérgenos del plato de texto libre", () => {
    pintar(menuV2());
    const detalles = screen.getAllByRole("group") as HTMLDetailsElement[];
    // El segundo plato es el escrito a mano.
    const detalleLibre = detalles[1];
    detalleLibre.open = true;

    expect(within(detalleLibre).getByText(/declarados por el restaurante/i)).toBeInTheDocument();
    // El panel guarda su forma canónica ("huevos"); la web la normaliza y la
    // pinta con SU etiqueta ("Huevo"). Que sean distintas es justo el contrato.
    expect(within(detalleLibre).getByText("Huevo")).toBeInTheDocument();
  });
});

describe("CartaDelDia — la foto no puede romper la carta", () => {
  it("una foto que no carga se sustituye por el rombo, no por el recuadro roto", () => {
    const { container } = pintar(menuV2());

    const foto = container.querySelector("img");
    expect(foto).not.toBeNull();
    expect(foto).toHaveAttribute("src", FOTO);

    // Lo que dispara el navegador cuando el fichero ya no está en el almacén.
    fireEvent.error(foto as HTMLImageElement);

    expect(container.querySelector("img")).toBeNull();
  });
});

describe("CartaDelDia — menú heredado (v1)", () => {
  it("no repite «no consta» bajo cada plato: lo dice una sola vez al pie", () => {
    pintar(menuV1());

    // Sin alérgenos por plato: no hay desplegables.
    expect(screen.queryAllByRole("group")).toHaveLength(0);
    // Y el aviso aparece exactamente una vez, al pie de todo el menú.
    expect(screen.getAllByText(/sin información de alérgenos/i)).toHaveLength(1);
  });
});

describe("CartaDelDia — secciones extra (Bebidas del menú de una novedad)", () => {
  const conExtra = (items: ItemMenu[]) =>
    render(
      <MemoryRouter>
        <LanguageProvider>
          <CartaDelDia
            menu={menuV2()}
            titulo={<h3>Menú de Navidad</h3>}
            seccionesExtra={[{ clave: "bebidas", titulo: "Bebidas", items }]}
          />
        </LanguageProvider>
      </MemoryRouter>,
    );

  it("se pinta detrás de las del menú, con el mismo formato", () => {
    conExtra([{ ...itemLibre, origen: "libre", id: "b-1", nombre: "Vino de la casa", alergenos: [] }]);
    const rotulos = screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(rotulos).toEqual(["Entrantes", "Bebidas"]);
    expect(screen.getByText("Vino de la casa")).toBeInTheDocument();
  });

  it("vacía no se pinta", () => {
    conExtra([]);
    expect(screen.queryByRole("heading", { name: "Bebidas" })).toBeNull();
  });
});

describe("CartaDelDia: titulosSecciones", () => {
  const conPostres = (): MenuDelDia => {
    const m = menuV2();
    return {
      ...m,
      secciones: {
        ...m.secciones,
        segundo: [itemLibre as ItemMenu],
        postre: [itemLibre as ItemMenu, itemCarta as ItemMenu],
      },
    };
  };
  const pintarCon = (titulos?: Partial<Record<"primero" | "segundo" | "postre", string>>) =>
    render(
      <MemoryRouter>
        <LanguageProvider>
          <CartaDelDia menu={conPostres()} titulo={<h3>Menú</h3>} titulosSecciones={titulos} />
        </LanguageProvider>
      </MemoryRouter>,
    );
  const h4s = () => screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);

  it("sin titulosSecciones, las etiquetas de siempre", () => {
    pintarCon();
    expect(h4s()).toEqual(["Entrantes", "Principales", "Postres"]);
  });

  it("con un parcial solo cambian las indicadas", () => {
    pintarCon({ segundo: "Del mar", postre: "Dulces" });
    expect(h4s()).toEqual(["Entrantes", "Del mar", "Dulces"]);
  });
});
