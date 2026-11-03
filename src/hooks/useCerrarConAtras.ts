import { useEffect, useRef } from "react";

/**
 * Mientras una capa (diálogo, hoja, visor) está abierta, el historial lleva una
 * entrada más (la misma URL y el mismo estado de React Router, con una marca),
 * así que «atrás» (botón del navegador, gesto de Android/iOS) quita esa entrada
 * y cierra la capa en vez de salir de la página: el `popstate` la cierra y la
 * página se queda donde estaba (`ScrollToTop` no se mueve: la entrada a la que
 * se vuelve es la misma, con la misma `key`).
 *
 * Si se cierra de otra forma (X, Esc, fuera), se quita esa entrada con
 * `history.back()` para que el siguiente «atrás» no se quede sin hacer nada.
 *
 * Con varias capas apiladas (p. ej. la hoja «Mi mesa» y encima su vista
 * previa), cada una lleva su propia marca y, tras un «atrás», solo cierra la
 * que ya no está en la entrada actual del historial: la de abajo se queda.
 *
 * @param clave  Nombre de la marca en `history.state`; que sea distinto por capa.
 */
// Marcas de capa conocidas: la entrada de una capa nueva NO hereda las de las que ya
// estaban abiertas (si no, no se sabría cuál de las dos entradas es la suya).
const clavesCapa = new Set<string>();

export function useCerrarConAtras(abierto: boolean, cerrar: () => void, clave = "capaAbierta") {
  const alCerrar = useRef(cerrar);
  alCerrar.current = cerrar;

  useEffect(() => {
    if (!abierto || typeof window === "undefined") return;
    const marca = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let entradaPropia = true;
    clavesCapa.add(clave);
    const base = Object.fromEntries(Object.entries(window.history.state ?? {}).filter(([k]) => !clavesCapa.has(k)));
    window.history.pushState({ ...base, [clave]: marca }, "");
    const alVolver = () => {
      if (window.history.state?.[clave] === marca) return; // «atrás» quitó otra capa, no esta
      entradaPropia = false;
      alCerrar.current();
    };
    window.addEventListener("popstate", alVolver);
    return () => {
      window.removeEventListener("popstate", alVolver);
      // Solo si seguimos en la entrada que se añadió: si otra navegación ya
      // la dejó atrás, un `back()` la desharía.
      if (entradaPropia && window.history.state?.[clave] === marca) window.history.back();
    };
  }, [abierto, clave]);
}
