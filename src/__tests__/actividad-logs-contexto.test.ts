/**
 * Contexto de los eventos de Super Admin › Logs (informe del panel, 10/11/2026):
 *   1. Recarga por ficheros caducados: una sola, y el error sale tras recargar
 *      con `props.recargado = true` (sin duplicados ni bucles).
 *   2. Navegadores automatizados: no mandan nada salvo que lo pidan.
 *   3. Versión y despliegue: de la build o, si faltan, de /version.json.
 *   4. Peticiones: método, estado y duración siempre; estado 0 dice si fue
 *      cancelada (no es error), sin red o error de red.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLAVE_AVISO,
  importarConRecarga,
  informarRecargaPendiente,
  instalarRecargaPorVersion,
  recargarUnaVez,
} from "@/lib/recarga-por-version";
import { _reiniciarRegistro, conectarEmisor, registrarActividad, type DatosActividad } from "@/lib/actividad/registro";
import { causaSinRespuesta, silenciarPorPrueba } from "@/lib/actividad/clasificar";
import { instalarSeguimiento, leerVersionPublicada } from "@/lib/actividad/instalar";

const almacen = () => {
  const datos = new Map<string, string>();
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
    datos,
  };
};

const capturar = () => {
  const recibidos: Array<[string, DatosActividad]> = [];
  conectarEmisor((tipo, datos) => recibidos.push([tipo, datos]));
  return recibidos;
};

afterEach(() => _reiniciarRegistro());

describe("1 · recarga por ficheros caducados", () => {
  it("guarda el error al recargar y lo manda UNA vez tras volver, con recargado = true", () => {
    const storage = almacen();
    const recargar = vi.fn();
    const entorno = { storage, recargar, version: "abc1234", ruta: () => "/carta" };
    expect(recargarUnaVez(entorno, { tipo: "error_react", datos: { objetivo: "espacios", error: { mensaje: "TypeError: Failed to fetch dynamically imported module" } } })).toBe(true);
    expect(recargar).toHaveBeenCalledTimes(1);
    expect(storage.datos.has(CLAVE_AVISO)).toBe(true);

    // «Tras recargar»: registro nuevo, el aviso sale una sola vez.
    _reiniciarRegistro();
    const recibidos = capturar();
    expect(informarRecargaPendiente(entorno)).toBe(true);
    expect(informarRecargaPendiente(entorno)).toBe(false);
    expect(recibidos).toHaveLength(1);
    const [tipo, datos] = recibidos[0];
    expect(tipo).toBe("error_react");
    expect(datos).toMatchObject({ objetivo: "espacios", ruta: "/carta", props: { recargado: true, despliegue_anterior: "abc1234" } });
    expect(datos.error?.mensaje).toContain("dynamically imported module");
  });

  it("mientras la página se recarga, los errores de esa misma recarga no se mandan", () => {
    const recibidos = capturar();
    recargarUnaVez({ storage: almacen(), recargar: () => {}, version: "v1" });
    registrarActividad("error_promesa", { error: { mensaje: "TypeError: Failed to fetch dynamically imported module" } });
    registrarActividad("clic", { objetivo: "Carta" });
    expect(recibidos.map(([t]) => t)).toEqual(["clic"]);
  });

  it("si ya se recargó por esta versión, no hay segunda recarga ni aviso: el error sigue su curso", () => {
    const storage = almacen();
    const recargar = vi.fn();
    const entorno = { storage, recargar, version: "v1" };
    recargarUnaVez(entorno, { tipo: "error_js", datos: {} });
    storage.datos.delete(CLAVE_AVISO);
    expect(recargarUnaVez(entorno, { tipo: "error_js", datos: {} })).toBe(false);
    expect(recargar).toHaveBeenCalledTimes(1);
    expect(storage.datos.has(CLAVE_AVISO)).toBe(false);
  });

  it("lazy(): recarga una vez si falla el import() por versión antigua y relanza el error", async () => {
    const storage = almacen();
    const recargar = vi.fn();
    const fallo = new TypeError("Failed to fetch dynamically imported module: https://x/assets/a-1.js");
    const cargar = importarConRecarga(() => Promise.reject(fallo), () => ({ storage, recargar, version: "v1" }));
    await expect(cargar()).rejects.toBe(fallo);
    await expect(cargar()).rejects.toBe(fallo);
    expect(recargar).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.datos.get(CLAVE_AVISO)!)).toMatchObject({ tipo: "error_promesa", datos: { props: { origen: "lazy" } } });
  });

  it("lazy(): otros errores no recargan", async () => {
    const recargar = vi.fn();
    const cargar = importarConRecarga(() => Promise.reject(new Error("x is undefined")), () => ({ storage: almacen(), recargar, version: "v1" }));
    await expect(cargar()).rejects.toThrow("x is undefined");
    expect(recargar).not.toHaveBeenCalled();
  });

  it("vite:preloadError y lazy() comparten la marca: una sola recarga entre los dos", async () => {
    const storage = almacen();
    const recargar = vi.fn();
    const entorno = () => ({ storage, recargar, version: "v1" });
    const objetivo = new EventTarget();
    instalarRecargaPorVersion(objetivo as unknown as Window, entorno);
    const ev = Object.assign(new Event("vite:preloadError"), { payload: new Error("Unable to preload CSS for /assets/x.css") });
    objetivo.dispatchEvent(ev);
    await expect(importarConRecarga(() => Promise.reject(new TypeError("Importing a module script failed.")), entorno)()).rejects.toThrow();
    expect(recargar).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.datos.get(CLAVE_AVISO)!)).toMatchObject({ datos: { props: { origen: "vite:preloadError" }, error: { mensaje: "Error: Unable to preload CSS for /assets/x.css" } } });
  });

  it("al instalarse manda el aviso de la recarga anterior", () => {
    const storage = almacen();
    storage.setItem(CLAVE_AVISO, JSON.stringify({ tipo: "error_promesa", datos: { error: { mensaje: "m" } }, version: "old" }));
    const recibidos = capturar();
    instalarRecargaPorVersion(new EventTarget() as unknown as Window, () => ({ storage, recargar: () => {}, version: "new" }));
    expect(recibidos).toEqual([["error_promesa", { error: { mensaje: "m" }, props: { recargado: true, despliegue_anterior: "old" } }]]);
  });
});

describe("2 · navegadores automatizados", () => {
  it("con webdriver no se manda nada salvo que se pida (ct_actividad_e2e = 1)", () => {
    const a = almacen();
    expect(silenciarPorPrueba(false, a)).toBe(false);
    expect(silenciarPorPrueba(undefined, a)).toBe(false);
    expect(silenciarPorPrueba(true, a)).toBe(true);
    expect(silenciarPorPrueba(true, null)).toBe(true);
    a.setItem("ct_actividad_e2e", "1");
    expect(silenciarPorPrueba(true, a)).toBe(false);
  });
});

describe("3 · versión de /version.json", () => {
  it("lee versión y commit corto", async () => {
    const pedir = vi.fn(async () => new Response(JSON.stringify({ version: "1.4.0+abc1234", commit: "abc1234" }), { status: 200 }));
    expect(await leerVersionPublicada(pedir as unknown as typeof fetch)).toEqual({ version: "1.4.0+abc1234", despliegue: "abc1234" });
    expect(String((pedir.mock.calls[0] as unknown[])[0])).toMatch(/^\/version\.json\?t=\d+$/);
  });
  it("si falla, null (nunca rompe)", async () => {
    expect(await leerVersionPublicada((async () => new Response("no", { status: 404 })) as unknown as typeof fetch)).toEqual({ version: null, despliegue: null });
    expect(await leerVersionPublicada((async () => { throw new TypeError("Failed to fetch"); }) as unknown as typeof fetch)).toEqual({ version: null, despliegue: null });
  });
});

describe("4 · peticiones sin respuesta", () => {
  it("clasifica el estado 0", () => {
    const abort = new DOMException("The user aborted a request.", "AbortError");
    const red = new TypeError("Failed to fetch");
    expect(causaSinRespuesta(abort, { saliendo: false, enLinea: true })).toBe("cancelada");
    expect(causaSinRespuesta(red, { saliendo: true, enLinea: true })).toBe("cancelada");
    expect(causaSinRespuesta(red, { saliendo: false, enLinea: false })).toBe("sin_red");
    expect(causaSinRespuesta(red, { saliendo: false, enLinea: true })).toBe("error_red");
    expect(causaSinRespuesta(red, { saliendo: false, enLinea: undefined })).toBe("error_red");
  });

  describe("en el rastreador instalado", () => {
    let fetchPrevio: typeof fetch;
    let seguimiento: ReturnType<typeof instalarSeguimiento>;
    let respuesta: () => Promise<Response>;
    const URL_REST = "https://proyecto.supabase.co/rest/v1/platos?select=*";

    beforeEach(() => {
      window.localStorage.setItem("cookieConsent", JSON.stringify({ maps: false, estadisticas: true, ts: new Date().toISOString() }));
      fetchPrevio = window.fetch;
      window.fetch = vi.fn(() => respuesta()) as unknown as typeof fetch;
      seguimiento = instalarSeguimiento();
    });
    afterEach(() => {
      seguimiento?.desinstalar();
      window.fetch = fetchPrevio;
      window.localStorage.clear();
      vi.restoreAllMocks();
    });

    const eventos = () => seguimiento!.rastreador.pendientes().filter((e) => e.tipo === "peticion" || e.tipo === "error_peticion");

    it("respuesta: método, estado y duración", async () => {
      respuesta = async () => new Response("[]", { status: 503 });
      await window.fetch(URL_REST, { method: "post" });
      const [ok, error] = eventos();
      expect(ok).toMatchObject({ tipo: "peticion", props: { endpoint: "rest:platos", metodo: "POST", status: 503 } });
      expect(typeof ok.props?.duracion_ms).toBe("number");
      expect(error).toMatchObject({ tipo: "error_peticion", props: { metodo: "POST", status: 503 }, error: { mensaje: "HTTP 503 en rest:platos" } });
    });

    it("AbortController: petición cancelada, nunca error", async () => {
      respuesta = async () => { throw new DOMException("aborted", "AbortError"); };
      await expect(window.fetch(URL_REST)).rejects.toThrow();
      expect(eventos()).toEqual([expect.objectContaining({ tipo: "peticion", props: expect.objectContaining({ status: 0, causa: "cancelada", cancelada: true, metodo: "GET" }) })]);
    });

    it("la página se va (pagehide): cancelada por el navegador", async () => {
      respuesta = async () => { throw new TypeError("Failed to fetch"); };
      window.dispatchEvent(new Event("pagehide"));
      await expect(window.fetch(URL_REST)).rejects.toThrow();
      expect(eventos().map((e) => [e.tipo, e.props?.causa])).toEqual([["peticion", "cancelada"]]);
    });

    it("sin red: error con causa sin_red", async () => {
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
      respuesta = async () => { throw new TypeError("Failed to fetch"); };
      await expect(window.fetch(URL_REST)).rejects.toThrow();
      expect(eventos()).toEqual([
        expect.objectContaining({ tipo: "error_peticion", props: expect.objectContaining({ status: 0, causa: "sin_red", en_linea: false }), error: expect.objectContaining({ mensaje: "Sin respuesta de rest:platos (sin conexión)" }) }),
      ]);
    });

    it("con red y sin cancelar: error_red", async () => {
      respuesta = async () => { throw new TypeError("Failed to fetch"); };
      await expect(window.fetch(URL_REST)).rejects.toThrow();
      expect(eventos()).toEqual([expect.objectContaining({ tipo: "error_peticion", props: expect.objectContaining({ causa: "error_red", en_linea: true }) })]);
    });
  });
});
