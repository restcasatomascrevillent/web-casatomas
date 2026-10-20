/**
 * Tests for useScrollReveal hook
 *
 * The hook uses IntersectionObserver to set `isVisible = true` when the
 * observed element enters the viewport. The observer is mocked in setup.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React, { useRef } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

// ---------------------------------------------------------------------------
// The hook only runs its observer when elementRef.current is not null.
// We mount a real component so the ref is attached to a real DOM element.
// ---------------------------------------------------------------------------

let capturedCallback: IntersectionObserverCallback | null = null;
let capturedDisconnect: ReturnType<typeof vi.fn>;

function TestComponent({ onResult }: { onResult: (v: { isVisible: boolean }) => void }) {
  const { elementRef, isVisible } = useScrollReveal();
  onResult({ isVisible });
  return <section ref={elementRef as React.Ref<HTMLElement>} data-testid="target">content</section>;
}

describe("useScrollReveal", () => {
  beforeEach(() => {
    capturedCallback = null;
    capturedDisconnect = vi.fn();

    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn((callback: IntersectionObserverCallback) => {
        capturedCallback = callback;
        return {
          observe: vi.fn(),
          unobserve: vi.fn(),
          disconnect: capturedDisconnect,
        };
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("isVisible starts as false", () => {
    let latest = { isVisible: false };
    render(<TestComponent onResult={(v) => { latest = v; }} />);
    expect(latest.isVisible).toBe(false);
  });

  it("elementRef is attached to the rendered DOM element", () => {
    render(<TestComponent onResult={() => {}} />);
    // The section element must exist
    expect(screen.getByTestId("target")).toBeInTheDocument();
  });

  it("sets isVisible = true when the entry is intersecting", () => {
    let latest = { isVisible: false };
    render(<TestComponent onResult={(v) => { latest = v; }} />);

    act(() => {
      capturedCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(latest.isVisible).toBe(true);
  });

  it("keeps isVisible = false when isIntersecting is false", () => {
    let latest = { isVisible: false };
    render(<TestComponent onResult={(v) => { latest = v; }} />);

    act(() => {
      capturedCallback?.(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(latest.isVisible).toBe(false);
  });

  it("calls observer.disconnect() once it becomes visible", () => {
    render(<TestComponent onResult={() => {}} />);

    act(() => {
      capturedCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(capturedDisconnect).toHaveBeenCalledOnce();
  });
});
