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

describe("ProductoCard — foto en grande y descripción", () => {
  const conFotoYDescripcion = {
    ...navajas,
    descripcion: "Navajas frescas a la plancha con ajo y perejil.",
    imagen_url: "https://x.test/platos/navajas.webp",
  };
  const pintarConFoto = () =>
    render(
      <MemoryRouter>
        <LanguageProvider>
          <ProductoCard plato={resolveTranslatedItem(conFotoYDescripcion, "es")} categoria="Mariscos" />
        </LanguageProvider>
      </MemoryRouter>,
    );

  it("la descripción no sale delante: solo detrás, tras la «i»", () => {
    const { container } = pintarConFoto();
    expect(container.querySelector('[data-cara="delantera"]')).not.toHaveTextContent(conFotoYDescripcion.descripcion);
    expect(container.querySelector('[data-cara="trasera"]')).toHaveTextContent(conFotoYDescripcion.descripcion);
  });

  it("pulsar la foto la abre en grande, con el nombre del plato, y se cierra", () => {
    pintarConFoto();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ampliar foto — Navajas" }));
    const dialogo = screen.getByRole("dialog", { name: "Navajas" });
    expect(dialogo.querySelector("img")).toHaveAttribute("src", conFotoYDescripcion.imagen_url);
    // El precio con su unidad, como en la tarjeta (en el marisco al peso importa).
    expect(dialogo).toHaveTextContent(/18,50\s€\s\/\sUnidad/);
    fireEvent.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("si el plato tiene vídeo, en grande sigue siendo vídeo (en bucle, sin sonido, con la foto de póster)", () => {
    const video = "https://x.test/platos/navajas.mp4";
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    try {
      render(
        <MemoryRouter>
          <LanguageProvider>
            <ProductoCard
              plato={resolveTranslatedItem({ ...conFotoYDescripcion, video_url: video }, "es")}
              categoria="Mariscos"
            />
          </LanguageProvider>
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Ampliar foto — Navajas" }));
      const dialogo = screen.getByRole("dialog", { name: "Navajas" });
      const enGrande = dialogo.querySelector("video")!;
      expect(enGrande).not.toBeNull();
      expect(enGrande).toHaveAttribute("src", video);
      expect(enGrande).toHaveAttribute("poster", conFotoYDescripcion.imagen_url);
      expect(enGrande.autoplay).toBe(true);
      expect(enGrande.muted).toBe(true);
      expect(enGrande).toHaveAttribute("loop");
      expect(enGrande).toHaveAttribute("playsinline");
      expect(dialogo.querySelector("img")).toBeNull();
      expect(play).toHaveBeenCalled();
    } finally {
      play.mockRestore();
      pause.mockRestore();
    }
  });

  it("sin foto no hay botón de ampliar", () => {
    pintar(navajas, 0);
    expect(screen.queryByRole("button", { name: /ampliar foto/i })).toBeNull();
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
