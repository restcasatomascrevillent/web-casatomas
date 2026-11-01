import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

/** Lo que tarda en aplicarse lo que se teclea (no se recalcula en cada tecla). */
export const RETARDO_BUSQUEDA_MS = 200;

/** `sessionStorage`: última búsqueda de cada entrada del historial. */
export const CLAVE_BUSQUEDAS_GUARDADAS = "carta:busquedas";
const MAX_GUARDADAS = 20;

const sinSuscripcion = () => () => {};

/**
 * `false` en el prerenderizado y mientras se hidrata; `true` en cualquier
 * montaje posterior (una navegación dentro de la web). Así el primer render
 * del navegador coincide con el HTML del SSG y, aun así, al volver atrás a
 * `/carta` la búsqueda se puede restaurar sin parpadeo.
 */
const useMontadoEnCliente = () =>
  useSyncExternalStore(sinSuscripcion, () => true, () => false);

function leerGuardadas(): Record<string, string> {
  try {
    const datos = JSON.parse(window.sessionStorage.getItem(CLAVE_BUSQUEDAS_GUARDADAS) ?? "{}");
    return datos && typeof datos === "object" && !Array.isArray(datos) ? datos : {};
  } catch {
    return {};
  }
}

/** Búsqueda guardada para esta entrada del historial (`location.key`), o "". */
export function leerBusquedaGuardada(clave: string): string {
  const valor = leerGuardadas()[clave];
  return typeof valor === "string" ? valor : "";
}

export function guardarBusqueda(clave: string, consulta: string): void {
  try {
    const datos = leerGuardadas();
    delete datos[clave];
    if (consulta) datos[clave] = consulta;
    // Solo las últimas: `sessionStorage` dura lo que la pestaña.
    const recientes = Object.entries(datos).slice(-MAX_GUARDADAS);
    window.sessionStorage.setItem(CLAVE_BUSQUEDAS_GUARDADAS, JSON.stringify(Object.fromEntries(recientes)));
  } catch {
    // Sin `sessionStorage` (modo privado estricto) simplemente no se recuerda.
  }
}

/**
 * Estado del buscador de `/carta`.
 *
 * - `texto`: lo que hay en el campo (responde al instante).
 * - `consulta`: lo que se busca, con un pequeño retraso; vacía en cuanto el
 *   campo se vacía (limpiar no espera al retraso).
 *
 * Empieza SIEMPRE vacío al hidratar: el HTML prerenderizado es la carta sin
 * búsqueda y tiene que coincidir con el primer render. La búsqueda se recuerda
 * por entrada del historial (`location.key`), no por URL: al tocar un plato y
 * volver atrás, los resultados siguen ahí; entrar de nuevo a `/carta` desde un
 * enlace empieza limpio. Sin parámetro en la URL a propósito: cada
 * `replaceState` lo contaría la analítica como una visita.
 */
export function useBusquedaCarta() {
  const { key } = useLocation();
  const montadoEnCliente = useMontadoEnCliente();
  const [texto, setTexto] = useState(() => (montadoEnCliente ? leerBusquedaGuardada(key) : ""));
  const conRetraso = useDebouncedValue(texto, RETARDO_BUSQUEDA_MS);
  const consulta = texto.trim() ? conRetraso.trim() : "";

  const primeraVez = useRef(true);
  useEffect(() => {
    // Al montar no se escribe: o no había nada, o es lo que se acaba de leer.
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    guardarBusqueda(key, consulta);
  }, [key, consulta]);

  const limpiar = useCallback(() => setTexto(""), []);

  return { texto, setTexto, consulta, activa: consulta !== "", limpiar };
}
