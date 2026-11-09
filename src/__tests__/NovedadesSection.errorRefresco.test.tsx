/**
 * NovedadesSection: si el refresco en el navegador falla, las tarjetas que ya
 * hay (las del build) se quedan.
 *
 * Bug que protege (09/11/2026, captura del dueño en un iPhone): la consulta
 * del navegador falló (pestaña abierta desde antes de un deploy: el chunk
 * perezoso del cliente de Supabase ya no existía) y la sección cambió las
 * tarjetas del SSG por «No se pudieron cargar las novedades».
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageProvider";

vi.mock("virtual:novedades-ssg", () => ({
  default: {
    generadoEn: "2026-09-25T10:00:00.000Z",
    novedades: [{ id: "build", titulo: "Estrenamos nueva web" }],
  },
}));

const consulta = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          order: () => {
            consulta();
            return Promise.reject(new TypeError("Failed to fetch dynamically imported module"));
          },
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
  render(
    <QueryClientProvider client={client}>
      <LanguageProvider initialLanguage="es">
        <NovedadesSection />
      </LanguageProvider>
    </QueryClientProvider>,
  );
  return client;
};

describe("NovedadesSection — fallo del refresco", () => {
  it("mantiene las tarjetas del build y no enseña el error", async () => {
    const client = renderEs();
    await waitFor(() => expect(consulta).toHaveBeenCalled());
    await waitFor(() => expect(client.getQueryState(["novedades"])?.status).toBe("error"));
    expect(screen.getByText("Estrenamos nueva web")).toBeInTheDocument();
    expect(screen.queryByText(/No se pudieron cargar las novedades/)).not.toBeInTheDocument();
  });
});
