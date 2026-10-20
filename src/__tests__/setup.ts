import "@testing-library/jest-dom";
import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Web Storage
// ---------------------------------------------------------------------------

// Node ≥ 25 trae su propio `localStorage` global (Web Storage) y, sin
// `--localstorage-file`, es un objeto sin métodos que tapa al de jsdom: 235
// tests caían con "window.localStorage.setItem is not a function" según la
// versión de Node de quien los lanzara. Si el almacén no funciona, se pone uno
// en memoria con la misma interfaz; con jsdom normal no se toca nada.
for (const nombre of ["localStorage", "sessionStorage"] as const) {
  let actual: Storage | undefined;
  try {
    actual = window[nombre];
  } catch {
    actual = undefined;
  }
  if (typeof actual?.setItem === "function") continue;
  const datos = new Map<string, string>();
  const almacen: Storage = {
    get length() {
      return datos.size;
    },
    clear: () => datos.clear(),
    getItem: (clave) => datos.get(String(clave)) ?? null,
    key: (indice) => [...datos.keys()][indice] ?? null,
    removeItem: (clave) => {
      datos.delete(String(clave));
    },
    setItem: (clave, valor) => {
      datos.set(String(clave), String(valor));
    },
  };
  Object.defineProperty(window, nombre, { configurable: true, value: almacen });
  Object.defineProperty(globalThis, nombre, { configurable: true, value: almacen });
}

// ---------------------------------------------------------------------------
// Browser APIs not available in jsdom
// ---------------------------------------------------------------------------

// IntersectionObserver — used by useScrollReveal
const IntersectionObserverMock = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

// matchMedia — used by some Radix components
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// scrollIntoView — used by Calendar & chatbot scroll
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// scrollTo — used by Header
window.scrollTo = vi.fn();

// requestAnimationFrame — use the real jsdom implementation but prevent
// framer-motion's internal batcher from calling it in an infinite loop.
// We simply stub it to schedule via setTimeout which is safe in jsdom.
let rafId = 0;
window.requestAnimationFrame = vi.fn((cb) => {
  const id = ++rafId;
  setTimeout(() => cb(performance.now()), 0);
  return id;
});
window.cancelAnimationFrame = vi.fn();

// crypto.randomUUID — used by AIChatbot session generation
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => "test-uuid-1234" },
  });
}

// ResizeObserver — used by embla carousel / radix
const ResizeObserverMock = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
vi.stubGlobal("ResizeObserver", ResizeObserverMock);
