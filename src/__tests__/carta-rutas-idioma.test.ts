/**
 * Parte de `carta-rutas.ts` añadida para el multi-idioma en subcarpeta:
 * `rutaCategoria`/`rutasDeCategorias` con prefijo por idioma, y
 * `etiquetaCategoriaIdioma`.
 *
 * Va en un fichero aparte de `carta-rutas.test.ts` a propósito, para no pisar
 * los tests de `construirIndiceCategorias`/`slugificar` que ya vivían ahí.
 *
 * En el entorno de test `virtual:carta-ssg` se sirve vacío (ver
 * `vitest.config.ts`), así que `cartaSSG.platos` no tiene ningún plato real:
 * lo que se puede fijar aquí es el contrato de prefijo de `rutaCategoria` y el
 * de CAÍDA de `etiquetaCategoriaIdioma` cuando no hay plato que traducir — no
 * la traducción en sí, que depende de datos reales del build.
 */
import { describe, expect, it } from "vitest";
import { etiquetaCategoriaIdioma, rutaCategoria, rutasDeCategorias } from "@/lib/carta-rutas";

describe("rutaCategoria — prefijo por idioma", () => {
  it("español: sin prefijo (por defecto y explícito)", () => {
    expect(rutaCategoria("entrantes-frios")).toBe("/carta/entrantes-frios");
    expect(rutaCategoria("entrantes-frios", "es")).toBe("/carta/entrantes-frios");
  });

  it("inglés y francés: con su prefijo, mismo slug", () => {
    expect(rutaCategoria("entrantes-frios", "en")).toBe("/en/carta/entrantes-frios");
    expect(rutaCategoria("entrantes-frios", "fr")).toBe("/fr/carta/entrantes-frios");
  });
});

describe("rutasDeCategorias — rutas absolutas para getStaticPaths", () => {
  it("sin categorías (build de test, virtual:carta-ssg vacío) no rompe: lista vacía", () => {
    expect(rutasDeCategorias("es")).toEqual([]);
    expect(rutasDeCategorias("en")).toEqual([]);
    expect(rutasDeCategorias("fr")).toEqual([]);
  });
});

describe("etiquetaCategoriaIdioma — cae a la etiqueta en español cuando no hay plato", () => {
  // Con `virtual:carta-ssg` vacío ninguna categoría tiene plato real: es
  // exactamente el caso "categoría sin plato" que documenta la función.
  it("es: siempre la etiqueta en español, sin mirar ningún plato", () => {
    expect(etiquetaCategoriaIdioma("ENTRANTES FRÍOS", "es")).toBe("Entrantes fríos");
  });

  it("en/fr sin plato disponible: cae a la etiqueta en español en vez de dejar un hueco", () => {
    expect(etiquetaCategoriaIdioma("ENTRANTES FRÍOS", "en")).toBe("Entrantes fríos");
    expect(etiquetaCategoriaIdioma("ENTRANTES FRÍOS", "fr")).toBe("Entrantes fríos");
  });
});
