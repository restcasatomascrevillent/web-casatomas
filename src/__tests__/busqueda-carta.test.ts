/**
 * Buscador de la carta (`src/lib/busqueda-carta.ts`): normalización y
 * coincidencias, sin React.
 */
import { describe, expect, it } from "vitest";
import {
  buscarBebidas,
  buscarPlatos,
  buscarVinos,
  coincide,
  fraseCoincidente,
  indexarBebidas,
  indexarPlatos,
  indexarVinos,
  normalizarBusqueda,
  terminosDeBusqueda,
  textoBuscable,
} from "@/lib/busqueda-carta";
import type { BebidaSSG, PlatoSSG, VinoSSG } from "@/lib/carta-ssg-types";
import type { CategoriaCarta } from "@/lib/carta-rutas";

describe("normalizarBusqueda", () => {
  it("ignora mayúsculas y tildes", () => {
    expect(normalizarBusqueda("Jamón Ibérico")).toBe("jamon iberico");
    expect(normalizarBusqueda("JAMON")).toBe(normalizarBusqueda("jamón"));
    expect(normalizarBusqueda("Crème brûlée")).toBe("creme brulee");
    expect(normalizarBusqueda("Piña")).toBe("pina");
    expect(normalizarBusqueda("Açaí")).toBe("acai");
  });

  it("«arròs» (valenciano) y «arroz» son la misma búsqueda", () => {
    expect(normalizarBusqueda("Arròs negre")).toBe("arroz negre");
    expect(normalizarBusqueda("ARROS")).toBe("arroz");
    expect(normalizarBusqueda("arroz")).toBe("arroz");
    // Solo la palabra entera: no toca otras que empiecen igual.
    expect(normalizarBusqueda("arrossejat")).toBe("arrossejat");
  });

  it("abre las ligaduras francesas y quita apóstrofos y puntos", () => {
    expect(normalizarBusqueda("Bœuf")).toBe("boeuf");
    expect(normalizarBusqueda("D.O. Rías Baixas")).toBe("do rias baixas");
    expect(normalizarBusqueda("Pig's ear")).toBe("pigs ear");
    expect(normalizarBusqueda("Moscato d’Asti")).toBe("moscato dasti");
  });

  it("los demás signos separan palabras y los espacios se colapsan", () => {
    expect(normalizarBusqueda("  Coca-Cola  Zero ")).toBe("coca cola zero");
    expect(normalizarBusqueda("Jamón 100% bellota")).toBe("jamon 100 bellota");
    expect(normalizarBusqueda("Vinos blancos — Rueda")).toBe("vinos blancos rueda");
  });

  it("vacío o nulo da cadena vacía", () => {
    expect(normalizarBusqueda(null)).toBe("");
    expect(normalizarBusqueda(undefined)).toBe("");
    expect(normalizarBusqueda("  —  ")).toBe("");
  });
});

describe("fraseCoincidente", () => {
  const nota = "Tinto de perfil maduro, con recuerdos de cereza. En boca es sabroso. Encaja con carnes asadas, un arròs de setas y quesos.";
  it("devuelve la frase que contiene la búsqueda (sin tildes, y arròs = arroz)", () => {
    expect(fraseCoincidente(nota, terminosDeBusqueda("arroz"))).toBe("Encaja con carnes asadas, un arròs de setas y quesos.");
    expect(fraseCoincidente(nota, terminosDeBusqueda("CEREZA"))).toBe("Tinto de perfil maduro, con recuerdos de cereza.");
  });
  it("nada si no coincide o no hay texto", () => {
    expect(fraseCoincidente(nota, terminosDeBusqueda("pulpo"))).toBeUndefined();
    expect(fraseCoincidente(undefined, terminosDeBusqueda("arroz"))).toBeUndefined();
    expect(fraseCoincidente(nota, [])).toBeUndefined();
  });
});

describe("terminosDeBusqueda y coincide", () => {
  it("parte la búsqueda en palabras normalizadas, sin repetir", () => {
    expect(terminosDeBusqueda("  Arroz   ARROZ Bogavante ")).toEqual(["arroz", "bogavante"]);
    expect(terminosDeBusqueda("")).toEqual([]);
    expect(terminosDeBusqueda("¿?")).toEqual([]);
  });

  it("cada palabra tiene que empezar alguna palabra del texto, y tienen que estar todas", () => {
    const texto = textoBuscable(["Arroz meloso de bogavante", ["bogavante", "caldo"]]);
    expect(coincide(texto, ["bogav"])).toBe(true);
    expect(coincide(texto, ["arroz", "bogavante"])).toBe(true);
    expect(coincide(texto, ["arroz", "rape"])).toBe(false);
    expect(coincide(textoBuscable(["Salmón"]), ["ron"])).toBe(false);
    expect(coincide(texto, [])).toBe(false);
  });
});

