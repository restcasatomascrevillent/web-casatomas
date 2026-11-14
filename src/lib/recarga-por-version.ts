/**
 * Pestaña con una versión antigua de la web: recargar sola (una vez) o avisar.
 *
 * Cada build cambia los nombres de `/assets` (y el hash del SSG). Una pestaña
 * abierta desde antes pide al navegar ficheros que ya no existen: el
 * `import()` de la página o de la sección (o el CSS que precarga) falla.
 * Recargar trae el `index.html` nuevo y se arregla solo.
 *
 * OJO: producción no solo cambia con cada release. El panel la reconstruye
 * (deploy hook de `rebuild-webs`) cada vez que se guarda la carta: el 13/11/2026
 * hubo 8 builds de la v1.11.0, todas con el mismo commit. Por eso la «versión»
 * de una pestaña es su BUILD (`window.__VITE_REACT_SSG_HASH__`, distinto en
 * cada build, aunque el commit sea el mismo), no el commit.
 *
 * Qué pasa cuando falla una carga (decisión única por página, compartida):
 *   1. Se pregunta a `/version.json` (sin caché) qué build está publicada.
 *   2. Es la misma que la de la pestaña → no hay versión nueva: es la red o un
 *      fichero que falta de verdad. No se recarga (la sección o la página
 *      enseñan su «No se pudo cargar · Recargar»).
 *   3. Es otra → se recarga UNA vez para llegar a ella; si la navegación
 *      estaba a medias, directamente a la página que se pidió. La marca en
 *      `sessionStorage` dice a qué build se intentó llegar: si tras recargar
 *      la pestaña sigue sin ella (HTML de una caché), no hay segunda recarga
 *      sino el aviso «Hay una versión nueva de la web · Toca para actualizar».
 *   4. No se puede saber (sin red, `/version.json` antiguo sin `build`) →
 *      sin conexión, no se recarga; si no, una recarga como mucho por build
 *      de la pestaña, con la misma marca.
 *
 * Puertas (todas llevan a la misma decisión): `vite:preloadError`,
 * `importarConRecarga` en los `lazy()`, `SectionErrorBoundary`, el
 * `errorElement` de las rutas (`ErrorDeRuta`) y las promesas sin capturar.
 *
 * Super Admin › Logs: el error que provoca la recarga sale tras recargar,
 * una vez, marcado (`accion` = `recuperado_tras_recarga` o
 * `recarga_sin_efecto` y una nota al final del mensaje: el servidor solo
 * admite propiedades de su catálogo y el panel enseña el mensaje). Si no se
 * recarga, sale en el momento con `accion` = `aviso_version_nueva`,
 * `sin_version_nueva` o `sin_conexion`.
 */

import type { createBrowserRouter } from "react-router-dom";
import { fijarDesvioDeErrores, marcarRecargaEnCurso, registrarActividad, type DatosActividad, type TipoActividad } from "@/lib/actividad/registro";
import { idiomaDeRuta } from "@/i18n/routing";
import { TEXTOS_VERSION_NUEVA } from "@/lib/textos-version-nueva";

/** A qué build se intentó llegar con la última recarga automática (una sola clave). */
export const CLAVE_MARCA = "recarga-auto";
/** Aviso pendiente de mandar tras la recarga (uno como mucho). */
export const CLAVE_AVISO = "recarga-auto-aviso";
const ESPERA_VERSION_MS = 5_000;

const COMMIT = (import.meta.env.VITE_COMMIT_WEB as string | undefined) || "";
const VERSION = (import.meta.env.VITE_VERSION_WEB as string | undefined) || "";

/** Errores de `import()` dinámico o de su precarga (Chrome, Firefox, Safari, Vite). */
export const esErrorDeVersionAntigua = (error: unknown): boolean => {
  const mensaje = error instanceof Error ? error.message : String(error ?? "");
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|is not a valid JavaScript MIME type|Failed to fetch|\bLoad failed\b/i.test(
    mensaje,
  );
};

