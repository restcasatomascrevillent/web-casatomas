/**
 * `esFotoCarta` (src/lib/carta-ssg.ts) debe decidir igual que el panel
 * (`admin-casatomas/src/components/carta/rutasFotoCarta.ts`): las fotos
 * procesadas se guardan como `<id>-carta-<ext>.webp` (desde una original ya
 * subida) o `<id>-carta.webp` (alta nueva ya compuesta). Con la regla vieja
 * (`-carta.<ext>`) NINGUNA foto procesada por el panel se reconocía.
 */
import { describe, it, expect } from "vitest";
import { esFotoCarta } from "@/lib/carta-ssg";

const BASE = "https://haqmmdfdzzatdnrrcgez.supabase.co/storage/v1/object/public";

describe("esFotoCarta", () => {
  it.each([
    [`${BASE}/vinos/6d6c1f0e-carta.webp`, "alta nueva compuesta en el panel"],
    [`${BASE}/vinos/6d6c1f0e-carta-webp.webp`, "procesada desde una original .webp"],
    [`${BASE}/platos/0621b106-carta-jpg.webp`, "procesada desde una original .jpg"],
    [`${BASE}/platos/0621b106-carta-jpeg.webp`, "procesada desde una original .jpeg"],
    [`${BASE}/platos/0621b106-carta-png.webp`, "procesada desde una original .png"],
    [`${BASE}/platos/0621b106-carta-JPG.webp`, "extensión original en mayúsculas"],
    [`${BASE}/vinos/6d6c1f0e-carta-webp.webp?t=1774192689021`, "con ?t= de caché"],
    [`${BASE}/vinos/6d6c1f0e-carta-webp.webp#x`, "con fragmento"],
    [`${BASE}/vinos/6d6c1f0e%2Dcarta%2Dwebp.webp`, "guion codificado (%2D)"],
    [`${BASE}/vinos/vi%C3%B1a-carta-jpg.webp`, "nombre con tilde codificada"],
    [`${BASE}/vinos/6d6c1f0e-CARTA.WEBP`, "todo en mayúsculas"],
    [`${BASE}/vinos/6d6c1f0e-carta.jpg`, "-carta con extensión jpg"],
    [`${BASE}/vinos/6d6c1f0e-carta.png`, "-carta con extensión png"],
  ])("%s → sí (%s)", (url) => {
    expect(esFotoCarta(url)).toBe(true);
  });

  it.each([
    [`${BASE}/vinos/6d6c1f0e.webp`, "foto antigua sin -carta"],
    [`${BASE}/vinos/6d6c1f0e.jpg`, "foto antigua .jpg"],
    [`${BASE}/vinos/carta.webp`, "«carta» sin guion delante"],
    [`${BASE}/vinos/micarta.webp`, "«carta» pegada a otra palabra"],
    [`${BASE}/vinos/6d6c1f0e-cartas.webp`, "-cartas no es -carta"],
    [`${BASE}/vinos/6d6c1f0e-carta-webp.gif`, "extensión final que el panel no genera"],
    [`${BASE}/vinos/6d6c1f0e-carta`, "sin extensión"],
    [`${BASE}/vinos/6d6c1f0e-carta.webp.bak`, "-carta no está justo antes de la extensión"],
    [`${BASE}/vinos/6d6c1f0e-carta-webp.webp/otra.webp`, "-carta en un directorio, no en el archivo"],
    [`${BASE}/vinos/6d6c1f0e.webp?x=-carta.webp`, "-carta solo en la consulta"],
    [`${BASE}/vinos/6d6c1f0e.webp#-carta.webp`, "-carta solo en el fragmento"],
    ["", "cadena vacía"],
  ])("%s → no (%s)", (url) => {
    expect(esFotoCarta(url)).toBe(false);
  });

  it("sin URL → no", () => {
    expect(esFotoCarta(null)).toBe(false);
    expect(esFotoCarta(undefined)).toBe(false);
  });

  it("un escape `%` mal formado no rompe el render: se prueba la ruta tal cual", () => {
    expect(() => esFotoCarta(`${BASE}/vinos/100%-carta-webp.webp`)).not.toThrow();
    expect(esFotoCarta(`${BASE}/vinos/100%-carta-webp.webp`)).toBe(true);
    expect(esFotoCarta(`${BASE}/vinos/100%.webp`)).toBe(false);
  });
});
