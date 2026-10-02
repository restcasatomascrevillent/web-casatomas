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

import { describe, it, expect } from "vitest";
import { imagenOptimizada } from "@/lib/carta-ssg";

const FOTO_SUPABASE =
  "https://jeamoczmbfsnwkfjxcyo.supabase.co/storage/v1/object/public/platos/abc-123.webp?t=1774192689021";

describe("imagenOptimizada", () => {
  it("envuelve una foto de Supabase Storage en el optimizador de Vercel, con el ancho y la URL codificados", () => {
    const resultado = imagenOptimizada(FOTO_SUPABASE, 768);
    expect(resultado).toBe(`/_vercel/image?url=${encodeURIComponent(FOTO_SUPABASE)}&w=768&q=75`);
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