/** Build de ESTA pestaña: el hash del SSG (cambia en cada build); si falta, el commit. */
export function buildActual(): string {
  const hash = typeof window !== "undefined" ? (window as Window & { __VITE_REACT_SSG_HASH__?: unknown }).__VITE_REACT_SSG_HASH__ : undefined;
  return (typeof hash === "string" && hash) || COMMIT || "sin-version";
}

/** Build publicada ahora mismo (`build` de /version.json), o null si no se puede saber. */
export async function leerBuildPublicada(pedir: typeof fetch = (u, i) => fetch(u, i), esperaMs = ESPERA_VERSION_MS): Promise<string | null> {
  const control = typeof AbortController !== "undefined" ? new AbortController() : null;
  const temporizador = setTimeout(() => control?.abort(), esperaMs);
  try {
    const res = await pedir(`/version.json?t=${Date.now()}`, { cache: "no-store", credentials: "omit", signal: control?.signal });
    if (!res.ok) return null;
    const datos = (await res.json()) as { build?: unknown };
    return typeof datos.build === "string" && datos.build ? datos.build : null;
  } catch {
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}

// ─── Router: adónde iba la navegación que falló ──────────────────────────────
type RouterNavegador = Pick<ReturnType<typeof createBrowserRouter>, "state">;
let router: RouterNavegador | null = null;

/** Lo llama `crearRouterCliente` (main.tsx) al crear el router del navegador. */
export function registrarRouter(r: RouterNavegador | null): void {
  router = r;
}

/** Ruta de la navegación en curso (la que se pidió y no ha cargado), o null. */
export function destinoPendiente(): string | null {
  const destino = router?.state.navigation.location;
  return destino ? `${destino.pathname}${destino.search}${destino.hash}` : null;
}

// ─── Entorno (inyectable en las pruebas) ─────────────────────────────────────
type Almacen = Pick<Storage, "getItem" | "setItem"> & Partial<Pick<Storage, "removeItem">>;

export interface Entorno {
  storage: Almacen | null;
  /** Build de la pestaña. */
  build: string;
  commit?: string;
  version?: string;
  ruta: () => string;
  buildPublicada: () => Promise<string | null>;
  enLinea: () => boolean | undefined;
  destino: () => string | null;
  /** `null`: recargar; una ruta: ir a ella (la navegación que falló). */
  irA: (destino: string | null) => void;
}

const entornoNavegador = (): Entorno => {
  let storage: Almacen | null = null;
  try {
    storage = window.sessionStorage;
  } catch {
    // Almacenamiento bloqueado: sin marca no hay recarga automática (no se puede evitar un bucle).
  }
  return {
    storage,
    build: buildActual(),
    commit: COMMIT,
    version: VERSION,
    ruta: () => window.location.pathname,
    buildPublicada: () => leerBuildPublicada(),
    enLinea: () => (typeof navigator.onLine === "boolean" ? navigator.onLine : undefined),
    destino: destinoPendiente,
    irA: (destino) => {
      const actual = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (destino && destino !== actual) window.location.assign(destino);
      else window.location.reload();
    },
  };
};

// ─── Estado compartido (lo leen los avisos) ──────────────────────────────────
export type EstadoRecarga = "normal" | "comprobando" | "recargando" | "aviso";
export type Decision = "recargar" | "aviso" | "sin_version_nueva" | "sin_conexion";

let estado: EstadoRecarga = "normal";
let enCurso: Promise<Decision> | null = null;
let avisoOfrecido: AvisoRecarga | null = null;
let avisosEnLinea = 0;
const oyentes = new Set<() => void>();

const cambiarEstado = (nuevo: EstadoRecarga) => {
  if (estado === nuevo) return;
  estado = nuevo;
  oyentes.forEach((fn) => fn());
  pintarAvisoFlotante();
};

export const leerEstadoRecarga = (): EstadoRecarga => estado;
export function suscribirEstadoRecarga(fn: () => void): () => void {
  oyentes.add(fn);
  return () => void oyentes.delete(fn);
}

/**
 * Un aviso dentro de la página (sección o ruta que no cargó) está a la vista:
 * mientras haya alguno, no sale el flotante. Devuelve cómo darlo de baja.
 */
export function registrarAvisoEnLinea(): () => void {
  avisosEnLinea++;
  pintarAvisoFlotante();
  return () => {
    avisosEnLinea--;
    pintarAvisoFlotante();
  };
}

const ID_FLOTANTE = "aviso-version-nueva";

/**
 * Aviso flotante en DOM puro: tiene que salir también si React no llegó a
 * montarse (la primera carga de la página falló) o si lo que falló no tiene
 * su propio mensaje (una precarga, el asistente…).
 */
function pintarAvisoFlotante(): void {
  if (typeof document === "undefined" || !document.body) return;
  const existente = document.getElementById(ID_FLOTANTE);
  const mostrar = estado === "aviso" && avisosEnLinea === 0;
  if (!mostrar) {
    existente?.remove();
    return;
  }
  if (existente) return;
  const textos = TEXTOS_VERSION_NUEVA[idiomaDeRuta(window.location.pathname)];
  const caja = document.createElement("div");
  caja.id = ID_FLOTANTE;
  caja.setAttribute("role", "status");
  caja.className =
    "fixed inset-x-4 z-[60] mx-auto max-w-md rounded-xl border border-border bg-background/95 px-4 py-3 text-center text-sm text-foreground shadow-lg backdrop-blur";
  caja.style.bottom = "calc(1rem + var(--mobile-cta-offset, 0px))";
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "w-full min-h-6 font-medium underline-offset-4 hover:underline";
  boton.textContent = `${textos.aviso} · ${textos.boton}`;
  boton.addEventListener("click", () => window.location.reload());
  caja.appendChild(boton);
  document.body.appendChild(caja);
}

// ─── Avisos para Super Admin › Logs ──────────────────────────────────────────
/** Lo que se manda: el evento que se habría mandado, con su marca. */
export interface AvisoRecarga {
  tipo: TipoActividad;
  datos: DatosActividad;
}

const mensajeDe = (error: unknown) => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));

