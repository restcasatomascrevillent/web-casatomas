/**
 * `image` como `ImageObject` con `caption`, en vez de una URL suelta: lo que
 * un buscador necesita para asociar texto a la foto en el JSON-LD (ver
 * `scripts/generate-sitemap.mjs` para el mismo caption en el sitemap de imágenes).
 */
import { describe, expect, it } from "vitest";
import { menuSchema, restaurantSchema, OG_IMAGE_CAPTION, NEGOCIO, SITE_URL } from "@/lib/negocio";
import type { SeccionCarta } from "@/lib/carta-ssg";
import type { PlatoSSG } from "@/lib/carta-ssg-types";
import type { ItemTraducido } from "@/lib/carta-i18n";

const SUPABASE_URL = "https://jeamoczmbfsnwkfjxcyo.supabase.co";

function item(overrides: Partial<PlatoSSG> = {}): ItemTraducido<Partial<PlatoSSG>> {
  return {
    id: "1",
    nombre: "Arroz del señoret",
    precio_eur: 18.5,
    displayNombre: "Arroz del señoret",
    displayIngredientes: [],
    translatedCategoria: null,
    ...overrides,
  };
}

function seccion(items: ItemTraducido<Partial<PlatoSSG>>[]): SeccionCarta<Partial<PlatoSSG>> {
  return { clave: "arroces", nombre: "Arroces", items };
}

describe("restaurantSchema — image como ImageObject", () => {
  it("lleva @type ImageObject, la og:image del sitio y el caption compartido con Seo.tsx", () => {
    const schema = restaurantSchema({});
    expect(schema.image).toEqual({
      "@type": "ImageObject",
      url: `${SITE_URL}/og-image.jpg`,
      caption: OG_IMAGE_CAPTION,
    });
  });
});

describe("menuSchema — image de cada producto como ImageObject", () => {
  it("con imagen: ImageObject con caption \"nombre — categoría, negocio\"", () => {
    const schema = menuSchema(
      [seccion([item({ imagen_url: "platos/arroz.jpg" })])],
      "es",
      SUPABASE_URL,
    );
    const producto = schema.hasMenuSection[0].hasMenuItem[0] as { image?: { "@type": string; url: string; caption: string } };
    expect(producto.image).toEqual({
      "@type": "ImageObject",
      url: `${SUPABASE_URL}/storage/v1/object/public/platos/arroz.jpg`,
      caption: `Arroz del señoret — Arroces, ${NEGOCIO.nombre}`,
    });
  });

  it("sin imagen: no se inventa un ImageObject", () => {
    const schema = menuSchema([seccion([item()])], "es", SUPABASE_URL);
    const producto = schema.hasMenuSection[0].hasMenuItem[0] as { image?: unknown };
    expect(producto.image).toBeUndefined();
  });
});
