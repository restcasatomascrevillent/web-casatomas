import { describe, expect, it } from "vitest";
import es from "@/i18n/languages/es";
import en from "@/i18n/languages/en";
import fr from "@/i18n/languages/fr";
import {
  COMENSALES_DEFECTO,
  COMENSALES_MAX,
  MAX_PREGUNTA_TOMY,
  acotarComensales,
  construirPreguntaTomy,
  formatearEuros,
  importeLinea,
  type LineaMesa,
  leerComensalesReserva,
  nombrePersona,
  normalizarEstadoMesa,
  porPersona,
  repartoCadaUno,
  resumenTextoMesa,
  rutaReservaMesa,
  totalMesa,
  urlCarta,
  URL_CARTA_FALLBACK,
} from "@/lib/mi-mesa";

const croquetas = { clave: "a", nombre: "Croquetas", precio_eur: 9, cantidad: 2 }; // 18
const jamon = { clave: "b", nombre: "Jamón", precio_eur: 6, unidad: "100 g", cantidad: 150 }; // 9
const chuleton = { clave: "c", nombre: "Chuletón", precio_eur: 50, unidad: "kg", cantidad: 1.2 }; // 60
const vino = { clave: "d", nombre: "Rioja", precio_eur: 21 }; // 21 (cantidad por defecto 1)
const lineas = [croquetas, jamon, chuleton, vino];

/** Normaliza el espacio duro de Intl para comparar cadenas. */
const ESPACIOS_DUROS = new RegExp("[\\u00a0\\u202f]", "g");
const plano = (s: string) => s.replace(ESPACIOS_DUROS, " ");

describe("importes de Mi mesa", () => {
  it("calcula cada línea según su unidad", () => {
    expect(importeLinea(croquetas)).toBe(18);
    expect(importeLinea(jamon)).toBe(9);
    expect(importeLinea(chuleton)).toBeCloseTo(60);
    expect(importeLinea(vino)).toBe(21);
  });

  it("suma el total y lo divide por comensales", () => {
    expect(totalMesa(lineas)).toBeCloseTo(108);
    expect(porPersona(108, 4)).toBe(27);
    expect(porPersona(100, 3)).toBeCloseTo(33.333, 2);
  });

  it("acota los comensales a 1–30 y usa 2 si el valor no es numérico", () => {
    expect(acotarComensales(0)).toBe(1);
    expect(acotarComensales(99)).toBe(COMENSALES_MAX);
    expect(acotarComensales("abc")).toBe(COMENSALES_DEFECTO);
    expect(acotarComensales(4.4)).toBe(4);
    // Nunca divide por cero.
    expect(porPersona(50, 0)).toBe(50);
  });

  it("formatea en euros según el idioma", () => {
    expect(plano(formatearEuros(27, "es"))).toBe("27,00 €");
    expect(plano(formatearEuros(27, "fr"))).toBe("27,00 €");
    expect(formatearEuros(27, "en")).toBe("€27.00");
  });
});