/** El aviso por defecto: el error tal cual, como lo habría mandado `capturarErroresTempranos`. */
export const avisoDeError = (error: unknown, origen: string): AvisoRecarga => ({
  tipo: "error_promesa",
  datos: { props: { origen }, error: { mensaje: mensajeDe(error), pila: error instanceof Error ? error.stack : undefined } },
});

type Marca = Decision | "recuperado_tras_recarga" | "recarga_sin_efecto";
/** `accion` del evento y nota legible al final del mensaje (el panel enseña el mensaje). */
const MARCAS: Record<Exclude<Marca, "recargar">, { accion: string; nota: string }> = {
  recuperado_tras_recarga: { accion: "recuperado_tras_recarga", nota: "recuperado: la pestaña se recargó sola con la versión nueva" },
  recarga_sin_efecto: { accion: "recarga_sin_efecto", nota: "se recargó sola pero siguió con la misma versión" },
  aviso: { accion: "aviso_version_nueva", nota: "sin segunda recarga: se le pidió tocar «Actualizar»" },
  sin_version_nueva: { accion: "sin_version_nueva", nota: "no había versión nueva (fallo de carga o de red)" },
  sin_conexion: { accion: "sin_conexion", nota: "sin conexión: no se recargó" },
};

export function marcarDatos(datos: DatosActividad, marca: Exclude<Marca, "recargar">, extra?: string): DatosActividad {
  const { accion, nota } = MARCAS[marca];
  const mensaje = datos.error?.mensaje;
  return {
    ...datos,
    accion,
    ...(datos.error ? { error: { ...datos.error, mensaje: `${mensaje ?? ""} · ${nota}${extra ? ` ${extra}` : ""}`.trim() } } : {}),
  };
}

