/**
 * El filtro dietético de la carta es una afirmación sobre la SALUD de quien
 * lee la web, así que su contrato se fija aquí y no en la interfaz.
 *
 * Lo que se estaba publicando antes de estos tests:
 *  - 9 platos sin ningún alérgeno registrado se ofrecían como aptos para
 *    celíacos, incluido uno cuya única nota dice "Para los alérgenos consultar
 *    al personal";
 *  - la comparación era `alergeno.includes("gluten")`, así que un alérgeno
 *    personalizado escrito como "sin gluten" excluía el plato justo al revés;
 *  - `alergenos_inferidos` y `alergenos_notas` se pintaban en la tarjeta pero
 *    el filtro no los miraba.
 */
import { describe, expect, it } from "vitest";
import {
  claveAlergeno,
  cumpleFiltroDietetico,
  datosAlergenos,
  etiquetaAlergeno,
  normalizeAlergenos,
  tieneInformacionAlergenos,
} from "@/lib/alergenos";
import { resolveTranslatedItem } from "@/lib/carta-i18n";

/** Atajo: lo que `CartaPlatos` le pasa al filtro para un plato cualquiera. */
const plato = (campos: Record<string, unknown>) => datosAlergenos(campos);

describe("filtro de celiaquía", () => {
  it("NO ofrece un plato sin información de alérgenos", () => {
    // El caso que motivó todo: sin datos no se puede afirmar que sea apto.
    const sinDatos = plato({ nombre: "Tosta de sardina" });
    expect(tieneInformacionAlergenos(sinDatos)).toBe(false);
    expect(cumpleFiltroDietetico(sinDatos, "celiaquia")).toBe(false);
  });

  it("NO ofrece un plato cuya única pista es 'consultar al personal'", () => {
    const soloNota = plato({
      alergenos_oficiales: [],
      alergenos_notas: "Para los alérgenos consultar al personal",
    });
    expect(tieneInformacionAlergenos(soloNota)).toBe(false);
    expect(cumpleFiltroDietetico(soloNota, "celiaquia")).toBe(false);
  });

  it("NO ofrece un plato con gluten declarado", () => {
    expect(cumpleFiltroDietetico(plato({ alergenos_oficiales: ["gluten"] }), "celiaquia")).toBe(
      false,
    );
  });

  it("SÍ ofrece un plato con alérgenos declarados en los que no está el gluten", () => {
    const apto = plato({ alergenos_oficiales: ["pescado", "sulfitos"] });
    expect(cumpleFiltroDietetico(apto, "celiaquia")).toBe(true);
  });

  it("un alérgeno personalizado escrito 'sin gluten' NO excluye el plato", () => {
    // Con `includes("gluten")` este plato desaparecía del filtro de celiaquía
    // aunque su ficha estuviera diciendo exactamente lo contrario.
    const apto = plato({ alergenos_oficiales: ["pescado", "sin gluten"] });
    expect(cumpleFiltroDietetico(apto, "celiaquia")).toBe(true);
  });

  it("mira también `alergenos_inferidos`, no solo los oficiales", () => {
    const inferido = plato({ alergenos_oficiales: ["pescado"], alergenos_inferidos: ["gluten"] });
    expect(cumpleFiltroDietetico(inferido, "celiaquia")).toBe(false);
  });

  it("una nota que menciona el gluten deja el plato fuera: la lee una persona", () => {
    // "Puede pedirse sin gluten; avise al camarero" es una CONDICIÓN, no una
    // certificación. El plato se sigue viendo en la carta sin el filtro.
    const condicional = plato({
      alergenos_oficiales: ["pescado"],
      alergenos_notas: "Puede pedirse sin gluten; avise al camarero",
    });
    expect(cumpleFiltroDietetico(condicional, "celiaquia")).toBe(false);
  });

  it("una nota que remite al personal anula la certificación", () => {
    const dudoso = plato({
      alergenos_oficiales: ["pescado"],
      alergenos_notas: "Consultar al personal antes de pedir",
    });
    expect(cumpleFiltroDietetico(dudoso, "celiaquia")).toBe(false);
  });

  it("una nota inocua no estorba", () => {
    const apto = plato({
      alergenos_oficiales: ["pescado"],
      alergenos_notas: "Se sirve muy frío",
    });
    expect(cumpleFiltroDietetico(apto, "celiaquia")).toBe(true);
  });

  it("da igual cómo esté escrito el gluten en la BD", () => {
    for (const valor of ["Gluten", "GLUTEN", "cereales con gluten", "Trigo", "Wheat"]) {
      expect(cumpleFiltroDietetico(plato({ alergenos_oficiales: [valor] }), "celiaquia")).toBe(
        false,
      );
    }
  });

  it("también funciona si los alérgenos llegan como texto separado por comas", () => {
    // Es la forma de `alergenos_en` / `alergenos_fr`.
    const conGluten = plato({ alergenos_oficiales: "Gluten, Milk" });
    expect(cumpleFiltroDietetico(conGluten, "celiaquia")).toBe(false);
    expect(cumpleFiltroDietetico(plato({ alergenos_oficiales: "Fish, Sulphites" }), "celiaquia")).toBe(
      true,
    );
  });
});