const platos: PlatoSSG[] = [
  { id: "1", nombre: "Croquetas de jamón ibérico", nombre_en: "Iberian Ham Croquettes", categoria: "ENTRANTES CALIENTES", categoria_en: "Hot starters", precio_eur: 12 },
  { id: "2", nombre: "Jamón 100% bellota", nombre_en: "100% Acorn-fed Iberian Ham", categoria: "ENTRANTES FRÍOS", categoria_en: "Cold starters", precio_eur: 28 },
  { id: "3", nombre: "Arroz meloso de bogavante", nombre_en: "Creamy Lobster Rice", descripcion: "Con caldo de marisco", descripcion_en: "With seafood stock", categoria: "ARROCES", categoria_en: "Rice dishes", precio_eur: 30 },
  { id: "4", nombre: "Arròs negre", categoria: "ARROCES", precio_eur: 24 },
  { id: "5", nombre: "Tarta de queso", ingredientes: ["queso", "nata", "galleta"], categoria: "POSTRES", precio_eur: 7 },
  { id: "6", nombre: "Arroz con leche", nombre_en: "Rice Pudding", categoria: "POSTRES", precio_eur: 6 },
  { id: "7", nombre: "Jamón sin página", categoria: "SIN PAGINA", precio_eur: 1 },
];

const categorias: CategoriaCarta[] = ["ENTRANTES FRÍOS", "ENTRANTES CALIENTES", "ARROCES", "POSTRES"].map((clave) => ({
  clave,
  slug: clave.toLowerCase(),
  total: 1,
}));

const resumen = (grupos: { clave: string; items: { id: string }[] }[]) =>
  grupos.map((grupo) => [grupo.clave, grupo.items.map((item) => item.id)]);

describe("buscarPlatos", () => {
  it("agrupa por categoría en el orden de la carta y respeta el orden de los platos", () => {
    const grupos = buscarPlatos(indexarPlatos(platos, "es"), terminosDeBusqueda("arroz"), categorias);
    expect(resumen(grupos)).toEqual([
      ["ARROCES", ["3", "4"]],
      ["POSTRES", ["6"]],
    ]);
  });

  it("«jamon» encuentra «jamón» y deja fuera los platos sin página de categoría", () => {
    const grupos = buscarPlatos(indexarPlatos(platos, "es"), terminosDeBusqueda("jamon"), categorias);
    expect(resumen(grupos)).toEqual([
      ["ENTRANTES FRÍOS", ["2"]],
      ["ENTRANTES CALIENTES", ["1"]],
    ]);
  });

  it("busca también en descripción, ingredientes y categoría", () => {
    const indice = indexarPlatos(platos, "es");
    expect(resumen(buscarPlatos(indice, terminosDeBusqueda("marisco"), categorias))).toEqual([["ARROCES", ["3"]]]);
    expect(resumen(buscarPlatos(indice, terminosDeBusqueda("galleta"), categorias))).toEqual([["POSTRES", ["5"]]]);
    expect(resumen(buscarPlatos(indice, terminosDeBusqueda("postres"), categorias))).toEqual([["POSTRES", ["5", "6"]]]);
  });

  it("en inglés busca en los nombres traducidos (y en el nombre original)", () => {
    const indice = indexarPlatos(platos, "en");
    expect(resumen(buscarPlatos(indice, terminosDeBusqueda("lobster"), categorias))).toEqual([["ARROCES", ["3"]]]);
    expect(resumen(buscarPlatos(indice, terminosDeBusqueda("seafood"), categorias))).toEqual([["ARROCES", ["3"]]]);
    expect(resumen(buscarPlatos(indice, terminosDeBusqueda("bogavante"), categorias))).toEqual([["ARROCES", ["3"]]]);
    // La descripción en castellano no cuenta si hay traducción.
    expect(buscarPlatos(indice, terminosDeBusqueda("caldo"), categorias)).toEqual([]);
    // El resultado ya viene traducido para pintarlo.
    expect(buscarPlatos(indice, terminosDeBusqueda("lobster"), categorias)[0].items[0].displayNombre).toBe("Creamy Lobster Rice");
  });

  it("sin palabras no hay resultados", () => {
    expect(buscarPlatos(indexarPlatos(platos, "es"), [], categorias)).toEqual([]);
  });
});

