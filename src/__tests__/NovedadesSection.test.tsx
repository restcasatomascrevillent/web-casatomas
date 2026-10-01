/**
 * NovedadesSection: la web tiene que pedir las novedades a Supabase al cargar,
 * aunque el build ya traiga una copia (`virtual:novedades-ssg`).
 *
 * Bug que protege: la copia del build se sembraba como `initialData` sin
 * fecha, React Query la daba por recién descargada y, con el `staleTime` de
 * 5 min de `App.tsx`, no volvía a preguntar. Resultado: una novedad nueva o
 * una traducción corregida en el panel no salía en la web en ningún idioma
 * hasta el siguiente deploy.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageProvider";

// Copia del build: una foto vieja (de hace días), con la novedad anterior.
vi.mock("virtual:novedades-ssg", () => ({
  default: {
    generadoEn: "2026-09-25T10:00:00.000Z",
    novedades: [{ id: "vieja", titulo: "Zamburiñas con tuétano", titulo_en: "Variegated Scallops with Bone Marrow" }],
  },
}));

// Lo que hay HOY en Supabase: la del cocido, con su traducción.
const filasSupabase = [
  {
    id: "cocido",
    titulo: "Llega el cocido gallego",
    titulo_en: "Galician Cocido Is Here",
    titulo_fr: "Le cocido galicien arrive",
  },
];
const consulta = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          order: () => {
            consulta();
            return Promise.resolve({ data: filasSupabase, error: null });
          },
        }),
      }),
    }),
  },
}));

import NovedadesSection from "@/components/NovedadesSection";

const renderEn = () => {
  // Misma configuración que App.tsx.
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false, retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider initialLanguage="en">
        <NovedadesSection />
      </LanguageProvider>
    </QueryClientProvider>,
  );
};

describe("NovedadesSection", () => {
  beforeEach(() => consulta.mockClear());

  it("pinta primero la copia del build (lo mismo que el HTML del SSG)", () => {
    renderEn();
    expect(screen.getByText("Variegated Scallops with Bone Marrow")).toBeInTheDocument();
  });

  it("al cargar pide las novedades a Supabase y pinta la traducción actual", async () => {
    renderEn();
    await waitFor(() => expect(consulta).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Galician Cocido Is Here")).toBeInTheDocument();
    expect(screen.queryByText("Variegated Scallops with Bone Marrow")).not.toBeInTheDocument();
  });
});
