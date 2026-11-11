/**
 * Buscador de `/carta` (`BuscadorCarta` dentro de `pages/carta/Indice.tsx`).
 *
 *  - Sin búsqueda, la página es el índice de siempre (con el campo encima), en
 *    el HTML prerenderizado y al hidratar, sin errores de hidratación.
 *  - Al buscar: sin mayúsculas ni tildes, en el idioma del visitante, platos +
 *    vinos + bebidas agrupados por categoría, recuento en `aria-live`.
 *  - Mensaje sin resultados, botón para limpiar, Escape.
 *  - Los filtros dietéticos de la página se aplican a los platos encontrados.
 *  - Al tocar un plato y volver atrás, la búsqueda sigue ahí.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { Link, MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import type { Language } from "@/i18n/types";
import { CLAVE_BUSQUEDAS_GUARDADAS, RETARDO_BUSQUEDA_MS } from "@/hooks/useBusquedaCarta";

vi.mock("virtual:carta-ssg", () => ({
  default: {
    generadoEn: "2026-11-01T08:00:00.000Z",
    platos: [
      { id: "12", nombre: "Jamón 100% bellota", nombre_en: "100% Acorn-fed Iberian Ham", categoria: "ENTRANTES FRÍOS", categoria_en: "Cold starters", precio_eur: 28, alergenos_oficiales: ["sulfitos"] },
      { id: "13", nombre: "Ensaladilla de pulpo", nombre_en: "Octopus Russian salad", categoria: "ENTRANTES FRÍOS", categoria_en: "Cold starters", precio_eur: 14, alergenos_oficiales: ["huevo", "moluscos"] },
      { id: "20", nombre: "Croquetas de jamón ibérico", nombre_en: "Iberian Ham Croquettes", descripcion: "Caseras, de bechamel", categoria: "ENTRANTES CALIENTES", categoria_en: "Hot starters", precio_eur: 12, alergenos_oficiales: ["gluten", "lacteos"] },
      { id: "30", nombre: "Arròs negre", categoria: "ARROCES", categoria_en: "Rice dishes", precio_eur: 24, unidad: "Ración", alergenos_oficiales: ["moluscos"] },
      { id: "31", nombre: "Arroz meloso de bogavante", nombre_en: "Creamy Lobster Rice", categoria: "ARROCES", categoria_en: "Rice dishes", precio_eur: 30, alergenos_oficiales: ["crustaceos"] },
      { id: "40", nombre: "Arroz con leche", nombre_en: "Rice Pudding", categoria: "POSTRES", categoria_en: "Desserts", precio_eur: 6, alergenos_oficiales: ["lacteos"] },
    ],
    resumen: {
      vinos: { total: 2, categorias: [{ nombre: "VINOS BLANCOS — RÍAS BAIXAS", total: 1 }, { nombre: "VINOS TINTOS — RIOJA", total: 1 }] },
      bebidas: { total: 2, categorias: [{ nombre: "Aguas", total: 1 }, { nombre: "Cervezas", total: 1 }] },
    },
    // Carta de Bebidas encendida en el panel (11/11/2026: por defecto apagada y sin bebidas en el buscador).
    config: { mostrarFotosPlatos: true, mostrarCartaBebidas: true },
  },
}));
vi.mock("virtual:carta-ssg/vinos", () => ({
  default: {
    generadoEn: "2026-11-01T08:00:00.000Z",
    vinos: [
      { id: "v1", nombre: "Albariño Pazo de Señoráns", categoria: "VINOS BLANCOS — RÍAS BAIXAS", categoria_en: "White wines — Rías Baixas", denominacion_origen: "D.O. Rías Baixas", precio_eur: 32 },
      { id: "v2", nombre: "Muga Reserva", categoria: "VINOS TINTOS — RIOJA", categoria_en: "Red wines — Rioja", denominacion_origen: "D.O.Ca. Rioja", descripcion: "Tinto con crianza en barrica. Encaja con carnes y un arroz de setas.", precio_eur: 35 },
    ],
  },
}));
vi.mock("virtual:carta-ssg/bebidas", () => ({
  default: {
    generadoEn: "2026-11-01T08:00:00.000Z",
    bebidas: [
      { id: "b1", nombre: "Agua mineral", categoria: "Aguas", categoria_en: "Waters", tamano: "50 cl", precio_eur: 2 },
      { id: "b2", nombre: "Estrella Galicia", categoria: "Cervezas", categoria_en: "Beers", tamano: "33 cl", precio_eur: 3 },
    ],
  },
}));

// `Seo` usa `Head` de vite-react-ssg, que necesita su provider.
vi.mock("@/components/Seo", () => ({ Seo: () => null }));

import CartaIndice from "@/pages/carta/Indice";
import { cargarBodega } from "@/components/carta/cargarBodega";

/** Página de destino mínima: sirve para volver atrás o volver por un enlace. */
const CategoriaFalsa = () => {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate(-1)}>
        Atrás
      </button>
      <Link to="/carta">Enlace a la carta</Link>
    </>
  );
};

