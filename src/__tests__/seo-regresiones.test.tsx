import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import Header from "@/components/Header";
import ListadoCompletoVinos from "@/components/carta/ListadoCompletoVinos";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { menuSchema, restaurantSchema } from "@/lib/negocio";
import { agruparPorCategoria } from "@/lib/carta-ssg";
import { precioConocido, mostrarPrecio } from "@/lib/precios";
import { PAGINAS_INFORMACION } from "@/lib/paginas-informacion";
import { existeEnTodosLosIdiomas, rutaEquivalente } from "@/i18n/routing";

it("los enlaces de sección apuntan a la portada desde páginas interiores", () => {
  render(<MemoryRouter initialEntries={["/en/carta/vinos"]}><LanguageProvider initialLanguage="en"><Header /></LanguageProvider></MemoryRouter>);
  const enlaces = screen.getAllByRole("link").filter(a => a.getAttribute("href")?.includes("#"));
  expect(enlaces.length).toBeGreaterThan(2);
  for (const enlace of enlaces) expect(enlace.getAttribute("href")).toMatch(/^\/en#/);
});

it("el HTML contiene el catálogo entero aunque solo haya 24 tarjetas interactivas", () => {
  const vinos = Array.from({ length: 207 }, (_, i) => ({ id: String(i), nombre: `Referencia ${i + 1}`, precio_eur: i === 206 ? 0 : 20 }));
  const html = renderToStaticMarkup(<ListadoCompletoVinos vinos={vinos} language="es" />);
  expect(html).toContain("Referencia 207");
  expect(html.match(/scope="row"/g)).toHaveLength(207);
  expect(html).toContain("Consultar precio");
  expect(html).not.toMatch(/>0€/);
});

describe("precios desconocidos", () => {
  it.each([0, -1, Number.NaN, Infinity, null, undefined])("no presenta %s como una oferta", precio => {
    expect(precioConocido(precio)).toBe(false);
    expect(mostrarPrecio(precio, "es")).toBe("Consultar precio");
    const item = { nombre: "Vino", categoria: "Vinos", precio_eur: precio };
    const schema = menuSchema(agruparPorCategoria([item], "es"), "es");
    expect(JSON.stringify(schema)).not.toContain('"offers"');
  });
  it("conserva los precios reales en JSON-LD", () => {
    const schema = menuSchema(agruparPorCategoria([{ nombre: "Vino", categoria: "Vinos", precio_eur: 24.5 }], "es"), "es");
    expect(JSON.stringify(schema)).toContain('"price":"24.50"');
  });
});

it("las páginas antiguas tienen equivalentes en los tres idiomas", () => {
  for (const ruta of Object.keys(PAGINAS_INFORMACION)) {
    expect(existeEnTodosLosIdiomas(ruta)).toBe(true);
    expect(rutaEquivalente(ruta, "fr")).toBe(`/fr${ruta}`);
  }
});

it("la migración conserva la carta antigua y no bloquea el dominio definitivo", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8"));
  expect(config.redirects).toContainEqual({ source: "/carta-casa-tomas-restaurante{/}?", destination: "/carta", statusCode: 301 });
  const regla = config.headers.find((r: { headers: { key: string }[] }) => r.headers.some(h => h.key === "X-Robots-Tag"));
  const host = new RegExp(`^${regla.has[0].value}$`);
  expect(host.test("casa-tomas-story.vercel.app")).toBe(true);
  expect(host.test("restaurantecasatomascrevillente.es")).toBe(false);
});

it("las URL con barra final redirigen en un solo salto", () => {
  // `trailingSlash: false` normaliza la barra (308) ANTES de evaluar `redirects`,
  // así que `/reservar/` daba 308 → `/reservar` y luego 301 → `/reservas`.
  // La barra la quita la última regla, después de las específicas.
  const config = JSON.parse(readFileSync("vercel.json", "utf8"));
  expect(config).not.toHaveProperty("trailingSlash");
  expect(config.redirects.at(-1)).toEqual({ source: "/:path(.+)/", destination: "/:path", statusCode: 301 });
});

it("el restaurante identifica sus perfiles y cocina gallega", () => {
  const schema = restaurantSchema({ lang: "es" });
  expect(schema.sameAs).toContain("https://www.instagram.com/casatomascrevillent/");
  expect(schema.servesCuisine).toContain("Cocina gallega");
});
