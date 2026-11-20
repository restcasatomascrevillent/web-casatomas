/**
 * ¿Ha cambiado alguien de fuera el HTML antes de que React lo hidratara? (CAS-6, CAS-18/19/20)
 *
 * Los errores de hidratación (#418/#422/#425) de la web salen de dos sitios:
 *   · un fallo nuestro (lo que se pinta en el navegador no es lo del build), o
 *   · algo del navegador que cambia la página antes de que React la reclame:
 *     el traductor (Chrome, Edge, Safari), los enlaces que crea solo
 *     (teléfonos de iOS, ver `index.html`) o una extensión.
 * `pagina-traducida.ts` reconoce el rastro de los traductores de Chrome y Edge;
 * esto vale para todos, incluidos los que no dejan rastro (el iPhone del
 * 20/11/2026 en /carta/carnes, CAS-6).
 *
 * Cómo: desde que arranca el bundle (antes de hidratar) y durante 20 s, un
 * `MutationObserver` mira el `#root`. React marca cada nodo que reclama o crea
 * con una propiedad `__reactFiber$…`, y NUNCA toca el HTML que aún no ha
 * reclamado (las secciones que se hidratan cuando el navegador está ocioso).
 * Así que es «ajeno»:
 *   · un texto sin marca de React que cambia (HTML aún sin reclamar);
 *   · cualquier cambio dentro de un elemento sin marca de React;
 *   · un nodo nuevo que no ha creado React (los suyos llevan la marca desde
 *     que los crea, antes de meterlos en la página).
 * Lo que React hace (hidratar, volver a pintar una sección, actualizar) nunca
 * cuenta. Las zonas que llena a mano una librería (el mapa de vinos de
 * Mapbox) se marcan con `data-dom-ajeno="permitido"` y no cuentan.
 */

const MARCA_REACT = "__reactFiber$";
const ZONA_PERMITIDA = '[data-dom-ajeno="permitido"]';
export const DURACION_VIGILANCIA_MS = 20_000;

export interface DomAjeno {
  /** Cambios ajenos vistos (0 = nadie de fuera ha tocado la página). */
  cambios: number;
  /** El primero, en corto, para el diagnóstico («texto «Carnes» → «Viandes»»). */
  muestra: string | null;
  /** Si la vigilancia sigue activa ahora (fuera de los 20 s, una página «sin cambios» no prueba nada). */
  activo: boolean;
}

let estado: Omit<DomAjeno, "activo"> = { cambios: 0, muestra: null };
let observador: MutationObserver | null = null;
let temporizador: ReturnType<typeof setTimeout> | null = null;

function esDeReact(nodo: Node): boolean {
  return Object.keys(nodo).some((clave) => clave.startsWith(MARCA_REACT));
}

function enZonaPermitida(nodo: Node): boolean {
  const elemento = nodo.nodeType === 1 ? (nodo as Element) : nodo.parentElement;
  return Boolean(elemento?.closest(ZONA_PERMITIDA));
}

const recorte = (texto: string | null | undefined) => {
  const limpio = (texto ?? "").replace(/\s+/g, " ").trim();
  return limpio.length > 24 ? `${limpio.slice(0, 24)}…` : limpio;
};
const nombre = (nodo: Node) => (nodo.nodeType === 1 ? (nodo as Element).tagName.toLowerCase() : nodo.nodeType === 3 ? "texto" : "nodo");

function apuntar(muestra: string) {
  estado = { ...estado, cambios: estado.cambios + 1, muestra: estado.muestra ?? muestra };
}

/** Qué dice un cambio del DOM: la muestra si es ajeno, `null` si es de React (o de una zona permitida). */
export function cambioAjeno(registro: Pick<MutationRecord, "type" | "target" | "addedNodes" | "oldValue">, raiz: Node): string | null {
  const { target } = registro;
  if (enZonaPermitida(target)) return null;
  if (registro.type === "characterData") {
    return esDeReact(target) ? null : `texto «${recorte(registro.oldValue)}» → «${recorte(target.nodeValue)}»`;
  }
  if (registro.type !== "childList") return null;
  if (target !== raiz && !esDeReact(target)) return `cambio dentro de <${nombre(target)}> sin hidratar`;
  for (const nodo of Array.from(registro.addedNodes)) {
    if (nodo.nodeType === 8) continue; // comentarios (marcas de Suspense)
    if (!esDeReact(nodo)) return `<${nombre(nodo)}> añadido en <${nombre(target)}>`;
  }
  return null;
}

/**
 * Empieza a vigilar `#root` (una vez, solo en el navegador). Hay que llamarlo
 * ANTES de hidratar: `main.tsx`, al cargar el bundle. Devuelve la función que
 * para (para los tests).
 */
export function vigilarDomAjeno(raiz: Element | null = typeof document === "undefined" ? null : document.getElementById("root"), duracionMs = DURACION_VIGILANCIA_MS): () => void {
  if (!raiz || typeof MutationObserver !== "function" || observador) return pararVigilancia;
  estado = { cambios: 0, muestra: null };
  observador = new MutationObserver((registros) => {
    for (const registro of registros) {
      try {
        const muestra = cambioAjeno(registro, raiz);
        if (muestra) apuntar(muestra);
      } catch {
        // Vigilar nunca rompe la web.
      }
    }
  });
  observador.observe(raiz, { subtree: true, childList: true, characterData: true, characterDataOldValue: true });
  temporizador = setTimeout(pararVigilancia, duracionMs);
  return pararVigilancia;
}

export function pararVigilancia(): void {
  if (observador) {
    // Lo que aún no se ha entregado también cuenta.
    for (const registro of observador.takeRecords()) {
      const muestra = (() => {
        try {
          return cambioAjeno(registro, registro.target.ownerDocument?.getElementById("root") ?? registro.target);
        } catch {
          return null;
        }
      })();
      if (muestra) apuntar(muestra);
    }
    observador.disconnect();
    observador = null;
  }
  if (temporizador) clearTimeout(temporizador);
  temporizador = null;
}

/**
 * Lo visto hasta ahora. Recoge también los cambios pendientes de entregar: un
 * error de hidratación se informa en mitad de un commit de React, antes de que
 * el observador haya recibido lo último.
 */
export function domAjeno(raiz: Element | null = typeof document === "undefined" ? null : document.getElementById("root")): DomAjeno {
  if (observador && raiz) {
    for (const registro of observador.takeRecords()) {
      try {
        const muestra = cambioAjeno(registro, raiz);
        if (muestra) apuntar(muestra);
      } catch {
        // ignorado
      }
    }
  }
  return { ...estado, activo: observador !== null };
}

/** Solo para pruebas. */
export function _reiniciarDomAjeno(): void {
  pararVigilancia();
  estado = { cambios: 0, muestra: null };
}
