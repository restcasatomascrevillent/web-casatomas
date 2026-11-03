/**
 * `src/i18n/routing.ts` — idioma <-> URL.
 *
 * Fija el contrato de la estructura en subcarpeta: español en la raíz, sin
 * prefijo; inglés y francés bajo `/en` y `/fr`. Todo son funciones puras, así
 * que no hace falta montar ningún componente ni un Router.
 */
import { describe, expect, it } from "vitest";
import type { RouteRecord } from "vite-react-ssg";
import { routes } from "@/App";
import {
  alternatesDePagina,
  construirRutaIdioma,
  existeEnTodosLosIdiomas,
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

describe("rutaEquivalente — query y ancla", () => {
  it("la misma página en otro idioma conserva la query y el ancla", () => {
    expect(rutaEquivalente("/reservas", "en", { search: "?comensales=4" })).toBe("/en/reservas?comensales=4");
    expect(rutaEquivalente("/fr/reservas", "es", { search: "?comensales=4" })).toBe("/reservas?comensales=4");
    expect(rutaEquivalente("/condiciones", "fr", { hash: "#newsletter" })).toBe("/fr/condiciones#newsletter");
    expect(rutaEquivalente("/en/carta", "es", { search: "?q=1", hash: "#vinos" })).toBe("/carta?q=1#vinos");
    // Mismo idioma (página solo en español): se queda tal cual, con su query.
    expect(rutaEquivalente("/reserva/respuesta", "es", { search: "?token=abc" })).toBe("/reserva/respuesta?token=abc");
  });

  it("si la página no existe en el otro idioma, va a la portada SIN query ni ancla (el token no viaja)", () => {
    expect(rutaEquivalente("/reserva/respuesta", "en", { search: "?token=abc", hash: "#x" })).toBe("/en");
    expect(rutaEquivalente("/newsletter/baja", "fr", { search: "?s=1&firma=f" })).toBe("/fr");
  });

  it("sin query ni ancla, igual que siempre", () => {
    expect(rutaEquivalente("/reservas", "en", {})).toBe("/en/reservas");
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

  it("la tienda de vinos existe en los tres idiomas: va a su equivalente", () => {
    expect(existeEnTodosLosIdiomas("/tienda")).toBe(true);
    expect(rutaEquivalente("/tienda", "en")).toBe("/en/tienda");
    expect(rutaEquivalente("/en/tienda", "fr")).toBe("/fr/tienda");
    expect(rutaEquivalente("/fr/tienda", "es")).toBe("/tienda");
  });

  it("las condiciones existen en los tres idiomas: va a su equivalente", () => {
    expect(rutaEquivalente("/condiciones", "en")).toBe("/en/condiciones");
    expect(rutaEquivalente("/fr/condiciones", "es")).toBe("/condiciones");
  });

  it("las reservas y la política de privacidad existen en los tres idiomas: va a su equivalente", () => {
    expect(rutaEquivalente("/reservas", "en")).toBe("/en/reservas");
    expect(rutaEquivalente("/reservas", "fr")).toBe("/fr/reservas");
    expect(rutaEquivalente("/en/reservas", "fr")).toBe("/fr/reservas");
    expect(rutaEquivalente("/fr/reservas", "es")).toBe("/reservas");
    expect(rutaEquivalente("/politica-privacidad", "en")).toBe("/en/politica-privacidad");
    expect(rutaEquivalente("/fr/politica-privacidad", "es")).toBe("/politica-privacidad");
  });

  it("una página que solo existe en español lleva a la portada del idioma destino, no a un 404", () => {
    for (const rutaSoloEs of ["/reserva/respuesta", "/newsletter/baja", "/404"]) {
      expect(rutaEquivalente(rutaSoloEs, "en")).toBe("/en");
      expect(rutaEquivalente(rutaSoloEs, "fr")).toBe("/fr");
    }
  });

  it("elegir el mismo idioma en una página solo-es no la abandona", () => {
    expect(rutaEquivalente("/reserva/respuesta", "es")).toBe("/reserva/respuesta");
    expect(rutaEquivalente("/newsletter/baja", "es")).toBe("/newsletter/baja");
  });

  it("desde un 404 de /en o /fr lleva a la portada del destino", () => {
    expect(rutaEquivalente("/en/no-existe", "es")).toBe("/");
    expect(rutaEquivalente("/en/no-existe", "fr")).toBe("/fr");
  });

  it("una página solo-es con barra final también va a la portada del destino", () => {
    expect(rutaEquivalente("/reserva/respuesta/", "en")).toBe("/en");
  });
});

/** Rutas de una rama de `App.tsx`, como rutas en español sin prefijo (`:param` -> `x`). */
function rutasDeRama(rama: string): string[] {
  const nodo = routes.find((r: RouteRecord) => r.path === rama);
  if (!nodo?.children) throw new Error(`rama ${rama} no encontrada en App.tsx`);
  return nodo.children
    .filter((hijo) => hijo.path !== "*")
    .map((hijo) => (hijo.index ? "/" : `/${hijo.path!.replace(/:[^/]+/g, "x")}`));
}

describe("existeEnTodosLosIdiomas — espejo de las rutas reales de App.tsx", () => {
  it("toda ruta montada bajo /en y /fr existe en todos los idiomas", () => {
    for (const rama of ["/en", "/fr"]) {
      for (const ruta of rutasDeRama(rama)) expect(existeEnTodosLosIdiomas(ruta), `${rama}${ruta}`).toBe(true);
    }
  });

  it("toda ruta que solo está en la rama española NO cuenta como multiidioma", () => {
    const enIngles = new Set(rutasDeRama("/en"));
    const soloEs = rutasDeRama("/").filter((ruta) => !enIngles.has(ruta));
    // Las páginas de los enlaces de los correos (que van en español), el aviso
    // legal (texto vigente solo en español) y el 404.
    expect([...soloEs].sort()).toEqual(["/404", "/aviso-legal", "/newsletter/baja", "/reserva/respuesta"]);
    for (const ruta of soloEs) expect(existeEnTodosLosIdiomas(ruta), ruta).toBe(false);
  });

  it("el formulario de reservas, la política de privacidad y las condiciones están en las tres ramas", () => {
    for (const rama of ["/", "/en", "/fr"]) {
      const rutas = rutasDeRama(rama);
      for (const ruta of ["/reservas", "/politica-privacidad", "/condiciones"]) {
        expect(rutas, `${rama} → ${ruta}`).toContain(ruta);
      }
    }
  });

  it("/en y /fr montan exactamente las mismas rutas", () => {
    expect(rutasDeRama("/fr")).toEqual(rutasDeRama("/en"));
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
