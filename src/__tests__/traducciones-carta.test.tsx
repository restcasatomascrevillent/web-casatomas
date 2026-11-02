/**
 * Textos de la carta que salían en castellano en /en y /fr (QA de salida a
 * producción: F-14, F-15, F-16, F-38 y F-39).
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { etiquetaUnidadPlato } from "@/lib/unidades-platos";
import { etiquetaAlergeno } from "@/lib/alergenos";
import { categoriaDeLinea } from "@/lib/mi-mesa";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { Language } from "@/i18n/types";
import { translations as en } from "@/i18n/languages/en";
import { translations as fr } from "@/i18n/languages/fr";

describe("unidad del precio (F-14)", () => {
  it("traduce «Unidad» y «Ración», también con las formas que guarda el panel", () => {
    expect(etiquetaUnidadPlato("Unidad", "en")).toBe("Unit");
    expect(etiquetaUnidadPlato("ud.", "fr")).toBe("Unité");
    expect(etiquetaUnidadPlato("ración", "en")).toBe("Portion");
    expect(etiquetaUnidadPlato("Raciones", "fr")).toBe("Portion");
    expect(etiquetaUnidadPlato("Unidad", "es")).toBe("Unidad");
  });

  it("deja kg, gramos y textos libres como están", () => {
    expect(etiquetaUnidadPlato("kg", "en")).toBe("kg");
    expect(etiquetaUnidadPlato("150 gr", "fr")).toBe("150 g");
    expect(etiquetaUnidadPlato("Docena", "en")).toBe("Docena");
  });
});

describe("«Sin alérgenos declarados» (F-16)", () => {
  it("se pinta en el idioma de la página", () => {
    expect(etiquetaAlergeno("sin alérgenos declarados", "fr")).toBe("Aucun allergène déclaré");
    expect(etiquetaAlergeno("sin alérgenos declarados", "en")).toBe("No allergens declared");
    expect(etiquetaAlergeno("Sin alérgenos declarados", "es")).toBe("Sin alérgenos declarados");
  });

  it("no cambia las etiquetas de los alérgenos de verdad", () => {
    expect(etiquetaAlergeno("lacteos", "fr")).toBe("Produits laitiers");
  });
});

describe("categoría en «Mi mesa» (F-15)", () => {
  const diccionarios = (t: typeof en) => [t.categories.platos, t.categories.bebidas];

  it("usa la columna traducida de la BD si viaja en la línea", () => {
    const linea = { categoria: "ENTRANTES FRÍOS", categoria_en: "Cold Starters" };
    expect(categoriaDeLinea(linea, "en", diccionarios(en))).toBe("Cold Starters");
  });

  it("si no, el diccionario de categorías", () => {
    expect(categoriaDeLinea({ categoria: "ENTRANTES FRÍOS" }, "en", diccionarios(en))).toBe("Cold starters");
    expect(categoriaDeLinea({ categoria: "Cervezas" }, "fr", diccionarios(fr))).toBe(fr.categories.bebidas.Cervezas);
  });

  it("en castellano, o sin traducción conocida, la deja como está", () => {
    expect(categoriaDeLinea({ categoria: "ENTRANTES FRÍOS", categoria_en: "Cold" }, "es")).toBe("ENTRANTES FRÍOS");
    expect(categoriaDeLinea({ categoria: "VINOS TINTOS — RIOJA" }, "fr", diccionarios(fr))).toBe("VINOS TINTOS — RIOJA");
    expect(categoriaDeLinea({ categoria: null }, "fr")).toBeNull();
  });
});

describe("botón de cerrar de diálogos y paneles (F-38)", () => {
  const casos: [Language, string][] = [
    ["es", "Cerrar"],
    ["en", "Close"],
    ["fr", "Fermer"],
  ];

  it.each(casos)("diálogo en %s → «%s»", (idioma, texto) => {
    render(
      <LanguageProvider initialLanguage={idioma}>
        <Dialog open>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Título</DialogTitle>
          </DialogContent>
        </Dialog>
      </LanguageProvider>,
    );
    expect(screen.getByRole("button", { name: texto })).toBeInTheDocument();
  });

  it.each(casos)("panel lateral en %s → «%s»", (idioma, texto) => {
    render(
      <LanguageProvider initialLanguage={idioma}>
        <Sheet open>
          <SheetContent aria-describedby={undefined}>
            <SheetTitle>Título</SheetTitle>
          </SheetContent>
        </Sheet>
      </LanguageProvider>,
    );
    expect(screen.getByRole("button", { name: texto })).toBeInTheDocument();
  });

  it("un diálogo que trae su propio texto lo conserva, y sin proveedor sale en castellano", () => {
    render(
      <Dialog open>
        <DialogContent aria-describedby={undefined} closeLabel="Cerrar aviso">
          <DialogTitle>Título</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "Cerrar aviso" })).toBeInTheDocument();
  });
});
