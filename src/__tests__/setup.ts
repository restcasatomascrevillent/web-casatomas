import "@testing-library/jest-dom";
import { vi } from "vitest";

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
