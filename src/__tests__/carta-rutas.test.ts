/**
 * Las rutas de `/carta/:categoria` se derivan de los datos que el build
 * descarga de Supabase, no de una lista escrita a mano: el dueño edita la carta
 * desde el panel de administración y el siguiente build tiene que reflejarlo
 * sin que nadie toque código.
 *
 * Estos tests fijan ese contrato y, sobre todo, los casos raros que no se
 * pueden reproducir con los datos reales.
 */
import { describe, expect, it } from "vitest";
import { construirIndiceCategorias, slugificar } from "@/lib/carta-rutas";

const platos = (...categorias: (string | undefined)[]) => categorias.map((categoria) => ({ categoria }));

describe("slugificar", () => {
  it("quita acentos y pasa a minúsculas con guiones", () => {
    expect(slugificar("ENTRANTES FRÍOS")).toBe("entrantes-frios");
    expect(slugificar("NOVEDADES DEL DÍA")).toBe("novedades-del-dia");
    expect(slugificar("Tintos de verano")).toBe("tintos-de-verano");
  });

  it("colapsa símbolos y no deja guiones sueltos en los extremos", () => {
    expect(slugificar("  ¡Arroces & Paellas!  ")).toBe("arroces-paellas");
    expect(slugificar("Menú (degustación)")).toBe("menu-degustacion");
  });

  it("devuelve cadena vacía si no queda nada utilizable", () => {
    expect(slugificar("★★★")).toBe("");
  });
});

describe("construirIndiceCategorias", () => {
  const ORDEN = ["ARROCES", "PESCADOS"] as const;

  it("deriva las categorías de los datos, con su recuento", () => {
    const indice = construirIndiceCategorias(platos("ARROCES", "PESCADOS", "ARROCES"), ORDEN);
    expect(indice).toEqual([
      { clave: "ARROCES", slug: "arroces", total: 2 },
      { clave: "PESCADOS", slug: "pescados", total: 1 },
    ]);
  });

  it("una categoría sin platos no genera ruta", () => {
    // "PESCADOS" está en el orden conocido pero no aparece en ninguna fila:
    // su `.html` no se emite y Vercel responde con el 404 real.
    const indice = construirIndiceCategorias(platos("ARROCES"), ORDEN);
    expect(indice.map((c) => c.slug)).toEqual(["arroces"]);
  });

  it("sin platos devuelve una lista vacía en vez de romper", () => {
    expect(construirIndiceCategorias([], ORDEN)).toEqual([]);
  });

  it("ignora filas sin categoría o con la categoría en blanco", () => {
    const indice = construirIndiceCategorias(platos("ARROCES", undefined, "   "), ORDEN);
    expect(indice).toEqual([{ clave: "ARROCES", slug: "arroces", total: 1 }]);
  });

  it("una categoría nueva del panel aparece detrás, sin reordenar las conocidas", () => {
    const indice = construirIndiceCategorias(platos("PESCADOS", "TAPAS", "ARROCES"), ORDEN);
    expect(indice.map((c) => c.clave)).toEqual(["ARROCES", "PESCADOS", "TAPAS"]);
    expect(indice.map((c) => c.slug)).toEqual(["arroces", "pescados", "tapas"]);
  });

  it("no deja que una categoría robe los slugs de vinos o bebidas", () => {
    // Sin orden conocido las categorías nuevas van alfabéticamente.
    const indice = construirIndiceCategorias(platos("Vinos", "Bebidas"), []);
    expect(indice.map((c) => c.slug)).toEqual(["bebidas-2", "vinos-2"]);
  });

  it("desambigua dos categorías que slugifican igual", () => {
    // "Arroces" y "ARROCES" son categorías distintas para la BD.
    const indice = construirIndiceCategorias(platos("Arroces", "ARROCES"), []);
    expect(indice.map((c) => c.slug)).toEqual(["arroces", "arroces-2"]);
  });

  it("da un slug utilizable a una categoría cuyo nombre son solo símbolos", () => {
    const indice = construirIndiceCategorias(platos("★★★"), []);
    expect(indice[0].slug).toBe("categoria-1");
    expect(indice[0].clave).toBe("★★★");
  });
});
