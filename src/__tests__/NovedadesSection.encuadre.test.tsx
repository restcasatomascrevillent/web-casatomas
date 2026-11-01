/**
 * NovedadesSection: el encuadre vertical de la foto (`imagen_posicion_y`) que
 * se elige en el panel tiene que llegar a la web tal cual.
 *
 * Bug que protege: `0` (encuadre arriba del todo) se trataba como "sin valor"
 * por ser falso en JavaScript, y la foto se quedaba centrada (50 %).
 */
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageProvider";

// `vi.hoisted`: los `vi.mock` de abajo se elevan por encima de cualquier `const`.
const { filas } = vi.hoisted(() => ({
  filas: [
    { id: "arriba", titulo: "Arriba", imagen_url: "https://example.com/arriba.jpg", imagen_posicion_y: 0 },
    { id: "medio", titulo: "Medio", imagen_url: "https://example.com/medio.jpg", imagen_posicion_y: 36 },
    { id: "sin-valor", titulo: "Sin valor", imagen_url: "https://example.com/sin-valor.jpg" },
    { id: "sin-foto", titulo: "Cata sin foto", imagen_url: null },
    { id: "espacios", titulo: "Foto en blanco", imagen_url: "   " },
    { id: "rota", titulo: "Foto rota", imagen_url: "https://example.com/rota.jpg" },
  ],
}));

vi.mock("virtual:novedades-ssg", () => ({
  default: { generadoEn: "2026-10-22T05:00:00.000Z", novedades: filas },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          order: () => Promise.resolve({ data: filas, error: null }),
        }),
      }),
    }),
  },
}));

import NovedadesSection from "@/components/NovedadesSection";

const renderEs = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false, retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider initialLanguage="es">
        <NovedadesSection />
      </LanguageProvider>
    </QueryClientProvider>,
  );
};

const fotoDe = (titulo: string) => screen.getByAltText(new RegExp(`^${titulo} — `)) as HTMLImageElement;

describe("NovedadesSection — encuadre de la foto", () => {
  it("respeta el encuadre 0 (arriba del todo) en vez de centrar la foto", () => {
    renderEs();
    expect(fotoDe("Arriba").style.objectPosition).toBe("center 0%");
  });

  it("aplica un encuadre intermedio", () => {
    renderEs();
    expect(fotoDe("Medio").style.objectPosition).toBe("center 36%");
  });

  it("sin encuadre guardado deja el centrado por defecto del navegador", () => {
    renderEs();
    expect(fotoDe("Sin valor").style.objectPosition).toBe("");
  });
});

describe("NovedadesSection — novedad sin foto (QA-MDN-05)", () => {
  it("no pone una foto de relleno que no tiene que ver con la novedad", () => {
    renderEs();
    expect(screen.getByText("Cata sin foto")).toBeInTheDocument();
    expect(screen.queryByAltText(/^Cata sin foto — /)).toBeNull();
    // Las que sí tienen foto siguen con la suya.
    expect(screen.getAllByRole("img").filter((i) => i.getAttribute("src")?.includes("example.com"))).toHaveLength(4);
  });

  it("una URL con solo espacios cuenta como sin foto", () => {
    renderEs();
    expect(screen.getByText("Foto en blanco")).toBeInTheDocument();
    expect(screen.queryByAltText(/^Foto en blanco — /)).toBeNull();
  });

  it("si la foto no carga, quita el bloque en vez de dejar el recuadro roto", () => {
    renderEs();
    const foto = fotoDe("Foto rota");
    const bloque = foto.parentElement!;
    fireEvent.error(foto);
    expect(screen.queryByAltText(/^Foto rota — /)).toBeNull();
    expect(bloque.isConnected).toBe(false);
    expect(screen.getByText("Foto rota")).toBeInTheDocument();
  });
});
