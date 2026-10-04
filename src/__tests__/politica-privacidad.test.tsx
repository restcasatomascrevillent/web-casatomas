/**
 * Política de privacidad en es/en/fr.
 *
 * El texto es legal: la traducción no puede añadir ni quitar contenido. Estos
 * tests no juzgan la calidad del inglés/francés (eso es de una persona), pero
 * sí que las tres versiones tienen la MISMA estructura, las mismas cifras
 * (2 años, 3 meses), los mismos enlaces y los mismos datos del responsable, y
 * que la página enlaza a las rutas de su idioma.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import PoliticaPrivacidad from "@/pages/PoliticaPrivacidad";
import { TextoRico } from "@/components/TextoRico";
import { LANGUAGES } from "@/i18n/routing";
import type { Language } from "@/i18n/types";
import { NEGOCIO, SITE_URL } from "@/lib/negocio";
import { RESPONSABLE_TRATAMIENTO, TEXTOS_PRIVACIDAD, type TextosPrivacidad } from "@/lib/politica-privacidad-textos";

// `Seo` usa `Head` de vite-react-ssg (necesita su provider): se sustituye por un
// espía que guarda los props que recibe, para comprobar noindex/canonical/lang.
const seoProps = vi.hoisted(() => ({ ultimo: null as Record<string, unknown> | null }));
vi.mock("@/components/Seo", () => ({
  Seo: (props: Record<string, unknown>) => {
    seoProps.ultimo = props;
    return null;
  },
}));

const negritas = (texto: string) => [...texto.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]);
const enlaces = (texto: string) => [...texto.matchAll(/\]\((https?:[^)\s]+)\)/g)].map((m) => m[1]);
const cifras = (texto: string) => texto.match(/\d+/g) ?? [];

/** Todos los textos de una versión, en el orden en que se pintan. */
function todosLosTextos(p: TextosPrivacidad): string[] {
  return [
    p.seoTitle, p.seoDescription, p.back, p.title, p.updated,
    ...Object.values(p.controller),
    p.data.heading, p.data.intro, ...p.data.items, p.data.assistantLabel, p.data.assistant,
    p.purposes.heading, ...p.purposes.items.flatMap((i) => [i.purpose, i.basis, i.description]), p.purposes.conditionsLinkText,
    p.retention.heading, ...p.retention.items.flatMap((i) => [i.label, i.text]),
    p.cookies.heading, p.cookies.intro, ...p.cookies.items.flatMap((i) => [i.name, i.type, i.duration, i.purpose]), p.cookies.outro,
    p.rights.heading, p.rights.intro, ...p.rights.items.flatMap((i) => [i.right, i.description]), p.rights.exercise, p.rights.complaint,
    p.providers.heading, p.providers.intro, p.providers.privacyLinkLabel, ...p.providers.items.flatMap((i) => [i.name, i.text]),
    p.contact.heading, p.contact.intro,
    p.footer.rights, p.footer.home, p.footer.privacy, p.footer.conditions,
  ];
}

