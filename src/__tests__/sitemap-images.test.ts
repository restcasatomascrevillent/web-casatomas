/**
 * Extensión `xmlns:image` del sitemap (`<image:image>`): solo `<img>` reales
 * con `alt`, dedupicadas por página, con la URL absoluta y el `caption` listo
 * para XML — ver `imagenesDe` en `scripts/generate-sitemap.mjs`.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generarSitemapYRobots } from "../../scripts/generate-sitemap.mjs";

const SITIO = "https://restaurantecasatomascrevillente.es";

function construir(html: string) {
  const raiz = mkdtempSync(path.join(tmpdir(), "sitemap-images-"));
  const dist = path.join(raiz, "dist");
  mkdirSync(dist, { recursive: true });
  writeFileSync(path.join(dist, "index.html"), html);
  return { raiz, dist };
}

async function generar(html: string) {
  const { raiz, dist } = construir(html);
  try {
    await generarSitemapYRobots(dist, SITIO);
    return readFileSync(path.join(dist, "sitemap.xml"), "utf8");
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
}

const pagina = (body: string) => `<!DOCTYPE html><html lang="es"><head></head><body>${body}</body></html>`;

describe("sitemap de imágenes", () => {
  it("una imagen con alt entra con su URL absoluta y su caption", async () => {
    const xml = await generar(pagina('<img src="/assets/salon.jpg" alt="Salón de Casa Tomás">'));
    expect(xml).toContain("<image:image>");
    expect(xml).toContain(`<image:loc>${SITIO}/assets/salon.jpg</image:loc>`);
    expect(xml).toContain("<image:caption>Salón de Casa Tomás</image:caption>");
  });

  it("una URL ya absoluta (Supabase Storage) no se reescribe", async () => {
    const externa = "https://jeamoczmbfsnwkfjxcyo.supabase.co/storage/v1/object/public/novedades/foto.jpg";
    const xml = await generar(pagina(`<img src="${externa}" alt="Novedad">`));
    expect(xml).toContain(`<image:loc>${externa}</image:loc>`);
  });

  it("sin alt, o con alt vacío (decorativa), no entra en el sitemap", async () => {
    const xml = await generar(
      pagina('<img src="/assets/a.jpg"><img src="/assets/b.jpg" alt="">'),
    );
    expect(xml).not.toContain("<image:image>");
  });

  it("la misma imagen repetida en la página cuenta una sola vez", async () => {
    const xml = await generar(
      pagina(
        '<img src="/assets/logo.png" alt="Logo">' +
          '<img src="/assets/logo.png" alt="Logo (footer)">',
      ),
    );
    expect(xml.match(/<image:image>/g)).toHaveLength(1);
  });

  it("solo el <img>, nunca el <source> de un <picture>", async () => {
    const xml = await generar(
      pagina(
        '<picture><source srcset="/assets/foto.avif" type="image/avif">' +
          '<img src="/assets/foto.jpg" alt="Foto"></picture>',
      ),
    );
    expect(xml).not.toContain("/assets/foto.avif");
    expect(xml).toContain(`<image:loc>${SITIO}/assets/foto.jpg</image:loc>`);
  });

  it("un alt con & ya escapado (p. ej. \"Juvé &amp; Camps\") no se escapa dos veces", async () => {
    const xml = await generar(pagina('<img src="/assets/vino.jpg" alt="Juvé &amp; Camps">'));
    expect(xml).toContain("<image:caption>Juvé &amp; Camps</image:caption>");
    expect(xml).not.toContain("&amp;amp;");
  });

  it("el &nbsp; que el HTML5 exige para el espacio de no separación no rompe el XML", async () => {
    // El propio prerenderizado escribe así el U+00A0 (obligado por la especificación
    // de serialización HTML5), tanto en texto como en atributos — `&nbsp;` no es una
    // entidad válida en XML a pelo, así que `imagenesDe` tiene que decodificarla.
    const xml = await generar(
      pagina('<img src="/assets/ostras.jpg" alt="Touche spéciale&nbsp;! — Casa Tomás">'),
    );
    expect(xml).not.toContain("&nbsp;");
    expect(xml).toContain("Touche spéciale ! — Casa Tomás");
    expect(() => new DOMParser().parseFromString(xml, "application/xml")).not.toThrow();
    const parsed = new DOMParser().parseFromString(xml, "application/xml");
    expect(parsed.querySelector("parsererror")).toBeNull();
  });
});
