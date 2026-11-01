/**
 * Contraste WCAG AA de los tokens de color de `src/index.css` (tema claro).
 *
 * Complementa `e2e/contraste.e2e.ts` (axe sobre el build real): aquí se lee
 * el CSS y se comprueba cada par texto/fondo que usa la web, para que un
 * cambio de token que baje de 4,5:1 falle ya en `npm test`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");
const raiz = css.slice(css.indexOf(":root"), css.indexOf(".dark"));

function token(nombre: string): [number, number, number] {
  const m = raiz.match(new RegExp(`--${nombre}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%;`));
  if (!m) throw new Error(`No encuentro --${nombre} en :root`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function rgb([h, s, l]: [number, number, number]): [number, number, number] {
  const S = s / 100, L = l / 100, a = S * Math.min(L, 1 - L);
  const f = (n: number) => { const k = (n + h / 30) % 12; return L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0), f(8), f(4)].map((x) => Math.round(x * 255)) as [number, number, number];
}

function luminancia(c: [number, number, number]) {
  const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string) {
  const [x, y] = [luminancia(rgb(token(a))), luminancia(rgb(token(b)))];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe("contraste de los tokens (AA, 4,5:1)", () => {
  it.each([
    ["accent-foreground", "accent", "botones dorados"],
    ["accent", "background", "texto dorado (precios, enlaces) sobre blanco"],
    ["secondary-foreground", "secondary", "botones piedra"],
    ["destructive-foreground", "destructive", "avisos de error"],
    ["stone-light", "dark-slate", "texto del pie"],
    ["background", "dark-slate", "títulos del pie"],
    ["foreground", "background", "texto normal"],
    ["muted-foreground", "background", "texto secundario"],
  ])("%s sobre %s (%s)", (texto, fondo) => {
    expect(contraste(texto, fondo)).toBeGreaterThanOrEqual(4.5);
  });
});