describe("buscarVinos y buscarBebidas", () => {
  const vinos: VinoSSG[] = [
    { id: "v1", nombre: "Pazo de Señoráns", categoria: "VINOS BLANCOS — RÍAS BAIXAS", denominacion_origen: "D.O. Rías Baixas", ubicacion_region: "Galicia", precio_eur: 30 },
    { id: "v2", nombre: "Muga Reserva", categoria: "VINOS TINTOS — RIOJA", categoria_en: "Red wines — Rioja", precio_eur: 35 },
    { id: "v3", nombre: "Moët Brut", categoria: "VINOS ESPUMOSOS — CHAMPAGNE", precio_eur: 80 },
    { id: "v4", nombre: "Albariño de Fefiñanes", categoria: "VINOS BLANCOS — RÍAS BAIXAS", precio_eur: 28 },
  ];

  it("vinos: agrupados por tipo (tintos, blancos, espumosos…) y buscables por D.O., región o categoría", () => {
    const indice = indexarVinos(vinos, "es");
    expect(resumen(buscarVinos(indice, terminosDeBusqueda("rias baixas")))).toEqual([["blanco", ["v1", "v4"]]]);
    expect(resumen(buscarVinos(indice, terminosDeBusqueda("galicia")))).toEqual([["blanco", ["v1"]]]);
    expect(resumen(buscarVinos(indice, terminosDeBusqueda("moet")))).toEqual([["espumoso", ["v3"]]]);
    expect(resumen(buscarVinos(indice, terminosDeBusqueda("vinos")))).toEqual([
      ["tinto", ["v2"]],
      ["blanco", ["v1", "v4"]],
      ["espumoso", ["v3"]],
    ]);
    expect(resumen(buscarVinos(indexarVinos(vinos, "en"), terminosDeBusqueda("red wines")))).toEqual([["tinto", ["v2"]]]);
  });

  it("marca los que solo coinciden por la descripción (p. ej. el maridaje), para enseñarla", () => {
    const conNota: VinoSSG[] = [
      { id: "n1", nombre: "Edoné Cuvée", categoria: "VINOS ESPUMOSOS — CAVA", descripcion: "Disfrútalo con langostinos o un arroz meloso.", precio_eur: 18 },
      { id: "n2", nombre: "Arroz Tinto (nombre de prueba)", categoria: "VINOS TINTOS — RIOJA", precio_eur: 10 },
    ];
    const grupos = buscarVinos(indexarVinos(conNota, "es"), terminosDeBusqueda("arroz"));
    expect(grupos.map((g) => [g.clave, g.porDescripcion])).toEqual([
      ["tinto", [false]],
      ["espumoso", [true]],
    ]);
  });

  it("bebidas: agrupadas por su categoría en el orden de la página; las nuevas, al final", () => {
    const bebidas: BebidaSSG[] = [
      { id: "b1", nombre: "Estrella Galicia", categoria: "Cervezas", categoria_en: "Beers", tamano: "33 cl", precio_eur: 3 },
      { id: "b2", nombre: "Agua mineral", categoria: "Aguas", categoria_en: "Waters", precio_eur: 2 },
      { id: "b3", nombre: "Galicia Kombucha", categoria: "Kombuchas", precio_eur: 4 },
    ];
    const indice = indexarBebidas(bebidas, "en");
    expect(resumen(buscarBebidas(indice, terminosDeBusqueda("galicia"), ["Aguas", "Cervezas"]))).toEqual([
      ["Cervezas", ["b1"]],
      ["Kombuchas", ["b3"]],
    ]);
    expect(resumen(buscarBebidas(indice, terminosDeBusqueda("beer"), ["Aguas", "Cervezas"]))).toEqual([["Cervezas", ["b1"]]]);
    expect(resumen(buscarBebidas(indexarBebidas(bebidas, "es"), terminosDeBusqueda("cerveza"), ["Aguas", "Cervezas"]))).toEqual([
      ["Cervezas", ["b1"]],
    ]);
  });
});
