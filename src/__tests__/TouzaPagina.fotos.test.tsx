/**
 * Fotos de /touza: la segunda foto es un cóctel delante de la «T» iluminada del
 * local (antes salía un camarero que ya no trabaja allí). Ningún texto
 * alternativo de la página habla de personal, en ningún idioma, y la foto
 * lleva sus variantes AVIF/WebP a 400, 640 y 800 px con JPG de respaldo.
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import TouzaPagina from "@/components/TouzaPagina";

const casos = [
  { lang: "es", alt: "Cóctel en copa delante de la «T» iluminada de Touza Cocktail Bar" },
  { lang: "en", alt: "Cocktail in a coupe glass in front of the backlit “T” at Touza Cocktail Bar" },
  { lang: "fr", alt: "Cocktail en coupe devant le « T » rétroéclairé du Touza Cocktail Bar" },
] as const;

const PERSONAL = /bartender|barman|barmaid|camarer|serveur|waiter|coctelero/i;

describe("TouzaPagina: foto del cóctel ante la «T»", () => {
  it.each(casos)("$lang: texto alternativo de la foto nueva y nadie en los alt", ({ lang, alt }) => {
    const { container } = render(
      <LanguageProvider initialLanguage={lang}>
        <TouzaPagina />
      </LanguageProvider>,
    );
    const fotos = Array.from(container.querySelectorAll("img"));
    expect(fotos).toHaveLength(3);
    for (const foto of fotos) expect(foto.alt).not.toMatch(PERSONAL);

    const coctel = fotos.find(f => f.alt === alt);
    expect(coctel, `falta la foto con alt «${alt}»`).toBeTruthy();
    expect(coctel!.getAttribute("src")).toMatch(/touza-coctel-640w.*\.jpg/);
    // Formato vertical 2:3, el del hueco (`aspect-[2/3]`).
    expect(Number(coctel!.getAttribute("width")) / Number(coctel!.getAttribute("height"))).toBeCloseTo(2 / 3, 3);

    const fuentes = Array.from(coctel!.closest("picture")!.querySelectorAll("source"));
    expect(fuentes.map(f => f.type)).toEqual(["image/avif", "image/webp"]);
    for (const fuente of fuentes) {
      expect(fuente.getAttribute("srcset")).toMatch(/touza-coctel-400w.* 400w, .*touza-coctel-640w.* 640w, .*touza-coctel-800w.* 800w/);
    }
  });
});
