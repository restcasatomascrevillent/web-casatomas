/**
 * Los enlaces a las reservas y a la política de privacidad respetan el idioma
 * de la página: desde `/en` y `/fr` llevan a `/en/reservas` y `/fr/reservas`
 * (antes llevaban siempre a la versión española).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MobileReserveCTA from "@/components/MobileReserveCTA";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { translations as es } from "@/i18n/languages/es";
import { translations as en } from "@/i18n/languages/en";
import { translations as fr } from "@/i18n/languages/fr";
import type { Language } from "@/i18n/types";

const IDIOMAS = [
  { lang: "es", prefijo: "", t: es },
  { lang: "en", prefijo: "/en", t: en },
  { lang: "fr", prefijo: "/fr", t: fr },
] as unknown as ReadonlyArray<{ lang: Language; prefijo: string; t: typeof es }>;

const Ruta = () => <output data-testid="ruta">{useLocation().pathname}</output>;

const montar = (lang: Language, ruta: string, hijos: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <LanguageProvider initialLanguage={lang}>
        {hijos}
        <Ruta />
      </LanguageProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    vi.fn(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    vi.fn(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(), takeRecords: vi.fn(() => []) })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe.each(IDIOMAS)("enlaces en $lang", ({ lang, prefijo, t }) => {
  it("el pie enlaza a las reservas y a la política de su idioma", () => {
    montar(lang, prefijo || "/", <Footer />);
    const pie = screen.getByRole("contentinfo");
    expect(within(pie).getByRole("link", { name: t.footer.reserveLink })).toHaveAttribute("href", `${prefijo}/reservas`);
    expect(within(pie).getByRole("link", { name: t.footer.terms })).toHaveAttribute("href", `${prefijo}/politica-privacidad`);
    expect(within(pie).getByRole("link", { name: t.footer.bookingTerms })).toHaveAttribute("href", `${prefijo}/condiciones`);
  });

  it("el botón «Reservar» del header lleva a las reservas de su idioma", async () => {
    const user = userEvent.setup();
    montar(lang, prefijo || "/", <Header />);
    const boton = screen.getAllByRole("button", { name: t.header.cta, hidden: true })[0];
    await user.click(boton);
    expect(screen.getByTestId("ruta")).toHaveTextContent(`${prefijo}/reservas`);
  });

  it("la barra móvil «Reservar mesa» lleva a las reservas de su idioma", async () => {
    const user = userEvent.setup();
    montar(lang, `${prefijo}/condiciones`, <MobileReserveCTA />);
    await user.click(screen.getByRole("button", { name: t.mobileCta.reserve, hidden: true }));
    expect(screen.getByTestId("ruta")).toHaveTextContent(`${prefijo}/reservas`);
  });

  it("la barra móvil no se pinta encima del propio formulario de reservas", () => {
    montar(lang, `${prefijo}/reservas`, <MobileReserveCTA />);
    expect(screen.queryByRole("button", { name: t.mobileCta.reserve, hidden: true })).toBeNull();
  });

  it("el teléfono de la barra móvil tiene etiqueta accesible en su idioma", () => {
    montar(lang, `${prefijo}/condiciones`, <MobileReserveCTA />);
    expect(screen.getByRole("link", { name: t.mobileCta.callAria, hidden: true })).toHaveAttribute("href", expect.stringMatching(/^tel:/));
  });
});
