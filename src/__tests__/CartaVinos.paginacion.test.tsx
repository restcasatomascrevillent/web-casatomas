/**
 * Regresión (auditoría 18/10/2026): la carta de vinos pagina de 24 en 24 y
 * desde que abre en «Todos» (207 referencias en producción) tres cosas
 * fallaban con datos reales:
 *
 *  1. El orden era `categoria, orden` sin desempate y en producción 184 de 207
 *     vinos comparten ese par: Postgres no garantiza el mismo orden entre dos
 *     consultas, así que «Mostrar más» podía repetir vinos de la primera
 *     página y no enseñar otros nunca.
 *  2. El buscador solo miraba los 24 vinos cargados: un vino de la página 2
 *     «no existía» hasta pulsar «Mostrar más».
 *  3. El refresco automático (cada 60 s, al volver a la pestaña o recuperar
 *     la red) volvía a pedir solo la primera página y la lista se encogía a
 *     24 fichas mientras el visitante leía la ficha 40.
 *
 * El mock imita a PostgREST: aplica filtros, `order` y `range`, y en los
 * EMPATES devuelve un orden distinto según la página pedida (como puede hacer
 * Postgres con otro plan), de modo que solo un desempate único da páginas
 * coherentes.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import CartaVinos from "@/components/carta/CartaVinos";
import { setEdadVinosConfirmada } from "@/utils/sessionManager";

type Vino = { id: string; nombre: string; precio_eur: number; categoria: string; orden: number; activado: boolean; restaurante: boolean };

const mock = vi.hoisted(() => ({ filas: [] as Vino[], consultas: 0 }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const filtros: ((v: Vino) => boolean)[] = [];
      const orden: { campo: keyof Vino; asc: boolean }[] = [];
      let desde = 0, hasta = 999;
      const consulta = {
        select: () => consulta,
        eq: (campo: keyof Vino, valor: unknown) => { filtros.push(v => v[campo] === valor); return consulta; },
        is: (campo: keyof Vino, valor: unknown) => { filtros.push(v => v[campo] === valor); return consulta; },
        in: (campo: keyof Vino, valores: unknown[]) => { filtros.push(v => valores.includes(v[campo])); return consulta; },
        order: (campo: keyof Vino, opciones?: { ascending?: boolean }) => { orden.push({ campo, asc: opciones?.ascending !== false }); return consulta; },
        range: (a: number, b: number) => { desde = a; hasta = b; return consulta; },
        then: (resolver: (valor: unknown) => unknown) => {
          mock.consultas++;
          const empate = desde === 0 ? 1 : -1; // otra página, otro orden en los empates
          const filas = mock.filas.filter(v => filtros.every(f => f(v))).sort((a, b) => {
            for (const { campo, asc } of orden) {
              const x = a[campo], y = b[campo];
              if (x < y) return asc ? -1 : 1;
              if (x > y) return asc ? 1 : -1;
            }
            return a.id < b.id ? -empate : empate;
          });
          return Promise.resolve({ data: filas.slice(desde, hasta + 1), error: null }).then(resolver);
        },
      };
      return consulta;
    },
  },
}));

const vino = (i: number): Vino => ({
  id: `v${String(i).padStart(2, "0")}`,
  nombre: `Rioja ${String(i).padStart(2, "0")}`,
  precio_eur: 20,
  categoria: "VINOS TINTOS — RIOJA",
  orden: 0,
  activado: true,
  restaurante: true,
});

const pintar = () => render(
  <LanguageProvider>
    <CartaVinos initialVinos={{ Todos: mock.filas.slice(0, 24) }} initialMapVinos={mock.filas} />
  </LanguageProvider>,
);

/** Espera a que termine la carga inicial (catálogo del mapa + primera página). */
const esperarCargaInicial = async () => {
  await waitFor(() => expect(mock.consultas).toBeGreaterThanOrEqual(2));
  await screen.findByRole("button", { name: "Mostrar más" });
};

describe("Carta de vinos — paginación, búsqueda y refresco con el catálogo completo", () => {
  beforeEach(() => {
    setEdadVinosConfirmada();
    mock.consultas = 0;
  });

  it("«Mostrar más» enseña cada vino una sola vez aunque compartan categoría y orden", async () => {
    mock.filas = Array.from({ length: 30 }, (_, i) => vino(i));
    pintar();
    await esperarCargaInicial();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar más" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Mostrar más" })).not.toBeInTheDocument());
    for (const { nombre } of mock.filas) expect(screen.getAllByText(nombre)).toHaveLength(1);
  });

  it("el buscador encuentra un vino que no está en la primera página", async () => {
    mock.filas = Array.from({ length: 40 }, (_, i) => vino(i));
    pintar();
    await esperarCargaInicial();
    expect(screen.queryByText("Rioja 35")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "rioja 35" } });
    expect(await screen.findByText("Rioja 35", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText("Rioja 01")).not.toBeInTheDocument();
    expect(screen.queryByText("No se encontraron vinos")).not.toBeInTheDocument();
  });

  it("el refresco automático no descarta las páginas ya cargadas con «Mostrar más»", async () => {
    mock.filas = Array.from({ length: 40 }, (_, i) => vino(i));
    pintar();
    await esperarCargaInicial();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar más" }));
    expect(await screen.findByText("Rioja 39")).toBeInTheDocument();
    const antes = mock.consultas;
    act(() => { window.dispatchEvent(new Event("focus")); });
    await waitFor(() => expect(mock.consultas).toBeGreaterThanOrEqual(antes + 2));
    // Da tiempo a que se aplique la respuesta del refresco.
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(screen.getByText("Rioja 39")).toBeInTheDocument();
    expect(screen.getByText("Rioja 24")).toBeInTheDocument();
  });
});
