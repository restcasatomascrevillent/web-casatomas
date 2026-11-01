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
import { translations as en } from "@/i18n/languages/en";
import { translations as es } from "@/i18n/languages/es";
import { translations as fr } from "@/i18n/languages/fr";
import { parsearBotonesNovedad, parsearMenuNovedad, tituloSeccion } from "@/lib/menu-novedad";
// Fixtures canónicos del plan técnico de «Maridajes y catas»: copias idénticas
// de las del panel (src/lib/__tests__/fixtures/), que las escribe tal cual.
import FIXTURE_CATA from "./fixtures/menu-novedad-v2-cata.json";
import FIXTURE_MARIDAJE from "./fixtures/menu-novedad-v2-maridaje.json";
import FIXTURE_TITULOS from "./fixtures/menu-novedad-titulos.json";

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

/** Copia profunda para cambiar un fixture sin tocar el original. */
const copia = <T,>(valor: T): T => JSON.parse(JSON.stringify(valor)) as T;

describe("parsearMenuNovedad · v1 (L1)", () => {
  it("la v1 sale igual que hoy: tipo menú, sin maridajes y sin cata", () => {
    const menu = parsearMenuNovedad(MENU, "es", "nov");
    expect(menu).toEqual({
      estructurado: true,
      tipo: "menu",
      secciones: {
        primero: [expect.objectContaining({ id: "l1" }), expect.objectContaining({ id: "l2" })],
        segundo: [expect.objectContaining({ id: "l3" })],
        postre: [],
      },
      bebidas: [expect.objectContaining({ id: "l4" })],
      maridajes: {},
      cata: [],
      extras: [],
    });
  });

  it("sin versión o con la 1, se ignoran tipo, maridaje y cata aunque vengan", () => {
    const conClavesV2 = copia(FIXTURE_MARIDAJE) as Record<string, unknown>;
    conClavesV2.version = 1;
    const menu = parsearMenuNovedad(conClavesV2, "es", "nov");
    expect(menu?.tipo).toBe("menu");
    expect(menu?.maridajes).toEqual({});
    expect(menu?.secciones.primero.map((item) => item.nombre)).toEqual(["Gamba roja de Santa Pola"]);

    // Una «cata» sin versión es un menú; sin platos, no hay nada que pintar.
    const { version: _version, ...cataSinVersion } = copia(FIXTURE_CATA);
    expect(parsearMenuNovedad(cataSinVersion, "es")).toBeNull();
    expect(parsearMenuNovedad({ ...copia(FIXTURE_CATA), version: "2" }, "es")).toBeNull();
  });
});