describe("textos de la política de privacidad — las tres versiones dicen lo mismo", () => {
  const es = TEXTOS_PRIVACIDAD.es;

  for (const lang of LANGUAGES.filter((l) => l !== "es")) {
    const otro = TEXTOS_PRIVACIDAD[lang];

    it(`${lang}: mismo número de apartados, datos, finalidades, plazos, cookies, derechos y proveedores`, () => {
      expect(otro.data.items).toHaveLength(es.data.items.length);
      expect(otro.purposes.items).toHaveLength(es.purposes.items.length);
      expect(otro.retention.items).toHaveLength(es.retention.items.length);
      expect(otro.cookies.items).toHaveLength(es.cookies.items.length);
      expect(otro.rights.items).toHaveLength(es.rights.items.length);
      expect(otro.providers.items).toHaveLength(es.providers.items.length);
    });

    it(`${lang}: los apartados están numerados igual (1 a 8)`, () => {
      const numeros = (p: TextosPrivacidad) =>
        [p.controller.heading, p.data.heading, p.purposes.heading, p.retention.heading, p.cookies.heading, p.rights.heading, p.providers.heading, p.contact.heading].map(
          (h) => h.match(/^(\d)\./)?.[1],
        );
      expect(numeros(otro)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
      expect(numeros(es)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    });

    it(`${lang}: mismos plazos de conservación (2 años, 3 meses) y mismos artículos del RGPD`, () => {
      expect(otro.retention.items.map((i) => negritas(i.text).flatMap(cifras))).toEqual(
        es.retention.items.map((i) => negritas(i.text).flatMap(cifras)),
      );
      expect(otro.purposes.items.map((i) => cifras(i.basis))).toEqual(es.purposes.items.map((i) => cifras(i.basis)));
      expect(cifras(otro.rights.intro)).toEqual(cifras(es.rights.intro)); // Ley Orgánica 3/2018
      expect(cifras(otro.updated)).toEqual(cifras(es.updated)); // 2026
    });

    it(`${lang}: la casilla/enlace de la newsletter está en la misma finalidad y los enlaces externos coinciden`, () => {
      expect(otro.purposes.items.map((i) => !!i.conditionsLink)).toEqual(es.purposes.items.map((i) => !!i.conditionsLink));
      expect(otro.providers.items.map((i) => i.href)).toEqual(es.providers.items.map((i) => i.href));
      expect(enlaces(otro.rights.complaint)).toEqual(enlaces(es.rights.complaint));
      expect(otro.rights.exercise).toContain("{email}");
    });

    it(`${lang}: los nombres de cookies y de proveedores se mantienen (son identificadores)`, () => {
      expect(otro.cookies.items.map((i) => i.name)).toEqual(es.cookies.items.map((i) => i.name));
      const marca = (nombre: string) => nombre.split(/[ (:]/)[0];
      expect(otro.providers.items.map((i) => marca(i.name)).slice(0, 4)).toEqual(
        es.providers.items.map((i) => marca(i.name)).slice(0, 4),
      );
    });

    it(`${lang}: sin avisos de «solo en español» ni textos sin traducir`, () => {
      const juntos = todosLosTextos(otro).join("\n");
      expect(juntos).not.toMatch(/in Spanish|en espagnol/i);
      // Un par de frases del texto español que no deben quedarse en la copia.
      expect(juntos).not.toContain("Recogemos únicamente");
      expect(juntos).not.toContain("Asistente telefónico");
      expect(juntos).not.toContain("Política de privacidad");
    });
  }

  it("los datos del responsable son los mismos en los tres idiomas y vienen de una sola fuente", () => {
    expect(RESPONSABLE_TRATAMIENTO.razonSocial).toBe("Restaurante Casa Tomás");
    expect(RESPONSABLE_TRATAMIENTO.direccion).toContain(NEGOCIO.calle);
    expect(RESPONSABLE_TRATAMIENTO.direccion).toContain(NEGOCIO.cp);
  });
});

describe("TextoRico — marcado mínimo", () => {
  it("negrita, enlace externo y email; el resto es texto (nada de HTML en crudo)", () => {
    const { container } = render(
      <MemoryRouter>
        <TextoRico texto="Hasta **2 años**, <b>no es HTML</b>, [AEPD](https://www.aepd.es) o {email}." />
      </MemoryRouter>,
    );
    expect(container.querySelector("strong")?.textContent).toBe("2 años");
    const aepd = screen.getByRole("link", { name: "AEPD" });
    expect(aepd).toHaveAttribute("href", "https://www.aepd.es");
    expect(aepd).toHaveAttribute("target", "_blank");
    expect(aepd).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getByRole("link", { name: NEGOCIO.email })).toHaveAttribute("href", `mailto:${NEGOCIO.email}`);
    expect(container.textContent).toContain("<b>no es HTML</b>");
    expect(container.querySelector("b")).toBeNull();
  });

  it("{phone} es el teléfono pulsable", () => {
    render(
      <MemoryRouter>
        <TextoRico texto="Llame al {phone}." />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link").getAttribute("href")).toMatch(/^tel:\+34/);
  });
});

function renderPagina(lang: Language, ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <LanguageProvider initialLanguage={lang}>
        <PoliticaPrivacidad />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

describe("página de la política de privacidad", () => {
  const RUTAS: Record<Language, string> = {
    es: "/politica-privacidad",
    en: "/en/politica-privacidad",
    fr: "/fr/politica-privacidad",
  };
  const PREFIJO: Record<Language, string> = { es: "", en: "/en", fr: "/fr" };

  beforeEach(() => {
    seoProps.ultimo = null;
  });

  for (const lang of LANGUAGES) {
    const p = TEXTOS_PRIVACIDAD[lang];

    it(`${lang}: noindex, sin hreflang, canonical y lang propios`, () => {
      renderPagina(lang, RUTAS[lang]);
      expect(seoProps.ultimo).toMatchObject({
        title: p.seoTitle,
        description: p.seoDescription,
        canonical: `${SITE_URL}${RUTAS[lang]}`,
        lang,
        noindex: true,
      });
      expect(seoProps.ultimo?.languageAlternates).toBeUndefined();
    });

    it(`${lang}: título, apartados y datos del responsable`, () => {
      renderPagina(lang, RUTAS[lang]);
      expect(screen.getByRole("heading", { level: 1, name: p.title })).toBeInTheDocument();
      for (const encabezado of [p.controller.heading, p.data.heading, p.purposes.heading, p.retention.heading, p.cookies.heading, p.rights.heading, p.providers.heading, p.contact.heading]) {
        expect(screen.getByRole("heading", { level: 2, name: encabezado })).toBeInTheDocument();
      }
      expect(screen.getByText(RESPONSABLE_TRATAMIENTO.razonSocial)).toBeInTheDocument();
      expect(screen.getAllByText(new RegExp(RESPONSABLE_TRATAMIENTO.direccion.slice(0, 20))).length).toBeGreaterThan(0);
      // Email del responsable (en el cuadro del responsable y en los enlaces)
      expect(screen.getAllByText(new RegExp(NEGOCIO.email)).length).toBeGreaterThan(1);
    });

    it(`${lang}: sus enlaces internos van a las rutas de su idioma`, () => {
      renderPagina(lang, RUTAS[lang]);
      const pie = screen.getByRole("contentinfo");
      expect(within(pie).getByRole("link", { name: p.footer.home })).toHaveAttribute("href", PREFIJO[lang] || "/");
      expect(within(pie).getByRole("link", { name: p.footer.privacy })).toHaveAttribute("href", `${PREFIJO[lang]}/politica-privacidad`);
      expect(within(pie).getByRole("link", { name: p.footer.conditions })).toHaveAttribute("href", `${PREFIJO[lang]}/condiciones`);
      expect(screen.getByRole("link", { name: new RegExp(p.back) })).toHaveAttribute("href", PREFIJO[lang] || "/");
      expect(screen.getByRole("link", { name: p.purposes.conditionsLinkText })).toHaveAttribute(
        "href",
        `${PREFIJO[lang]}/condiciones#newsletter`,
      );
    });

    it(`${lang}: los plazos de 2 años y 3 meses salen en negrita`, () => {
      const { container } = renderPagina(lang, RUTAS[lang]);
      const seccion = screen.getByRole("heading", { level: 2, name: p.retention.heading }).closest("section")!;
      expect([...seccion.querySelectorAll("strong")].map((s) => s.textContent).filter((t) => /\d/.test(t ?? "") )).toHaveLength(2);
      expect(container.querySelectorAll('a[target="_blank"]').length).toBeGreaterThanOrEqual(6); // 5 proveedores + AEPD
    });
  }
});
