import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import SugerenciaIdioma from "@/components/SugerenciaIdioma";
import { saveConsent } from "@/lib/cookie-consent";
import {
  CLAVE_SUGERENCIA_IDIOMA,
  _reiniciarSugerenciaIdioma,
  idiomaASugerir,
  idiomaDelTraductor,
  idiomaPreferido,
  volvioAlEspanol,
} from "@/lib/sugerencia-idioma";

/**
 * Aviso «This page is also available in English» (pedido por el dueño el
 * 21/11/2026): se OFRECE la versión inglesa o francesa a quien tiene el
 * navegador en ese idioma; nunca se cambia de idioma solo.
 */

const base = { idiomasNavegador: ["en-GB", "en"], idiomaTraductor: null, guardado: null };

describe("idiomaASugerir", () => {
  it.each([
    [["en-GB", "en"], "en"],
    [["fr-FR"], "fr"],
    [["de-DE", "en"], "en"], // un alemán que también lee inglés: mejor nuestra versión inglesa
    [["de-DE", "fr", "en"], "fr"],
    [["es-ES", "en"], null], // prefiere español
    [["ca-ES", "es"], null],
    [["de-DE", "nl"], null], // ninguno que tengamos: el traductor sigue como siempre
    [[], null],
  ])("navegador %j → %s", (idiomasNavegador, esperado) => {
    expect(idiomaASugerir({ ...base, ruta: "/carta", idiomasNavegador })).toBe(esperado);
  });

  it("el idioma al que traduce el traductor manda sobre el del navegador", () => {
    expect(idiomaASugerir({ ...base, ruta: "/carta", idiomasNavegador: ["de"], idiomaTraductor: "fr" })).toBe("fr");
    expect(idiomaASugerir({ ...base, ruta: "/carta", idiomasNavegador: ["en"], idiomaTraductor: "de" })).toBe("en");
  });

  it.each(["/en/carta", "/fr", "/fr/reservas"])("no en páginas que ya están en inglés o francés: %s", (ruta) => {
    expect(idiomaASugerir({ ...base, ruta })).toBeNull();
  });

  it.each(["/reserva/respuesta", "/newsletter/baja", "/aviso-legal", "/404", "/lo-que-sea"])(
    "no en páginas que solo existen en español (correos, 404…): %s",
    (ruta) => {
      expect(idiomaASugerir({ ...base, ruta })).toBeNull();
    },
  );

  it.each(["/", "/carta", "/carta/vinos", "/reservas", "/regala", "/contacto", "/tienda", "/touza"])("sí en %s", (ruta) => {
    expect(idiomaASugerir({ ...base, ruta })).toBe("en");
  });

  it("si lo cerró o eligió español, no se vuelve a ofrecer", () => {
    expect(idiomaASugerir({ ...base, ruta: "/carta", guardado: "cerrada" })).toBeNull();
    expect(idiomaASugerir({ ...base, ruta: "/carta", guardado: "es" })).toBeNull();
  });
});

describe("idiomaPreferido e idiomaDelTraductor", () => {
  it("lee el idioma base", () => {
    expect(idiomaPreferido(["EN_us"])).toBe("en");
    expect(idiomaPreferido([null, undefined, "pt-BR", "fr-CA"])).toBe("fr");
  });

  it("solo con la marca del traductor de Chrome y un idioma que no sea español", () => {
    expect(idiomaDelTraductor({ className: "translated-ltr", lang: "en" })).toBe("en");
    expect(idiomaDelTraductor({ className: "dark translated-rtl", lang: "fr" })).toBe("fr");
    expect(idiomaDelTraductor({ className: "translated-ltr", lang: "es" })).toBeNull();
    expect(idiomaDelTraductor({ className: "", lang: "en" })).toBeNull();
  });
});

describe("volvioAlEspanol", () => {
  beforeEach(() => _reiniciarSugerenciaIdioma());

  it("pasar de /en o /fr a una página en español es elegir el español", () => {
    expect(volvioAlEspanol("/carta")).toBe(false); // primera página
    expect(volvioAlEspanol("/en/carta")).toBe(false);
    expect(volvioAlEspanol("/carta")).toBe(true);
    expect(volvioAlEspanol("/reservas")).toBe(false); // ya estaba en español
  });
});