describe("parsearMenuNovedad · v2 menú con maridaje (fixture canónico)", () => {
  it("castellano: cada plato con su bebida, por el id del plato; el plato sin bebida, sin línea", () => {
    const menu = parsearMenuNovedad(FIXTURE_MARIDAJE, "es", "nov");
    expect(menu?.tipo).toBe("menu");
    expect(menu?.secciones.primero.map((item) => item.id)).toEqual(["p1"]);
    expect(menu?.maridajes).toEqual({
      p1: { id: "m1", nombre: "Cava brut nature", descripcion: "Bien frío", sulfitos: true },
      d1: { id: "m2", nombre: "Fondillón", descripcion: null, sulfitos: true },
    });
    expect(menu?.maridajes.s1).toBeUndefined();
    expect(menu?.bebidas.map((item) => item.nombre)).toEqual(["Agua mineral"]);
    expect(menu?.cata).toEqual([]);
  });

  it("inglés: el plato y su bebida traducidos; sin traducción, en castellano", () => {
    const menu = parsearMenuNovedad(FIXTURE_MARIDAJE, "en", "nov");
    expect(menu?.secciones.primero[0]).toMatchObject({ nombre: "Santa Pola red prawn", descripcion: "Grilled" });
    expect(menu?.maridajes.p1).toMatchObject({ nombre: "Brut nature cava", descripcion: "Well chilled" });
    expect(menu?.maridajes.d1).toMatchObject({ nombre: "Fondillón", descripcion: null });
  });

  it("francés: la bebida en francés, campo a campo", () => {
    const menu = parsearMenuNovedad(FIXTURE_MARIDAJE, "fr", "nov");
    expect(menu?.secciones.primero[0].nombre).toBe("Crevette rouge de Santa Pola");
    expect(menu?.maridajes.p1).toMatchObject({ nombre: "Cava brut nature", descripcion: "Bien frais" });
    expect(menu?.maridajes.d1.nombre).toBe("Fondillón");
  });

  it("se ignora el maridaje sin `maridaje: true`", () => {
    for (const maridaje of [false, "true", 1, undefined]) {
      const menu = parsearMenuNovedad({ ...copia(FIXTURE_MARIDAJE), maridaje }, "es");
      expect(menu?.maridajes).toEqual({});
      expect(menu?.secciones.postre.map((item) => item.nombre)).toEqual(["Turrón de Jijona"]);
    }
  });

  it("maridaje null o sin nombre: el plato sale sin línea; sulfitos solo con true; ids de respaldo", () => {
    const crudo = copia(FIXTURE_MARIDAJE);
    crudo.secciones.primero[0].maridaje = null;
    Object.assign(crudo.secciones.segundo[0], { id: null, maridaje: { nombre: "Tinto joven", sulfitos: "true" } });
    Object.assign(crudo.secciones.postre[0], { maridaje: { id: "m2", nombre: "   ", sulfitos: true } });
    Object.assign(crudo.secciones.bebidas[0], { maridaje: { id: "x", nombre: "No cuenta" } });
    const menu = parsearMenuNovedad(crudo, "es", "nov");
    // El plato sin id recibe `${idNovedad}-${seccion}-${indice}` y su bebida, esa clave.
    expect(menu?.secciones.segundo[0].id).toBe("nov-segundo-0");
    expect(menu?.maridajes).toEqual({
      "nov-segundo-0": { id: "nov-segundo-0-maridaje", nombre: "Tinto joven", descripcion: null, sulfitos: false },
    });
    expect(menu?.secciones.primero).toHaveLength(1);
    expect(menu?.bebidas.map((item) => item.nombre)).toEqual(["Agua mineral"]);
  });

  it("tipo desconocido o versión mayor que 2: se lee igual, en lo que se pueda", () => {
    expect(parsearMenuNovedad({ ...copia(FIXTURE_MARIDAJE), tipo: "degustacion" }, "es")?.tipo).toBe("menu");
    const v3 = parsearMenuNovedad({ ...copia(FIXTURE_MARIDAJE), version: 3 }, "es");
    expect(Object.keys(v3?.maridajes ?? {})).toEqual(["p1", "d1"]);
  });

  it("acepta el jsonb llegado como texto", () => {
    expect(parsearMenuNovedad(JSON.stringify(FIXTURE_MARIDAJE), "es")?.maridajes.p1.nombre).toBe("Cava brut nature");
  });
});

