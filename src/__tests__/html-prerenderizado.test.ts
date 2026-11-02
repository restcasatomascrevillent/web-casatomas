/**
 * Un solo `<html` por página. El prerenderizado conserva los comentarios de
 * `index.html`, y uno que citaba la etiqueta literalmente dejaba un segundo
 * `<html>` en TODAS las páginas de `dist/`. El build ya falla si pasa
 * (`scripts/verificar-html.mjs`, llamado desde `ssgOptions.onFinished`);
 * aquí se prueba el verificador y la plantilla de origen.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  htmlDePublic,
  idiomaEsperado,
  problemasDeAccesibilidad,
  problemasDeHtml,
  verificarHtmlPrerenderizado,
} from "../../scripts/verificar-html.mjs";

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
    expect(problemasDeHtml('<!DOCTYPE html><html lang="fr"><head></head><body><a href="#contenido">Saltar al contenido</a><header><a href="/">Inicio</a></header><main id="contenido" tabindex="-1"><h1>Hola</h1></main></body></html>', "fr/condiciones.html")).toEqual([]);
  });

  it("rechaza un segundo <html, aunque esté dentro de un comentario", () => {
    const html = '<!DOCTYPE html><html lang="es"><!-- este <html> sobra --><head></head><body><a href="#contenido">Saltar</a><main id="contenido"></main></body></html>';
    const problemas = problemasDeHtml(html, "index.html");
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatch(/2 apariciones/);
  });

  it("rechaza un lang que no es el del idioma de la ruta", () => {
    const problemas = problemasDeHtml('<!DOCTYPE html><html lang="es"><head></head><body><a href="#contenido">Saltar</a><main id="contenido"></main></body></html>', "en/reservas.html");
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatch(/lang="es".*"en"/);
  });

  it("rechaza una página sin lang", () => {
    expect(problemasDeHtml("<!DOCTYPE html><html><head></head></html>", "index.html")[0]).toMatch(/ninguno/);
  });
});

describe("verificar-html — ficheros de public/ que no salen del prerenderizado", () => {
  // Fichero de verificación de Google Search Console: una línea, sin `<html>`.
  // Vite lo copia tal cual de `public/` a `dist/`; antes rompía el build.
  const VERIFICACION = "google-site-verification: google0123456789abcdef.html";

  const CUERPO = '<body><a href="#contenido">Saltar</a><main id="contenido"></main></body>';

  function carpetas() {
    const raiz = mkdtempSync(path.join(tmpdir(), "verificar-html-"));
    const dist = path.join(raiz, "dist");
    const publico = path.join(raiz, "public");
    mkdirSync(path.join(dist, "en"), { recursive: true });
    mkdirSync(publico);
    writeFileSync(path.join(dist, "index.html"), `<!DOCTYPE html><html lang="es"><head></head>${CUERPO}</html>`);
    writeFileSync(path.join(dist, "en", "reservas.html"), `<!DOCTYPE html><html lang="en"><head></head>${CUERPO}</html>`);
    writeFileSync(path.join(dist, "google0123456789abcdef.html"), VERIFICACION);
    writeFileSync(path.join(publico, "google0123456789abcdef.html"), VERIFICACION);
    return { raiz, dist, publico };
  }

  it("htmlDePublic lista los .html de public/ (y nada si la carpeta no existe)", async () => {
    const { raiz, publico } = carpetas();
    try {
      expect(await htmlDePublic(publico)).toEqual(["google0123456789abcdef.html"]);
      expect(await htmlDePublic(path.join(raiz, "no-existe"))).toEqual([]);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it("no rompe el build por ellos, pero sigue comprobando las páginas prerenderizadas", async () => {
    const { raiz, dist, publico } = carpetas();
    try {
      // Sin ignorarlo, el verificador lo tomaría por una página rota.
      await expect(verificarHtmlPrerenderizado(dist)).rejects.toThrow(/google0123456789abcdef\.html/);
      await expect(verificarHtmlPrerenderizado(dist, { ignorar: await htmlDePublic(publico) })).resolves.toBe(2);
      // Ignorar public/ no tapa una página prerenderizada mal.
      writeFileSync(path.join(dist, "en", "reservas.html"), '<!DOCTYPE html><html lang="es"><head></head></html>');
      await expect(verificarHtmlPrerenderizado(dist, { ignorar: await htmlDePublic(publico) })).rejects.toThrow(/en\/reservas\.html/);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });
});

describe("verificar-html: accesibilidad de teclado", () => {
  const pagina = (cuerpo: string) => `<!DOCTYPE html><html lang="es"><head><script>var a = "<main>";</script></head><body>${cuerpo}</body></html>`;

  it("acepta un único <main id=\"contenido\"> con el enlace de saltar como primer foco", () => {
    expect(problemasDeAccesibilidad(pagina('<a href="#contenido">Saltar al contenido</a><header><a href="/">Inicio</a></header><main id="contenido" tabindex="-1"><h1>Hola</h1></main>'), "index.html")).toEqual([]);
  });

  it("rechaza dos <main> o ninguno", () => {
    expect(problemasDeAccesibilidad(pagina('<a href="#contenido">x</a><main id="contenido"></main><main></main>'), "index.html")[0]).toMatch(/2 elementos <main>/);
    expect(problemasDeAccesibilidad(pagina('<a href="#contenido">x</a><div></div>'), "index.html")[0]).toMatch(/0 elementos <main>/);
  });

  it("rechaza un <main> sin id=\"contenido\"", () => {
    expect(problemasDeAccesibilidad(pagina('<a href="#contenido">x</a><main></main>'), "index.html")[0]).toMatch(/id="contenido"/);
  });

  it("rechaza que otro elemento enfocable vaya antes del enlace de saltar", () => {
    const problemas = problemasDeAccesibilidad(pagina('<button>Aceptar cookies</button><a href="#contenido">x</a><main id="contenido"></main>'), "index.html");
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatch(/primer elemento enfocable/);
  });

  it("ignora los elementos con tabindex=\"-1\" y los comentarios", () => {
    expect(problemasDeAccesibilidad(pagina('<!-- <button>x</button> --><div tabindex="-1"></div><a href="#contenido">x</a><main id="contenido" tabindex="-1"></main>'), "index.html")).toEqual([]);
  });
});
