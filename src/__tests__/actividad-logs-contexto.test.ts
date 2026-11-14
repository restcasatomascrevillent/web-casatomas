/**
 * Contexto de los eventos de Super Admin › Logs (informe del panel, 10/11/2026):
 *   1. Recarga por ficheros caducados: una sola, y el error sale tras recargar
 *      marcado como recuperado (`accion` y nota en el mensaje: el servidor no
 *      admite `props.recargado`), o al momento con el porqué si no recarga.
 *   2. Navegadores automatizados: no mandan nada salvo que lo pidan.
 *   3. Versión y despliegue: de la build o, si faltan, de /version.json.
 *   4. Peticiones: método, estado y duración siempre; estado 0 dice si fue
 *      cancelada (no es error), sin red o error de red.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLAVE_AVISO,
  _reiniciarRecarga,
  decidirTrasFallo,
  importarConRecarga,
  informarRecargaPendiente,
  instalarRecargaPorVersion,
  registrarFalloDeCarga,
  type Entorno,
} from "@/lib/recarga-por-version";
import { _reiniciarRegistro, capturarErroresTempranos, conectarEmisor, registrarActividad, type DatosActividad } from "@/lib/actividad/registro";
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
  const entorno = (o: Partial<Entorno> & { publicada?: string | null } = {}): Entorno & { irA: ReturnType<typeof vi.fn> } => {
    const { publicada = "bbb", ...resto } = o;
    return {
      storage: almacen(),
      build: "aaa",
      commit: "abc1234",
      version: "1.11.0",
      ruta: () => "/carta",
      buildPublicada: async () => publicada,
      enLinea: () => true,
      destino: () => null,
      irA: vi.fn(),
      ...resto,
    } as Entorno & { irA: ReturnType<typeof vi.fn> };
  };
  const FALLO = "TypeError: Failed to fetch dynamically imported module: https://x/assets/Categoria-Crjz1JUy.js";
  const evento = { objetivo: "espacios", props: { componente: "espacios" }, error: { mensaje: FALLO } };

  afterEach(() => _reiniciarRecarga());

  it("si recarga, el error no sale ahora: sale UNA vez tras volver, marcado como recuperado (accion y nota en el mensaje)", async () => {
    const storage = almacen();
    const recibidos = capturar();
    const e = entorno({ storage });
    await expect(registrarFalloDeCarga("error_react", evento, new TypeError(FALLO), e)).resolves.toBe("recargar");
    expect(e.irA).toHaveBeenCalledTimes(1);
    expect(recibidos).toEqual([]);
    expect(storage.datos.has(CLAVE_AVISO)).toBe(true);

    // «Tras recargar»: registro nuevo y la pestaña ya en la build nueva («bbb»).
    _reiniciarRegistro();
    _reiniciarRecarga();
    const tras = capturar();
    const nueva = entorno({ storage, build: "bbb" });
    expect(informarRecargaPendiente(nueva)).toBe(true);
    expect(informarRecargaPendiente(nueva)).toBe(false);
    expect(tras).toHaveLength(1);
    const [tipo, datos] = tras[0];
    expect(tipo).toBe("error_react");
    expect(datos).toMatchObject({
      accion: "recuperado_tras_recarga",
      objetivo: "espacios",
      ruta: "/carta",
      props: { componente: "espacios", recargado: true, despliegue_anterior: "abc1234", build_anterior: "aaa" },
    });
    // El mensaje empieza igual (el panel agrupa por él los «ficheros caducados») y acaba con la nota.
    expect(datos.error?.mensaje).toBe(`${FALLO} · recuperado: la pestaña se recargó sola con la versión nueva (antes: v1.11.0 · build aaa)`);
  });

  it("si tras recargar sigue la misma build (HTML de una caché), sale como «recarga sin efecto»", async () => {
    const storage = almacen();
    await registrarFalloDeCarga("error_react", evento, new TypeError(FALLO), entorno({ storage }));
    _reiniciarRegistro();
    const tras = capturar();
    informarRecargaPendiente(entorno({ storage, build: "aaa" }));
    expect(tras[0][1]).toMatchObject({ accion: "recarga_sin_efecto" });
    expect(tras[0][1].error?.mensaje).toContain("se recargó sola pero siguió con la misma versión");
  });

  it("si no recarga, el error sale en el momento con el porqué", async () => {
    const casos: Array<[Entorno, string]> = [
      [entorno({ publicada: "aaa" }), "sin_version_nueva"],
      [entorno({ publicada: null, enLinea: () => false }), "sin_conexion"],
      [entorno({ storage: null }), "aviso_version_nueva"],
    ];
    for (const [e, accion] of casos) {
      _reiniciarRecarga();
      _reiniciarRegistro();
      const recibidos = capturar();
      await registrarFalloDeCarga("error_react", evento, new TypeError(FALLO), e);
      expect(recibidos).toHaveLength(1);
      expect(recibidos[0][1]).toMatchObject({ accion, objetivo: "espacios" });
      expect(recibidos[0][1].error?.mensaje?.startsWith(FALLO)).toBe(true);
    }
  });

  it("otros errores salen tal cual, sin preguntar nada", async () => {
    const recibidos = capturar();
    const e = entorno();
    const buildPublicada = vi.spyOn(e, "buildPublicada");
    await registrarFalloDeCarga("error_react", { error: { mensaje: "TypeError: x is undefined" } }, new TypeError("x is undefined"), e);
    expect(recibidos).toEqual([["error_react", { error: { mensaje: "TypeError: x is undefined" } }]]);
    expect(buildPublicada).not.toHaveBeenCalled();
  });

  it("mientras la página se recarga, los errores de esa misma recarga no se mandan", async () => {
    const recibidos = capturar();
    await decidirTrasFallo(null, entorno());
    registrarActividad("error_promesa", { error: { mensaje: FALLO } });
    registrarActividad("clic", { objetivo: "Carta" });
    expect(recibidos.map(([t]) => t)).toEqual(["clic"]);
  });

  it("vite:preloadError y lazy() comparten la decisión: una recarga y el primer aviso", async () => {
    const storage = almacen();
    const e = entorno({ storage });
    const objetivo = new EventTarget();
    instalarRecargaPorVersion(objetivo as unknown as Window, () => e);
    objetivo.dispatchEvent(Object.assign(new Event("vite:preloadError"), { payload: new Error("Unable to preload CSS for /assets/x.css") }));
    await expect(importarConRecarga(() => Promise.reject(new TypeError("Importing a module script failed.")), () => e)()).rejects.toThrow();
    await vi.waitFor(() => expect(e.irA).toHaveBeenCalledTimes(1));
    expect(JSON.parse(storage.datos.get(CLAVE_AVISO)!)).toMatchObject({
      build: "aaa",
      datos: { props: { origen: "vite:preloadError" }, error: { mensaje: "Error: Unable to preload CSS for /assets/x.css" } },
    });
  });

  it("al instalarse manda el aviso de la recarga anterior", () => {
    const storage = almacen();
    storage.setItem(CLAVE_AVISO, JSON.stringify({ tipo: "error_promesa", datos: { error: { mensaje: "m" } }, version: "old", build: "zzz" }));
    const recibidos = capturar();
    instalarRecargaPorVersion(new EventTarget() as unknown as Window, () => entorno({ storage }));
    expect(recibidos).toEqual([
      [
        "error_promesa",
        {
          accion: "recuperado_tras_recarga",
          error: { mensaje: "m · recuperado: la pestaña se recargó sola con la versión nueva (antes: build zzz)" },
          props: { recargado: true, despliegue_anterior: "old", build_anterior: "zzz" },
        },
      ],
    ]);
  });

  it("una promesa sin capturar con un fallo de versión antigua pasa por la decisión antes de ir a Logs", async () => {
    const e = entorno({ publicada: "aaa" });
    instalarRecargaPorVersion(new EventTarget() as unknown as Window, () => e);
    capturarErroresTempranos();
    const recibidos = capturar();
    window.dispatchEvent(Object.assign(new Event("unhandledrejection"), { reason: new TypeError("Importing a module script failed.") }));
    expect(recibidos).toEqual([]);
    await vi.waitFor(() => expect(recibidos).toHaveLength(1));
    expect(recibidos[0][0]).toBe("error_promesa");
    expect(recibidos[0][1]).toMatchObject({ accion: "sin_version_nueva" });
    // Otros errores, al momento.
    window.dispatchEvent(Object.assign(new Event("unhandledrejection"), { reason: new Error("x is undefined") }));
    expect(recibidos).toHaveLength(2);
    expect(recibidos[1][1]).not.toHaveProperty("accion");
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
