import { describe, expect, it } from "vitest";
import {
  normalizarUnidadPlato,
  gramosDeUnidad,
  opcionesUnidadPlato,
  guardarUnidadPlato,
  descomponerUnidad,
} from "../unidades-platos";

describe("unidades canónicas de platos", () => {
  it.each(["unidad", " Unidad ", "UNIDADES", "ud.", "uds", "pieza"])(
    "normaliza %s",
    (valor) => {
      expect(normalizarUnidadPlato(valor)).toBe("Unidad");
    },
  );
  it("agrupa variantes sin opciones duplicadas, manteniendo otras formas de venta", () => {
    expect(
      opcionesUnidadPlato([
        "Unidad",
        "unidad",
        "UD",
        "100g",
        "150 gramos",
        " KG ",
        "ración",
        "RACIONES",
      ]),
    ).toEqual(["Unidad", "kg", "gramos", "Ración"]);
  });
  it("conserva el peso y transforma las formas históricas", () => {
    expect(normalizarUnidadPlato("150gramos")).toBe("150 g");
    expect(gramosDeUnidad("100 G")).toBe(100);
    expect(descomponerUnidad("200g")).toEqual({
      unidad: "gramos",
      gramos: 200,
    });
    expect(guardarUnidadPlato("gramos", 150)).toBe("150 g");
    expect(() => guardarUnidadPlato("gramos", 0)).toThrow();
    expect(() => guardarUnidadPlato("gramos", NaN)).toThrow();
    expect(normalizarUnidadPlato("g")).toBe("1 g");
  });
});

import {
  configUnidad,
  importeLinea,
  formatearCantidadLinea,
  sufijoPrecio,
} from "../mi-mesa";
it("calcula gramos con el peso del precio y no con una base fija de 100 g", () => {
  expect(configUnidad("150gramos").defecto).toBe(150);
  expect(
    importeLinea({
      nombre: "Jamón",
      unidad: "150 g",
      precio_eur: 12,
      cantidad: 300,
    }),
  ).toBe(24);
  expect(
    importeLinea({
      nombre: "Jamón",
      unidad: "100g",
      precio_eur: 6,
      cantidad: 150,
    }),
  ).toBe(9);
  expect(
    importeLinea({
      nombre: "Carne",
      unidad: "KG",
      precio_eur: 50,
      cantidad: 1.2,
    }),
  ).toBe(60);
  expect(formatearCantidadLinea({ unidad: "150 G", cantidad: 300 }, "es")).toBe(
    "300 g",
  );
  expect(sufijoPrecio("150gramos")).toBe("/150 g");
});
