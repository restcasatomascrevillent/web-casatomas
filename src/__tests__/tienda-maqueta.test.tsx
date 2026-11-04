/**
 * La tienda de vinos es una MAQUETA solo en la demo: se construye en todos los
 * entornos menos en producción (`scripts/tienda-maqueta.mjs`, misma detección
 * que la versión), y en el build de producción no hay ruta `/tienda`, ni
 * enlaces en el menú o el pie, ni equivalente en otros idiomas.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { RouteRecord } from "vite-react-ssg";
import { tiendaEnBuild } from "../../scripts/tienda-maqueta.mjs";
import { tiendaVisible } from "@/lib/tienda-visible";

describe("¿se construye la tienda? (scripts/tienda-maqueta.mjs)", () => {
  it("no en producción (Vercel, VERCEL_ENV=production: la rama main)", () => {
    expect(tiendaEnBuild({ VERCEL: "1", VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "main" })).toBe(false);
  });

  it("sí en la demo (staging), en previews y en local", () => {
    expect(tiendaEnBuild({ VERCEL: "1", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "staging" })).toBe(true);
    expect(tiendaEnBuild({ VERCEL: "1", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "feat/tienda" })).toBe(true);
    expect(tiendaEnBuild({})).toBe(true);
  });

  it("en la app: solo un \"false\" explícito la oculta", () => {
    expect(tiendaVisible("false")).toBe(false);
    expect(tiendaVisible("true")).toBe(true);
    expect(tiendaVisible(undefined)).toBe(true);
  });
});

describe("build de producción (VITE_TIENDA_VISIBLE = \"false\")", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const cargarComoProduccion = async () => {
    vi.stubEnv("VITE_TIENDA_VISIBLE", "false");
    vi.resetModules();
    return {
      App: await import("@/App"),
      routing: await import("@/i18n/routing"),
      Header: (await import("@/components/Header")).default,
      Footer: (await import("@/components/Footer")).default,
      LanguageProvider: (await import("@/i18n/LanguageProvider")).LanguageProvider,
    };
  };

  it("no hay ruta /tienda en ningún idioma ni equivalente en otro idioma", async () => {
    const { App, routing } = await cargarComoProduccion();
    const rutas = App.routes.flatMap((rama: RouteRecord) => (rama.children ?? []).map((hijo) => `${rama.path}|${hijo.path ?? ""}`));
    expect(rutas.filter((ruta) => ruta.endsWith("|tienda"))).toEqual([]);
    expect(routing.existeEnTodosLosIdiomas("/tienda")).toBe(false);
  });

  it.each([
    ["/", "es"],
    ["/en", "en"],
    ["/fr", "fr"],
  ] as const)("%s: ni «Tienda» en el menú ni en el pie", async (url, idioma) => {
    const { Header, Footer, LanguageProvider } = await cargarComoProduccion();
    const { container } = render(
      <MemoryRouter initialEntries={[url]}>
        <LanguageProvider initialLanguage={idioma}>
          <Header />
          <Footer />
        </LanguageProvider>
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('a[href$="/tienda"]')).toHaveLength(0);
    expect(within(container).queryByRole("link", { name: /^(Tienda|Shop|Boutique)/ })).toBeNull();
    // El resto del pie sigue igual.
    expect(container.querySelector('footer a[href$="/carta"]')).not.toBeNull();
  });
});

describe("acceso a la tienda en la tarjeta de cheques regalo", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const pintarRegalo = async (url: string, idioma: "es" | "en" | "fr", produccion: boolean) => {
    if (produccion) vi.stubEnv("VITE_TIENDA_VISIBLE", "false");
    vi.resetModules();
    const ContactoSection = (await import("@/components/ContactoSection")).default;
    const { LanguageProvider } = await import("@/i18n/LanguageProvider");
    return render(
      <MemoryRouter initialEntries={[url]}>
        <LanguageProvider initialLanguage={idioma}>
          <ContactoSection modo="regalo" />
        </LanguageProvider>
      </MemoryRouter>,
    );
  };

  it.each([
    ["/regala", "es", "Ver la tienda", "/tienda", "Tienda de vinos"],
    ["/en/regala", "en", "See the shop", "/en/tienda", "Wine shop"],
    ["/fr/regala", "fr", "Voir la boutique", "/fr/tienda", "Boutique de vins"],
  ] as const)("demo %s: «%s» lleva a %s", async (url, idioma, boton, href, titulo) => {
    const { container } = await pintarRegalo(url, idioma, false);
    expect(within(container).getByRole("heading", { name: titulo })).toBeInTheDocument();
    expect(within(container).getByRole("link", { name: boton })).toHaveAttribute("href", href);
  });

  it("producción: la tarjeta no enlaza a la tienda", async () => {
    const { container } = await pintarRegalo("/regala", "es", true);
    expect(within(container).queryByRole("link", { name: "Ver la tienda" })).toBeNull();
    expect(container.querySelectorAll('a[href$="/tienda"]')).toHaveLength(0);
  });
});
