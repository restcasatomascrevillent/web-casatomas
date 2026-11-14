/**
 * Recarga (o aviso) cuando la pestaña tiene una versión antigua de la web.
 *
 * Bugs que protege (Super Admin › Logs, 10–13/11/2026):
 *   · Producción se reconstruye con el MISMO commit cada vez que el panel
 *     guarda la carta (8 builds de la v1.11.0 el 13/11). La marca de «ya se
 *     recargó» iba por commit: tras la primera recarga, las siguientes builds
 *     dejaban la pestaña rota. Ahora va por build (hash del SSG).
 *   · Sin bucles: si tras recargar sigue la build vieja, aviso, no otra recarga.
 *   · Sin versión nueva (fallo de red) no se recarga: no tiene arreglo así.
 *   · Si la navegación estaba a medias, la recarga va a la página pedida.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CLAVE_MARCA,
  _reiniciarRecarga,
  decidirTrasFallo,
  destinoPendiente,
  esErrorDeVersionAntigua,
  importarConRecarga,
  instalarRecargaPorVersion,
  leerBuildPublicada,
  leerEstadoRecarga,
  registrarAvisoEnLinea,
  registrarRouter,
  type Entorno,
} from "@/lib/recarga-por-version";
import { _reiniciarRegistro } from "@/lib/actividad/registro";

const almacen = () => {
  const datos = new Map<string, string>();
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
    datos,
  };
};

/** Entorno de prueba: build «aaa» en la pestaña y «bbb» publicada, salvo que se diga otra cosa. */
const entorno = (o: Partial<Entorno> & { publicada?: string | null } = {}) => {
  const { publicada = "bbb", ...resto } = o;
  const irA = vi.fn();
  const buildPublicada = vi.fn(async () => publicada);
  const e: Entorno = {
    storage: almacen(),
    build: "aaa",
    commit: "28554c2",
    version: "1.11.0",
    ruta: () => "/",
    buildPublicada,
    enLinea: () => true,
    destino: () => null,
    irA,
    ...resto,
  };
  return { e, irA, buildPublicada };
};

const FALLO = new TypeError("Failed to fetch dynamically imported module: https://x/assets/Categoria-Crjz1JUy.js");

afterEach(() => {
  _reiniciarRecarga();
  _reiniciarRegistro();
});