const app = (entrada = "/carta", idioma: Language = "es") => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[entrada]}>
      <LanguageProvider initialLanguage={idioma}>
        <Routes>
          <Route path="/carta" element={<CartaIndice />} />
          <Route path="/en/carta" element={<CartaIndice />} />
          <Route path="/carta/:categoria" element={<CategoriaFalsa />} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>
  </QueryClientProvider>
);

const campo = () => screen.getByRole("searchbox");
/** Recuento del buscador (`aria-live`), no otros `role=status` de la página. */
const recuento = () => document.getElementById("buscador-carta-estado")!;

const buscar = async (texto: string) => {
  fireEvent.change(campo(), { target: { value: texto } });
  await act(async () => {
    vi.advanceTimersByTime(RETARDO_BUSQUEDA_MS + 20);
  });
};

describe("/carta — buscador", () => {
  // La bodega llega por dos import() diferidos que, con la suite entera, podían
  // tardar segundos: el test de la bodega se quedaba en «Sin resultados». Se
  // espera aquí la MISMA carga (memorizada) que usa el componente.
  beforeAll(async () => {
    await cargarBodega();
  });

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.sessionStorage.removeItem(CLAVE_BUSQUEDAS_GUARDADAS);
  });
  afterEach(() => vi.useRealTimers());

  it("prerenderizado: el índice de siempre con el campo encima y sin resultados", () => {
    const html = renderToString(app());
    const contenedor = document.createElement("div");
    contenedor.innerHTML = html;

    const input = contenedor.querySelector<HTMLInputElement>("input#buscador-carta")!;
    expect(input.type).toBe("search");
    expect(input.value).toBe("");
    expect(contenedor.querySelector('label[for="buscador-carta"]')?.textContent).toBe("Buscar en la carta");
    expect(contenedor.querySelector("form[role=search]")).not.toBeNull();
    // El recuento existe (para `aria-live`) pero vacío.
    const vivo = contenedor.querySelector("#buscador-carta-estado")!;
    expect(vivo.getAttribute("aria-live")).toBe("polite");
    expect(vivo.textContent).toBe("");
    // El índice de categorías y la bodega, como siempre.
    expect(contenedor.querySelector("#platos")).not.toBeNull();
    expect(contenedor.querySelector("#bodega")).not.toBeNull();
    expect(contenedor.querySelector('a[href="/carta/entrantes-frios"]')).not.toBeNull();
    expect(contenedor.querySelector('a[href="/carta/vinos"]')).not.toBeNull();
    expect(contenedor.querySelector("#resultados-platos")).toBeNull();
  });

  it("se hidrata sobre el HTML prerenderizado sin errores", async () => {
    const html = renderToString(app());
    const contenedor = document.createElement("div");
    contenedor.innerHTML = html;
    document.body.append(contenedor);
    const errores: unknown[] = [];
    let raiz: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      raiz = hydrateRoot(contenedor, app(), { onRecoverableError: (error) => errores.push(error) });
    });
    try {
      expect(errores).toEqual([]);
      // Mismo DOM que el HTML prerenderizado (comparado ya parseado: el
      // string de React escribe `srcSet`, el DOM lo normaliza a `srcset`).
      const prerenderizado = document.createElement("div");
      prerenderizado.innerHTML = html;
      expect(contenedor.innerHTML).toBe(prerenderizado.innerHTML);
    } finally {
      await act(async () => raiz.unmount());
      contenedor.remove();
    }
  });

  it("«jamon» encuentra «Jamón» y agrupa por categoría en el orden de la carta", async () => {
    render(app());
    await buscar("JAMON");

    const resultados = screen.getByRole("region", { name: "Platos" });
    const grupos = within(resultados).getAllByRole("heading", { level: 3 });
    expect(grupos.map((h) => h.textContent)).toEqual(["Entrantes fríos 1", "Entrantes calientes 1"]);
    expect(within(resultados).getByRole("link", { name: /Jamón 100% bellota/ })).toHaveAttribute(
      "href",
      "/carta/entrantes-frios#plato-12",
    );
    expect(within(resultados).getByRole("link", { name: /Croquetas de jamón ibérico/ })).toBeInTheDocument();
    // Cada grupo enlaza a su categoría.
    expect(within(resultados).getAllByRole("link", { name: "Ver sección" })[0]).toHaveAttribute("href", "/carta/entrantes-frios");
    // El índice desaparece mientras se busca.
    expect(document.getElementById("platos")).toBeNull();
    expect(recuento()).toHaveTextContent("2 resultados para «JAMON» en 2 categorías.");
    expect(recuento()).toHaveAttribute("aria-live", "polite");
  });

  it("«arroz» encuentra también «Arròs», y busca en la descripción", async () => {
    render(app());
    await buscar("arroz");
    const resultados = screen.getByRole("region", { name: "Platos" });
    expect(within(resultados).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Arroces 2",
      "Postres 1",
    ]);
    expect(within(resultados).getByText("Arròs negre")).toBeInTheDocument();
    expect(within(resultados).getByText("24,00 € / Ración")).toBeInTheDocument();

    await buscar("bechamel");
    expect(screen.getByText("Croquetas de jamón ibérico")).toBeInTheDocument();
    expect(screen.getByText("Caseras, de bechamel")).toBeInTheDocument();
  });

  it("busca en vinos y bebidas (se cargan al entrar en el campo)", async () => {
    render(app());
    fireEvent.focus(campo());
    await buscar("rias baixas");
    const bodega = await screen.findByRole(
      "region",
      { name: "Bodega y bebidas" },
      {
        timeout: 5000,
        // En el CI falla de vez en cuando y en local no se reproduce: sin el
        // volcado del DOM (que sale cortado), deja constancia de si la búsqueda
        // llegó a aplicarse y de qué secciones de resultados había.
        onTimeout: (error) => {
          const secciones = screen.queryAllByRole("region").map((region) => region.getAttribute("aria-labelledby"));
          error.message =
            `No aparece «Bodega y bebidas». Campo: «${(campo() as HTMLInputElement).value}» · ` +
            `recuento: «${recuento().textContent}» · secciones: ${JSON.stringify(secciones)}`;
          return error;
        },
      },
    );
    expect(within(bodega).getByRole("heading", { level: 3 })).toHaveTextContent("Vinos blancos 1");
    expect(within(bodega).getByText("Albariño Pazo de Señoráns")).toBeInTheDocument();
    expect(within(bodega).getByText("32,00 €")).toBeInTheDocument();
    expect(within(bodega).getByRole("link", { name: "Ver carta de vinos" })).toHaveAttribute("href", "/carta/vinos");

    // Un vino que sale por su maridaje enseña la frase que lo explica.
    await buscar("arroz");
    const conMaridaje = within(screen.getByRole("region", { name: "Bodega y bebidas" }));
    expect(conMaridaje.getByText("Muga Reserva")).toBeInTheDocument();
    expect(conMaridaje.getByText("Encaja con carnes y un arroz de setas.")).toBeInTheDocument();

    await buscar("cerveza");
    expect(within(screen.getByRole("region", { name: "Bodega y bebidas" })).getByText("Estrella Galicia")).toBeInTheDocument();
    expect(screen.getByText("33 cl")).toBeInTheDocument();
    // Límite propio: la espera de la bodega ya puede llegar a 5 s y, con las
    // tres búsquedas, el test pasaba de los 5 s por defecto en el runner del CI.
  }, 15000);

  it("en inglés busca en los nombres traducidos y habla en inglés", async () => {
    render(app("/en/carta", "en"));
    expect(screen.getByLabelText("Search the menu")).toBe(campo());
    await buscar("lobster");
    const resultados = screen.getByRole("region", { name: "Dishes" });
    expect(within(resultados).getByText("Creamy Lobster Rice")).toBeInTheDocument();
    expect(within(resultados).getByRole("heading", { level: 3 })).toHaveTextContent("Rice dishes 1");
    expect(within(resultados).getByRole("link", { name: /Creamy Lobster Rice/ })).toHaveAttribute(
      "href",
      "/en/carta/arroces#plato-31",
    );
    expect(recuento()).toHaveTextContent("1 result for “lobster”.");
  });

  it("sin resultados: mensaje claro y un botón que devuelve la carta entera", async () => {
    render(app());
    await buscar("pizza");
    expect(recuento()).toHaveTextContent("Sin resultados para «pizza».");
    expect(screen.getByText("No hemos encontrado nada con «pizza».")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver toda la carta" }));
    expect(campo()).toHaveValue("");
    expect(document.getElementById("platos")).not.toBeNull();
    expect(recuento()).toHaveTextContent("");
  });

  it("el botón de limpiar vacía el campo, devuelve el índice y deja el foco en el campo", async () => {
    render(app());
    expect(screen.queryByRole("button", { name: "Borrar la búsqueda" })).toBeNull();
    await buscar("pulpo");
    expect(screen.getByText("Ensaladilla de pulpo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Borrar la búsqueda" }));
    expect(campo()).toHaveValue("");
    expect(campo()).toHaveFocus();
    expect(document.getElementById("platos")).not.toBeNull();
  });

  it("Escape también limpia", async () => {
    render(app());
    await buscar("pulpo");
    fireEvent.keyDown(campo(), { key: "Escape" });
    expect(campo()).toHaveValue("");
    expect(document.getElementById("platos")).not.toBeNull();
  });

  it("los filtros dietéticos de la página se aplican a los platos encontrados", async () => {
    render(app("/carta?dietas=celiaquia"));
    await buscar("jamon");
    // Las croquetas llevan gluten: fuera. El jamón (alérgenos registrados,
    // sin gluten) se queda.
    expect(screen.getByText("Jamón 100% bellota")).toBeInTheDocument();
    expect(screen.queryByText("Croquetas de jamón ibérico")).toBeNull();
    // El enlace conserva el filtro.
    expect(screen.getByRole("link", { name: /Jamón 100% bellota/ })).toHaveAttribute(
      "href",
      "/carta/entrantes-frios?dietas=celiaquia#plato-12",
    );
  });

  it("al tocar un plato y volver atrás, la búsqueda y sus resultados siguen ahí", async () => {
    render(app());
    await buscar("pulpo");
    fireEvent.click(screen.getByRole("link", { name: /Ensaladilla de pulpo/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Atrás" }));
    expect(await screen.findByRole("searchbox")).toHaveValue("pulpo");
    expect(screen.getByText("Ensaladilla de pulpo")).toBeInTheDocument();
    expect(document.getElementById("platos")).toBeNull();
  });

  it("entrar de nuevo a /carta desde un enlace (no con «atrás») empieza sin búsqueda", async () => {
    render(app());
    await buscar("pulpo");
    fireEvent.click(screen.getByRole("link", { name: /Ensaladilla de pulpo/ }));
    fireEvent.click(await screen.findByRole("link", { name: "Enlace a la carta" }));
    expect(await screen.findByRole("searchbox")).toHaveValue("");
    expect(document.getElementById("platos")).not.toBeNull();
  });
});
