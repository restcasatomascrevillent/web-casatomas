/**
 * Secciones de platos con nombre libre en el menú de una novedad
 * (`secciones.extra`, 31/10/2026): el panel las escribe con su posición y la
 * web las pinta intercaladas entre primero, segundo y postre.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import CartaDelDia, { type SeccionExtraCarta } from "@/components/espacios/CartaDelDia";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { parsearMenuNovedad, type PosicionSeccionExtra } from "@/lib/menu-novedad";

const plato = (id: string, nombre: string, extra: Record<string, unknown> = {}) => ({
  id,
  origen: "libre",
  platoId: null,
  nombre,
  descripcion: null,
  imagenUrl: null,
  imagenPosicionY: null,
  alergenos: [],
  alergenosInferidos: [],
  alergenosNotas: null,
  ...extra,
});

const MENU = {
  version: 2,
  tipo: "menu",
  incluye_bebidas: false,
  maridaje: true,
  secciones: {
    primero: [plato("p1", "Gamba roja")],
    segundo: [plato("s1", "Arroz a banda")],
    postre: [plato("d1", "Turrón")],
    bebidas: [],
    extra: [
      { id: "x2", nombre: "Prepostre", posicion: "antes_postre", platos: [plato("e2", "Sorbete de limón")] },
      {
        id: "x1",
        nombre: "Aperitivo",
        posicion: "antes_primero",
        traducciones: { en: { nombre: "Appetiser" } },
        platos: [plato("e1", "Gilda", { maridaje: { id: "m1", nombre: "Fino", sulfitos: true } })],
      },
      { id: "x3", nombre: "Café", posicion: "rara", platos: [plato("e3", "Café de puchero")] },
      { id: "x4", nombre: "   ", posicion: "antes_segundo", platos: [plato("e4", "Sin sección")] },
      { id: "x5", nombre: "Vacía", posicion: "antes_segundo", platos: [] },
    ],
  },
};

describe("parsearMenuNovedad · secciones extra", () => {
  it("lee las que tienen nombre y platos, con su posición, su nombre traducido y el maridaje de sus platos", () => {
    const menu = parsearMenuNovedad(MENU, "en", "n")!;
    expect(menu.extras.map((e) => [e.titulo, e.posicion, e.items.map((i) => i.nombre)])).toEqual([
      ["Prepostre", "antes_postre", ["Sorbete de limón"]],
      ["Appetiser", "antes_primero", ["Gilda"]],
      ["Café", "despues_postre", ["Café de puchero"]],
    ]);
    expect(menu.maridajes[menu.extras[1].items[0].id]).toMatchObject({ nombre: "Fino", sulfitos: true });
  });

  it("un menú con platos solo en secciones extra se pinta; sin la clave, `extras` está vacío", () => {
    const soloExtra = { version: 1, secciones: { extra: [{ nombre: "Aperitivo", platos: [plato("e1", "Gilda")] }] } };
    expect(parsearMenuNovedad(soloExtra, "es")?.extras).toHaveLength(1);
    const sinExtra = { version: 1, secciones: { primero: [plato("p1", "Gamba")] } };
    expect(parsearMenuNovedad(sinExtra, "es")?.extras).toEqual([]);
  });
});

describe("CartaDelDia · secciones intercaladas", () => {
  it("pinta cada sección extra en su sitio entre primero, segundo y postre", () => {
    const menu = parsearMenuNovedad(MENU, "es", "n")!;
    const intercaladas: Partial<Record<PosicionSeccionExtra, SeccionExtraCarta[]>> = {};
    for (const extra of menu.extras) {
      (intercaladas[extra.posicion] ??= []).push({ clave: extra.id, titulo: extra.titulo, items: extra.items });
    }
    render(
      <MemoryRouter>
        <LanguageProvider initialLanguage="es">
          <CartaDelDia menu={menu} titulo={<h3>Menú</h3>} seccionesIntercaladas={intercaladas} maridajes={menu.maridajes} />
        </LanguageProvider>
      </MemoryRouter>,
    );
    const orden = ["Gilda", "Gamba roja", "Arroz a banda", "Sorbete de limón", "Turrón", "Café de puchero"].map(
      (nombre) => screen.getByText(nombre),
    );
    for (let i = 1; i < orden.length; i++) {
      expect(orden[i - 1].compareDocumentPosition(orden[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByText("Aperitivo")).toBeInTheDocument();
    expect(screen.getByText("Prepostre")).toBeInTheDocument();
  });
});
