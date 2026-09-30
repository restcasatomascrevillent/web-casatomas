/**
 * Como el `loader` que se le pasa a `lazy(...)`, pero en el navegador no
 * empieza a descargar el fragmento hasta que el hilo principal queda libre
 * (`requestIdleCallback`), para no competir por ancho de banda/CPU con el
 * bundle crítico (cabecera + hero) justo al entrar — eso es lo que hacía
 * sentir lenta la portada en el primer vistazo, no que faltara nada por
 * optimizar en el propio bundle.
 *
 * En el prerenderizado (Node, sin `window`) se resuelve al momento: el
 * renderizador de vite-react-ssg (`renderToPipeableStream`) espera a que el
 * `import()` de un `lazy()` se resuelva para volcar el contenido real en el
 * HTML estático, así que retrasarlo ahí dejaría la página sin ese contenido.
 *
 * Es solo un cambio de CUÁNDO se dispara el `import()`, no de qué renderiza
 * React ni de la estructura del árbol: la hidratación de un `Suspense` cuyo
 * contenido ya venía en el HTML del servidor no exige que su código esté
 * descargado — React lo deja tal cual (visible, aún no interactivo) hasta
 * que la promesa se resuelve. Por eso esto no arriesga el mismo bug que ya
 * se corrigió varias veces esta sesión (contenido invisible sin JS): el HTML
 * no cambia, solo se retrasa cuándo se pide el JS que lo hace interactivo.
 *
 * SAFARI (macOS Y iOS) NUNCA HA IMPLEMENTADO `requestIdleCallback` — sigue
 * sin soporte hoy, solo tras una bandera desactivada por defecto en Safari
 * Technology Preview (MDN, `Window.requestIdleCallback`, tabla de
 * compatibilidad). En TODO iOS (Safari, y también Chrome/Firefox para iOS:
 * Apple los obliga a usar WebKit) esta función caía siempre en el fallback
 * de abajo, que era un `setTimeout` fijo y corto: disparaba los import() de
 * las seis secciones A LA VEZ a los 200 ms de montar, justo cuando el móvil
 * puede seguir descargando el hero (la foto/el lema de la portada, el LCP)
 * — exactamente el reparto de ancho de banda que este módulo dice evitar.
 * El fallback espera ahora al evento `load` (cuando el hero y sus
 * fuentes/imagen ya están servidos) antes de pedir el código de más
 * secciones; si la página ya había terminado de cargar al llamar a esto
 * (`document.readyState === "complete"`), no hay nada que esperar.
 */
export function idleImport<T>(loader: () => Promise<T>, timeoutMs = 2000): () => Promise<T> {
  return () => {
    if (typeof window === "undefined") {
      return loader();
    }

    return new Promise<T>((resolve, reject) => {
      const start = () => {
        loader().then(resolve, reject);
      };

      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(start, { timeout: timeoutMs });
        return;
      }

      if (document.readyState === "complete") {
        window.setTimeout(start, 0);
      } else {
        window.addEventListener("load", () => window.setTimeout(start, 0), { once: true });
      }
    });
  };
}
