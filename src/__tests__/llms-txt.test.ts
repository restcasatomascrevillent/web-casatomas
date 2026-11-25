/**
 * `/llms.txt`, `/llms-full.txt` (scripts/generate-llms.mjs), los bots de IA de
 * `robots.txt` y la clave de IndexNow (scripts/indexnow.mjs).
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { componerLlms, generarLlms, horarioLegible, slugificar, telefonoLegible } from "../../scripts/generate-llms.mjs";
import { BOTS_IA, generarSitemapYRobots } from "../../scripts/generate-sitemap.mjs";
import { CLAVE_INDEXNOW, cuerpoIndexNow, urlsDelSitemap } from "../../scripts/indexnow.mjs";
import { slugificar as slugificarRuta } from "@/lib/carta-rutas";
import {
  ANO_FUNDACION,
  DESCRIPCION_RESTAURANTE,
  HORARIOS,
  NEGOCIO,
  OFERTA,
  PERFILES,
  TOUZA_CALLE,
} from "@/lib/datos-negocio";
import { restaurantSchema, websiteSchema, SITE_URL } from "@/lib/negocio";
import es from "@/i18n/languages/es";

const SITIO = "https://restaurantecasatomascrevillente.es";

const CARTA = {
  platos: [
    { nombre: "Arroz meloso de bogavante", categoria: "ARROCES", precio_eur: 25.5, unidad: "Unidad", descripcion: "Arroz meloso\r\nal momento." },
    { nombre: "Arroz meloso de rape", categoria: "ARROCES", precio_eur: 21 },
    { nombre: "Bogavante de la ría", categoria: "MARISCOS", precio_eur: 95, unidad: "kg" },
    { nombre: "Percebes", categoria: "MARISCOS" },
    { nombre: "Tarta de queso", categoria: "POSTRES SIN PÁGINA", precio_eur: 6.5 },
  ],
  vinos: [
    { nombre: "Albariño X", categoria: "VINOS BLANCOS — RÍAS BAIXAS", denominacion_origen: "Rías Baixas", precio_eur: 22, copeo: true, precio_copa_eur: 4.5 },
    { nombre: "Tinto Y", categoria: "VINOS TINTOS — RIOJA", precio_eur: 30, descripcion: "Fruta roja." },
  ],
  bebidas: [{ nombre: "Agua", categoria: "AGUAS", precio_eur: 2 }],
  config: { mostrarCartaBebidas: false },
};

const RUTAS = ["/", "/carta", "/carta/arroces", "/carta/mariscos", "/carta/vinos", "/contacto", "/reservas", "/en", "/en/carta"];

function opciones(extra = {}) {
  return {
    siteUrl: SITIO,
    rutas: RUTAS,
    negocio: NEGOCIO,
    horarios: HORARIOS,
    oferta: OFERTA,
    perfiles: PERFILES,
    anoFundacion: ANO_FUNDACION,
    descripcion: DESCRIPCION_RESTAURANTE,
    mapsUrl: "https://www.google.com/maps/place/?q=place_id:X",
    touza: { url: "https://touza.restaurantecasatomascrevillente.es", calle: TOUZA_CALLE },
    carta: CARTA,
    cabeceras: new Map([
      ["/contacto", { titulo: "Contacto y horarios | Casa Tomás Crevillente", descripcion: "Dirección, teléfono y horario." }],
      ["/reservas", { titulo: "Reservar mesa | Casa Tomás", descripcion: "Reserva online." }],
    ]),
    fecha: "2026-11-25",
    ...extra,
  };
}

describe("llms.txt — datos del negocio", () => {
  const { resumen } = componerLlms(opciones());

  it("empieza como pide llmstxt.org: H1 con el nombre y cita con la descripción", () => {
    const lineas = resumen.split("\n");
    expect(lineas[0]).toBe(`# ${NEGOCIO.nombre}`);
    expect(lineas[2]).toBe(`> ${DESCRIPCION_RESTAURANTE}`);
  });

  it("dirección, teléfono, email y horario salen de datos-negocio.ts", () => {
    expect(resumen).toContain(`${NEGOCIO.calle}, ${NEGOCIO.cp} ${NEGOCIO.localidad}`);
    expect(resumen).toContain("+34 966 10 78 87");
    expect(resumen).toContain(NEGOCIO.email);
    expect(resumen).toContain(horarioLegible(HORARIOS));
    expect(resumen).toContain(`${SITIO}/reservas`);
  });

  it("el horario coincide con el que enseña la página de contacto (es.ts)", () => {
    const visible = es.translations.contacto.schedule.map((d: { day: string; hours: string }) => `${d.day.toLowerCase()}: ${d.hours.toLowerCase()}`);
    const legible = horarioLegible(HORARIOS).replace(/–/g, " - ").replace(/ a /g, " - ");
    for (const tramo of visible) expect(legible).toContain(tramo);
  });

  it("enlaza las categorías que tienen página y no inventa enlaces para las que no", () => {
    expect(resumen).toContain(`[Arroces](${SITIO}/carta/arroces): 2 platos, de 21,00 € a 25,50 €`);
    expect(resumen).toContain(`[Mariscos](${SITIO}/carta/mariscos): 2 platos, 95,00 €`);
    expect(resumen).toContain(`[Carta de vinos](${SITIO}/carta/vinos): 2 vinos (vinos blancos: 1, vinos tintos: 1)`);
    expect(resumen).toContain("- Postres sin página: 1 platos, 6,50 €");
    expect(resumen).not.toContain("/carta/postres-sin-pagina");
  });

  it("lista las páginas en castellano con su título y su descripción, sin las de otros idiomas", () => {
    expect(resumen).toContain(`- [Contacto y horarios](${SITIO}/contacto): Dirección, teléfono y horario.`);
    expect(resumen).not.toContain(`(${SITIO}/en/carta)`);
    expect(resumen).toContain(`${SITIO}/llms-full.txt`);
  });

  it("sin la página de reservas no la anuncia", () => {
    const { resumen: sinReservas } = componerLlms(opciones({ rutas: RUTAS.filter((r) => r !== "/reservas") }));
    expect(sinReservas).not.toContain(`${SITIO}/reservas`);
  });
});

describe("llms-full.txt — la carta entera", () => {
  it("cada plato con su precio, su unidad y su descripción en una línea", () => {
    const { completo } = componerLlms(opciones());
    expect(completo).toContain("- Arroz meloso de bogavante: 25,50 €. Arroz meloso al momento.");
    expect(completo).toContain("- Bogavante de la ría: 95,00 € (kg)");
    expect(completo).toContain("- Percebes: consultar precio");
    expect(completo).toContain("## Carta de vinos");
    expect(completo).toContain("### Vinos blancos");
    expect(completo).toContain("- Albariño X (Rías Baixas): 22,00 €; copa 4,50 €");
    expect(completo).toContain("- Tinto Y (Rioja): 30,00 €. Fruta roja.");
  });

  it("las bebidas solo entran si su carta está encendida y tiene página", () => {
    expect(componerLlms(opciones()).completo).not.toContain("Agua");
    const encendida = componerLlms(
      opciones({ carta: { ...CARTA, config: { mostrarCartaBebidas: true } }, rutas: [...RUTAS, "/carta/bebidas"] }),
    );
    expect(encendida.completo).toContain("- Agua: 2,00 €");
  });

  it("escribe los dos ficheros en el build y lee título/descripción del HTML", async () => {
    const dist = mkdtempSync(path.join(tmpdir(), "llms-"));
    try {
      writeFileSync(path.join(dist, "index.html"), "<html></html>");
      writeFileSync(
        path.join(dist, "contacto.html"),
        '<html><head><title data-rh="true">Contacto &amp; horarios | Casa Tomás</title><meta data-rh="true" name="description" content="Cómo llegar"></head></html>',
      );
      const { cabeceras: _c, ...resto } = opciones();
      await generarLlms(dist, { ...resto, rutas: ["/", "/contacto"] });
      const resumen = readFileSync(path.join(dist, "llms.txt"), "utf8");
      expect(resumen).toContain(`- [Contacto & horarios](${SITIO}/contacto): Cómo llegar`);
      expect(existsSync(path.join(dist, "llms-full.txt"))).toBe(true);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });
});

describe("ayudantes", () => {
  it("slugificar es el mismo que el de las rutas de la carta", () => {
    for (const nombre of ["ENTRANTES FRÍOS", "NOVEDADES DEL DÍA", "Snack", "Arroces & más"]) {
      expect(slugificar(nombre)).toBe(slugificarRuta(nombre));
    }
  });

  it("teléfono legible y horario agrupado con el lunes cerrado", () => {
    expect(telefonoLegible("+34966107887")).toBe("+34 966 10 78 87");
    expect(horarioLegible(HORARIOS)).toBe(
      "lunes: cerrado; martes a jueves: 09:30–23:00; viernes: 09:00–23:30; sábado: 10:30–23:30; domingo: 11:00–16:00",
    );
  });
});

describe("robots.txt — asistentes de IA", () => {
  it("permite a los rastreadores de búsqueda de ChatGPT, Claude, Perplexity, Gemini y Bing y señala llms.txt", async () => {
    const raiz = mkdtempSync(path.join(tmpdir(), "robots-ia-"));
    try {
      mkdirSync(raiz, { recursive: true });
      writeFileSync(path.join(raiz, "index.html"), '<!DOCTYPE html><html lang="es"><head></head></html>');
      await generarSitemapYRobots(raiz, SITIO);
      const robots = readFileSync(path.join(raiz, "robots.txt"), "utf8");
      for (const bot of ["OAI-SearchBot", "ChatGPT-User", "GPTBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Bingbot"]) {
        expect(BOTS_IA).toContain(bot);
        expect(robots).toContain(`User-agent: ${bot}\nAllow: /\n`);
      }
      expect(robots).not.toMatch(/Disallow/);
      expect(robots).toContain(`${SITIO}/llms.txt`);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });
});

describe("IndexNow", () => {
  it("el fichero de la clave está en public/ con la clave dentro", () => {
    const fichero = path.resolve(__dirname, "../../public", `${CLAVE_INDEXNOW}.txt`);
    expect(readFileSync(fichero, "utf8").trim()).toBe(CLAVE_INDEXNOW);
  });

  it("toma las URLs de página del sitemap (no las de imagen) y descarta otros dominios", () => {
    const xml =
      `<urlset><url><loc>${SITIO}/</loc><image:image><image:loc>${SITIO}/a.jpg</image:loc></image:image></url>` +
      `<url><loc>${SITIO}/carta</loc></url><url><loc>${SITIO}/carta</loc></url><url><loc>https://otro.es/x</loc></url></urlset>`;
    const cuerpo = cuerpoIndexNow(SITIO, urlsDelSitemap(xml));
    expect(cuerpo).toEqual({
      host: "restaurantecasatomascrevillente.es",
      key: CLAVE_INDEXNOW,
      keyLocation: `${SITIO}/${CLAVE_INDEXNOW}.txt`,
      urlList: [`${SITIO}/`, `${SITIO}/carta`],
    });
  });
});

describe("JSON-LD — entidad para buscadores y asistentes", () => {
  it("el restaurante lleva descripción, año de apertura y sus perfiles oficiales", () => {
    const schema = restaurantSchema({});
    expect(schema.description).toBe(DESCRIPCION_RESTAURANTE);
    expect(schema.foundingDate).toBe("1998");
    expect(schema.sameAs).toEqual([PERFILES.instagram, PERFILES.facebook, PERFILES.tripadvisor]);
  });

  it("la portada declara el WebSite «Casa Tomás» publicado por el restaurante", () => {
    const web = websiteSchema("es");
    expect(web["@type"]).toBe("WebSite");
    expect(web.name).toBe("Casa Tomás");
    expect(web.publisher).toEqual({ "@id": `${SITE_URL}/#restaurante` });
    expect(restaurantSchema({})["@id"]).toBe(`${SITE_URL}/#restaurante`);
  });
});
