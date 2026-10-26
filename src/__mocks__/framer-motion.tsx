/**
 * Framer-motion mock for tests.
 * Replaces animated components with static HTML elements so tests can
 * assert on DOM content without waiting for animations.
 */

import React from "react";
import { vi } from "vitest";

type AnyProps = Record<string, unknown> & { children?: React.ReactNode };

const makeMotionComponent = (tag: string) =>
  React.forwardRef<HTMLElement, AnyProps>(
    ({ children, initial: _i, animate: _a, exit: _e, transition: _t, variants: _v, whileHover: _wh, whileTap: _wt, layout: _l, layoutId: _li, ...rest }, ref) =>
      React.createElement(tag, { ...rest, ref }, children as React.ReactNode)
  );

export const motion = new Proxy({} as Record<string, ReturnType<typeof makeMotionComponent>>, {
  get: (_target, tag: string) => makeMotionComponent(tag),
});

export const AnimatePresence = ({ children }: { children?: React.ReactNode }) => (
  <>{children}</>
);

export const useAnimation = () => ({
  start: vi.fn(),
  stop: vi.fn(),
  set: vi.fn(),
});

export const useMotionValue = (initial: number) => {
  const subscribers = new Set<() => void>();
  let _value = initial;
  return {
    get: () => _value,
    set: (v: number) => { _value = v; subscribers.forEach((s) => s()); },
    onChange: (cb: () => void) => { subscribers.add(cb); return () => subscribers.delete(cb); },
  };
};

export const useTransform = (_mv: unknown, _input: unknown, output: number[]) => ({
  get: () => output[0],
});

export const useScroll = () => ({ scrollY: { get: () => 0 } });
export const useSpring = (v: unknown) => v;
export const useInView = () => true;

export default {
  motion,
  AnimatePresence,
  useAnimation,
  useMotionValue,
  useTransform,
  useScroll,
  useSpring,
  useInView,
};
