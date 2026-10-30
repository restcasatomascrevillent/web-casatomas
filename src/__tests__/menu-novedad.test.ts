/**
 * Lectura de `novedades.botones` y `novedades.menu` (`@/lib/menu-novedad`).
 *
 * El panel escribe y la web lee. Lo que protegen estas pruebas:
 *  - Una fila de antes de la migración (sin columnas) o un valor raro no rompe
 *    la tarjeta: se lee como «sin botones» / «sin menú».
 *  - El orden de los botones es el que eligió el dueño, sin repetidos y como
 *    mucho dos.
 *  - Cada línea del menú sale en el idioma del visitante si tiene traducción
 *    y, si no, en castellano (criterio 7).
 *  - Bebidas solo si el dueño eligió «Comida + bebidas» (criterio 3).
 */
import { describe, expect, it } from "vitest";
import { parsearBotonesNovedad, parsearMenuNovedad } from "@/lib/menu-novedad";

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

/** Mismo ejemplo que el contrato del plan técnico. */
const MENU = {
  version: 1,
  incluye_bebidas: true,
  secciones: {
    primero: [
      linea("l1", "Ensaladilla de pulpo", {
        origen: "carta",
        platoId: "12",
        descripcion: "Con pan al carbón",
        alergenos: ["moluscos"],
        traducciones: {
          en: { nombre: "Octopus Russian salad", descripcion: "With charcoal bread" },
          fr: { nombre: "Salade russe au poulpe", descripcion: null },
        },
      }),
      linea("l2", "Sopa de picadillo"),
    ],
    segundo: [linea("l3", "Arroz con bogavante", { traducciones: { en: null, fr: { nombre: "  " } } })],
    postre: [],
    bebidas: [linea("l4", "Vino de la casa", { traducciones: { en: { nombre: "House wine", descripcion: null } } })],
  },
};

describe("parsearBotonesNovedad", () => {
  it("conserva el orden que eligió el dueño", () => {
    expect(parsearBotonesNovedad(["ver_menu", "llamar"])).toEqual(["ver_menu", "llamar"]);
    expect(parsearBotonesNovedad(["llamar", "ver_plato"])).toEqual(["llamar", "ver_plato"]);
  });

  it("columna ausente, null, texto u objeto: sin botones (novedades de antes, igual que hoy)", () => {
    for (const valor of [undefined, null, "", "llamar", { 0: "llamar" }, 3]) {
      expect(parsearBotonesNovedad(valor)).toEqual([]);
    }
    expect(parsearBotonesNovedad([])).toEqual([]);
  });

  it("ignora tipos desconocidos y repetidos, y se queda con los dos primeros válidos", () => {
    expect(parsearBotonesNovedad(["reservar", "llamar", "llamar", 7, null, "ver_plato", "ver_menu"])).toEqual([
      "llamar",
      "ver_plato",
    ]);
  });
});

describe("parsearMenuNovedad", () => {
  it("castellano: nombres y descripciones tal cual, sección vacía incluida", () => {
    const menu = parsearMenuNovedad(MENU, "es", "nov");
    expect(menu?.estructurado).toBe(true);
    expect(menu?.secciones.primero.map((item) => item.nombre)).toEqual(["Ensaladilla de pulpo", "Sopa de picadillo"]);
    expect(menu?.secciones.primero[0]).toMatchObject({ origen: "carta", platoId: "12", alergenos: ["moluscos"] });
    expect(menu?.secciones.postre).toEqual([]);
    expect(menu?.bebidas.map((item) => item.nombre)).toEqual(["Vino de la casa"]);
  });

  it("inglés: usa la traducción y, donde no la hay, el castellano", () => {
    const menu = parsearMenuNovedad(MENU, "en", "nov");
    expect(menu?.secciones.primero[0]).toMatchObject({
      nombre: "Octopus Russian salad",
      descripcion: "With charcoal bread",
    });
    // Escrito a mano y sin traducción: castellano.
    expect(menu?.secciones.primero[1].nombre).toBe("Sopa de picadillo");
    // `en: null`: castellano.
    expect(menu?.secciones.segundo[0].nombre).toBe("Arroz con bogavante");
    expect(menu?.bebidas[0].nombre).toBe("House wine");
  });

  it("francés: campo a campo (nombre traducido, descripción en castellano si falta; nombre en blanco no vale)", () => {
    const menu = parsearMenuNovedad(MENU, "fr", "nov");
    expect(menu?.secciones.primero[0]).toMatchObject({
      nombre: "Salade russe au poulpe",
      descripcion: "Con pan al carbón",
    });
    expect(menu?.secciones.segundo[0].nombre).toBe("Arroz con bogavante");
    expect(menu?.bebidas[0].nombre).toBe("Vino de la casa");
  });

  it("«Solo comida»: no hay bebidas aunque queden líneas guardadas", () => {
    const menu = parsearMenuNovedad({ ...MENU, incluye_bebidas: false }, "es");
    expect(menu?.bebidas).toEqual([]);
    expect(parsearMenuNovedad({ ...MENU, incluye_bebidas: "true" }, "es")?.bebidas).toEqual([]);
  });

  it("tolera secciones ausentes y líneas sin nombre", () => {
    const menu = parsearMenuNovedad(
      { incluye_bebidas: true, secciones: { segundo: [linea("a", "  "), linea("b", "Cordero"), "Lubina"] } },
      "es",
      "nov",
    );
    expect(menu?.secciones.primero).toEqual([]);
    expect(menu?.secciones.segundo.map((item) => item.nombre)).toEqual(["Cordero", "Lubina"]);
    expect(menu?.secciones.segundo[1].id).toBe("nov-segundo-2");
    expect(menu?.bebidas).toEqual([]);
  });

  it("acepta el jsonb llegado como texto", () => {
    expect(parsearMenuNovedad(JSON.stringify(MENU), "es")?.secciones.primero).toHaveLength(2);
  });

  it("sin nada que pintar devuelve null (y «Ver menú» no sale)", () => {
    for (const valor of [
      undefined,
      null,
      "",
      "no es json",
      [],
      { secciones: null },
      { secciones: [] },
      { incluye_bebidas: true, secciones: { primero: [], segundo: [], postre: [], bebidas: [linea("x", "Agua")] } },
    ]) {
      expect(parsearMenuNovedad(valor, "es")).toBeNull();
    }
  });
});
