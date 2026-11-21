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
 *   · CAS-5 (16/11/2026): un corte de red de un momento dejaba «No se pudo
 *     cargar esta página». El navegador no repite un `import()` que falló, así
 *     que una PÁGINA se reintenta recargando, una vez por build y página y sin
 *     aviso en Logs; una sección, no.
 *   · CAS-5 y CAS-8 (17/11/2026): en iOS, un corte de red en la PRIMERA carga
 *     tiraba a la vez varias secciones de la portada y el `<link>` de
 *     `client-*.js` (los ficheros existían). Durante la carga inicial, una
 *     sección o un recurso se reintentan recargando como una página (una vez
 *     por build y página); con la página ya abierta, una sección sigue sin
 *     recargar.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CLAVE_AVISO,
  CLAVE_MARCA,
  CLAVE_REINTENTO,
  MARGEN_CARGA_INICIAL_MS,
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

  it("sin versión nueva y falla una PÁGINA: se reintenta recargando, una vez por build y página, sin aviso para Logs", async () => {
    const storage = almacen();
    const primera = entorno({ storage, publicada: "aaa", ruta: () => "/carta/carnes" });
    const aviso = { tipo: "error_promesa" as const, datos: { error: { mensaje: FALLO.message } } };
    await expect(decidirTrasFallo(aviso, primera.e, { pagina: true })).resolves.toBe("recargar");
    expect(primera.irA).toHaveBeenCalledTimes(1);
    expect(primera.irA).toHaveBeenCalledWith(null);
    expect(storage.getItem(CLAVE_REINTENTO)).toBe("aaa|/carta/carnes");
    // Ni marca de versión nueva (no la hay) ni aviso que mandar tras recargar.
    expect(storage.getItem(CLAVE_MARCA)).toBeNull();
    expect(storage.getItem(CLAVE_AVISO)).toBeNull();
    expect(leerEstadoRecarga()).toBe("recargando");

    // Tras recargar vuelve a fallar: ya no se recarga; la página enseña su mensaje y sale en Logs.
    _reiniciarRecarga();
    const segunda = entorno({ storage, publicada: "aaa", ruta: () => "/carta/carnes" });
    await expect(decidirTrasFallo(aviso, segunda.e, { pagina: true })).resolves.toBe("sin_version_nueva");
    expect(segunda.irA).not.toHaveBeenCalled();
    expect(leerEstadoRecarga()).toBe("normal");

    // Otra página (o la misma con otra build) sí tiene su reintento.
    _reiniciarRecarga();
    const otraPagina = entorno({ storage, publicada: "aaa", ruta: () => "/carta/vinos" });
    await expect(decidirTrasFallo(aviso, otraPagina.e, { pagina: true })).resolves.toBe("recargar");
    _reiniciarRecarga();
    const otraBuild = entorno({ storage, build: "bbb", publicada: "bbb", ruta: () => "/carta/vinos" });
    await expect(decidirTrasFallo(aviso, otraBuild.e, { pagina: true })).resolves.toBe("recargar");
  });

  it("CAS-5/CAS-8: sin versión nueva, una SECCIÓN que falla en la carga inicial (3 s) se reintenta recargando, sin aviso para Logs", async () => {
    const storage = almacen();
    const aviso = { tipo: "error_react" as const, datos: { error: { mensaje: "TypeError: Importing a module script failed." } } };
    const { e, irA } = entorno({ storage, publicada: "aaa", msDesdeInicio: () => 3_000 });
    // Varias secciones de la portada a la vez (nosotros, contacto, novedades…): una sola pregunta y una sola recarga.
    const r = await Promise.all([decidirTrasFallo(aviso, e), decidirTrasFallo(aviso, e), decidirTrasFallo(aviso, e)]);
    expect(r).toEqual(["recargar", "recargar", "recargar"]);
    expect(irA).toHaveBeenCalledTimes(1);
    expect(irA).toHaveBeenCalledWith(null);
    expect(storage.getItem(CLAVE_REINTENTO)).toBe("aaa|/");
    expect(storage.getItem(CLAVE_AVISO)).toBeNull();
    expect(storage.getItem(CLAVE_MARCA)).toBeNull();
  });

  it("CAS-5/CAS-8: con la página ya abierta (60 s) una sección que falla sigue sin recargar", async () => {
    const { e, irA } = entorno({ publicada: "aaa", msDesdeInicio: () => 60_000 });
    await expect(decidirTrasFallo(null, e)).resolves.toBe("sin_version_nueva");
    expect(irA).not.toHaveBeenCalled();
    expect(e.storage!.getItem(CLAVE_REINTENTO)).toBeNull();
    // El margen es inclusivo; un milisegundo después ya no es la carga inicial.
    _reiniciarRecarga();
    const justo = entorno({ publicada: "aaa", msDesdeInicio: () => MARGEN_CARGA_INICIAL_MS });
    await expect(decidirTrasFallo(null, justo.e)).resolves.toBe("recargar");
    _reiniciarRecarga();
    const pasado = entorno({ publicada: "aaa", msDesdeInicio: () => MARGEN_CARGA_INICIAL_MS + 1 });
    await expect(decidirTrasFallo(null, pasado.e)).resolves.toBe("sin_version_nueva");
  });

  it("CAS-5/CAS-8: el reintento de la carga inicial es UNO por build y página: si tras recargar vuelve a fallar, sale en Logs", async () => {
    const storage = almacen();
    const primera = entorno({ storage, publicada: "aaa", msDesdeInicio: () => 2_000 });
    await expect(decidirTrasFallo(null, primera.e)).resolves.toBe("recargar");
    // Tras recargar, la página vuelve a fallar en su carga inicial: ya no recarga.
    _reiniciarRecarga();
    const segunda = entorno({ storage, publicada: "aaa", msDesdeInicio: () => 2_500 });
    await expect(decidirTrasFallo(null, segunda.e)).resolves.toBe("sin_version_nueva");
    expect(segunda.irA).not.toHaveBeenCalled();
    // Comparte la marca con el reintento de la página: si la página ya lo gastó, la sección tampoco recarga.
    _reiniciarRecarga();
    const gastado = almacen();
    gastado.setItem(CLAVE_REINTENTO, "aaa|/");
    const seccion = entorno({ storage: gastado, publicada: "aaa", msDesdeInicio: () => 1_000 });
    await expect(decidirTrasFallo(null, seccion.e)).resolves.toBe("sin_version_nueva");
    expect(seccion.irA).not.toHaveBeenCalled();
  });

  it("CAS-5/CAS-8: en la carga inicial, si no se sabe la hora (sin performance), se comporta como antes: la sección no recarga", async () => {
    for (const ms of [Number.NaN, Number.POSITIVE_INFINITY, -5]) {
      _reiniciarRecarga();
      const { e, irA } = entorno({ publicada: "aaa", msDesdeInicio: () => ms });
      await expect(decidirTrasFallo(null, e)).resolves.toBe("sin_version_nueva");
      expect(irA).not.toHaveBeenCalled();
    }
  });

  it("sin versión nueva con la navegación a medias: el reintento va a la página pedida aunque la puerta no sepa que es una página", async () => {
    const { e, irA } = entorno({ publicada: "aaa", destino: () => "/carta/carnes?x=1" });
    await expect(decidirTrasFallo(null, e)).resolves.toBe("recargar");
    expect(irA).toHaveBeenCalledWith("/carta/carnes?x=1");
    expect(e.storage!.getItem(CLAVE_REINTENTO)).toBe("aaa|/carta/carnes?x=1");
  });

  it("sin versión nueva: la puerta que sabe que es una página puede llegar después de la primera (vite:preloadError → lazy de la ruta)", async () => {
    const { e, irA, buildPublicada } = entorno({ publicada: "aaa" });
    const r = await Promise.all([decidirTrasFallo(null, e), decidirTrasFallo(null, e, { pagina: true })]);
    expect(r).toEqual(["recargar", "recargar"]);
    expect(buildPublicada).toHaveBeenCalledTimes(1);
    expect(irA).toHaveBeenCalledTimes(1);
  });

  it("sin versión nueva y sin almacenamiento: no se reintenta (no se podría evitar un bucle)", async () => {
    const { e, irA } = entorno({ storage: null, publicada: "aaa" });
    await expect(decidirTrasFallo(null, e, { pagina: true })).resolves.toBe("sin_version_nueva");
    _reiniciarRecarga();
    const bloqueado = entorno({ publicada: "aaa", storage: { getItem: () => { throw new Error("bloqueado"); }, setItem: () => undefined } });
    await expect(decidirTrasFallo(null, bloqueado.e, { pagina: true })).resolves.toBe("sin_version_nueva");
    expect(irA).not.toHaveBeenCalled();
    expect(bloqueado.irA).not.toHaveBeenCalled();
  });

  it("que una página pidiera reintento no se le pega al fallo siguiente de una sección", async () => {
    const storage = almacen();
    storage.setItem(CLAVE_REINTENTO, "aaa|/");
    const { e, irA } = entorno({ storage, publicada: "aaa" });
    // La página ya gastó su reintento: no recarga.
    await expect(decidirTrasFallo(null, e, { pagina: true })).resolves.toBe("sin_version_nueva");
    // Después falla una sección de otra página: sigue sin recargar.
    const seccion = entorno({ storage, publicada: "aaa", ruta: () => "/reservas" });
    await expect(decidirTrasFallo(null, seccion.e)).resolves.toBe("sin_version_nueva");
    expect(irA).not.toHaveBeenCalled();
    expect(seccion.irA).not.toHaveBeenCalled();
  });

  it("la página no arrancó (primera carga) y no se recarga sola: aviso «No se pudo cargar esta página» y rastreador para Logs", async () => {
    const storage = almacen();
    storage.setItem(CLAVE_REINTENTO, "aaa|/"); // el reintento ya se gastó
    const instalarRastreador = vi.fn();
    const { e, irA } = entorno({ storage, publicada: "aaa", arrancada: () => false, instalarRastreador });
    await expect(decidirTrasFallo(null, e, { pagina: true })).resolves.toBe("sin_version_nueva");
    expect(irA).not.toHaveBeenCalled();
    const aviso = document.getElementById("aviso-pagina-sin-cargar");
    expect(aviso?.textContent).toBe("No se pudo cargar esta página. · Recargar página");
    expect(aviso?.querySelector("button")).not.toBeNull();
    expect(instalarRastreador).toHaveBeenCalledTimes(1);
    // Otro fallo en la misma página no duplica el aviso.
    await expect(decidirTrasFallo(null, e, { pagina: true })).resolves.toBe("sin_version_nueva");
    expect(document.querySelectorAll("#aviso-pagina-sin-cargar")).toHaveLength(1);
  });

  it("con la web arrancada (o si falla una sección) no sale ese aviso: el mensaje lo pone la ruta o la sección", async () => {
    const storage = almacen();
    storage.setItem(CLAVE_REINTENTO, "aaa|/");
    const instalarRastreador = vi.fn();
    const arrancada = entorno({ storage, publicada: "aaa", arrancada: () => true, instalarRastreador });
    await expect(decidirTrasFallo(null, arrancada.e, { pagina: true })).resolves.toBe("sin_version_nueva");
    const seccion = entorno({ storage, publicada: "aaa", arrancada: () => false, instalarRastreador });
    await expect(decidirTrasFallo(null, seccion.e)).resolves.toBe("sin_version_nueva");
    expect(document.getElementById("aviso-pagina-sin-cargar")).toBeNull();
    expect(instalarRastreador).not.toHaveBeenCalled();
  });

  it("sin red no recarga (sería la página de «sin conexión» del navegador)", async () => {
    const { e, irA } = entorno({ publicada: null, enLinea: () => false });
    await expect(decidirTrasFallo(null, e)).resolves.toBe("sin_conexion");
    expect(irA).not.toHaveBeenCalled();
  });

  describe("sin red: al volver la red, una recarga a lo que se pidió (21/11/2026)", () => {
    /** Entorno sin red que guarda quién espera a que vuelva. */
    const sinRed = (o: Partial<Entorno> = {}) => {
      let alVolver: (() => void) | null = null;
      const r = entorno({ publicada: null, enLinea: () => false, alVolverLaRed: (fn) => { alVolver = fn; }, ...o });
      return { ...r, volverLaRed: () => alVolver?.(), esperando: () => alVolver !== null };
    };

    it("una página que falló sin red: no recarga ahora, sí al volver la red (a la página pedida)", async () => {
      const { e, irA, volverLaRed } = sinRed({ destino: () => "/carta/arroces" });
      await expect(decidirTrasFallo(null, e, { pagina: true })).resolves.toBe("sin_conexion");
      expect(irA).not.toHaveBeenCalled();
      volverLaRed();
      expect(irA).toHaveBeenCalledWith("/carta/arroces");
      expect(leerEstadoRecarga()).toBe("recargando");
    });

    it("solo una vez por build y página: si tras recargar vuelve a fallar sin red, se queda el aviso", async () => {
      const storage = almacen();
      const primera = sinRed({ storage, destino: () => "/carta/arroces" });
      await decidirTrasFallo(null, primera.e, { pagina: true });
      primera.volverLaRed();
      expect(primera.irA).toHaveBeenCalledTimes(1);
      _reiniciarRecarga();
      const segunda = sinRed({ storage, destino: () => "/carta/arroces" });
      await decidirTrasFallo(null, segunda.e, { pagina: true });
      segunda.volverLaRed();
      expect(segunda.irA).not.toHaveBeenCalled();
    });

    it("una sección que falla con la página ya abierta (fuera de la carga inicial) no recarga al volver la red", async () => {
      const { e, irA, esperando } = sinRed({ msDesdeInicio: () => MARGEN_CARGA_INICIAL_MS + 1 });
      await decidirTrasFallo(null, e);
      expect(esperando()).toBe(false);
      expect(irA).not.toHaveBeenCalled();
    });

    it("varios fallos a la vez esperan una sola vez a la red", async () => {
      let esperas = 0;
      const { e } = sinRed({ destino: () => "/carta", alVolverLaRed: () => { esperas++; } });
      await Promise.all([decidirTrasFallo(null, e, { pagina: true }), decidirTrasFallo(null, e, { pagina: true })]);
      expect(esperas).toBe(1);
    });
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

  it("lazy() de una ruta ({ pagina: true }): sin versión nueva se reintenta recargando; el de una sección, no", async () => {
    const pagina = entorno({ publicada: "aaa" });
    await expect(importarConRecarga(() => Promise.reject(FALLO), () => pagina.e, { pagina: true })()).rejects.toBe(FALLO);
    await vi.waitFor(() => expect(pagina.irA).toHaveBeenCalledTimes(1));
    _reiniciarRecarga();
    const seccion = entorno({ publicada: "aaa" });
    await expect(importarConRecarga(() => Promise.reject(FALLO), () => seccion.e)()).rejects.toBe(FALLO);
    await vi.waitFor(() => expect(seccion.buildPublicada).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(leerEstadoRecarga()).toBe("normal"));
    expect(seccion.irA).not.toHaveBeenCalled();
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
