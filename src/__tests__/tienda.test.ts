/**
 * Lógica de la tienda de vinos (`src/lib/tienda.ts`): configuración del panel,
 * precios al céntimo como la base de datos, vinos a la venta y las lecturas en
 * vivo de PostgREST (con `fetch` simulado).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  centimosTienda,
  normalizarConfigTienda,
  precioTienda,
  vinosALaVenta,
  type ConfigTienda,
  type VinoTienda,
} from "@/lib/tienda";

const CONFIG: ConfigTienda = { activa: true, descuento_pct: 30, vinos_excluidos: [], aviso: null, recogida: null };

const vino = (id: string, precio: number): VinoTienda => ({ id, nombre: `Vino ${id}`, categoria: "VINOS TINTOS — RIOJA", precio_eur: precio });

const respuesta = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("normalizarConfigTienda", () => {
  it("lee la fila del contrato (y descarta lo que no usa)", () => {
    expect(
      normalizarConfigTienda({
        id: true,
        activa: true,
        descuento_pct: "25.5",
        vinos_excluidos: ["a", 7],
        aviso: "  Cerrado por vacaciones del 1 al 15  ",
        recogida: "",
        updated_at: "2026-11-03T10:00:00Z",
      }),
    ).toEqual({ activa: true, descuento_pct: 25.5, vinos_excluidos: ["a", "7"], aviso: "Cerrado por vacaciones del 1 al 15", recogida: null });
  });

  it("descuento por defecto de la migración (30) y solo `activa: true` abre", () => {
    expect(normalizarConfigTienda({ activa: "true" })).toEqual({ activa: false, descuento_pct: 30, vinos_excluidos: [], aviso: null, recogida: null });
  });

  it("recorta descuentos imposibles y descarta lo que no es una fila", () => {
    expect(normalizarConfigTienda({ activa: true, descuento_pct: 140 })?.descuento_pct).toBe(100);
    expect(normalizarConfigTienda({ descuento_pct: -5 })?.descuento_pct).toBe(0);
    for (const nada of [null, undefined, "x", 3, []]) expect(normalizarConfigTienda(nada)).toBeNull();
  });
});

describe("precio tienda = round(precio_eur * (1 - descuento_pct/100), 2), como Postgres", () => {
  it.each([
    [45, 30, 31.5],
    [15.7, 30, 10.99],
    [20.5, 30, 14.35],
    // 33,495 exactos: en coma flotante saldría 33,49 €; la base dice 33,50 €.
    [47.85, 30, 33.5],
    [735, 30, 514.5],
    [22.5, 12.5, 19.69],
    [10, 0, 10],
    [10, 100, 0],
  ])("%s € con un %s %% → %s €", (precio, pct, esperado) => {
    expect(precioTienda(precio, pct)).toBe(esperado);
  });

  it("en céntimos enteros", () => {
    expect(centimosTienda(47.85, 30)).toBe(3350);
    expect(Number.isInteger(centimosTienda(19.99, 33.33))).toBe(true);
  });

});

describe("vinosALaVenta", () => {
  it("fuera los excluidos en el panel, los de precio 0 o sin precio y los que no tienen id; el orden se conserva", () => {
    const vinos = [vino("a", 20), vino("b", 0), vino("c", 30), { ...vino("d", 10), id: "" }, vino("e", Number.NaN), vino("f", 12)];
    expect(vinosALaVenta(vinos, { ...CONFIG, vinos_excluidos: ["c"] }).map((v) => v.id)).toEqual(["a", "f"]);
  });
});

describe("lecturas en vivo", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_SUPABASE_URL", "https://demo.supabase.co/");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "clave-publica");
  });

  it("configuración: fila → normalizada; 404 (sin tabla) o sin fila → null; 5xx lanza", async () => {
    const { consultarConfigTienda } = await import("@/lib/tienda");
    const espia = vi.fn(async () => respuesta(200, [{ id: true, activa: true, descuento_pct: 30, recogida: "En barra" }]));
    vi.stubGlobal("fetch", espia);
    expect(await consultarConfigTienda()).toEqual({ activa: true, descuento_pct: 30, vinos_excluidos: [], aviso: null, recogida: "En barra" });
    const [url, opciones] = espia.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://demo.supabase.co/rest/v1/configuracion_tienda?select=*&id=eq.true&limit=1");
    expect(opciones.headers).toMatchObject({ apikey: "clave-publica", Authorization: "Bearer clave-publica" });

    vi.stubGlobal("fetch", vi.fn(async () => respuesta(404, { code: "PGRST205" })));
    expect(await consultarConfigTienda()).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => respuesta(200, [])));
    expect(await consultarConfigTienda()).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => respuesta(503, {})));
    await expect(consultarConfigTienda()).rejects.toThrow(/503/);
  });

  it("vinos: mismo filtro que la carta + precio > 0; sin `?t=`; orden numérico; vacío lanza", async () => {
    const { consultarVinosTienda } = await import("@/lib/tienda");
    const espia = vi.fn(async () =>
      respuesta(200, [
        { id: 2, nombre: "B", categoria: "VINOS TINTOS — RIOJA", precio_eur: 30, orden: "10", imagen_url: "https://demo.supabase.co/storage/v1/object/public/vinos/b-carta-webp.webp?t=123", nombre_en: null },
        { id: 1, nombre: "A", categoria: "VINOS TINTOS — RIOJA", precio_eur: "20", orden: "2", imagen_url: null },
      ]),
    );
    vi.stubGlobal("fetch", espia);
    const vinos = await consultarVinosTienda();
    const [url] = espia.mock.calls[0] as unknown as [string];
    expect(url).toContain("/rest/v1/Vinos?select=id,nombre,");
    expect(url).toContain("&activado=eq.true&restaurante=is.true&precio_eur=gt.0&order=categoria.asc,orden.asc,id.asc");
    expect(vinos.map((v) => [v.id, v.precio_eur])).toEqual([
      ["1", 20],
      ["2", 30],
    ]);
    expect(vinos[1].imagen_url).toBe("https://demo.supabase.co/storage/v1/object/public/vinos/b-carta-webp.webp");
    expect(vinos[1]).not.toHaveProperty("nombre_en");

    vi.stubGlobal("fetch", vi.fn(async () => respuesta(200, [])));
    await expect(consultarVinosTienda()).rejects.toThrow(/0 filas/);
    vi.stubGlobal("fetch", vi.fn(async () => respuesta(400, { code: "42703" })));
    await expect(consultarVinosTienda()).rejects.toThrow(/400/);
  });
});