describe("qué errores son de versión antigua", () => {
  it("los de import() y precarga de Chrome, Firefox, Safari y Vite", () => {
    for (const m of [
      "Failed to fetch dynamically imported module: https://x/assets/a-1.js",
      "error loading dynamically imported module: https://x/assets/a-1.js",
      "Importing a module script failed.",
      "'text/html' is not a valid JavaScript MIME type.",
      "Unable to preload CSS for /assets/EspaciosGallery-CmTTVDlw.css",
      "Load failed",
    ]) {
      expect(esErrorDeVersionAntigua(new TypeError(m)), m).toBe(true);
    }
    expect(esErrorDeVersionAntigua(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(esErrorDeVersionAntigua(new SyntaxError("Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"))).toBe(false);
  });
});

describe("la decisión", () => {
  it("build nueva publicada: recarga una vez y apunta a qué build iba", async () => {
    const { e, irA } = entorno();
    await expect(decidirTrasFallo(null, e)).resolves.toBe("recargar");
    expect(irA).toHaveBeenCalledTimes(1);
    expect(irA).toHaveBeenCalledWith(null);
    expect(e.storage!.getItem(CLAVE_MARCA)).toBe("bbb");
    expect(leerEstadoRecarga()).toBe("recargando");
  });

  it("rebuilds del MISMO commit: otra recarga con cada build nueva (antes, la marca por commit lo impedía)", async () => {
    const storage = almacen();
    const primera = entorno({ storage, build: "aaa", publicada: "bbb" });
    await expect(decidirTrasFallo(null, primera.e)).resolves.toBe("recargar");
    // Tras recargar: la pestaña ya tiene «bbb»; el panel publica «ccc» con el mismo commit.
    _reiniciarRecarga();
    const segunda = entorno({ storage, build: "bbb", publicada: "ccc" });
    await expect(decidirTrasFallo(null, segunda.e)).resolves.toBe("recargar");
    expect(primera.irA).toHaveBeenCalledTimes(1);
    expect(segunda.irA).toHaveBeenCalledTimes(1);
  });

  it("sin bucle: si tras recargar la pestaña sigue sin la build nueva, avisa en vez de recargar otra vez", async () => {
    const storage = almacen();
    storage.setItem(CLAVE_MARCA, "bbb");
    const { e, irA } = entorno({ storage, build: "aaa", publicada: "bbb" });
    await expect(decidirTrasFallo(null, e)).resolves.toBe("aviso");
    expect(irA).not.toHaveBeenCalled();
    expect(leerEstadoRecarga()).toBe("aviso");
    // Lo que falle después en esta página no vuelve a preguntar.
    await expect(decidirTrasFallo(null, e)).resolves.toBe("aviso");
    expect(e.buildPublicada).toHaveBeenCalledTimes(1);
  });

  it("la build publicada es la de la pestaña: no recarga (fallo de red o de un fichero), y el siguiente fallo vuelve a preguntar", async () => {
    const { e, irA, buildPublicada } = entorno({ publicada: "aaa" });
    await expect(decidirTrasFallo(null, e)).resolves.toBe("sin_version_nueva");
    await expect(decidirTrasFallo(null, e)).resolves.toBe("sin_version_nueva");
    expect(irA).not.toHaveBeenCalled();
    expect(buildPublicada).toHaveBeenCalledTimes(2);
    expect(leerEstadoRecarga()).toBe("normal");
  });

  it("sin red no recarga (sería la página de «sin conexión» del navegador)", async () => {
    const { e, irA } = entorno({ publicada: null, enLinea: () => false });
    await expect(decidirTrasFallo(null, e)).resolves.toBe("sin_conexion");
    expect(irA).not.toHaveBeenCalled();
  });

  it("sin saber qué build hay publicada (/version.json antiguo): una recarga como mucho por build de la pestaña", async () => {
    const storage = almacen();
    const primera = entorno({ storage, publicada: null });
    await expect(decidirTrasFallo(null, primera.e)).resolves.toBe("recargar");
    expect(storage.getItem(CLAVE_MARCA)).toBe("?aaa");
    _reiniciarRecarga();
    const misma = entorno({ storage, publicada: null });
    await expect(decidirTrasFallo(null, misma.e)).resolves.toBe("aviso");
    _reiniciarRecarga();
    const otra = entorno({ storage, build: "bbb", publicada: null });
    await expect(decidirTrasFallo(null, otra.e)).resolves.toBe("recargar");
  });

  it("sin almacenamiento no puede evitar un bucle: avisa en vez de recargar", async () => {
    const { e, irA } = entorno({ storage: null });
    await expect(decidirTrasFallo(null, e)).resolves.toBe("aviso");
    const bloqueado = entorno({ storage: { getItem: () => { throw new Error("bloqueado"); }, setItem: () => undefined } });
    _reiniciarRecarga();
    await expect(decidirTrasFallo(null, bloqueado.e)).resolves.toBe("aviso");
    expect(irA).not.toHaveBeenCalled();
    expect(bloqueado.irA).not.toHaveBeenCalled();
  });

  it("varios avisos del mismo fallo (vite:preloadError, lazy, el boundary): una sola pregunta y una sola recarga", async () => {
    const { e, irA, buildPublicada } = entorno();
    const r = await Promise.all([decidirTrasFallo(null, e), decidirTrasFallo(null, e), decidirTrasFallo(null, e)]);
    expect(r).toEqual(["recargar", "recargar", "recargar"]);
    await expect(decidirTrasFallo(null, e)).resolves.toBe("recargar");
    expect(buildPublicada).toHaveBeenCalledTimes(1);
    expect(irA).toHaveBeenCalledTimes(1);
  });

  it("si la navegación estaba a medias, va a la página que se pidió", async () => {
    const { e, irA } = entorno({ destino: () => "/carta/carnes" });
    await decidirTrasFallo(null, e);
    expect(irA).toHaveBeenCalledWith("/carta/carnes");
  });

  it("destino de la navegación en curso, del router del navegador", () => {
    expect(destinoPendiente()).toBeNull();
    registrarRouter({ state: { navigation: { location: { pathname: "/en/carta", search: "?q=1", hash: "#vinos" } } } } as never);
    expect(destinoPendiente()).toBe("/en/carta?q=1#vinos");
    registrarRouter({ state: { navigation: { location: undefined } } } as never);
    expect(destinoPendiente()).toBeNull();
  });
});

describe("aviso flotante «Hay una versión nueva de la web»", () => {
  const conAviso = async () => {
    const storage = almacen();
    storage.setItem(CLAVE_MARCA, "bbb");
    await decidirTrasFallo(null, entorno({ storage }).e);
  };

  it("sale si no se puede recargar sola y nada en la página lo enseña ya", async () => {
    await conAviso();
    const aviso = document.getElementById("aviso-version-nueva");
    expect(aviso?.textContent).toBe("Hay una versión nueva de la web · Toca para actualizar");
    expect(aviso?.getAttribute("role")).toBe("status");
  });

  it("no sale mientras una sección o una página enseña su propio aviso", async () => {
    const baja = registrarAvisoEnLinea();
    await conAviso();
    expect(document.getElementById("aviso-version-nueva")).toBeNull();
    baja();
    expect(document.getElementById("aviso-version-nueva")).not.toBeNull();
  });

  it("en el idioma de la URL", async () => {
    window.history.pushState({}, "", "/fr/carta");
    try {
      await conAviso();
      expect(document.getElementById("aviso-version-nueva")?.textContent).toBe("Une nouvelle version du site est disponible · Touchez pour mettre à jour");
    } finally {
      window.history.pushState({}, "", "/");
    }
  });
});

describe("puertas", () => {
  it("vite:preloadError pide la decisión", async () => {
    const objetivo = new EventTarget();
    const { e, irA } = entorno();
    instalarRecargaPorVersion(objetivo as unknown as Window, () => e);
    objetivo.dispatchEvent(Object.assign(new Event("vite:preloadError"), { payload: FALLO }));
    objetivo.dispatchEvent(Object.assign(new Event("vite:preloadError"), { payload: FALLO }));
    await vi.waitFor(() => expect(irA).toHaveBeenCalledTimes(1));
  });

  it("lazy(): pide la decisión si el import() falla por versión antigua y relanza el error", async () => {
    const { e, irA } = entorno();
    const cargar = importarConRecarga(() => Promise.reject(FALLO), () => e);
    await expect(cargar()).rejects.toBe(FALLO);
    await vi.waitFor(() => expect(irA).toHaveBeenCalledTimes(1));
  });

  it("lazy(): otros errores no preguntan ni recargan", async () => {
    const { e, irA, buildPublicada } = entorno();
    await expect(importarConRecarga(() => Promise.reject(new Error("x is undefined")), () => e)()).rejects.toThrow("x is undefined");
    expect(buildPublicada).not.toHaveBeenCalled();
    expect(irA).not.toHaveBeenCalled();
  });
});

describe("leerBuildPublicada", () => {
  const respuesta = (cuerpo: unknown, ok = true) => (async () => ({ ok, json: async () => cuerpo })) as unknown as typeof fetch;

  it("lee `build` de /version.json, sin caché", async () => {
    const pedir = vi.fn(respuesta({ version: "1.11.0", commit: "28554c2", build: "mxhlsewn4e" }));
    await expect(leerBuildPublicada(pedir)).resolves.toBe("mxhlsewn4e");
    expect(pedir.mock.calls[0][0]).toMatch(/^\/version\.json\?t=\d+$/);
    expect(pedir.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  it("null si no se puede saber: sin `build` (build anterior a esto), HTTP de error, sin red o sin respuesta a tiempo", async () => {
    await expect(leerBuildPublicada(respuesta({ version: "1.11.0" }))).resolves.toBeNull();
    await expect(leerBuildPublicada(respuesta({}, false))).resolves.toBeNull();
    await expect(leerBuildPublicada((async () => { throw new TypeError("Load failed"); }) as unknown as typeof fetch)).resolves.toBeNull();
    const colgada = ((_u: unknown, init?: RequestInit) =>
      new Promise((_ok, ko) => init?.signal?.addEventListener("abort", () => ko(new DOMException("abortada", "AbortError"))))) as unknown as typeof fetch;
    await expect(leerBuildPublicada(colgada, 10)).resolves.toBeNull();
  });
});