describe("reparto «cada uno lo suyo»", () => {
  const clave = (l: LineaMesa & { clave: string }) => l.clave;

  it("suma lo asignado a cada persona y reparte lo no asignado entre todos", () => {
    // Persona 1 → chuletón (60); persona 2 → croquetas (18); jamón y vino (30) para compartir.
    const r = repartoCadaUno(lineas, clave, { c: [0], a: [1] }, 3);
    expect(r.compartido).toBeCloseTo(30);
    expect(r.compartidoPorPersona).toBeCloseTo(10);
    expect(r.propio).toEqual([expect.closeTo(60), 18, 0]);
    expect(r.porPersona[0]).toBeCloseTo(70);
    expect(r.porPersona[1]).toBeCloseTo(28);
    expect(r.porPersona[2]).toBeCloseTo(10);
    const suma = r.porPersona.reduce((a, b) => a + b, 0);
    expect(suma).toBeCloseTo(totalMesa(lineas));
  });

  it("una línea con varias personas se divide a partes iguales solo entre ellas", () => {
    // Chuletón (60) → persona 0; croquetas (18) → persona 1; jamón (9) lo
    // comparten 0 y 2 (4,5 cada uno); vino (21) sin asignar, para compartir.
    const r = repartoCadaUno(lineas, clave, { c: [0], a: [1], b: [0, 2] }, 3);
    expect(r.propio[0]).toBeCloseTo(60 + 4.5);
    expect(r.propio[1]).toBeCloseTo(18);
    expect(r.propio[2]).toBeCloseTo(4.5);
    expect(r.compartido).toBeCloseTo(21);
    expect(r.compartidoPorPersona).toBeCloseTo(7);
    expect(r.porPersona[0]).toBeCloseTo(71.5);
    expect(r.porPersona[1]).toBeCloseTo(25);
    expect(r.porPersona[2]).toBeCloseTo(11.5);
    const suma = r.porPersona.reduce((a, b) => a + b, 0);
    expect(suma).toBeCloseTo(totalMesa(lineas));
  });

  it("si se bajan los comensales, lo asignado a quien ya no está pasa a compartido", () => {
    const r = repartoCadaUno(lineas, clave, { c: [3] }, 2);
    expect(r.propio).toEqual([0, 0]);
    expect(r.compartido).toBeCloseTo(108);
    expect(r.porPersona).toEqual([expect.closeTo(54), expect.closeTo(54)]);
  });

  it("una persona fuera de rango dentro de una línea compartida no cuenta, pero no invalida al resto", () => {
    // Jamón (9) "compartido" entre 0 y 5, con solo 2 comensales: 5 se
    // descarta, así que el importe entero (no la mitad) va a la persona 0.
    const r = repartoCadaUno(lineas, clave, { b: [0, 5] }, 2);
    expect(r.propio[0]).toBeCloseTo(9);
    expect(r.propio[1]).toBeCloseTo(0);
    expect(r.compartido).toBeCloseTo(99); // croquetas + chuletón + vino
  });

  it("usa «Persona N» cuando el nombre está vacío", () => {
    expect(nombrePersona(["Ana", "  "], 0, "Persona {n}")).toBe("Ana");
    expect(nombrePersona(["Ana", "  "], 1, "Persona {n}")).toBe("Persona 2");
    expect(nombrePersona([], 4, "Person {n}")).toBe("Person 5");
  });
});

describe("estado persistido de Mi mesa", () => {
  it("sanea lo que venga de sessionStorage", () => {
    expect(normalizarEstadoMesa(null)).toEqual({ comensales: 2, modo: "igual", nombres: [], asignaciones: {} });
    expect(
      normalizarEstadoMesa({
        comensales: 500,
        modo: "cadaUno",
        nombres: ["Ana", 3],
        // `a`: formato anterior (un número suelto) — compatible, se envuelve
        // en array. `b`/`c`/`d`: inválidos sueltos, se descartan. `e`: array
        // con un valor inválido mezclado y un duplicado. `f`: array vacío.
        asignaciones: { a: 1, b: -1, c: "x", d: 2.5, e: [2, 2, "x", 3.5, 40], f: [] },
      }),
    ).toEqual({ comensales: 30, modo: "cadaUno", nombres: ["Ana", ""], asignaciones: { a: [1], e: [2] } });
    expect(normalizarEstadoMesa({ modo: "raro" }).modo).toBe("igual");
  });
});

describe("?comensales= en reservas", () => {
  it("rellena de 1 a 12", () => {
    expect(leerComensalesReserva("?comensales=4")).toEqual({ comensales: 4, grupoGrande: false });
    expect(leerComensalesReserva("?comensales=12")).toEqual({ comensales: 12, grupoGrande: false });
    expect(leerComensalesReserva("?comensales=1")).toEqual({ comensales: 1, grupoGrande: false });
    expect(leerComensalesReserva("?comensales=3.7")).toEqual({ comensales: 3, grupoGrande: false });
  });

  it("más de 12 no rellena y activa el aviso de grupos grandes", () => {
    expect(leerComensalesReserva("?comensales=13")).toEqual({ comensales: null, grupoGrande: true });
    expect(leerComensalesReserva("?comensales=30")).toEqual({ comensales: null, grupoGrande: true });
  });

  it("ignora valores ausentes o inválidos", () => {
    expect(leerComensalesReserva("")).toEqual({ comensales: null, grupoGrande: false });
    expect(leerComensalesReserva("?comensales=")).toEqual({ comensales: null, grupoGrande: false });
    expect(leerComensalesReserva("?comensales=0")).toEqual({ comensales: null, grupoGrande: false });
    expect(leerComensalesReserva("?comensales=-3")).toEqual({ comensales: null, grupoGrande: false });
    expect(leerComensalesReserva("?comensales=muchos")).toEqual({ comensales: null, grupoGrande: false });
  });

  it("el enlace de Mi mesa lleva los comensales acotados", () => {
    expect(rutaReservaMesa(6)).toBe("/reservas?comensales=6");
    expect(rutaReservaMesa(99)).toBe("/reservas?comensales=30");
  });

  it("y en el idioma de la página: /en/reservas y /fr/reservas", () => {
    expect(rutaReservaMesa(6, "en")).toBe("/en/reservas?comensales=6");
    expect(rutaReservaMesa(99, "fr")).toBe("/fr/reservas?comensales=30");
  });
});

