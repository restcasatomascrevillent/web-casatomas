/**
 * Regresión (auditoría 18/10/2026): como en la carta de vinos, el buscador de
 * bebidas solo miraba la página cargada (24). En producción «Cervezas» tiene 25
 * referencias: la nº 25 no aparecía al buscarla hasta pulsar «Mostrar más».
 * Además «TODAS» ordenaba solo por `orden` (63 de 75 bebidas empatan) y podía
 * repetir u omitir bebidas entre páginas.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import CartaBebidas from "@/components/carta/CartaBebidas";

type Bebida = { id: string; nombre: string; categoria: string; precio_eur: number; orden: number; activado: boolean; restaurante: boolean };
const mock = vi.hoisted(() => ({ filas: [] as Bebida[] }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const filtros: ((b: Bebida) => boolean)[] = [];
      const orden: (keyof Bebida)[] = [];
      let desde = 0, hasta = 999;
      const consulta = {
        select: () => consulta,
        eq: (c: keyof Bebida, v: unknown) => { filtros.push((b) => b[c] === v); return consulta; },
        is: (c: keyof Bebida, v: unknown) => { filtros.push((b) => b[c] === v); return consulta; },
        order: (c: keyof Bebida) => { orden.push(c); return consulta; },
        range: (a: number, b: number) => { desde = a; hasta = b; return consulta; },
        then: (ok: (v: unknown) => unknown) => {
          const empate = desde === 0 ? 1 : -1;
          const filas = mock.filas.filter((b) => filtros.every((f) => f(b))).sort((a, b) => {
            for (const c of orden) { if (a[c] < b[c]) return -1; if (a[c] > b[c]) return 1; }
            return a.id < b.id ? -empate : empate;
          });
          return Promise.resolve({ data: filas.slice(desde, hasta + 1), error: null }).then(ok);
        },
      };
      return consulta;
    },
  },
}));

const bebida = (i: number, orden = 0): Bebida => ({ id: `b${String(i).padStart(2, "0")}`, nombre: `Cerveza ${String(i).padStart(2, "0")}`, categoria: "Cervezas", precio_eur: 3, orden, activado: true, restaurante: true });

describe("Carta de bebidas — búsqueda y paginación", () => {
  beforeEach(() => { mock.filas = []; });

  it("el buscador encuentra una bebida que no está en la primera página", async () => {
    mock.filas = Array.from({ length: 30 }, (_, i) => bebida(i + 1, i + 1));
    render(<LanguageProvider><CartaBebidas showAddButton /></LanguageProvider>);
    await screen.findByText("Cerveza 01");
    expect(screen.queryByText("Cerveza 28")).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Buscar bebidas..."), { target: { value: "cerveza 28" } });
    // Se vuelve a consultar: la tarjeta se re-renderiza (mock de framer-motion)
    // y el nodo encontrado primero puede sustituirse por otro idéntico.
    await waitFor(() => expect(screen.getByText("Cerveza 28")).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.queryByText("Cerveza 01")).not.toBeInTheDocument();
  });

  it("«Mostrar más» enseña cada bebida una sola vez aunque empaten en orden", async () => {
    mock.filas = Array.from({ length: 30 }, (_, i) => bebida(i + 1));
    render(<LanguageProvider><CartaBebidas showAddButton /></LanguageProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Mostrar más" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Mostrar más" })).not.toBeInTheDocument());
    for (const { nombre } of mock.filas) expect(screen.getAllByText(nombre)).toHaveLength(1);
  });
});
