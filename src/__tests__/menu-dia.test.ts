/**
 * El menú del día se lee de una columna `jsonb` con DOS formatos vivos a la
 * vez, así que el contrato de lectura se fija aquí.
 *
 * Lo que estaba roto antes de estos tests: el normalizador devolvía el texto
 * entero ante un salto de línea, así que un "Primero" con dos platos escritos
 * en dos líneas se publicaba como un único bloque con un `\n` dentro.
 */
import { describe, expect, it } from "vitest";

import { alergenosDeItem, lineasDeTexto, parsearMenuDiario } from "@/lib/menu-dia";

const filaV1 = {
  id: "fila-v1",
  fecha: "2026-03-12",
  idiom: "es",
  menu: {
    primero: "Crema de calabaza asada\nBrocheta de pulpo y patata",
    segundo: "Arroz meloso de setas",
    postre: "Torrija caramelizada",
  },
};

const filaV2 = {
  id: "fila-v2",
  fecha: "2026-03-19",
  idiom: "es",
  menu: {
    v: 2,
    // Espejo heredado: el panel lo sigue escribiendo, pero manda `secciones`.
    primero: "ESPEJO QUE NO DEBE PINTARSE",
    segundo: "ESPEJO QUE NO DEBE PINTARSE",
    postre: "ESPEJO QUE NO DEBE PINTARSE",
    secciones: {
      primero: [
        {
          id: "linea-1",
          origen: "carta",
          platoId: "plato-7",
          nombre: "Ensalada templada de queso de cabra",
          descripcion: "Con nueces caramelizadas",
          imagenUrl: "https://ejemplo.test/foto.webp",
          imagenPosicionY: 140,
          alergenos: ["lácteos", "frutos de cáscara"],
          alergenosInferidos: ["sulfitos"],
          alergenosNotas: "Disponible sin nueces.",
        },
      ],
      segundo: [{ id: "linea-2", origen: "libre", nombre: "  Lomo de rape  " }],
      postre: [{ id: "linea-3", nombre: "" }],
    },
  },
};

describe("lineasDeTexto — el fallo del salto de línea", () => {
  it("parte por saltos de línea en vez de devolver el texto entero", () => {
    expect(lineasDeTexto("Ensalada\nSopa de marisco")).toEqual(["Ensalada", "Sopa de marisco"]);
  });

  it("aguanta \\r\\n, espacios sobrantes y líneas en blanco", () => {
    expect(lineasDeTexto("  Ensalada  \r\n\r\n Sopa \n")).toEqual(["Ensalada", "Sopa"]);
  });

  it("acepta array y array serializado dentro del texto", () => {
    expect(lineasDeTexto(["Ensalada", " Sopa "])).toEqual(["Ensalada", "Sopa"]);
    expect(lineasDeTexto('["Ensalada","Sopa"]')).toEqual(["Ensalada", "Sopa"]);
  });
});

describe("parsearMenuDiario — formato heredado (v1)", () => {
  const menu = parsearMenuDiario(filaV1);

  it("publica los dos platos de un mismo campo como dos líneas", () => {
    expect(menu?.secciones.primero.map((item) => item.nombre)).toEqual([
      "Crema de calabaza asada",
      "Brocheta de pulpo y patata",
    ]);
  });

  it("se marca como NO estructurado (no hay fotos ni alérgenos que enseñar)", () => {
    expect(menu?.estructurado).toBe(false);
    expect(menu?.secciones.postre[0].imagenUrl).toBeNull();
    expect(menu?.secciones.postre[0].alergenos).toEqual([]);
  });

  it("lee igual si el jsonb llega como texto JSON", () => {
    const comoTexto = parsearMenuDiario({ ...filaV1, menu: JSON.stringify(filaV1.menu) });
    expect(comoTexto?.secciones.primero).toHaveLength(2);
  });
});

describe("parsearMenuDiario — formato estructurado (v2)", () => {
  const menu = parsearMenuDiario(filaV2);

  it("manda `secciones` y NO el espejo heredado", () => {
    expect(menu?.estructurado).toBe(true);
    expect(menu?.secciones.primero.map((item) => item.nombre)).toEqual([
      "Ensalada templada de queso de cabra",
    ]);
    expect(menu?.secciones.segundo.map((item) => item.nombre)).toEqual(["Lomo de rape"]);
  });

  it("descarta las líneas sin nombre en vez de pintar un hueco", () => {
    expect(menu?.secciones.postre).toEqual([]);
  });

  it("recorta el encuadre de la foto a 0..100", () => {
    expect(menu?.secciones.primero[0].imagenPosicionY).toBe(100);
  });

  it("mantiene separados los alérgenos declarados y los deducidos", () => {
    const datos = alergenosDeItem(menu!.secciones.primero[0]);
    expect(datos.oficiales).toEqual(["lácteos", "frutos de cáscara"]);
    expect(datos.inferidos).toEqual(["sulfitos"]);
    expect(datos.notas).toBe("Disponible sin nueces.");
  });

  it("cae al espejo heredado si `secciones` viene vacío", () => {
    const menuVacio = parsearMenuDiario({
      ...filaV2,
      menu: {
        v: 2,
        primero: "Crema de calabaza\nBrocheta de pulpo",
        secciones: { primero: [], segundo: [], postre: [] },
      },
    });
    expect(menuVacio?.estructurado).toBe(false);
    expect(menuVacio?.secciones.primero).toHaveLength(2);
  });
});

describe("parsearMenuDiario — filas que no se pueden publicar", () => {
  it("descarta una fecha inválida", () => {
    expect(parsearMenuDiario({ ...filaV1, fecha: "no-es-fecha" })).toBeNull();
  });

  it("descarta un menú sin ningún plato", () => {
    expect(parsearMenuDiario({ ...filaV1, menu: { primero: "", segundo: null } })).toBeNull();
    expect(parsearMenuDiario({ ...filaV1, menu: null })).toBeNull();
  });
});
