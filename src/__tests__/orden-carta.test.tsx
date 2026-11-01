/**
 * Orden de los platos (y vinos y bebidas) dentro de cada categoría.
 *
 * Contrato con el panel: al reordenar, guarda en `orden` enteros consecutivos
 * desde 1 dentro de cada categoría. En `Platos` y `Vinos` la columna es TEXTO,
 * y PostgREST la ordenaba como texto: "1", "10", "11", "2"… A partir de diez
 * platos, la carta no salía en el orden del panel. Ahora:
 *  - `orden` numérico ascendente dentro de cada categoría;
 *  - nulos / no numéricos al final;
 *  - empates en el orden en que llegan de la consulta (sort estable);
 *  - las categorías no se mueven.
 * Tanto en los datos que se hornean en el build (`scripts/carta-ssg.mjs`) como
 * en los que la carta de vinos carga en el navegador (`CartaVinos`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { compararOrden, ordenarPorOrdenEnCategoria, ordenNumerico } from "@/lib/orden-carta.mjs";
import { fetchCartaSSG } from "../../scripts/carta-ssg.mjs";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import CartaVinos from "@/components/carta/CartaVinos";
import { setEdadVinosConfirmada } from "@/utils/sessionManager";

type Fila = { id: string; categoria?: string | null; orden?: unknown };
const ids = (filas: { id: string }[]) => filas.map((fila) => fila.id);

describe("ordenNumerico", () => {
  it("lee el número del texto que guarda el panel y los números tal cual", () => {
    expect(ordenNumerico("1")).toBe(1);
    expect(ordenNumerico(" 12 ")).toBe(12);
    expect(ordenNumerico("10")).toBe(10);
    expect(ordenNumerico("3,5")).toBe(3.5);
    expect(ordenNumerico("-2")).toBe(-2);
    expect(ordenNumerico(7)).toBe(7);
    expect(ordenNumerico(0)).toBe(0);
  });

  it("todo lo que no es un número es «sin orden»", () => {
    for (const valor of [null, undefined, "", "   ", "abc", "1º", "2a", NaN, Infinity, {}, []]) {
      expect(ordenNumerico(valor)).toBeNull();
    }
  });

  it("compararOrden: numérico, y los «sin orden» detrás y empatados entre sí", () => {
    expect(compararOrden("2", "10")).toBeLessThan(0);
    expect(compararOrden("10", "2")).toBeGreaterThan(0);
    expect(compararOrden(null, "1")).toBeGreaterThan(0);
    expect(compararOrden("1", "abc")).toBeLessThan(0);
    expect(compararOrden(null, "abc")).toBe(0);
    expect(compararOrden("01", 1)).toBe(0);
  });
});

describe("ordenarPorOrdenEnCategoria", () => {
  it("ordena 1, 2, … 10, 11 y no como texto", () => {
    const filas: Fila[] = ["1", "10", "11", "2", "3"].map((orden) => ({ id: `p${orden}`, categoria: "ARROCES", orden }));
    expect(ids(ordenarPorOrdenEnCategoria(filas))).toEqual(["p1", "p2", "p3", "p10", "p11"]);
  });

  it("deja al final los nulos y los no numéricos, en el orden en que llegaron", () => {
    const filas: Fila[] = [
      { id: "sin-1", categoria: "POSTRES", orden: null },
      { id: "dos", categoria: "POSTRES", orden: "2" },
      { id: "texto", categoria: "POSTRES", orden: "abc" },
      { id: "uno", categoria: "POSTRES", orden: 1 },
      { id: "sin-2", categoria: "POSTRES" },
    ];
    expect(ids(ordenarPorOrdenEnCategoria(filas))).toEqual(["uno", "dos", "sin-1", "texto", "sin-2"]);
  });

  it("con la columna ya entera (tras la migración del panel) da el mismo resultado", () => {
    const filas: Fila[] = [
      { id: "a", categoria: "X", orden: 10 },
      { id: "b", categoria: "X", orden: null },
      { id: "c", categoria: "X", orden: 2 },
      { id: "d", categoria: "X", orden: 1 },
    ];
    expect(ids(ordenarPorOrdenEnCategoria(filas))).toEqual(["d", "c", "a", "b"]);
  });

  it("los empates conservan el orden de llegada (como está hoy: todos a 0)", () => {
    const filas: Fila[] = ["c", "a", "d", "b"].map((id) => ({ id, categoria: "SNACK", orden: "0" }));
    expect(ids(ordenarPorOrdenEnCategoria(filas))).toEqual(["c", "a", "d", "b"]);
  });

  it("no mueve las categorías: ordena DENTRO de cada una", () => {
    const filas: Fila[] = [
      { id: "m10", categoria: "MARISCOS", orden: "10" },
      { id: "m2", categoria: "MARISCOS", orden: "2" },
      { id: "a3", categoria: "ARROCES", orden: "3" },
      { id: "a1", categoria: "ARROCES", orden: "1" },
    ];
    expect(ids(ordenarPorOrdenEnCategoria(filas))).toEqual(["m2", "m10", "a1", "a3"]);
  });

  it("no muta la entrada", () => {
    const filas: Fila[] = [
      { id: "b", categoria: "X", orden: "2" },
      { id: "a", categoria: "X", orden: "1" },
    ];
    const copia = [...filas];
    ordenarPorOrdenEnCategoria(filas);
    expect(filas).toEqual(copia);
  });
});

describe("datos horneados en el build (scripts/carta-ssg.mjs)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("platos y vinos (orden en texto) y bebidas (numérico) salen por orden numérico dentro de cada categoría", async () => {
    // Lo que devolvería PostgREST con `order=categoria.asc,orden.asc`: orden de TEXTO.
    const respuestas: Record<string, object[]> = {
      Platos: [
        { id: "a-1", nombre: "Arroz 1", categoria: "ARROCES", precio_eur: 1, orden: "1" },
        { id: "a-10", nombre: "Arroz 10", categoria: "ARROCES", precio_eur: 1, orden: "10" },
        { id: "a-2", nombre: "Arroz 2", categoria: "ARROCES", precio_eur: 1, orden: "2" },
        { id: "a-x", nombre: "Arroz sin orden", categoria: "ARROCES", precio_eur: 1, orden: null },
        { id: "c-11", nombre: "Carne 11", categoria: "CARNES", precio_eur: 1, orden: "11" },
        { id: "c-9", nombre: "Carne 9", categoria: "CARNES", precio_eur: 1, orden: "9" },
      ],
      Vinos: [
        { id: "v-12", nombre: "Vino 12", categoria: "VINOS TINTOS — RIOJA", precio_eur: 1, orden: "12" },
        { id: "v-3", nombre: "Vino 3", categoria: "VINOS TINTOS — RIOJA", precio_eur: 1, orden: "3" },
      ],
      Bebidas: [
        { id: "b-1", nombre: "Agua", categoria: "Aguas", precio_eur: 1, orden: 1 },
        { id: "b-2", nombre: "Agua con gas", categoria: "Aguas", precio_eur: 1, orden: 2 },
      ],
    };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const tabla = new URL(url).pathname.split("/").at(-1) ?? "";
      return { ok: true, json: async () => respuestas[tabla] ?? [] };
    }));

    const carta = await fetchCartaSSG({ url: "https://local.test", key: "test" });

    expect(ids(carta.platos)).toEqual(["a-1", "a-2", "a-10", "a-x", "c-9", "c-11"]);
    expect(ids(carta.vinos)).toEqual(["v-3", "v-12"]);
    expect(ids(carta.bebidas)).toEqual(["b-1", "b-2"]);
    // `orden` viaja para que el navegador pueda reordenar igual.
    expect(carta.platos[0]).toMatchObject({ orden: "1" });
    expect(carta.platos[3]).not.toHaveProperty("orden");
  });

  it("pide a Supabase categoría, orden e `id` como desempate único en las tres tablas", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      urls.push(url);
      return { ok: true, json: async () => [{ id: "1", nombre: "x", categoria: "X", precio_eur: 1 }] };
    }));
    await fetchCartaSSG({ url: "https://local.test", key: "test" });
    for (const tabla of ["Platos", "Vinos", "Bebidas"]) {
      const url = urls.find((candidata) => candidata.includes(`/rest/v1/${tabla}?`));
      expect(new URL(url!).searchParams.get("order"), tabla).toBe("categoria.asc,orden.asc,id.asc");
    }
  });
});

// ---------------------------------------------------------------------------
// Navegador: la carta de vinos pide a Supabase y Supabase ordena `orden` (texto)
// como texto. Mini-PostgREST: filtros, `order` (nulos al final, como Postgres)
// y `range`.
// ---------------------------------------------------------------------------
type VinoVivo = { id: string; nombre: string; precio_eur: number; categoria: string; orden: string | null; activado: boolean; restaurante: boolean };
const vivo = vi.hoisted(() => ({ filas: [] as VinoVivo[] }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const filtros: ((v: VinoVivo) => boolean)[] = [];
      const orden: (keyof VinoVivo)[] = [];
      let desde = 0, hasta = 999;
      const consulta = {
        select: () => consulta,
        eq: (campo: keyof VinoVivo, valor: unknown) => { filtros.push((v) => v[campo] === valor); return consulta; },
        is: (campo: keyof VinoVivo, valor: unknown) => { filtros.push((v) => v[campo] === valor); return consulta; },
        in: (campo: keyof VinoVivo, valores: unknown[]) => { filtros.push((v) => valores.includes(v[campo])); return consulta; },
        order: (campo: keyof VinoVivo) => { orden.push(campo); return consulta; },
        range: (a: number, b: number) => { desde = a; hasta = b; return consulta; },
        then: (resolver: (valor: unknown) => unknown) => {
          const filas = vivo.filas.filter((v) => filtros.every((f) => f(v))).sort((a, b) => {
            for (const campo of orden) {
              const x = a[campo], y = b[campo];
              if (x === y) continue;
              if (x === null) return 1; // NULLS LAST
              if (y === null) return -1;
              return String(x) < String(y) ? -1 : 1; // texto, como Postgres con `text`
            }
            return 0;
          });
          return Promise.resolve({ data: filas.slice(desde, hasta + 1), error: null }).then(resolver);
        },
      };
      return consulta;
    },
  },
}));

describe("datos cargados en el navegador (CartaVinos)", () => {
  beforeEach(() => setEdadVinosConfirmada());

  it("pinta los vinos de cada categoría por orden numérico aunque Supabase los devuelva como texto", async () => {
    const fila = (id: string, categoria: string, orden: string | null): VinoVivo => ({
      id, nombre: `Vino ${id}`, precio_eur: 20, categoria, orden, activado: true, restaurante: true,
    });
    vivo.filas = [
      fila("r10", "VINOS TINTOS — RIOJA", "10"),
      fila("r2", "VINOS TINTOS — RIOJA", "2"),
      fila("rx", "VINOS TINTOS — RIOJA", null),
      fila("r1", "VINOS TINTOS — RIOJA", "1"),
      fila("b11", "VINOS BLANCOS — RUEDA", "11"),
      fila("b3", "VINOS BLANCOS — RUEDA", "3"),
    ];
    // Sin semilla: lo que se ve es exactamente lo que llega de Supabase.
    render(<LanguageProvider><CartaVinos /></LanguageProvider>);

    await waitFor(() => expect(screen.getAllByText(/^Vino /)).toHaveLength(6));
    expect(screen.getAllByText(/^Vino /).map((nodo) => nodo.textContent)).toEqual([
      // Las categorías llegan de la consulta (`categoria.asc`): blancos antes que tintos.
      "Vino b3", "Vino b11",
      "Vino r1", "Vino r2", "Vino r10", "Vino rx",
    ]);
  });
});