describe("<SugerenciaIdioma />", () => {
  const idiomasOriginales = Object.getOwnPropertyDescriptor(window.navigator, "languages");
  const navegadorEn = (idiomas: string[]) => {
    Object.defineProperty(window.navigator, "languages", { configurable: true, get: () => idiomas });
  };

  beforeEach(() => {
    _reiniciarSugerenciaIdioma();
    window.localStorage.clear();
    // Las cookies ya elegidas: el aviso de idioma espera a que se resuelva el de cookies.
    window.localStorage.setItem("cookieConsent", JSON.stringify({ maps: false, estadisticas: false, ts: new Date().toISOString() }));
    document.documentElement.className = "";
    document.documentElement.lang = "es";
  });
  afterEach(() => {
    cleanup(); // desmontar antes de tocar <html>: si no, su vigilante reacciona fuera de act()
    if (idiomasOriginales) Object.defineProperty(window.navigator, "languages", idiomasOriginales);
    else delete (window.navigator as { languages?: unknown }).languages;
    document.documentElement.className = "";
    vi.restoreAllMocks();
  });

  const montar = (ruta: string) =>
    render(
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="*" element={<SugerenciaIdioma />} />
        </Routes>
      </MemoryRouter>,
    );

  it("no sale en el HTML del servidor (no puede romper la hidratación)", () => {
    navegadorEn(["en-GB"]);
    const html = renderToString(
      <MemoryRouter initialEntries={["/carta"]}>
        <SugerenciaIdioma />
      </MemoryRouter>,
    );
    expect(html).toBe("");
  });

  it("navegador en inglés en /carta/vinos: ofrece la misma página en inglés, en inglés", () => {
    navegadorEn(["en-GB", "en"]);
    montar("/carta/vinos");
    const aviso = screen.getByTestId("sugerencia-idioma");
    expect(aviso).toHaveAttribute("lang", "en");
    expect(aviso).toHaveTextContent("This page is also available in English.");
    expect(screen.getByRole("link", { name: "View in English" })).toHaveAttribute("href", "/en/carta/vinos");
  });

  it("navegador en francés: en francés y a la página francesa, con su búsqueda", () => {
    navegadorEn(["fr-FR"]);
    montar("/reservas?comensales=4");
    expect(screen.getByRole("link", { name: "Voir en français" })).toHaveAttribute("href", "/fr/reservas?comensales=4");
  });

  it("espera a que se elijan las cookies (no junta dos avisos)", () => {
    navegadorEn(["en"]);
    window.localStorage.removeItem("cookieConsent");
    document.cookie = "cookieConsent=; max-age=0; path=/";
    montar("/carta");
    expect(screen.queryByTestId("sugerencia-idioma")).toBeNull();
    act(() => saveConsent(false));
    expect(screen.getByRole("link", { name: "View in English" })).toBeInTheDocument();
  });

  it("navegador en español: nada", () => {
    navegadorEn(["es-ES", "en"]);
    montar("/carta");
    expect(screen.queryByTestId("sugerencia-idioma")).toBeNull();
  });

  it("cerrar lo quita y lo recuerda", () => {
    navegadorEn(["en"]);
    const { unmount } = montar("/carta");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("sugerencia-idioma")).toBeNull();
    expect(window.localStorage.getItem(CLAVE_SUGERENCIA_IDIOMA)).toBe("cerrada");
    unmount();
    montar("/reservas");
    expect(screen.queryByTestId("sugerencia-idioma")).toBeNull();
  });

  it("si el traductor de Chrome empieza a traducir al francés, ofrece la versión francesa", async () => {
    navegadorEn(["de-DE"]);
    montar("/carta");
    expect(screen.queryByTestId("sugerencia-idioma")).toBeNull();
    await act(async () => {
      document.documentElement.lang = "fr";
      document.documentElement.className = "translated-ltr";
      await new Promise((r) => setTimeout(r, 0)); // el MutationObserver avisa en una microtarea
    });
    expect(screen.getByRole("link", { name: "Voir en français" })).toHaveAttribute("href", "/fr/carta");
  });

  it("al volver al español desde la versión inglesa, no insiste", () => {
    navegadorEn(["en"]);
    let ir: (ruta: string) => void = () => {};
    const Navegar = () => {
      ir = useNavigate();
      return null;
    };
    render(
      <MemoryRouter initialEntries={["/en/carta"]}>
        <Navegar />
        <Routes>
          <Route path="*" element={<SugerenciaIdioma />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("sugerencia-idioma")).toBeNull();
    act(() => ir("/carta"));
    expect(screen.queryByTestId("sugerencia-idioma")).toBeNull();
    expect(window.localStorage.getItem(CLAVE_SUGERENCIA_IDIOMA)).toBe("es");
  });
});
