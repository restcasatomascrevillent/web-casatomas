/**
 * `rutaPlato` y `anclaPlato` (`@/lib/carta-rutas`): adónde lleva «Échale un
 * vistazo» y con qué `#`.
 *
 * La carta es estática (SSG): solo tienen página y tarjeta los platos que
 * estaban en el último build. Un plato borrado, fuera de la carta o creado
 * después no puede llevar a ninguna parte, así que `rutaPlato` devuelve `null`
 * y el botón no se pinta (criterio 5 y riesgo 1 del plan).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("virtual:carta-ssg", () => ({
  default: {
    generadoEn: "2026-10-28T08:00:00.000Z",
    platos: [
      { id: "12", nombre: "Ensaladilla de pulpo", categoria: "ENTRANTES FRÍOS", precio_eur: 14 },
      { id: 7, nombre: "Arroz negro", categoria: "ARROCES", precio_eur: 18 },
      { id: "Plato_Raro 1", nombre: "Raro", categoria: "ARROCES", precio_eur: 9 },
      { id: "sin-categoria", nombre: "Huérfano", precio_eur: 5 },
      { id: "espacios", nombre: "Mal escrito", categoria: " POSTRES ", precio_eur: 5 },
    ],
    resumen: { vinos: { total: 0, categorias: [] }, bebidas: { total: 0, categorias: [] } },
  },
}));

import { anclaPlato, rutaPlato } from "@/lib/carta-rutas";

describe("anclaPlato", () => {
  it("plato- + id, solo con [a-z0-9-]", () => {
    expect(anclaPlato("12")).toBe("plato-12");
    expect(anclaPlato(7)).toBe("plato-7");
    expect(anclaPlato(" Plato_Raro 1 ")).toBe("plato-plato-raro-1");
    expect(anclaPlato("3f2a-ÑU")).toBe("plato-3f2a--u");
  });
});

describe("rutaPlato", () => {
  it("lleva a la categoría del plato con su ancla, en el idioma actual", () => {
    expect(rutaPlato("12")).toBe("/carta/entrantes-frios#plato-12");
    expect(rutaPlato("12", "es")).toBe("/carta/entrantes-frios#plato-12");
    expect(rutaPlato("12", "en")).toBe("/en/carta/entrantes-frios#plato-12");
    expect(rutaPlato("12", "fr")).toBe("/fr/carta/entrantes-frios#plato-12");
  });

  it("el id de BD puede ser número o texto", () => {
    expect(rutaPlato(7)).toBe("/carta/arroces#plato-7");
    expect(rutaPlato("7")).toBe("/carta/arroces#plato-7");
    expect(rutaPlato("Plato_Raro 1", "en")).toBe("/en/carta/arroces#plato-plato-raro-1");
  });

  it("plato borrado (plato_id NULL por la FK), vacío o que no está en el build: null", () => {
    for (const id of [null, undefined, "", "  ", "999", {}, ["12"]]) {
      expect(rutaPlato(id)).toBeNull();
    }
  });

  it("plato sin categoría o con una que no tiene página tal cual: null, nunca un enlace a una página sin él", () => {
    expect(rutaPlato("sin-categoria")).toBeNull();
    // `platosDeCategoria` compara la categoría exacta: " POSTRES " no saldría
    // en `/carta/postres`, así que el botón tampoco.
    expect(rutaPlato("espacios")).toBeNull();
  });
});
