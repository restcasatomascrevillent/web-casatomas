/**
 * Encabezado y texto SEO de `/carta/:categoria` (08/11/2026, petición del
 * dueño con la captura de `/carta/carnes`):
 *
 *  - El `h1` es el nombre de la sección en los datos («Carnes»), único, sin
 *    el título comercial largo (ni visible ni oculto).
 *  - Entre el encabezado y los platos no hay párrafos: el texto descriptivo
 *    va al pie, en un `<details>` cerrado y prerenderizado.
 *  - `title` y `description` siguen siendo los propios de cada sección.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import type { Language } from "@/i18n/types";
import { SEO_CATEGORIA } from "@/lib/carta-seo";

vi.mock("virtual:carta-ssg", () => ({
  default: {
    generadoEn: "2026-11-08T08:00:00.000Z",
    platos: [
      { id: "1", nombre: "Chuletón vaca madurada 60 días", categoria: "CARNES", categoria_en: "Meats", precio_eur: 88 },
      { id: "2", nombre: "Cochinillo", categoria: "CARNES", categoria_en: "Meats", precio_eur: 26 },
      { id: "3", nombre: "Fruta", categoria: "POSTRES", categoria_en: "Desserts", precio_eur: 6 },
    ],
    resumen: { vinos: { total: 0, categorias: [] }, bebidas: { total: 0, categorias: [] } },
  },
}));

// `Seo` usa `Head` de vite-react-ssg; aquí basta con ver qué recibe.
const seoProps = vi.hoisted(() => ({ ultimo: null as null | { title?: string; description?: string; canonical?: string } }));
vi.mock("@/components/Seo", () => ({
  Seo: (props: { title?: string; description?: string; canonical?: string }) => {
    seoProps.ultimo = props;
    return null;
  },
}));
vi.mock("@/hooks/useMostrarFotosPlatos", () => ({ useMostrarFotosPlatos: () => false }));

import CartaCategoria from "@/pages/carta/Categoria";

const pagina = (entrada: string, idioma: Language = "es") => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[entrada]}>
      <LanguageProvider initialLanguage={idioma}>
        <Routes>
          <Route path="/carta/:categoria" element={<CartaCategoria />} />
          <Route path="/en/carta/:categoria" element={<CartaCategoria />} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>
  </QueryClientProvider>
);

const INTRO_CARNES = SEO_CATEGORIA.carnes.es.intro[0];

describe("/carta/:categoria — encabezado y contenido ampliado", () => {
  beforeEach(() => {
    seoProps.ultimo = null;
  });

  it("el único h1 es el nombre de la sección, no el título comercial", () => {
    const { container } = render(pagina("/carta/carnes"));
    const h1s = container.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/^Carnes$/);
    expect(container.textContent).not.toContain("chuletón madurado 60 días y cochinillo");
    // Migas y contador, como siempre.
    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toHaveTextContent("Carnes");
    expect(screen.getByText("2 platos")).toBeInTheDocument();
  });

  it("el h1 sale del nombre traducido de la sección en cada idioma", () => {
    const { container } = render(pagina("/en/carta/carnes", "en"));
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelector("h1")).toHaveTextContent(/^Meats$/);
  });

  it("no hay párrafos entre el encabezado y los platos: el texto va al pie, en un desplegable cerrado", () => {
    const { container } = render(pagina("/carta/carnes"));
    const parrafo = screen.getByText(INTRO_CARNES);
    const desplegable = parrafo.closest("details");
    expect(desplegable).not.toBeNull();
    expect(desplegable).not.toHaveAttribute("open");
    expect(within(desplegable as HTMLElement).getByText("Más sobre nuestras carnes").closest("summary")).not.toBeNull();

    // Después del último plato y antes de «Otras secciones».
    const ultimoPlato = container.querySelector("#plato-2") as Element;
    const otrasSecciones = screen.getByRole("navigation", { name: "Otras secciones" });
    expect(ultimoPlato.compareDocumentPosition(desplegable as Element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect((desplegable as Element).compareDocumentPosition(otrasSecciones) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // Abrir y cerrar con teclado o toque es comportamiento nativo de `<details>`
  // que jsdom no implementa: lo prueba el e2e `carta-seccion-encabezado`.

  it("el texto ampliado está en el HTML prerenderizado (no se carga al abrir)", () => {
    const html = renderToString(pagina("/carta/carnes"));
    expect(html).toContain(INTRO_CARNES);
    expect(html).toMatch(/<details[^>]*>(?:(?!<\/details>)[\s\S])*Más sobre nuestras carnes/);
    expect(html).not.toMatch(/<details[^>]*\bopen\b/);
  });

  it("los metadatos siguen siendo los propios de la sección", () => {
    render(pagina("/carta/carnes"));
    expect(seoProps.ultimo?.title).toBe(SEO_CATEGORIA.carnes.es.title);
    expect(seoProps.ultimo?.description).toBe(SEO_CATEGORIA.carnes.es.description);
    expect(seoProps.ultimo?.canonical).toMatch(/\/carta\/carnes$/);
  });

  it("una sección sin SEO propio no lleva desplegable y mantiene sus metadatos genéricos", () => {
    const { container } = render(pagina("/carta/postres"));
    expect(container.querySelector("h1")).toHaveTextContent(/^Postres$/);
    expect(container.querySelector("main details.mt-12")).toBeNull();
    expect(seoProps.ultimo?.title).toBe("Postres: carta y precios | Casa Tomás Crevillent");
  });
});
