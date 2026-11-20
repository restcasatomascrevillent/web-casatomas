/**
 * Imágenes de la web que no cargan (CAS-17): antes de apuntarlas en Super
 * Admin › Logs se distingue la conexión del visitante (se reintenta y se
 * repinta) de un fichero que de verdad falta o está roto (fallo de la web).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ESPERA_CONEXION_MS,
  ESPERA_REINTENTO_MS,
  comprobarImagenFallida,
  entornoDelNavegador,
  repintarImagen,
  type EntornoImagen,
} from "@/lib/actividad/imagen-fallida";

const entorno = (o: Partial<EntornoImagen> = {}): EntornoImagen & { llamadas: string[] } => {
  const llamadas: string[] = [];
  return {
    llamadas,
    enLinea: () => true,
    esperarConexion: async (ms) => (llamadas.push(`esperarConexion:${ms}`), true),
    esperar: async (ms) => void llamadas.push(`esperar:${ms}`),
    cargar: async (url) => (llamadas.push(`cargar:${url}`), true),
    sondear: async (url) => (llamadas.push(`sondear:${url}`), 200),
    ...o,
  };
};

const LAMPARA = "https://restaurantecasatomascrevillente.es/assets/lampara-1400w-nk0RtDsA.avif";

describe("comprobarImagenFallida", () => {
  it("corte momentáneo (18/11): al reintentar carga → recuperada, sin preguntar al servidor", async () => {
    const e = entorno();
    expect(await comprobarImagenFallida(LAMPARA, e)).toBe("recuperada");
    expect(e.llamadas).toEqual([`esperar:${ESPERA_REINTENTO_MS}`, `cargar:${LAMPARA}`]);
  });

  it("sin cobertura (19/11): tampoco carga y el servidor no contesta → sin_conexion", async () => {
    const e = entorno({ cargar: async () => false, sondear: async () => "red" });
    expect(await comprobarImagenFallida(LAMPARA, e)).toBe("sin_conexion");
  });

  it("el navegador dice que no hay red: espera a que vuelva y entonces reintenta", async () => {
    const e = entorno({ enLinea: () => false });
    expect(await comprobarImagenFallida(LAMPARA, e)).toBe("recuperada");
    expect(e.llamadas).toEqual([`esperarConexion:${ESPERA_CONEXION_MS}`, `cargar:${LAMPARA}`]);
  });

  it("si la red no vuelve a tiempo: sin_conexion, sin pedir nada", async () => {
    const e = entorno({ enLinea: () => false, esperarConexion: async () => false });
    expect(await comprobarImagenFallida(LAMPARA, e)).toBe("sin_conexion");
    expect(e.llamadas).toEqual([]);
  });

  it("fichero que falta (404) o error del servidor: rota (fallo de la web)", async () => {
    expect(await comprobarImagenFallida(LAMPARA, entorno({ cargar: async () => false, sondear: async () => 404 }))).toBe("rota");
    expect(await comprobarImagenFallida(LAMPARA, entorno({ cargar: async () => false, sondear: async () => 502 }))).toBe("rota");
  });

  it("el servidor la sirve pero el navegador no puede pintarla: rota (fallo de la web)", async () => {
    expect(await comprobarImagenFallida(LAMPARA, entorno({ cargar: async () => false, sondear: async () => 200 }))).toBe("rota");
  });
});

describe("entornoDelNavegador", () => {
  afterEach(() => vi.useRealTimers());

  it("sondear: el estado HTTP sin caché, o «red» si no contesta", async () => {
    const pedir = vi.fn(async () => new Response("", { status: 404 }));
    expect(await entornoDelNavegador(pedir as unknown as typeof fetch).sondear(LAMPARA)).toBe(404);
    expect(pedir).toHaveBeenCalledWith(LAMPARA, expect.objectContaining({ cache: "no-store" }));
    const sinRed = (async () => { throw new TypeError("Failed to fetch"); }) as unknown as typeof fetch;
    expect(await entornoDelNavegador(sinRed).sondear(LAMPARA)).toBe("red");
  });

  it("esperarConexion: true al volver la red, false si no vuelve a tiempo", async () => {
    vi.useFakeTimers();
    const e = entornoDelNavegador(fetch);
    const vuelve = e.esperarConexion(1000);
    window.dispatchEvent(new Event("online"));
    expect(await vuelve).toBe(true);
    const noVuelve = e.esperarConexion(1000);
    vi.advanceTimersByTime(1000);
    expect(await noVuelve).toBe(false);
  });
});

describe("repintarImagen", () => {
  it("vuelve a poner el mismo src y srcset (el navegador la vuelve a pedir); fuera de la página, nada", () => {
    const img = document.createElement("img");
    img.setAttribute("src", "/assets/lampara.jpg");
    img.setAttribute("srcset", "/assets/lampara-700w.avif 700w");
    const set = vi.spyOn(img, "setAttribute");
    repintarImagen(img);
    expect(set).not.toHaveBeenCalled(); // no está en la página
    document.body.appendChild(img);
    repintarImagen(img);
    expect(set.mock.calls).toEqual([["srcset", "/assets/lampara-700w.avif 700w"], ["src", "/assets/lampara.jpg"]]);
    img.remove();
  });
});
