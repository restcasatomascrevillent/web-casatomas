import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import Header from "@/components/Header";
import { LanguageProvider } from "@/i18n/LanguageProvider";

afterEach(() => { vi.unstubAllGlobals(); });

it("does not interrupt anchor scrolling on the initial resize notification", () => {
  let resize: ResizeObserverCallback;
  const disconnect = vi.fn();
  vi.stubGlobal("ResizeObserver", vi.fn((cb: ResizeObserverCallback) => {
    resize = cb;
    return { observe: vi.fn(), disconnect };
  }));
  render(<MemoryRouter><LanguageProvider initialLanguage="es"><Header /><section id="carta">Menu</section></LanguageProvider></MemoryRouter>);
  const section = document.getElementById("carta")!;
  let top = 700;
  section.getBoundingClientRect = vi.fn(() => ({ top } as DOMRect));
  section.scrollIntoView = vi.fn();
  fireEvent.click(screen.getByRole("link", { name: /^Carta$/ }));
  expect(section.scrollIntoView).toHaveBeenCalledTimes(1);
  act(() => resize([], {} as ResizeObserver));
  expect(section.scrollIntoView).toHaveBeenCalledTimes(1);
  top = 850;
  act(() => resize([], {} as ResizeObserver));
  expect(section.scrollIntoView).toHaveBeenLastCalledWith({ behavior: "instant" });
  fireEvent.touchMove(window);
  expect(disconnect).toHaveBeenCalled();
});