function guardarAviso(e: Entorno, aviso: AvisoRecarga | null): void {
  if (!aviso || !e.storage) return;
  try {
    const ruta = aviso.datos.ruta ?? e.ruta();
    e.storage.setItem(
      CLAVE_AVISO,
      JSON.stringify({ ...aviso, datos: { ...aviso.datos, ...(ruta ? { ruta } : {}) }, version: e.commit || e.build, build: e.build, publicada: e.version || undefined }),
    );
  } catch {
    // Sin almacenamiento el aviso se pierde: la recarga es lo importante.
  }
}

// ─── La decisión ─────────────────────────────────────────────────────────────
async function decidir(e: Entorno): Promise<Decision> {
  const publicada = await e.buildPublicada();
  if (publicada && publicada === e.build) return "sin_version_nueva";
  if (!publicada && e.enLinea() === false) return "sin_conexion";
  // A qué build se quiere llegar. Sin saberla, «cualquiera distinta de la mía».
  const objetivo = publicada ?? `?${e.build}`;
  if (!e.storage) return "aviso";
  try {
    if (e.storage.getItem(CLAVE_MARCA) === objetivo) return "aviso";
    e.storage.setItem(CLAVE_MARCA, objetivo);
  } catch {
    return "aviso";
  }
  return "recargar";
}

/**
 * Falló una carga por (posible) versión antigua: decide, una vez por página
 * aunque lleguen varios avisos del mismo fallo, si se recarga. Si se recarga,
 * guarda el primer `aviso` para mandarlo al volver.
 */
export function decidirTrasFallo(aviso: AvisoRecarga | null, entorno?: Entorno): Promise<Decision> {
  avisoOfrecido ??= aviso;
  if (estado === "recargando") return Promise.resolve("recargar");
  if (estado === "aviso") return Promise.resolve("aviso");
  if (enCurso) return enCurso;
  const e = entorno ?? entornoNavegador();
  cambiarEstado("comprobando");
  enCurso = decidir(e).then(
    (d) => {
      if (d === "recargar") {
        guardarAviso(e, avisoOfrecido);
        // Los errores que salten mientras la página se descarga son ruido de esta misma recarga.
        marcarRecargaEnCurso();
        cambiarEstado("recargando");
        e.irA(e.destino());
      } else {
        enCurso = null;
        avisoOfrecido = null;
        cambiarEstado(d === "aviso" ? "aviso" : "normal");
      }
      return d;
    },
    () => {
      enCurso = null;
      avisoOfrecido = null;
      cambiarEstado("normal");
      return "sin_version_nueva" as const;
    },
  );
  return enCurso;
}

/**
 * Registra un fallo de carga en Super Admin › Logs. Si es de versión antigua,
 * espera a la decisión: si se recarga, sale tras recargar (con su marca); si
 * no, sale ahora con la marca de por qué no.
 */
export function registrarFalloDeCarga(tipo: TipoActividad, datos: DatosActividad, error: unknown, entorno?: Entorno): Promise<Decision | null> {
  if (typeof window === "undefined" || !esErrorDeVersionAntigua(error)) {
    registrarActividad(tipo, datos);
    return Promise.resolve(null);
  }
  return registrarFalloDeVersion(tipo, datos, entorno);
}

/** Igual, para un fallo que ya se sabe que es de un fichero de la web (p. ej. un 404 de `/assets`). */
export function registrarFalloDeVersion(tipo: TipoActividad, datos: DatosActividad, entorno?: Entorno): Promise<Decision> {
  // Solo el error que lo provocó se guarda para después de recargar; los 404 de recursos no (son ruido de la recarga).
  return decidirTrasFallo(tipo === "error_recurso" ? null : { tipo, datos }, entorno).then((d) => {
    if (d !== "recargar") registrarActividad(tipo, marcarDatos(datos, d));
    return d;
  });
}

