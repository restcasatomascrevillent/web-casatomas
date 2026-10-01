import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * React Router, a diferencia de una navegación normal del navegador, NO
 * lleva el scroll a 0 al cambiar de página — se queda donde estaba en la
 * página anterior. Sin esto, entrar a `/carta/vinos` con la portada
 * desplazada hacia abajo aterrizaba igual de desplazado en la carta nueva.
 *
 * Cuando la navegación sí lleva un ancla (`#carta`), se respeta: el
 * `scroll-behavior: smooth` de `index.css` ya lleva hasta ahí, y forzar
 * aquí un salto a 0 lo interrumpiría a medio camino.
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;

