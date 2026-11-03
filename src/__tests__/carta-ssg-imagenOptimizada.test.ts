/**
 * `imagenOptimizada` (src/lib/carta-ssg.ts): el panel sube las fotos de
 * platos/vinos tal cual salen del móvil (de media medio MB, hasta 3 MB —
 * comprobado en Supabase Storage) para un hueco de card de 192 px de alto.
 * Supabase Storage no las redimensiona en el plan gratuito del proyecto, así
 * que el achicado pasa por el optimizador de Vercel (`/_vercel/image`, ver
 * `vercel.json` → `images`), que solo acepta hosts de su `remotePatterns` —
 * de ahí que la función solo envuelva el host real de Supabase Storage y
 * deje cualquier otra URL tal cual, para no arriesgar un 400.
 */

import { readFileSync } from "node:fs";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { imagenOptimizada, srcSetOptimizada } from "@/lib/carta-ssg";

const FOTO_SUPABASE =
  "https://haqmmdfdzzatdnrrcgez.supabase.co/storage/v1/object/public/platos/abc-123.webp?t=1774192689021";

describe("imagenOptimizada", () => {
  // Build de producción: solo se envuelve el host de su propio proyecto.
  beforeEach(() => vi.stubEnv("VITE_SUPABASE_URL", "https://haqmmdfdzzatdnrrcgez.supabase.co/"));
  afterEach(() => vi.unstubAllEnvs());

  it("envuelve una foto de Supabase Storage en el optimizador de Vercel, con el ancho y la URL codificados", () => {
    const resultado = imagenOptimizada(FOTO_SUPABASE, 768);
    expect(resultado).toBe(`/_vercel/image?url=${encodeURIComponent(FOTO_SUPABASE)}&w=768&q=75`);
  });

  it("en el build de producción deja tal cual las fotos de la demo y del proyecto viejo", () => {
    for (const ref of ["sfonaclosuafvlhutkon", "jeamoczmbfsnwkfjxcyo"]) {
      const foto = `https://${ref}.supabase.co/storage/v1/object/public/vinos/x.webp`;
      expect(imagenOptimizada(foto, 640)).toBe(foto);
    }
  });

  it("en el build de la demo envuelve las fotos de la demo", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://sfonaclosuafvlhutkon.supabase.co");
    const foto = "https://sfonaclosuafvlhutkon.supabase.co/storage/v1/object/public/vinos/x.webp";
    expect(imagenOptimizada(foto, 640)).toBe(`/_vercel/image?url=${encodeURIComponent(foto)}&w=640&q=75`);
  });

  it("con un VITE_SUPABASE_URL que no es de Supabase (backend falso del e2e) no envuelve nada", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "http://127.0.0.1:4321");
    const foto = "http://127.0.0.1:4321/storage/v1/object/public/vinos/x.webp";
    expect(imagenOptimizada(foto, 640)).toBe(foto);
  });

  it("sin VITE_SUPABASE_URL no envuelve nada", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    expect(imagenOptimizada(FOTO_SUPABASE, 640)).toBe(FOTO_SUPABASE);
  });

  it("deja tal cual una URL de otro host, en vez de arriesgar un 400 del optimizador", () => {
    const externa = "https://cdn.otraweb.com/foto.jpg";
    expect(imagenOptimizada(externa, 768)).toBe(externa);
  });

  it("devuelve null si no hay foto", () => {
    expect(imagenOptimizada(null, 768)).toBeNull();
  });

  it("no revienta con una cadena que no es una URL válida — la devuelve tal cual", () => {
    expect(imagenOptimizada("no-es-una-url", 768)).toBe("no-es-una-url");
  });

  it("cada ancho pedido da una URL distinta (el optimizador cachea por combinación url+w+q)", () => {
    const a = imagenOptimizada(FOTO_SUPABASE, 640);
    const b = imagenOptimizada(FOTO_SUPABASE, 1024);
    expect(a).not.toBe(b);
  });
});

describe("srcSetOptimizada (novedades)", () => {
  beforeEach(() => vi.stubEnv("VITE_SUPABASE_URL", "https://haqmmdfdzzatdnrrcgez.supabase.co/"));
  afterEach(() => vi.unstubAllEnvs());

  it("genera un srcset con los tres anchos de vercel.json → images.sizes", () => {
    const srcset = srcSetOptimizada(FOTO_SUPABASE)!;
    const anchos = JSON.parse(readFileSync("vercel.json", "utf8")).images.sizes as number[];
    expect(srcset.split(", ")).toHaveLength(anchos.length);
    for (const w of anchos) expect(srcset).toContain(`&w=${w}&q=75 ${w}w`);
    expect(srcset).toContain("/_vercel/image?url=");
  });

  it("URLs fuera del optimizador o vacías → null", () => {
    expect(srcSetOptimizada("https://example.com/a.jpg")).toBeNull();
    expect(srcSetOptimizada(null)).toBeNull();
  });
});
