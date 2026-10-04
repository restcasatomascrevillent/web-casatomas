/**
 * Un solo `<html` por página. El prerenderizado conserva los comentarios de
 * `index.html`, y uno que citaba la etiqueta literalmente dejaba un segundo
 * `<html>` en TODAS las páginas de `dist/`. El build ya falla si pasa
 * (`scripts/verificar-html.mjs`, llamado desde `ssgOptions.onFinished`);
 * aquí se prueba el verificador y la plantilla de origen.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { idiomaEsperado, problemasDeHtml } from "../../scripts/verificar-html.mjs";

describe("plantilla index.html", () => {
  const html = readFileSync(path.resolve(process.cwd(), "index.html"), "utf8");

  it("tiene exactamente un <html y sin lang fijo (lo pone <Seo lang>)", () => {
    expect(html.match(/<html[\s>]/gi)).toHaveLength(1);
    expect(/<html[^>]*\blang=/i.test(html)).toBe(false);
  });
});

describe("verificar-html", () => {
  it("deduce el idioma de la ruta", () => {
    expect(idiomaEsperado("index.html")).toBe("es");
    expect(idiomaEsperado("reservas.html")).toBe("es");
    expect(idiomaEsperado("en.html")).toBe("en");
    expect(idiomaEsperado("en/reservas.html")).toBe("en");
    expect(idiomaEsperado("fr/politica-privacidad.html")).toBe("fr");
    expect(idiomaEsperado("fr.html")).toBe("fr");
    expect(idiomaEsperado("reserva/index.html")).toBe("es");
  });

  it("acepta una página con un solo <html> y el lang de su idioma", () => {
    expect(problemasDeHtml('<!DOCTYPE html><html lang="fr"><head></head><body></body></html>', "fr/condiciones.html")).toEqual([]);
  });

  it("rechaza un segundo <html, aunque esté dentro de un comentario", () => {
    const html = '<!DOCTYPE html><html lang="es"><!-- este <html> sobra --><head></head><body></body></html>';
    const problemas = problemasDeHtml(html, "index.html");
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatch(/2 apariciones/);
  });

  it("rechaza un lang que no es el del idioma de la ruta", () => {
    const problemas = problemasDeHtml('<!DOCTYPE html><html lang="es"><head></head></html>', "en/reservas.html");
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatch(/lang="es".*"en"/);
  });

  it("rechaza una página sin lang", () => {
    expect(problemasDeHtml("<!DOCTYPE html><html><head></head></html>", "index.html")[0]).toMatch(/ninguno/);
  });
});
