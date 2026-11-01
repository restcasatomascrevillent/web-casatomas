/**
 * Pie común y enlaces a la política de cookies (QA de salida a producción).
 *
 * Las páginas legales tenían un pie propio, mínimo, sin «Política de cookies»
 * ni «Aviso legal»: ahora usan el `Footer` de toda la web. Y el enlace del
 * aviso de cookies lleva directamente al apartado de cookies (`#cookies`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import AvisoLegal from "@/pages/AvisoLegal";
import Condiciones from "@/pages/Condiciones";
import PoliticaPrivacidad from "@/pages/PoliticaPrivacidad";
import CookieConsent from "@/components/CookieConsent";
import { translations as es } from "@/i18n/languages/es";
import { translations as en } from "@/i18n/languages/en";
import { translations as fr } from "@/i18n/languages/fr";
import type { Language } from "@/i18n/types";

vi.mock("@/components/Seo", () => ({ Seo: () => null }));

const IDIOMAS = [
  { lang: "es", prefijo: "", t: es },
  { lang: "en", prefijo: "/en", t: en },
  { lang: "fr", prefijo: "/fr", t: fr },
] as unknown as ReadonlyArray<{ lang: Language; prefijo: string; t: typeof es }>;

const montar = (lang: Language, ruta: string, pagina: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <LanguageProvider initialLanguage={lang}>{pagina}</LanguageProvider>
    </MemoryRouter>,
  );

/** El pie común: un único `<footer>` con todos los enlaces legales de su idioma. */
function compruebaPieCompleto(t: typeof es, prefijo: string) {
  expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
  const pie = screen.getByRole("contentinfo");
  expect(within(pie).getByRole("link", { name: t.footer.terms })).toHaveAttribute("href", `${prefijo}/politica-privacidad`);
  expect(within(pie).getByRole("link", { name: t.footer.cookiePolicy })).toHaveAttribute(
    "href",
    `${prefijo}/politica-privacidad#cookies`,
  );
  expect(within(pie).getByRole("link", { name: t.footer.bookingTerms })).toHaveAttribute("href", `${prefijo}/condiciones`);
  expect(within(pie).getByRole("link", { name: t.footer.legalNotice })).toHaveAttribute("href", "/aviso-legal");
  expect(within(pie).getByRole("button", { name: t.footer.cookieSettings })).toBeInTheDocument();
  expect(within(pie).getByRole("link", { name: t.footer.reserveLink })).toHaveAttribute("href", `${prefijo}/reservas`);
}

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    vi.fn(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(), takeRecords: vi.fn(() => []) })),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe.each(IDIOMAS)("pie completo en las páginas legales ($lang)", ({ lang, prefijo, t }) => {
  it("política de privacidad", () => {
    montar(lang, `${prefijo}/politica-privacidad`, <PoliticaPrivacidad />);
    compruebaPieCompleto(t, prefijo);
  });

  it("condiciones", () => {
    montar(lang, `${prefijo}/condiciones`, <Condiciones />);
    compruebaPieCompleto(t, prefijo);
  });

  it("el enlace del aviso de cookies lleva al apartado de cookies", () => {
    montar(lang, prefijo || "/", <CookieConsent />);
    expect(screen.getByRole("link", { name: t.cookie.link })).toHaveAttribute(
      "href",
      `${prefijo}/politica-privacidad#cookies`,
    );
  });
});

describe("aviso legal (solo en español)", () => {
  it("lleva el pie completo", () => {
    montar("es", "/aviso-legal", <AvisoLegal />);
    compruebaPieCompleto(es, "");
  });
});

describe("salto al apartado de cookies", () => {
  it("al entrar con #cookies, la política baja hasta ese apartado", () => {
    const scroll = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
    scroll.mockClear();
    montar("es", "/politica-privacidad#cookies", <PoliticaPrivacidad />);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.instances[0]).toBe(document.getElementById("cookies"));
  });
});
