/**
 * Condiciones de compra de cheques regalo y bases del sorteo «Vota tu vino
 * favorito» (09/11/2026). Comprueba que los tres idiomas dicen lo mismo
 * (estructura y cifras), que recogen lo que decidió el dueño y que la página
 * `/condiciones` las pinta con sus anclas y el recuadro «Edición actual».
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import Condiciones from "@/pages/Condiciones";
import { LANGUAGES } from "@/i18n/routing";
import type { Language } from "@/i18n/types";
import { TEXTOS_CHEQUES_SORTEO, type SeccionCondiciones } from "@/lib/condiciones-compra-textos";
import { NEGOCIO, TITULAR } from "@/lib/negocio";

vi.mock("@/components/Seo", () => ({ Seo: () => null }));

const es = TEXTOS_CHEQUES_SORTEO.es;
const cifras = (secciones: readonly SeccionCondiciones[]) =>
  secciones.map((s) => [s.title, ...s.paragraphs].join(" ").replace(TITULAR.domicilio, "").replace(TITULAR.cif, "").match(/\d+/g) ?? []);
const marcas = (secciones: readonly SeccionCondiciones[]) =>
  secciones.map((s) => s.paragraphs.join(" ").match(/\{(phone|email|privacy)\}/g) ?? []);

describe("textos de cheques regalo y sorteo", () => {
  for (const lang of LANGUAGES.filter((l) => l !== "es")) {
    const otro = TEXTOS_CHEQUES_SORTEO[lang];
    it(`${lang}: mismos apartados, mismas cifras y mismos enlaces que el español`, () => {
      expect(otro.giftSections.map((s) => s.paragraphs.length)).toEqual(es.giftSections.map((s) => s.paragraphs.length));
      expect(otro.drawSections.map((s) => s.paragraphs.length)).toEqual(es.drawSections.map((s) => s.paragraphs.length));
      expect(cifras(otro.giftSections)).toEqual(cifras(es.giftSections));
      expect(cifras(otro.drawSections)).toEqual(cifras(es.drawSections));
      expect(marcas(otro.giftSections)).toEqual(marcas(es.giftSections));
      expect(marcas(otro.drawSections)).toEqual(marcas(es.drawSections));
    });
  }

  it("recogen las decisiones del dueño: 30 días para devolver, 12 meses ampliables, solo en el restaurante, mayores de 18", () => {
    const cheques = es.giftSections.flatMap((s) => s.paragraphs).join("\n");
    expect(cheques).toMatch(/30 días naturales desde la compra/);
    expect(cheques).toMatch(/incluidos los gastos de gestión, en un plazo máximo de 14 días/);
    expect(cheques).toMatch(/12 meses desde la fecha de compra/);
    expect(cheques).toMatch(/pídenos que ampliemos el plazo/);
    expect(cheques).toMatch(/No sirve para comprar botellas de la tienda de vinos ni en otros establecimientos/);
    expect(cheques).toMatch(/te lo volveremos a enviar al email con el que se compró/);
    expect(cheques).toContain(TITULAR.denominacionSocial);
    expect(es.giftSections.some((s) => /Modelo de formulario de desistimiento/.test(s.title))).toBe(true);
    const sorteo = es.drawSections.flatMap((s) => s.paragraphs).join("\n");
    expect(sorteo).toMatch(/mayores de 18 años/);
    expect(sorteo).toMatch(/gratis y no obliga a comprar/);
    expect(sorteo).toContain(TITULAR.cif);
  });
});

function pintar(lang: Language, ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <LanguageProvider initialLanguage={lang}>
        <Condiciones />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

const respuesta = (fila: Record<string, unknown>) => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://x.test");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [fila] }));
};

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("página /condiciones", () => {
  const PREFIJO: Record<Language, string> = { es: "", en: "/en", fr: "/fr" };
  for (const lang of LANGUAGES) {
    const t = TEXTOS_CHEQUES_SORTEO[lang];
    it(`${lang}: índice y secciones de cheques regalo y sorteo, con su ancla y el email pulsable`, async () => {
      respuesta({ encuesta_vinos_activa: false });
      pintar(lang, `${PREFIJO[lang]}/condiciones`);
      const indice = screen.getByRole("navigation");
      expect(within(indice).getByRole("link", { name: t.tocGift })).toHaveAttribute("href", "#cheques-regalo");
      expect(within(indice).getByRole("link", { name: t.tocDraw })).toHaveAttribute("href", "#sorteo");
      expect(document.getElementById("cheques-regalo-titulo")).toHaveTextContent(t.giftHeading);
      expect(document.getElementById("sorteo-titulo")).toHaveTextContent(t.drawHeading);
      const cheques = document.getElementById("cheques-regalo")!;
      expect(within(cheques).getAllByRole("link", { name: NEGOCIO.email })[0]).toHaveAttribute("href", `mailto:${NEGOCIO.email}`);
      await waitFor(() => expect(fetch).toHaveBeenCalled());
      expect(screen.getByTestId("sorteo-edicion-actual")).toHaveTextContent(t.drawCurrent.none);
    });
  }

  it("con una edición abierta, el recuadro enseña el premio y el último día", async () => {
    const anio = new Date().getFullYear() + 1;
    respuesta({ encuesta_vinos_activa: true, encuesta_vinos_premio: "Una botella de Mauro", encuesta_vinos_fin: `${anio}-06-30` });
    pintar("es", "/condiciones");
    const recuadro = screen.getByTestId("sorteo-edicion-actual");
    await waitFor(() => expect(recuadro).toHaveTextContent("Premio: Una botella de Mauro"));
    expect(recuadro).toHaveTextContent(`Último día para votar: 30/06/${anio} (incluido)`);
  });
});
