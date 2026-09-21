/**
 * `src/i18n/routing.ts` — idioma <-> URL.
 *
 * Fija el contrato de la estructura en subcarpeta: español en la raíz, sin
 * prefijo; inglés y francés bajo `/en` y `/fr`. Todo son funciones puras, así
 * que no hace falta montar ningún componente ni un Router.
 */
import { describe, expect, it } from "vitest";
import {
  alternatesDePagina,
  construirRutaIdioma,
  idiomaDeRuta,
  quitarPrefijoIdioma,
  rutaEquivalente,
} from "@/i18n/routing";

describe("idiomaDeRuta", () => {
  it("español: sin prefijo", () => {
    expect(idiomaDeRuta("/")).toBe("es");
    expect(idiomaDeRuta("/carta")).toBe("es");
    expect(idiomaDeRuta("/carta/vinos")).toBe("es");
  });

  it("inglés y francés: con prefijo", () => {
    expect(idiomaDeRuta("/en")).toBe("en");
    expect(idiomaDeRuta("/en/carta")).toBe("en");
    expect(idiomaDeRuta("/fr")).toBe("fr");
    expect(idiomaDeRuta("/fr/carta/vinos")).toBe("fr");
  });

  it("no confunde un segmento que EMPIEZA por 'en' con el prefijo de idioma", () => {
    // Ruta hipotética: "/entrantes" no es "/en" + "trantes".
    expect(idiomaDeRuta("/entrantes")).toBe("es");
    expect(idiomaDeRuta("/englobal")).toBe("es");
  });
});

describe("quitarPrefijoIdioma", () => {
  it("deja igual una ruta en español", () => {
    expect(quitarPrefijoIdioma("/carta/vinos")).toBe("/carta/vinos");
    expect(quitarPrefijoIdioma("/")).toBe("/");
  });

  it("quita el prefijo de inglés/francés", () => {
    expect(quitarPrefijoIdioma("/en/carta/vinos")).toBe("/carta/vinos");
    expect(quitarPrefijoIdioma("/fr/carta")).toBe("/carta");
  });

  it("la portada de un idioma vuelve a '/'", () => {
    expect(quitarPrefijoIdioma("/en")).toBe("/");
    expect(quitarPrefijoIdioma("/fr")).toBe("/");
  });
});

describe("construirRutaIdioma", () => {
  it("español no lleva prefijo", () => {
    expect(construirRutaIdioma("/carta/vinos", "es")).toBe("/carta/vinos");
    expect(construirRutaIdioma("/", "es")).toBe("/");
  });

  it("antepone el prefijo en inglés y francés", () => {
    expect(construirRutaIdioma("/carta/vinos", "en")).toBe("/en/carta/vinos");
    expect(construirRutaIdioma("/carta", "fr")).toBe("/fr/carta");
  });

  it("la portada en otro idioma es solo el prefijo, sin barra final", () => {
    expect(construirRutaIdioma("/", "en")).toBe("/en");
    expect(construirRutaIdioma("/", "fr")).toBe("/fr");
  });
});

describe("rutaEquivalente — lo que usa el selector de idioma del header", () => {
  it("cambia de idioma sin volver a la portada", () => {
    expect(rutaEquivalente("/carta/vinos", "en")).toBe("/en/carta/vinos");
    expect(rutaEquivalente("/en/carta/vinos", "fr")).toBe("/fr/carta/vinos");
    expect(rutaEquivalente("/fr/carta/entrantes-frios", "es")).toBe("/carta/entrantes-frios");
  });

  it("la portada de un idioma a otro es la portada del otro, no la raíz cruda", () => {
    expect(rutaEquivalente("/en", "fr")).toBe("/fr");
    expect(rutaEquivalente("/", "en")).toBe("/en");
  });
});

describe("alternatesDePagina", () => {
  it("las tres versiones (autorreferencia incluida) más x-default al español", () => {
    const alternates = alternatesDePagina("/carta/vinos", "https://example.com");
    expect(alternates).toEqual([
      { hrefLang: "es", href: "https://example.com/carta/vinos" },
      { hrefLang: "en", href: "https://example.com/en/carta/vinos" },
      { hrefLang: "fr", href: "https://example.com/fr/carta/vinos" },
      { hrefLang: "x-default", href: "https://example.com/carta/vinos" },
    ]);
  });

  it("funciona para la portada", () => {
    const alternates = alternatesDePagina("/", "https://example.com");
    expect(alternates.map((a) => a.href)).toEqual([
      "https://example.com/",
      "https://example.com/en",
      "https://example.com/fr",
      "https://example.com/",
    ]);
  });

  it("no le importa una barra final en siteUrl", () => {
    const alternates = alternatesDePagina("/carta", "https://example.com/");
    expect(alternates[0].href).toBe("https://example.com/carta");
  });
});
