import { describe, expect, it } from "vitest";
import { formatearPrecio, mostrarPrecio } from "@/lib/precios";

// El espacio entre la cifra y el € es duro (U+00A0): que no se parta la línea.
const plano = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");

describe("formato de precio «24,50 €»", () => {
  it("coma decimal, dos decimales y € detrás, en es, en y fr", () => {
    for (const idioma of ["es", "en", "fr"] as const) {
      expect(plano(mostrarPrecio(24.5, idioma))).toBe("24,50 €");
      expect(plano(mostrarPrecio(18, idioma))).toBe("18,00 €");
      expect(plano(mostrarPrecio(18.9, idioma))).toBe("18,90 €");
      expect(plano(mostrarPrecio(132.5, idioma))).toBe("132,50 €");
    }
  });

  it("el € no se separa de la cifra", () => {
    expect(formatearPrecio(24.5)).toBe("24,50\u00a0€");
  });

  it("sin precio conocido, «Consultar precio» en cada idioma", () => {
    expect(mostrarPrecio(null, "es")).toBe("Consultar precio");
    expect(mostrarPrecio(0, "en")).toBe("Ask for price");
    expect(mostrarPrecio(undefined, "fr")).toBe("Prix sur demande");
  });
});
