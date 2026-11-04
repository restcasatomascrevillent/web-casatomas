import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Posición vertical de cada entrada del historial, por `location.key`. Solo
 * en memoria: sirve para «atrás» y «adelante» dentro de la misma visita (la
 * navegación entre páginas es de React Router, no del navegador).
 */
const posiciones = new Map<string, number>();

/** Lo que se sigue intentando restaurar mientras la página aún no es tan alta. */
const ESPERA_MAXIMA_MS = 1500;

/** `useLayoutEffect` sin el aviso de React al prerenderizar (SSG). */
const useLayoutEffectCliente = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * React Router, a diferencia de una navegación normal del navegador, NO
 * lleva el scroll a 0 al cambiar de página — se queda donde estaba en la
 * página anterior. Sin esto, entrar a `/carta/vinos` con la portada
 * desplazada hacia abajo aterrizaba igual de desplazado en la carta nueva.
 *
 * Cuando la navegación sí lleva un ancla (`#carta`), se respeta: el
 * `scroll-behavior: smooth` de `index.css` ya lleva hasta ahí (lo hace
 * `Header`), y forzar aquí un salto a 0 lo interrumpiría a medio camino.
 *
 * Si solo cambian los parámetros de la misma página con REPLACE (los filtros
 * de la carta, `?dietas=`), no se sube: es la misma página.
 *
 * Al volver con «atrás» (o el gesto de atrás del móvil), la página vuelve a
 * donde se dejó: antes subía arriba del todo, y quien volvía de «Échale un
 * vistazo» en una novedad tenía que bajar otra vez hasta Novedades. Cada
 * entrada guarda su `scrollY` mientras se desplaza; un `POP` a una entrada
 * conocida lo recupera. Si la página aún no mide lo bastante (una sección
 * que termina de pintarse), se reintenta unos fotogramas.
 */
const ScrollToTop = () => {
  const { pathname, hash, key } = useLocation();
  const tipo = useNavigationType();
  const claveActual = useRef(key);
  const rutaActual = useRef(pathname);
  const primera = useRef(true);

  // Se apunta la posición de la entrada actual mientras se desplaza. El
  // evento `scroll` llega en el fotograma siguiente, así que el recorte que
  // hace el navegador al pintar una página más corta ya cuenta para la
  // entrada nueva, no para la que se deja.
  useEffect(() => {
    const guardar = () => posiciones.set(claveActual.current, window.scrollY);
    window.addEventListener("scroll", guardar, { passive: true });
    return () => window.removeEventListener("scroll", guardar);
  }, []);

  useLayoutEffectCliente(() => {
    // Misma entrada: p. ej. el «atrás» que cierra el diálogo de «Ver menú»
    // (`MenuNovedadDialog`) vuelve a la entrada en la que ya se estaba.
    if (!primera.current && key === claveActual.current) return;
    const mismaPagina = pathname === rutaActual.current;
    claveActual.current = key;
    rutaActual.current = pathname;
    // Primera carga: la decide el navegador (y `Header` si hay ancla).
    if (primera.current) {
      primera.current = false;
      if (!hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      return;
    }
    if (hash) return;
    // Misma página y REPLACE: solo cambian los parámetros de la URL, p. ej. los filtros de la
    // carta (`?dietas=`, `useFiltrosCarta`). No es otra página: el visitante sigue donde estaba
    // (dueño, 04/11/2026: «cuando pulsas los filtros de la carta te mueve al hero»).
    if (mismaPagina && tipo === "REPLACE") {
      posiciones.set(key, window.scrollY);
      return;
    }

    const guardada = tipo === "POP" ? posiciones.get(key) : undefined;
    if (guardada === undefined) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      return;
    }

    let fotograma = 0;
    const limite = performance.now() + ESPERA_MAXIMA_MS;
    const restaurar = () => {
      window.scrollTo({ top: guardada, left: 0, behavior: "instant" });
      if (Math.abs(window.scrollY - guardada) > 1 && performance.now() < limite) {
        fotograma = requestAnimationFrame(restaurar);
      }
    };
    restaurar();
    // Si el visitante se desplaza a mano mientras tanto, se deja de insistir.
    const parar = () => cancelAnimationFrame(fotograma);
    window.addEventListener("wheel", parar, { passive: true, once: true });
    window.addEventListener("touchstart", parar, { passive: true, once: true });
    return () => {
      parar();
      window.removeEventListener("wheel", parar);
      window.removeEventListener("touchstart", parar);
    };
  }, [pathname, hash, key, tipo]);

  return null;
};

export default ScrollToTop;
