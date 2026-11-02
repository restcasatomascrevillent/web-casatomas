/**
 * QA F-32: la galería de «Nuestros espacios» no enseña pestañas de espacios
 * sin fotos (antes salía «Terraza» con «Fotografías próximamente»).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import EspaciosGallery from "@/components/EspaciosGallery";

beforeAll(() => {
  Element.prototype.scrollTo ??= function () {};
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

const casos = [
  { lang: "es", pestanas: ["Salón", "Comedor"], oculta: "Terraza", pendiente: /próximamente/i },
  { lang: "en", pestanas: ["Lounge", "Dining room"], oculta: "Terrace", pendiente: /coming soon/i },
  { lang: "fr", pestanas: ["Salon", "Salle à manger"], oculta: "Terrasse", pendiente: /à venir/i },
] as const;

describe("EspaciosGallery sin pestaña de Terraza", () => {
  it.each(casos)("$lang: solo salen los espacios con fotos", ({ lang, pestanas, oculta, pendiente }) => {
    const { container } = render(
      <MemoryRouter>
        <LanguageProvider initialLanguage={lang}>
          <EspaciosGallery />
        </LanguageProvider>
      </MemoryRouter>,
    );
    const tabs = container.querySelectorAll(".ct-tabs button");
    expect([...tabs].map((b) => b.textContent)).toEqual(pestanas);
    expect(screen.queryByRole("button", { name: oculta })).toBeNull();
    expect(container.textContent).not.toMatch(pendiente);
    expect(tabs[0].getAttribute("aria-pressed")).toBe("true");
  });
});
