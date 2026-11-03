/**
 * Estética de Navidad: solo en la demo. Se construye en todos los entornos
 * menos en producción (`scripts/navidad.mjs`, misma detección que la versión),
 * y en el build de producción (`VITE_NAVIDAD = "false"`) no se pinta nada
 * navideño en la portada, la cabecera ni la tarjeta de cheques regalo.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { navidadEnBuild } from "../../scripts/navidad.mjs";
import { navidadActiva } from "@/lib/navidad";

// El hero precarga el logo con `<Head>` (necesita el HelmetProvider del SSG).
vi.mock("vite-react-ssg", () => ({ Head: () => null }));

describe("¿lleva el build la estética de Navidad? (scripts/navidad.mjs)", () => {
  it("no en producción (Vercel, VERCEL_ENV=production: la rama main)", () => {
    expect(navidadEnBuild({ VERCEL: "1", VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "main" })).toBe(false);
  });

  it("sí en la demo (staging), en previews y en local", () => {
    expect(navidadEnBuild({ VERCEL: "1", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "staging" })).toBe(true);
    expect(navidadEnBuild({ VERCEL: "1", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "feat/navidad" })).toBe(true);
    expect(navidadEnBuild({})).toBe(true);
  });

  it("en la app: solo un \"false\" explícito la apaga", () => {
    expect(navidadActiva("false")).toBe(false);
    expect(navidadActiva("true")).toBe(true);
    expect(navidadActiva(undefined)).toBe(true);
  });
});

describe("portada, cabecera y cheques: demo frente a producción", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const pintar = async (url: string, idioma: "es" | "en" | "fr", produccion: boolean) => {
    vi.stubEnv("VITE_NAVIDAD", produccion ? "false" : "true");
    vi.resetModules();
    const Hero = (await import("@/components/Hero")).default;
    const Header = (await import("@/components/Header")).default;
    const ContactoSection = (await import("@/components/ContactoSection")).default;
    const { FranjaNavidad } = await import("@/components/navidad/Navidad");
    const { NAVIDAD } = await import("@/lib/navidad");
    const { LanguageProvider } = await import("@/i18n/LanguageProvider");
    return render(
      <MemoryRouter initialEntries={[url]}>
        <LanguageProvider initialLanguage={idioma}>
          <Header />
          <Hero />
          {NAVIDAD && <FranjaNavidad language={idioma} />}
          <ContactoSection modo="regalo" />
        </LanguageProvider>
      </MemoryRouter>,
    );
  };

  it.each([
    ["/", "es", "Felices fiestas", "Reservar mesa", "/reservas", "Regala Casa Tomás esta Navidad"],
    ["/en", "en", "Happy holidays", "Book a table", "/en/reservas", "Give Casa Tomás this Christmas"],
    ["/fr", "fr", "Joyeuses fêtes", "Réserver une table", "/fr/reservas", "Offrez Casa Tomás pour Noël"],
  ] as const)("demo %s: franja «%s», enlace a reservas y lema de los cheques", async (url, idioma, titulo, enlace, href, lema) => {
    const { container } = await pintar(url, idioma, false);
    const franja = container.querySelector<HTMLElement>(".navidad-franja")!;
    expect(within(franja).getByText(titulo)).toBeInTheDocument();
    expect(within(franja).getByRole("link", { name: new RegExp(`^${enlace}`) })).toHaveAttribute("href", href);
    expect(within(container).getByText(lema)).toBeInTheDocument();
    // Lo decorativo, oculto a lectores de pantalla.
    for (const clase of [".navidad-nevada", ".navidad-ornamento", ".navidad-filete-cabecera", ".navidad-lazo"]) {
      const nodo = container.querySelector(clase);
      expect(nodo, clase).not.toBeNull();
      expect(nodo).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("producción: ni rastro de Navidad", async () => {
    const { container } = await pintar("/", "es", true);
    expect(container.querySelector('[class*="navidad"]')).toBeNull();
    expect(container.textContent).not.toMatch(/Felices fiestas|Navidad|Nochebuena/);
  });
});
