/**
 * NovedadesSection: las fotos de las novedades (subidas sin comprimir, hasta
 * 1,3 MB) pasan por el optimizador de Vercel con srcset por ancho, igual que
 * las de la carta, para no agotar el egress de Supabase Storage.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageProvider";

const HOST = "https://haqmmdfdzzatdnrrcgez.supabase.co";
const FOTO = `${HOST}/storage/v1/object/public/novedades/cata.jpg`;

const { filas } = vi.hoisted(() => ({
  filas: [
    { id: "a", titulo: "Cata", imagen_url: "https://haqmmdfdzzatdnrrcgez.supabase.co/storage/v1/object/public/novedades/cata.jpg" },
    { id: "b", titulo: "Externa", imagen_url: "https://example.com/e.jpg" },
  ],
}));

vi.mock("virtual:novedades-ssg", () => ({
  default: { generadoEn: "2026-10-22T05:00:00.000Z", novedades: filas },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ order: () => ({ order: () => Promise.resolve({ data: filas, error: null }) }) }),
    }),
  },
}));

import NovedadesSection from "@/components/NovedadesSection";

describe("NovedadesSection — fotos optimizadas", () => {
  beforeEach(() => vi.stubEnv("VITE_SUPABASE_URL", HOST));
  afterEach(() => vi.unstubAllEnvs());

  const pinta = () =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { staleTime: 300000, retry: false } } })}>
        <LanguageProvider initialLanguage="es">
          <NovedadesSection />
        </LanguageProvider>
      </QueryClientProvider>,
    );

  it("la foto de Supabase va por /_vercel/image con srcset 640/768/1024, sizes, lazy y async", () => {
    pinta();
    const img = screen.getByAltText(/^Cata — /) as HTMLImageElement;
    expect(img.getAttribute("src")).toBe(`/_vercel/image?url=${encodeURIComponent(FOTO)}&w=768&q=75`);
    const srcset = img.getAttribute("srcset")!;
    for (const w of [640, 768, 1024]) expect(srcset).toContain(`&w=${w}&q=75 ${w}w`);
    expect(img.getAttribute("sizes")).toContain("100vw");
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("decoding")).toBe("async");
  });

  it("una foto de otro host se deja tal cual, sin srcset", () => {
    pinta();
    const img = screen.getByAltText(/^Externa — /) as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://example.com/e.jpg");
    expect(img.hasAttribute("srcset")).toBe(false);
  });
});