/**
 * Tras una recarga automática: manda (una vez) el error que la provocó,
 * marcado como recuperado (o «sin efecto» si la pestaña sigue en la misma
 * build). Va a la cola de `registrarActividad`, que lo entrega cuando se
 * instala el rastreador. Devuelve `true` si había aviso.
 */
export function informarRecargaPendiente(entorno: Entorno = entornoNavegador()): boolean {
  let texto: string | null = null;
  try {
    texto = entorno.storage?.getItem(CLAVE_AVISO) ?? null;
    if (texto) entorno.storage?.removeItem?.(CLAVE_AVISO);
  } catch {
    return false;
  }
  if (!texto) return false;
  try {
    const aviso = JSON.parse(texto) as AvisoRecarga & { version?: string; build?: string; publicada?: string };
    if (!aviso || typeof aviso.tipo !== "string") return false;
    const marca = aviso.build && aviso.build === entorno.build ? "recarga_sin_efecto" : "recuperado_tras_recarga";
    const antes = [aviso.publicada && `v${aviso.publicada}`, aviso.build && `build ${aviso.build}`].filter(Boolean).join(" · ");
    const datos: DatosActividad = {
      ...aviso.datos,
      props: {
        ...(aviso.datos?.props ?? {}),
        recargado: true,
        ...(aviso.version ? { despliegue_anterior: aviso.version } : {}),
        ...(aviso.build ? { build_anterior: aviso.build } : {}),
      },
    };
    registrarActividad(aviso.tipo, marcarDatos(datos, marca, antes ? `(antes: ${antes})` : undefined));
    return true;
  } catch {
    return false;
  }
}

/**
 * Para los `lazy()`: si el `import()` falla por versión antigua, pide la
 * decisión (la misma que el resto). El error sigue su curso: lo recoge el
 * `SectionErrorBoundary` o el `errorElement` de la ruta, que enseñan su aviso.
 */
export function importarConRecarga<T>(cargar: () => Promise<T>, entorno?: () => Entorno): () => Promise<T> {
  return () =>
    cargar().catch((error: unknown) => {
      if (typeof window !== "undefined" && esErrorDeVersionAntigua(error)) {
        void decidirTrasFallo(avisoDeError(error, "lazy"), entorno?.());
      }
      throw error;
    });
}

/**
 * Vite (5.4) lanza `vite:preloadError` en `window` cuando falla cualquier
 * `import()` dinámico que pase por su ayudante, o su precarga (JS o CSS). No
 * se cancela el evento: el error sigue su curso y lo enseña quien lo recoja.
 * Las promesas sin capturar con un error de este tipo pasan por la misma
 * decisión antes de ir a Logs. Al instalarse, manda el aviso de la recarga
 * anterior.
 */
export function instalarRecargaPorVersion(objetivo: Pick<Window, "addEventListener"> = window, entorno?: () => Entorno): void {
  const e = () => (entorno ? entorno() : entornoNavegador());
  informarRecargaPendiente(e());
  objetivo.addEventListener("vite:preloadError", (ev) => {
    const error = (ev as Event & { payload?: unknown }).payload ?? new Error("vite:preloadError");
    void decidirTrasFallo(avisoDeError(error, "vite:preloadError"), e());
  });
  fijarDesvioDeErrores((tipo, datos, motivo) => {
    if (!esErrorDeVersionAntigua(motivo)) return false;
    void registrarFalloDeCarga(tipo, datos, motivo, e());
    return true;
  });
}

/** Solo para pruebas. */
export function _reiniciarRecarga(): void {
  estado = "normal";
  enCurso = null;
  avisoOfrecido = null;
  avisosEnLinea = 0;
  router = null;
  oyentes.clear();
  if (typeof document !== "undefined") document.getElementById(ID_FLOTANTE)?.remove();
}
