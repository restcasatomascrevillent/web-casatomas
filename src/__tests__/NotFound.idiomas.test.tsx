/**
 * Página 404 en cada idioma (`/lo-que-sea`, `/en/lo-que-sea`, `/fr/lo-que-sea`
 * y `/novedades/no-existe`): `lang`, título y descripción en el idioma de la
 * URL, enlace de vuelta a la portada de ESE idioma, y cabecera y pie.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { idiomaDeRuta } from "@/i18n/routing";
import NotFound from "@/pages/NotFound";
import { translations as es } from "@/i18n/languages/es";
import { translations as en } from "@/i18n/languages/en";
import { translations as fr } from "@/i18n/languages/fr";

// `Seo` usa `Head` de vite-react-ssg (necesita su provider): se sustituye por
// un espía que guarda los props.
const seoProps = vi.hoisted(() => ({ ultimo: null as Record<string, unknown> | null }));
vi.mock("@/components/Seo", () => ({
  Seo: (props: Record<string, unknown>) => {
    seoProps.ultimo = props;
    return null;
  },
}));
vi.mock("@/components/JsonLd", () => ({ JsonLd: () => null }));

const pintar = (url: string) => {
  const lang = idiomaDeRuta(url);
  vi.spyOn(console, "error").mockImplementation(() => {});
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[url]}>
        <LanguageProvider initialLanguage={lang}>
          <NotFound />
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("404 por idioma", () => {
  it.each([
    { url: "/no-existe-qa", lang: "es", t: es, portada: "/" },
    { url: "/en/no-existe-qa", lang: "en", t: en, portada: "/en" },
    { url: "/fr/no-existe-qa", lang: "fr", t: fr, portada: "/fr" },
    { url: "/en/carta/no-existe-qa", lang: "en", t: en, portada: "/en" },
  ])("$url: lang, title, description y vuelta a $portada", async ({ url, lang, t, portada }) => {
    pintar(url);
    await waitFor(() => expect(screen.getByText(t.notFound.message)).toBeInTheDocument());
    expect(seoProps.ultimo).toMatchObject({
      lang,
      title: t.notFound.metaTitle,
      description: t.notFound.metaDescription,
      noindex: true,
    });
    expect(screen.getByRole("link", { name: t.notFound.back })).toHaveAttribute("href", portada);
  });

  it("cada idioma tiene su propio título y descripción (nada en castellano en en/fr)", () => {
    for (const t of [en, fr]) {
      expect(t.notFound.metaTitle).not.toBe(es.notFound.metaTitle);
      expect(t.notFound.metaDescription).not.toBe(es.notFound.metaDescription);
    }
    for (const t of [es, en, fr]) expect(t.notFound.metaDescription.length).toBeLessThanOrEqual(160);
  });
});

describe("404 de novedades", () => {
  it.each(["/novedades/no-existe-qa", "/en/novedades/no-existe-qa", "/fr/novedades/no-existe-qa"])(
    "%s lleva cabecera y pie",
    async (url) => {
      const { container } = pintar(url);
      await waitFor(() => expect(container.querySelector("header")).not.toBeNull());
      expect(container.querySelector("footer")).not.toBeNull();
      expect(container.querySelector("main")).not.toBeNull();
    },
  );
});
