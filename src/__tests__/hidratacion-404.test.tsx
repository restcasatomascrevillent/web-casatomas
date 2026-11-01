import { afterEach, describe, expect, it } from "vitest";
import { act, render } from "@testing-library/react";
import { LanguageProvider, useTranslations } from "@/i18n/LanguageProvider";
import middleware, { config as configMiddleware, RUTA_INEXISTENTE } from "../../middleware";
import {
  idiomaParaHidratar,
  reiniciarHidratacion404ParaTests,
  terminarHidratacion404,
} from "@/lib/hidratacion-404";

/**
 * «Páginas 404 (2/2)». La hidratación de verdad (el `404.html` del build
 * servido en `/lo-que-sea`, `/en/...`) se prueba en `e2e/pagina-404.e2e.ts`;
 * aquí, las piezas: el idioma del primer render y el middleware de `/404`.
 */

const marcas: HTMLElement[] = [];
afterEach(() => {
  marcas.splice(0).forEach((m) => m.remove());
  document.documentElement.lang = "";
  window.localStorage.clear();
  terminarHidratacion404();
});

/** Simula que el HTML recién cargado es el `404.html` (en español). */
const cargar404 = () => {
  const marca = document.createElement("div");
  marca.setAttribute("data-pagina-no-encontrada", "");
  document.body.append(marca);
  marcas.push(marca);
  document.documentElement.lang = "es";
  reiniciarHidratacion404ParaTests();
};

describe("idiomaParaHidratar", () => {
  it("es null en una página que no es el 404", () => {
    document.documentElement.lang = "en";
    reiniciarHidratacion404ParaTests();
    expect(idiomaParaHidratar()).toBeNull();
    expect(terminarHidratacion404()).toBe(false);
  });

  it("da el idioma del 404.html hasta que se termina la hidratación", () => {
    cargar404();
    expect(idiomaParaHidratar()).toBe("es");
    expect(terminarHidratacion404()).toBe(true);
    expect(idiomaParaHidratar()).toBeNull();
  });
});

describe("LanguageProvider sobre el 404.html", () => {
  const Idioma = ({ pintados }: { pintados: string[] }) => {
    const { language } = useTranslations();
    pintados.push(language);
    return <span>{language}</span>;
  };

  it("en /en/... el primer render va en español (como el HTML) y luego pasa al inglés", async () => {
    cargar404();
    const pintados: string[] = [];
    let vista: ReturnType<typeof render>;
    await act(async () => {
      vista = render(<LanguageProvider initialLanguage="en"><Idioma pintados={pintados} /></LanguageProvider>);
    });
    expect(pintados[0]).toBe("es");
    expect(vista!.container.textContent).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("en cualquier otra página manda el idioma de la URL desde el primer render", async () => {
    reiniciarHidratacion404ParaTests();
    const pintados: string[] = [];
    await act(async () => {
      render(<LanguageProvider initialLanguage="fr"><Idioma pintados={pintados} /></LanguageProvider>);
    });
    expect(new Set(pintados)).toEqual(new Set(["fr"]));
  });
});

describe("middleware de /404 (criterio 4)", () => {
  it("solo se ejecuta en /404", () => {
    expect(configMiddleware.matcher).toBe("/404");
  });

  it("reescribe (sin redirigir) a una ruta inexistente: Vercel responde 404 con el 404.html", () => {
    const respuesta = middleware(new Request("https://web-casatomas.vercel.app/404"));
    expect(respuesta.headers.get("x-middleware-rewrite")).toBe(`https://web-casatomas.vercel.app${RUTA_INEXISTENTE}`);
    expect(respuesta.headers.get("location")).toBeNull();
  });
});