describe("parsearMenuNovedad · v2 cata (fixture canónico)", () => {
  it("una cata sin comida es válida: las líneas en orden, con sus sulfitos", () => {
    const menu = parsearMenuNovedad(FIXTURE_CATA, "es", "nov");
    expect(menu).toEqual({
      estructurado: true,
      tipo: "cata",
      secciones: { primero: [], segundo: [], postre: [] },
      bebidas: [],
      maridajes: {},
      cata: [
        { id: "c1", nombre: "Whisky de malta 12 años", descripcion: null, sulfitos: false },
        // Con refId de la carta: se pinta el nombre copiado, esté o no en la carta.
        { id: "c2", nombre: "Fondillón", descripcion: "Alicante, dulce", sulfitos: true },
        { id: "c3", nombre: "Ginebra de Mahón", descripcion: null, sulfitos: false },
      ],
      extras: [],
    });
  });

  it("inglés y francés: traducción donde la hay y castellano de respaldo", () => {
    expect(parsearMenuNovedad(FIXTURE_CATA, "en")?.cata.map((linea) => linea.nombre)).toEqual([
      "12-year-old malt whisky",
      "Fondillón",
      "Ginebra de Mahón",
    ]);
    const fr = parsearMenuNovedad(FIXTURE_CATA, "fr")?.cata;
    expect(fr?.map((linea) => linea.nombre)).toEqual(["Whisky de malta 12 años", "Fondillón", "Ginebra de Mahón"]);
    expect(fr?.[1].descripcion).toBe("Alicante, dulce");
  });

  it("no mira primero, segundo, postre ni bebidas (L5)", () => {
    const crudo = copia(FIXTURE_CATA) as Record<string, unknown> & { secciones: Record<string, unknown> };
    crudo.incluye_bebidas = true;
    crudo.maridaje = true;
    crudo.secciones.primero = [linea("x1", "Plato que no cuenta", { maridaje: { nombre: "Tampoco" } })];
    crudo.secciones.bebidas = [linea("x2", "Agua")];
    const menu = parsearMenuNovedad(crudo, "es");
    expect(menu?.secciones).toEqual({ primero: [], segundo: [], postre: [] });
    expect(menu?.bebidas).toEqual([]);
    expect(menu?.maridajes).toEqual({});
    expect(menu?.cata).toHaveLength(3);
  });

  it("líneas sin nombre u origen raro: se descartan o se leen; sulfitos solo con true", () => {
    const crudo = copia(FIXTURE_CATA) as { secciones: { cata: unknown[] } };
    crudo.secciones.cata = [
      null,
      "Ron",
      { id: "z", nombre: "  " },
      { nombre: " Vermut ", origen: "otro", sulfitos: "true", descripcion: "  " },
    ];
    expect(parsearMenuNovedad(crudo, "es", "nov")?.cata).toEqual([
      { id: "nov-cata-3", nombre: "Vermut", descripcion: null, sulfitos: false },
    ]);
  });

  it("una cata vacía da null (y «Ver menú» no sale), aunque traiga platos", () => {
    for (const cata of [[], undefined, null, "Whisky", [{ nombre: "" }]]) {
      const crudo = copia(FIXTURE_CATA) as { secciones: Record<string, unknown> };
      crudo.secciones.cata = cata;
      crudo.secciones.primero = [linea("x1", "Plato que no cuenta")];
      expect(parsearMenuNovedad(crudo, "es")).toBeNull();
    }
  });
});

describe("i18n de maridajes y catas", () => {
  it("prefijo del maridaje, título de la cata y aviso de sulfitos en los tres idiomas", () => {
    expect(es.novedades.botones).toMatchObject({
      prefijoMaridaje: "Maridaje:",
      cata: "Cata",
      contieneSulfitos: "Contiene sulfitos",
    });
    expect(en.novedades.botones).toMatchObject({
      prefijoMaridaje: "Pairing:",
      cata: "Tasting",
      contieneSulfitos: "Contains sulphites",
    });
    expect(fr.novedades.botones).toMatchObject({
      prefijoMaridaje: "Accord :",
      cata: "Dégustation",
      contieneSulfitos: "Contient des sulfites",
    });
  });
});