describe("compartir", () => {
  it("construye la URL de la carta con el origen actual o la de respaldo", () => {
    expect(urlCarta("https://restaurantecasatomascrevillente.es")).toBe("https://restaurantecasatomascrevillente.es/carta");
    expect(urlCarta("http://localhost:8080/", "/en/carta")).toBe("http://localhost:8080/en/carta");
    expect(urlCarta(null)).toBe(URL_CARTA_FALLBACK);
    expect(urlCarta("null")).toBe(URL_CARTA_FALLBACK);
  });

  it("resume la mesa con total y parte por persona", () => {
    const texto = plano(
      resumenTextoMesa(
        [croquetas, vino],
        3,
        "es",
        {
          summaryTitle: "Mi mesa en Casa Tomás",
          summaryTotal: "Total orientativo: {amount}",
          summaryPerPerson: "≈ {amount} por persona ({n} comensales)",
          summaryLink: "La carta: {url}",
        },
        "https://x.test/carta",
      ),
    );
    expect(texto).toContain("• 2 × Croquetas");
    expect(texto).toContain("Total orientativo: 39,00 €");
    expect(texto).toContain("≈ 13,00 € por persona (3 comensales)");
    expect(texto).toContain("La carta: https://x.test/carta");
  });
});

describe("construirPreguntaTomy", () => {
  const textos = (idioma: "es" | "en" | "fr") => {
    const t = { es, en, fr }[idioma].translations.preview;
    return { aiQuestion: t.aiQuestion, aiQuestionMore: t.aiQuestionMore };
  };
  const plato = (i: number) => ({
    nombre: `Plato de la casa con nombre bastante largo número ${i}`,
    cantidad: 1,
  });

  it("lista todos los platos como «cantidad× nombre» si caben", () => {
    const texto = construirPreguntaTomy(
      [
        { nombre: "Croquetas", cantidad: 2 },
        { nombre: "Chuletón", cantidad: 1.5, unidad: "kg" },
      ],
      4,
      "es",
      textos("es"),
    );
    expect(texto).toBe(
      "Somos 4. ¿Es suficiente con esto? ¿Qué vino nos recomiendas? Tenemos: 2× Croquetas, 1,5 kg× Chuletón",
    );
  });

  it("con muchos platos no pasa de 500 y termina con «y N más»", () => {
    const lineas = Array.from({ length: 40 }, (_, i) => plato(i + 1));
    const texto = construirPreguntaTomy(lineas, 6, "es", textos("es"));
    expect(MAX_PREGUNTA_TOMY).toBe(500);
    expect(texto.length).toBeLessThanOrEqual(500);
    const incluidos = (texto.match(/1× /g) ?? []).length;
    expect(incluidos).toBeGreaterThan(0);
    expect(texto.endsWith(`y ${40 - incluidos} más`)).toBe(true);
    // Mete todos los que caben: uno más ya se pasaría.
    const conUnoMas = textos("es")
      .aiQuestion.replace("{n}", "6")
      .replace(
        "{items}",
        `${lineas.slice(0, incluidos + 1).map((l) => `1× ${l.nombre}`).join(", ")} y ${40 - incluidos - 1} más`,
      );
    expect(conUnoMas.length).toBeGreaterThan(500);
  });

  it("nunca pasa del máximo aunque un solo plato sea enorme", () => {
    const texto = construirPreguntaTomy([{ nombre: "x".repeat(2000), cantidad: 1 }], 2, "es", textos("es"));
    expect(texto.length).toBeLessThanOrEqual(500);
    expect(texto).toMatch(/y 1 más$/);
  });

  it.each([
    ["en", /^We are 3\..*and \d+ more$/],
    ["fr", /^Nous sommes 3\..*et \d+ de plus$/],
  ] as const)("localiza la cola en %s", (idioma, patron) => {
    const lineas = Array.from({ length: 40 }, (_, i) => plato(i + 1));
    const texto = construirPreguntaTomy(lineas, 3, idioma, textos(idioma));
    expect(texto.length).toBeLessThanOrEqual(500);
    expect(texto).toMatch(patron);
  });
});
