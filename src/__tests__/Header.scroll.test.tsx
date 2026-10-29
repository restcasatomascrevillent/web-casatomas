import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import Header from "@/components/Header";
import { LanguageProvider } from "@/i18n/LanguageProvider";

afterEach(() => { vi.unstubAllGlobals(); });

const montar = () => {
  render(<MemoryRouter><LanguageProvider initialLanguage="es"><Header /><section id="carta">Menu</section></LanguageProvider></MemoryRouter>);
  const section = document.getElementById("carta")!;
  let offsetTop = 0;
  // jsdom no maqueta: `offsetTop` siempre es 0 y no se puede asignar.
  Object.defineProperty(section, "offsetTop", { configurable: true, get: () => offsetTop });
  return { section, moverA: (top: number) => { offsetTop = top; } };
};

it("does not interrupt anchor scrolling on the initial resize notification", () => {
  let resize: ResizeObserverCallback;
  const disconnect = vi.fn();
  vi.stubGlobal("ResizeObserver", vi.fn((cb: ResizeObserverCallback) => {
    resize = cb;
    return { observe: vi.fn(), disconnect };
  }));
  const scrollTo = vi.fn();
  vi.stubGlobal("scrollTo", scrollTo);
  const { moverA } = montar();
  moverA(700);
  fireEvent.click(screen.getByRole("link", { name: /^Carta$/ }));
  expect(scrollTo).toHaveBeenCalledTimes(1);
  expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ top: 700 }));
  act(() => resize([], {} as ResizeObserver));
  expect(scrollTo).toHaveBeenCalledTimes(1);
  moverA(850);
  act(() => resize([], {} as ResizeObserver));
  expect(scrollTo).toHaveBeenLastCalledWith({ top: 850, behavior: "instant" });
  fireEvent.touchMove(window);
  expect(disconnect).toHaveBeenCalled();
});

it("lands on the layout position minus scroll-margin-top, ignoring transforms (the dish grid fades up 30 px)", () => {
  vi.stubGlobal("ResizeObserver", vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn() })));
  const scrollTo = vi.fn();
  vi.stubGlobal("scrollTo", scrollTo);
  const { section, moverA } = montar();
  moverA(900);
  // A medio `animate-fade-up` el plato se ve 30 px más abajo de donde acabará.
  section.getBoundingClientRect = vi.fn(() => ({ top: 930 } as DOMRect));
  section.scrollIntoView = vi.fn();
  const real = window.getComputedStyle.bind(window);
  // Solo este espía: `restoreAllMocks` borraría también el `matchMedia` de `setup.ts`.
  const estilo = vi.spyOn(window, "getComputedStyle").mockImplementation((el, pseudo) =>
    el === section ? ({ scrollMarginTop: "112px" } as CSSStyleDeclaration) : real(el, pseudo),
  );
  fireEvent.click(screen.getByRole("link", { name: /^Carta$/ }));
  expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 788 }));
  expect(section.scrollIntoView).not.toHaveBeenCalled();
  estilo.mockRestore();
});
