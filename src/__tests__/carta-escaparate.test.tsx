/**
 * Carta «Escaparate» (diseño A): la tarjeta de plato enseña la cantidad en el
 * botón en cuanto el plato está en la mesa, y la sección pone delante los
 * platos con foto y debajo («También en …») los que aún no la tienen.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProductoCard from "@/components/carta/ProductoCard";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { resolveTranslatedItem } from "@/lib/carta-i18n";
import { separarPorFoto } from "@/pages/carta/Categoria";

const navajas = { id: "n1", nombre: "Navajas", categoria: "MARISCOS", precio_eur: 18.5, unidad: "Unidad" };
const gamba = { id: "g1", nombre: "Gamba roja", categoria: "MARISCOS", precio_eur: 28, unidad: "100 g" };

const pintar = (plato: typeof navajas, cantidadEnPedido: number, onAnadir = vi.fn()) => {
  render(
    <MemoryRouter>
      <LanguageProvider>
        <ProductoCard
          plato={resolveTranslatedItem(plato, "es")}
          categoria="Mariscos"
          cantidadEnPedido={cantidadEnPedido}
          onAnadir={onAnadir}
        />
      </LanguageProvider>
    </MemoryRouter>,
  );
  return onAnadir;
};

describe("ProductoCard — botón de añadir", () => {
  it("sin nada en la mesa dice «Añadir» con su «+»", () => {
    const onAnadir = pintar(navajas, 0);
    const boton = screen.getByRole("button", { name: "Añadir Navajas a Mi mesa" });
    expect(boton).toHaveTextContent("Añadir");
    expect(boton).not.toHaveAttribute("data-en-mesa");
    fireEvent.click(boton);
    expect(onAnadir).toHaveBeenCalledTimes(1);
  });

  it("con el plato en la mesa, el «+» deja sitio a la cantidad («× 2») y sigue añadiendo", () => {
    const onAnadir = pintar(navajas, 2);
    const boton = screen.getByRole("button", { name: "Añadir otra vez Navajas a Mi mesa (ya hay 2)" });
    expect(boton).toHaveTextContent("× 2");
    expect(boton).not.toHaveTextContent("Añadir");
    expect(boton).toHaveAttribute("data-en-mesa", "true");
    fireEvent.click(boton);
    expect(onAnadir).toHaveBeenCalledTimes(1);
  });

  it("al peso enseña los gramos, sin «×»", () => {
    pintar(gamba, 200);
    expect(screen.getByRole("button", { name: /Gamba roja.*ya hay 200 g/ })).toHaveTextContent(/^200 g$/);
  });

  it("solo la cara a la vista ofrece el botón (la otra va inert)", () => {
    pintar(navajas, 1);
    expect(screen.getAllByRole("button", { name: /Navajas a Mi mesa/ })).toHaveLength(1);
  });
});

describe("separarPorFoto", () => {
  const conFoto = (id: string) => ({ id, imagen_url: `https://x.supabase.co/storage/v1/object/public/platos/${id}.webp` });
  const sinFoto = (id: string) => ({ id, imagen_url: undefined });

  it("pone delante los que tienen foto y detrás los demás, cada grupo en su orden", () => {
    const platos = [sinFoto("a"), conFoto("b"), sinFoto("c"), conFoto("d")];
    const { conFoto: delante, sinFoto: detras } = separarPorFoto(platos, true);
    expect(delante.map((p) => p.id)).toEqual(["b", "d"]);
    expect(detras.map((p) => p.id)).toEqual(["a", "c"]);
  });

  it("con las fotos apagadas, una sola rejilla en el orden de siempre", () => {
    const platos = [sinFoto("a"), conFoto("b")];
    expect(separarPorFoto(platos, false)).toEqual({ conFoto: platos, sinFoto: [] });
  });

  it("si ninguno tiene foto no hay «También en …»", () => {
    const platos = [sinFoto("a"), sinFoto("b")];
    expect(separarPorFoto(platos, true)).toEqual({ conFoto: platos, sinFoto: [] });
  });
});
