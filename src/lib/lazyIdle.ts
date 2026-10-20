/**
 * Defer noncritical sections until idle (or load on browsers without it).
 * The deadline also applies without requestIdleCallback: a slow image must
 * never leave a server-rendered section waiting indefinitely for hydration.
 * Essential navigation and the menu are imported directly by the home route.
 */
export function idleImport<T>(loader: () => Promise<T>, timeoutMs = 2000): () => Promise<T> {
  return () => {
    if (typeof window === "undefined") return loader();

    return new Promise<T>((resolve, reject) => {
      let started = false;
      let idleId: number | undefined;
      const start = () => {
        if (started) return;
        started = true;
        clearTimeout(deadline);
        window.removeEventListener("load", onLoad);
        if (idleId !== undefined && typeof window.cancelIdleCallback === "function") {
          window.cancelIdleCallback(idleId);
        }
        Promise.resolve().then(loader).then(resolve, reject);
      };
      const onLoad = () => { setTimeout(start, 0); };
      const deadline = setTimeout(start, timeoutMs);

      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(start, { timeout: timeoutMs });
      } else if (document.readyState === "complete") {
        onLoad();
      } else {
        window.addEventListener("load", onLoad, { once: true });
      }
    });
  };
}