describe("la carta filtrada por celiaquía (lo que acaba viendo el visitante)", () => {
  // Misma composición que el `useMemo` de `CartaPlatos.tsx`.
  const carta = [
    { nombre: "Sin datos", alergenos_oficiales: [] },
    { nombre: "Solo nota", alergenos_notas: "Para los alérgenos consultar al personal" },
    { nombre: "Con gluten", alergenos_oficiales: ["gluten"] },
    { nombre: "Gluten inferido", alergenos_oficiales: ["huevo"], alergenos_inferidos: ["Gluten"] },
    { nombre: "Apto", alergenos_oficiales: ["pescado", "sulfitos"] },
    { nombre: "Apto con alérgeno raro", alergenos_oficiales: ["pescado", "sin gluten"] },
  ];

  it("solo deja los platos que se puede afirmar que son aptos", () => {
    const visibles = carta
      .filter((item) => cumpleFiltroDietetico(datosAlergenos(item), "celiaquia"))
      .map((item) => item.nombre);

    expect(visibles).toEqual(["Apto", "Apto con alérgeno raro"]);
  });
});

describe("filtro de lactosa", () => {
  it("descarta lácteos escritos de cualquier manera", () => {
    for (const valor of ["lacteos", "Lácteos", "leche", "Milk", "lactosa", "lait"]) {
      expect(cumpleFiltroDietetico(plato({ alergenos_oficiales: [valor] }), "lactosa")).toBe(false);
    }
  });

  it("no confunde lácteos con otro alérgeno", () => {
    expect(cumpleFiltroDietetico(plato({ alergenos_oficiales: ["gluten"] }), "lactosa")).toBe(true);
  });

  it("un plato sin datos tampoco es apto sin lactosa", () => {
    expect(cumpleFiltroDietetico(plato({}), "lactosa")).toBe(false);
  });
});

describe("vocabulario único de alérgenos", () => {
  it("el ID del panel y la etiqueta con acentos de la BD son el mismo alérgeno", () => {
    expect(claveAlergeno("frutos_cascara")).toBe("frutos_cascara");
    expect(claveAlergeno("Frutos de cáscara")).toBe("frutos_cascara");
    expect(claveAlergeno("crustaceos")).toBe(claveAlergeno("Crustáceos"));
    expect(claveAlergeno("lacteos")).toBe(claveAlergeno("Leche"));
  });

  it("un valor suelto que no es alérgeno oficial se conserva", () => {
    expect(claveAlergeno("marisco")).toBe("marisco");
    expect(claveAlergeno("alcohol")).toBe("alcohol");
    expect(claveAlergeno("carne")).toBe("carne");
  });

  it("traduce la etiqueta al idioma activo", () => {
    expect(etiquetaAlergeno("frutos_cascara", "es")).toBe("Frutos de cáscara");
    expect(etiquetaAlergeno("frutos_cascara", "en")).toBe("Tree nuts");
    expect(etiquetaAlergeno("frutos_cascara", "fr")).toBe("Fruits à coque");
    expect(etiquetaAlergeno("Milk", "es")).toBe("Lácteos");
  });

  it("un alérgeno desconocido se enseña tal cual, capitalizado", () => {
    expect(etiquetaAlergeno("pimiento morrón", "es")).toBe("Pimiento morrón");
  });

  it("no duplica un alérgeno que llega en castellano y traducido", () => {
    const datos = datosAlergenos({
      alergenos_oficiales: ["lacteos"],
      displayAlergenosOficiales: ["Milk"],
    });
    const claves = new Set([...datos.oficiales, ...datos.inferidos].map(claveAlergeno));
    expect([...claves]).toEqual(["lacteos"]);
  });

  it("el filtro no depende del idioma: la lista traducida también excluye", () => {
    const enIngles = datosAlergenos({ displayAlergenosOficiales: ["Gluten", "Fish"] });
    expect(cumpleFiltroDietetico(enIngles, "celiaquia")).toBe(false);
  });
});

describe("normalizeAlergenos", () => {
  it("acepta array, JSON serializado y texto separado por comas", () => {
    expect(normalizeAlergenos(["gluten", "soja"])).toEqual(["gluten", "soja"]);
    expect(normalizeAlergenos('["gluten","soja"]')).toEqual(["gluten", "soja"]);
    expect(normalizeAlergenos("Gluten, Milk, Sulphites")).toEqual(["Gluten", "Milk", "Sulphites"]);
  });

  it("tolera el literal de array de Postgres y los valores vacíos", () => {
    expect(normalizeAlergenos("{gluten,soja}")).toEqual(["gluten", "soja"]);
    expect(normalizeAlergenos("[]")).toEqual([]);
    expect(normalizeAlergenos("")).toEqual([]);
    expect(normalizeAlergenos(null)).toEqual([]);
    expect(normalizeAlergenos(undefined)).toEqual([]);
  });
});

describe("traducción de alérgenos (`alergenos_en` / `alergenos_fr`)", () => {
  const platoBase = {
    nombre: "Croquetas",
    nombre_en: "Croquettes",
    alergenos_oficiales: ["gluten", "lacteos"],
    alergenos_inferidos: ["huevo"],
    alergenos_en: "Gluten, Milk, Egg",
  };

  it("en inglés usa la columna traducida", () => {
    const traducido = resolveTranslatedItem(platoBase, "en");
    expect(traducido.displayAlergenosOficiales).toEqual(["Gluten", "Milk", "Egg"]);
    // La columna traducida es una lista única: no se repiten en castellano.
    expect(traducido.displayAlergenosInferidos).toEqual([]);
  });

  it("si falta la traducción cae al castellano en vez de quedarse en blanco", () => {
    const traducido = resolveTranslatedItem(platoBase, "fr");
    expect(traducido.displayAlergenosOficiales).toEqual(["gluten", "lacteos"]);
    expect(traducido.displayAlergenosInferidos).toEqual(["huevo"]);
  });

  it("en castellano normaliza las listas aunque lleguen como texto", () => {
    const traducido = resolveTranslatedItem(
      { nombre: "Tarta", alergenos_oficiales: '["gluten","huevo"]' },
      "es",
    );
    expect(traducido.displayAlergenosOficiales).toEqual(["gluten", "huevo"]);
  });
});
