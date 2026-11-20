/**
 * CAS-17 en el rastreador instalado: qué se apunta en Super Admin › Logs según
 * la decisión de `comprobarImagenFallida` (simulada aquí; la de verdad se prueba
 * en imagen-fallida.test.ts), cuándo se repinta y que no hay bucles.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCION_IMAGEN, MAX_COMPROBACIONES_POR_IMAGEN, type ResultadoImagen } from "@/lib/actividad/imagen-fallida";
import { instalarSeguimiento } from "@/lib/actividad/instalar";

const { resultados, comprobar } = vi.hoisted(() => {
  const resultados: string[] = [];
  return { resultados, comprobar: vi.fn(async (..._args: unknown[]) => resultados.shift() ?? "rota") };
});
vi.mock("@/lib/actividad/imagen-fallida", async (original) => ({
  ...(await original<typeof import("@/lib/actividad/imagen-fallida")>()),
  comprobarImagenFallida: comprobar,
}));

describe("en el rastreador instalado", () => {
  let seguimiento: ReturnType<typeof instalarSeguimiento>;
  beforeEach(() => {
    resultados.length = 0;
    comprobar.mockClear();
    seguimiento = instalarSeguimiento();
  });
  afterEach(() => {
    seguimiento?.desinstalar();
    document.body.innerHTML = "";
  });

  const imagen = (src: string) => {
    const img = document.createElement("img");
    img.setAttribute("src", src);
    document.body.appendChild(img);
    return img;
  };
  const fallar = async (img: HTMLImageElement) => {
    img.dispatchEvent(new Event("error"));
    await new Promise((r) => setTimeout(r, 0));
  };
  const errores = () => seguimiento!.rastreador.pendientes().filter((e) => e.tipo === "error_recurso");

  it("recuperada: se repinta y se apunta como recuperada al reintentar (el panel: conexión)", async () => {
    resultados.push("recuperada");
    const img = imagen(`${window.location.origin}/assets/lampara-1400w-nk0RtDsA.avif`);
    const set = vi.spyOn(img, "setAttribute");
    await fallar(img);
    expect(set).toHaveBeenCalledWith("src", expect.stringContaining("lampara"));
    expect(errores()).toEqual([expect.objectContaining({ accion: ACCION_IMAGEN.recuperada, objetivo: expect.stringContaining("/assets/lampara-1400w") })]);
  });

  it("sin conexión: se apunta con accion sin_conexion", async () => {
    resultados.push("sin_conexion");
    await fallar(imagen(`${window.location.origin}/_vercel/image?url=%2Ffoto.jpg&w=640&q=75`));
    expect(comprobar).toHaveBeenCalledWith(`${window.location.origin}/_vercel/image?url=%2Ffoto.jpg&w=640&q=75`, expect.anything());
    expect(errores()).toEqual([expect.objectContaining({ accion: "sin_conexion", objetivo: `${window.location.origin}/_vercel/image` })]);
  });

  it("rota: se apunta como siempre, sin accion (fallo de la web, abre ticket)", async () => {
    resultados.push("rota");
    await fallar(imagen(`${window.location.origin}/assets/no-existe.avif`));
    expect(errores()).toHaveLength(1);
    expect(errores()[0].accion).toBeUndefined();
  });

  it("una imagen de otro dominio no se comprueba (el panel ya la da por servicio externo)", async () => {
    await fallar(imagen("https://scontent.cdninstagram.com/foto.jpg"));
    expect(comprobar).not.toHaveBeenCalled();
    expect(errores()).toEqual([expect.objectContaining({ objetivo: "https://scontent.cdninstagram.com/foto.jpg" })]);
  });

  it(`sin bucles: se repinta una sola vez por elemento y, pasadas ${MAX_COMPROBACIONES_POR_IMAGEN} comprobaciones, se apunta tal cual`, async () => {
    resultados.push("recuperada", "recuperada", "recuperada");
    const img = imagen(`${window.location.origin}/assets/lampara.avif`);
    const set = vi.spyOn(img, "setAttribute");
    for (let i = 0; i < MAX_COMPROBACIONES_POR_IMAGEN + 1; i++) await fallar(img);
    expect(comprobar).toHaveBeenCalledTimes(MAX_COMPROBACIONES_POR_IMAGEN);
    expect(set.mock.calls.filter(([a]) => a === "src")).toHaveLength(1);
  });

  it("si se desinstala mientras se comprueba, no se apunta nada", async () => {
    let soltar: (r: ResultadoImagen) => void = () => {};
    comprobar.mockImplementationOnce(() => new Promise<ResultadoImagen>((r) => { soltar = r; }));
    const img = imagen(`${window.location.origin}/assets/lampara.avif`);
    img.dispatchEvent(new Event("error"));
    const pendientesAntes = seguimiento!.rastreador.pendientes().length;
    seguimiento!.desinstalar();
    soltar("sin_conexion");
    await new Promise((r) => setTimeout(r, 0));
    expect(seguimiento!.rastreador.pendientes().length).toBe(pendientesAntes);
    seguimiento = null as never;
  });
});
