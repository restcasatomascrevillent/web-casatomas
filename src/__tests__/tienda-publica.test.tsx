/**
 * La tienda de vinos está PUBLICADA en todos los entornos (dueño, 04/11/2026):
 * antes era una maqueta que el build de producción quitaba. Ya no depende del
 * entorno: con un build de producción (Vercel, `VERCEL_ENV=production`,
 * `import.meta.env.PROD`) hay ruta `/tienda` en los tres idiomas, enlace en el
 * menú, en el pie y en la tarjeta de cheques regalo.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { RouteRecord } from "vite-react-ssg";

/** Recarga los módulos como en un build de producción (rama `main` en Vercel). */
const comoProduccion = () => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("VERCEL_GIT_COMMIT_REF", "main");
  vi.stubEnv("MODE", "production");
  vi.stubEnv("PROD", true);
  vi.stubEnv("DEV", false);
  vi.resetModules();
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("tienda publicada también en producción", () => {
  it("ruta /tienda en las tres ramas del router y equivalente en otro idioma", async () => {
    comoProduccion();
    const App = await import("@/App");
    const routing = await import("@/i18n/routing");
    const rutas = App.routes.flatMap((rama: RouteRecord) => (rama.children ?? []).map((hijo) => `${rama.path}|${hijo.path ?? ""}`));
    expect(rutas.filter((ruta) => ruta.endsWith("|tienda"))).toEqual(["/|tienda", "/en|tienda", "/fr|tienda"]);
    expect(routing.existeEnTodosLosIdiomas("/tienda")).toBe(true);
    expect(routing.rutaEquivalente("/tienda", "en")).toBe("/en/tienda");
    expect(routing.rutaEquivalente("/en/tienda", "fr")).toBe("/fr/tienda");
  });

  it.each([
    ["/", "es", "/tienda"],
    ["/en", "en", "/en/tienda"],
    ["/fr", "fr", "/fr/tienda"],
  ] as const)("%s: «Tienda» en el menú y en el pie, a %s", async (url, idioma, href) => {
    comoProduccion();
    const Header = (await import("@/components/Header")).default;
    const Footer = (await import("@/components/Footer")).default;
    const { LanguageProvider } = await import("@/i18n/LanguageProvider");
    const { container } = render(
      <MemoryRouter initialEntries={[url]}>
        <LanguageProvider initialLanguage={idioma}>
          <Header />
          <Footer />
        </LanguageProvider>
      </MemoryRouter>,
    );
    expect(container.querySelector(`header a[href="${href}"]`)).not.toBeNull();
    expect(container.querySelector(`footer a[href="${href}"]`)).not.toBeNull();
    // El resto del pie sigue igual.
    expect(container.querySelector('footer a[href$="/carta"]')).not.toBeNull();
  });

  it.each([
    ["/regala", "es", "Ver la tienda", "/tienda", "Tienda de vinos"],
    ["/en/regala", "en", "See the shop", "/en/tienda", "Wine shop"],
    ["/fr/regala", "fr", "Voir la boutique", "/fr/tienda", "Boutique de vins"],
  ] as const)("cheques regalo %s: «%s» lleva a %s", async (url, idioma, boton, href, titulo) => {
    comoProduccion();
    const ContactoSection = (await import("@/components/ContactoSection")).default;
    const { LanguageProvider } = await import("@/i18n/LanguageProvider");
    const { container } = render(
      <MemoryRouter initialEntries={[url]}>
        <LanguageProvider initialLanguage={idioma}>
          <ContactoSection modo="regalo" />
        </LanguageProvider>
      </MemoryRouter>,
    );
    expect(within(container).getByRole("heading", { name: titulo })).toBeInTheDocument();
    expect(within(container).getByRole("link", { name: boton })).toHaveAttribute("href", href);
  });
});
