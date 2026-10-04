/**
 * El sitemap solo lista páginas PRERENDERIZADAS e indexables. Los `.html` que
 * Vite copia tal cual de `public/` (p. ej. la verificación de Google Search
 * Console, una línea sin `noindex`) no son páginas del sitio: `vite.config.ts`
 * se los pasa a `generarSitemapYRobots` en `ignorar` (los mismos que
 * `htmlDePublic` devuelve para `verificar-html`).
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generarSitemapYRobots } from "../../scripts/generate-sitemap.mjs";
import { htmlDePublic } from "../../scripts/verificar-html.mjs";

const SITIO = "https://restaurantecasatomascrevillente.es";
const VERIFICACION = "google0123456789abcdef.html";

function construir() {
  const raiz = mkdtempSync(path.join(tmpdir(), "sitemap-public-"));
  const dist = path.join(raiz, "dist");
  const publico = path.join(raiz, "public");
  mkdirSync(dist, { recursive: true });
  mkdirSync(publico);
  writeFileSync(path.join(dist, "index.html"), '<!DOCTYPE html><html lang="es"><head></head><body></body></html>');
  writeFileSync(path.join(dist, "reservas.html"), '<!DOCTYPE html><html lang="es"><head></head><body></body></html>');
  writeFileSync(
    path.join(dist, "condiciones.html"),
    '<!DOCTYPE html><html lang="es"><head><meta name="robots" content="noindex,follow"></head></html>',
  );
  writeFileSync(path.join(dist, VERIFICACION), `google-site-verification: ${VERIFICACION}`);
  writeFileSync(path.join(publico, VERIFICACION), `google-site-verification: ${VERIFICACION}`);
  return { raiz, dist, publico };
}

describe("sitemap — ficheros de public/", () => {
  it("no lista los .html copiados de public/, sí las páginas prerenderizadas indexables", async () => {
    const { raiz, dist, publico } = construir();
    try {
      const rutas = await generarSitemapYRobots(dist, SITIO, { ignorar: await htmlDePublic(publico) });
      expect(rutas).toEqual(["/", "/reservas"]);
      const xml = readFileSync(path.join(dist, "sitemap.xml"), "utf8");
      expect(xml).not.toContain("google0123456789abcdef");
      expect(xml).toContain(`<loc>${SITIO}/reservas</loc>`);
      expect(xml).not.toContain("/condiciones");
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it("sin `ignorar`, el fichero de verificación se colaría como URL (lo que se evita)", async () => {
    const { raiz, dist } = construir();
    try {
      expect(await generarSitemapYRobots(dist, SITIO)).toContain("/google0123456789abcdef");
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });
});