describe("tituloSeccion y titulos (historia 40a3221d)", () => {
  const conTitulos = (titulos: unknown, extra: Record<string, unknown> = {}) => ({
    ...(FIXTURE_TITULOS as Record<string, unknown>),
    titulos,
    ...extra,
  });

  it("C1: primero con trim y en los tres idiomas", () => {
    expect(tituloSeccion(FIXTURE_TITULOS, "primero", "es")).toBe("Para picar");
    expect(tituloSeccion(FIXTURE_TITULOS, "primero", "en")).toBe("To share");
    expect(tituloSeccion(FIXTURE_TITULOS, "primero", "fr")).toBe("À partager");
  });

  it("C2: cae al español si en/fr están vacíos, en blanco o no son texto", () => {
    expect(tituloSeccion(FIXTURE_TITULOS, "segundo", "en")).toBe("Del mar y de la brasa");
    expect(tituloSeccion(FIXTURE_TITULOS, "segundo", "fr")).toBe("Del mar y de la brasa");
    expect(tituloSeccion(FIXTURE_TITULOS, "bebidas", "en")).toBe("Vinos y aguas");
  });

  it("C3: sin español válido la entrada se ignora aunque traiga en/fr", () => {
    for (const idioma of ["es", "en", "fr"] as const) {
      expect(tituloSeccion(FIXTURE_TITULOS, "postre", idioma)).toBeNull();
    }
    const menu = parsearMenuNovedad(FIXTURE_TITULOS, "en", "n");
    expect(menu?.titulos).toEqual({ primero: "To share", segundo: "Del mar y de la brasa", bebidas: "Vinos y aguas" });
    expect(menu?.titulos).not.toHaveProperty("postre");
  });

  it.each([
    ["ausente", undefined],
    ["null", null],
    ["array", [{ es: "X" }]],
    ["texto", "Para picar"],
    ["número", 4],
    ["entrada en texto", { primero: "Para picar" }],
    ["es numérico", { primero: { es: 5, en: "To share" } }],
    ["entrada array", { primero: ["Para picar"] }],
  ])("C3: titulos %s no crea título", (_, titulos) => {
    const menu = conTitulos(titulos);
    expect(tituloSeccion(menu, "primero", "es")).toBeNull();
    expect(tituloSeccion(menu, "primero", "en")).toBeNull();
    expect(parsearMenuNovedad(menu, "es", "n")?.titulos ?? {}).not.toHaveProperty("primero");
  });

  it("ignora claves desconocidas", () => {
    const menu = parsearMenuNovedad(conTitulos({ otra: { es: "X" }, primero: { es: "Y" } }), "es", "n");
    expect(menu?.titulos).toEqual({ primero: "Y" });
  });

  it("C4: los fixtures v1 y v2 existentes dan titulos vacío", () => {
    // Sin nombres propios la clave no existe: el objeto es idéntico al de antes.
    expect(parsearMenuNovedad(MENU, "es", "n")?.titulos ?? {}).toEqual({});
    expect(parsearMenuNovedad(FIXTURE_MARIDAJE, "fr", "n")?.titulos ?? {}).toEqual({});
    expect(parsearMenuNovedad(MENU, "es", "n")).not.toHaveProperty("titulos");
  });

  it("C4: una cata con titulos devuelve titulos vacío", () => {
    const cata = { ...(FIXTURE_CATA as Record<string, unknown>), titulos: { bebidas: { es: "X" } } };
    expect(parsearMenuNovedad(cata, "es", "n")?.titulos ?? {}).toEqual({});
  });

  it("C4: mismo resultado sin version, con 1 y con 2", () => {
    const base = FIXTURE_TITULOS as Record<string, unknown>;
    const { version: _v, tipo: _t, ...sinVersion } = base;
    const r = (m: unknown) => parsearMenuNovedad(m, "en", "n")?.titulos;
    expect(r(sinVersion)).toEqual(r({ ...sinVersion, version: 1 }));
    expect(r(sinVersion)).toEqual(r({ ...sinVersion, version: 2 }));
    expect(r(sinVersion)).toEqual({ primero: "To share", segundo: "Del mar y de la brasa", bebidas: "Vinos y aguas" });
  });

  it("C4: el menú como texto JSON también funciona", () => {
    expect(tituloSeccion(JSON.stringify(FIXTURE_TITULOS), "primero", "fr")).toBe("À partager");
    expect(parsearMenuNovedad(JSON.stringify(FIXTURE_TITULOS), "es", "n")?.titulos?.primero).toBe("Para picar");
  });
});
