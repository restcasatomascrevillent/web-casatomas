import { precioConocido } from "@/lib/precios";
/**
 * Datos del negocio y constructores de datos estructurados (schema.org).
 *
 * Todo lo que hay aquí está verificado. Lo que no se ha podido verificar
 * (coordenadas exactas) se omite: un dato inventado en el
 * JSON-LD es motivo de acción manual de Google, no un detalle menor.
 */
import type { ItemTraducido } from "./carta-i18n";
import type { PlatoSSG } from "./carta-ssg-types";
import { resolverImagen, type SeccionCarta } from "./carta-ssg";
import { etiquetaAlergeno } from "./alergenos";
import { construirRutaIdioma } from "@/i18n/routing";
import {
  NEGOCIO,
  HORARIOS,
  PERFILES,
  ANO_FUNDACION,
  OFERTA,
  GOOGLE_PLACE_ID_POR_DEFECTO,
  TOUZA_URL_POR_DEFECTO,
  TOUZA_CALLE,
  DESCRIPCION_RESTAURANTE,
} from "./datos-negocio";
import type { Language } from "@/i18n/types";

export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined) ?? "https://restaurantecasatomascrevillente.es"
).replace(/\/+$/, "");

/**
 * Place ID de la ficha de Google del restaurante.
 *
 * Verificado contra Google Maps: corresponde a *Casa Tomás Restaurante
 * Crevillente*, Carrer Santa Maria de la Cabeza 2.
 *
 * Va como constante y no leído de `config_google_places` a propósito: esa tabla
 * existe, pero con la clave anon devuelve 0 filas (su RLS no permite lectura
 * anónima), así que ni el navegador ni el build pueden consultarla. Si algún día
 * se abre esa política, este valor puede pasar a salir de ahí. Mientras tanto se
 * puede sobreescribir por entorno sin tocar código.
 */
export const GOOGLE_PLACE_ID =
  (import.meta.env.VITE_GOOGLE_PLACE_ID as string | undefined) || GOOGLE_PLACE_ID_POR_DEFECTO;

/**
 * Forma canónica que documenta Google para enlazar a un sitio por Place ID.
 * Sustituye al CID inventado (`0x…:0x1234567890abcdef`) que llevaba a un mapa roto.
 */
export const GOOGLE_MAPS_URL = `https://www.google.com/maps/place/?q=place_id:${GOOGLE_PLACE_ID}`;

/** URL oficial para que un cliente deje reseña en la ficha real. */
/**
 * Web de Touza Cocktail Bar (el otro negocio del dueño). Es el proyecto
 * `touza-casatomas` del equipo de Vercel del restaurante, con dominio propio
 * desde el 10/11/2026 (`touza-casatomas.vercel.app` redirige ahí con 308).
 * `VITE_TOUZA_URL` puede sobrescribirlo. La antigua
 * `touza-restaurant-website.vercel.app` es de la cuenta vieja de
 * `oficiososia` y no se enlaza.
 */
export const TOUZA_URL = (
  (import.meta.env.VITE_TOUZA_URL as string | undefined) || TOUZA_URL_POR_DEFECTO
).replace(/\/+$/, "");

/** Página de Touza «Copas después de cenar» (la crea el PR de Touza; /despues-de-cenar). */
export const TOUZA_DESPUES_DE_CENAR_URL = `${TOUZA_URL}/despues-de-cenar`;

export const GOOGLE_REVIEW_URL = `https://search.google.com/local/writereview?placeid=${GOOGLE_PLACE_ID}`;

export { NEGOCIO, HORARIOS, PERFILES, ANO_FUNDACION, DESCRIPCION_RESTAURANTE } from "./datos-negocio";

/** Titular de la web (aviso legal, política de privacidad): vive en `titular.ts`, sin dependencias. */
export { TITULAR } from "./titular";

/**
 * Describe lo que de verdad muestra `og-image.jpg` (carne a la brasa con
 * patatas asadas) — fuente única para el `alt`/`caption` de esa foto en
 * `Seo.tsx` y en el JSON-LD del restaurante, para no repetir el texto ni
 * dejar que diverja.
 */
export const OG_IMAGE_CAPTION = `Carne a la brasa servida con patatas asadas — ${NEGOCIO.nombre}, ${NEGOCIO.localidad}`;

const ID_RESTAURANTE = `${SITE_URL}/#restaurante`;

const ALERGENOS_PREFIJO: Record<Language, string> = {
  es: "Alérgenos",
  en: "Allergens",
  fr: "Allergènes",
};

/**
 * `MenuItem` de un plato, vino o bebida. Solo campos que existen en la BD.
 *
 * `item` ya viene resuelto por `resolveTranslatedItem` (vía `agruparPorCategoria`),
 * así que `displayAlergenosOficiales` está en el idioma de `lang` — antes se leía
 * `item.alergenos_oficiales` (la columna cruda, siempre en castellano) y el
 * JSON-LD de una página en inglés/francés listaba los alérgenos en español.
 */
function menuItem(item: ItemTraducido<Partial<PlatoSSG>>, lang: Language, categoria: string, supabaseUrl?: string) {
  const imagen = resolverImagen(item.imagen_url, supabaseUrl);
  // Por el vocabulario común: el panel guarda `frutos_cascara` y en el JSON-LD
  // tiene que leerse "Frutos de cáscara", igual que en la tarjeta. El `Set`
  // hace falta porque varias formas de la BD ("lacteos", "leche", "lactosa")
  // son el mismo alérgeno y se repetían en la descripción.
  const alergenos = [
    ...new Set((item.displayAlergenosOficiales ?? []).map((a) => etiquetaAlergeno(a, lang))),
  ];

  return {
    "@type": "MenuItem",
    name: item.displayNombre,
    // Las descripciones están vacías en los tres idiomas (0 de 128): no se inventa ninguna.
    ...(item.displayDescripcion ? { description: item.displayDescripcion } : {}),
    ...(imagen
      ? {
          image: {
            "@type": "ImageObject",
            url: imagen,
            caption: `${item.displayNombre} — ${categoria}, ${NEGOCIO.nombre}`,
          },
        }
      : {}),
    ...(precioConocido(item.precio_eur)
      ? {
          offers: {
            "@type": "Offer",
            price: item.precio_eur.toFixed(2),
            priceCurrency: "EUR",
            ...(item.unidad ? { unitText: item.unidad } : {}),
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
    // Los alérgenos van como texto en `nutrition`. NO se deriva `suitableForDiet`:
    // la BD lista alérgenos PRESENTES, y marcar "sin gluten" por omisión sería un
    // problema de seguridad alimentaria, no de SEO.
    ...(alergenos.length
      ? {
          nutrition: {
            "@type": "NutritionInformation",
            description: `${ALERGENOS_PREFIJO[lang] ?? ALERGENOS_PREFIJO.es}: ${alergenos.join(", ")}`,
          },
        }
      : {}),
  };
}

/**
 * `Menu` con sus productos dentro.
 *
 * `opts` existe porque ahora hay varios `Menu` en el sitio (la portada, cada
 * `/carta/<categoria>`, `/carta/vinos`…) y dos entidades distintas no pueden
 * compartir `@id`: Google las fusionaría en una sola.
 */
export function menuSchema(
  secciones: SeccionCarta<Partial<PlatoSSG>>[],
  lang: Language,
  supabaseUrl?: string,
  opts: { id?: string; nombre?: string; url?: string } = {},
) {
  return {
    "@type": "Menu",
    "@id": opts.id ?? `${SITE_URL}/#carta`,
    name: opts.nombre ?? "Carta Casa Tomás",
    ...(opts.url ? { url: opts.url } : {}),
    inLanguage: lang,
    hasMenuSection: secciones.map((seccion) => ({
      "@type": "MenuSection",
      name: seccion.nombre,
      numberOfItems: seccion.items.length,
      hasMenuItem: seccion.items.map((item) => menuItem(item, lang, seccion.nombre, supabaseUrl)),
    })),
  };
}

/**
 * `Menu` de índice: secciones con su recuento y su URL, SIN los productos.
 *
 * Es lo que publica `/carta`. Repetir ahí los 388 productos que ya describen
 * las páginas de categoría duplicaría la entidad y engordaría el HTML de la
 * página que solo sirve para repartir enlaces.
 */
export function menuIndiceSchema(
  secciones: { nombre: string; total: number; url: string }[],
  lang: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${SITE_URL}/carta#menu`,
    name: "Carta Casa Tomás",
    url: `${SITE_URL}/carta`,
    inLanguage: lang,
    hasMenuSection: secciones.map((seccion) => ({
      "@type": "MenuSection",
      name: seccion.nombre,
      numberOfItems: seccion.total,
      url: seccion.url,
    })),
  };
}

/** Envuelve un `Menu` para que pueda publicarse como entidad de nivel superior. */
export const menuPagina = (menu: ReturnType<typeof menuSchema>) => ({
  "@context": "https://schema.org",
  ...menu,
  // Ancla el menú a la ficha del restaurante en vez de dejarlo suelto.
  isPartOf: { "@type": "Restaurant", "@id": `${SITE_URL}/#restaurante`, name: NEGOCIO.nombre },
});

export function restaurantSchema(opts: {
  menu?: ReturnType<typeof menuSchema>;
  lang?: string;
}) {
  const { menu, lang = "es" } = opts;

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": ID_RESTAURANTE,
    name: NEGOCIO.nombre,
    alternateName: NEGOCIO.nombreAlternativo,
    description: DESCRIPCION_RESTAURANTE,
    foundingDate: ANO_FUNDACION,
    image: {
      "@type": "ImageObject",
      url: `${SITE_URL}/og-image.jpg`,
      caption: OG_IMAGE_CAPTION,
    },
    // Copia estable (public/) de src/assets/logo/logo-casa-tomas-512.png: los
    // assets de Vite llevan hash en el nombre y no sirven como URL fija.
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo-casa-tomas.png`,
      width: 512,
      height: 352,
    },
    telephone: NEGOCIO.telefono,
    email: NEGOCIO.email,
    url: `${SITE_URL}/`,
    inLanguage: lang,
    address: {
      "@type": "PostalAddress",
      streetAddress: NEGOCIO.calle,
      addressLocality: NEGOCIO.localidad,
      addressRegion: NEGOCIO.region,
      postalCode: NEGOCIO.cp,
      addressCountry: NEGOCIO.pais,
    },
    // `geo` se omite a propósito: las tres fuentes del repo daban tres longitudes
    // distintas y ninguna es verificable. `hasMap` con el Place ID real es
    // suficiente para que Google ubique el local.
    hasMap: GOOGLE_MAPS_URL,
    openingHoursSpecification: HORARIOS.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [...h.dias],
      opens: h.abre,
      closes: h.cierra,
    })),
    // Touza Cocktail Bar, la coctelería de al lado (n.º 4). Mismo `@id` que usa
    // su propia web, para que Google y los asistentes de IA unan las dos fichas.
    subOrganization: {
      "@type": "BarOrPub",
      "@id": `${TOUZA_URL}/#bar`,
      name: "Touza Cocktail Bar",
      url: `${TOUZA_URL}/`,
      address: {
        "@type": "PostalAddress",
        streetAddress: TOUZA_CALLE,
        addressLocality: NEGOCIO.localidad,
        addressRegion: NEGOCIO.region,
        postalCode: NEGOCIO.cp,
        addressCountry: NEGOCIO.pais,
      },
    },
    sameAs: [PERFILES.instagram, PERFILES.facebook, PERFILES.tripadvisor],
    servesCuisine: [...OFERTA.cocina],
    priceRange: OFERTA.rangoPrecio,
    currenciesAccepted: "EUR",
    paymentAccepted: OFERTA.pago,
    acceptsReservations: `${SITE_URL}/reservas`,
    petsAllowed: OFERTA.mascotas,
    ...(menu ? { hasMenu: menu } : {}),
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/reservas`,
        inLanguage: "es-ES",
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
          "http://schema.org/IOSPlatform",
          "http://schema.org/AndroidPlatform",
        ],
      },
      result: { "@type": "FoodEstablishmentReservation", name: "Reservar mesa" },
    },
    // Sin `aggregateRating`: el restaurante tiene 4,5★ con 1.657 opiniones en
    // Google, pero marcar en tu propio sitio valoraciones de otra plataforma
    // incumple las directrices de Google y puede acarrear penalización.
  };
}

/**
 * `WebSite` de la portada: es lo que Google lee para el nombre del sitio en los
 * resultados («Casa Tomás» en vez del dominio) y une la web con la ficha del
 * restaurante (`publisher` → mismo `@id` que `restaurantSchema`).
 */
export function websiteSchema(lang: Language = "es") {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#web`,
    name: "Casa Tomás",
    alternateName: [NEGOCIO.nombre, NEGOCIO.nombreAlternativo],
    url: `${SITE_URL}/`,
    inLanguage: lang,
    publisher: { "@id": ID_RESTAURANTE },
  };
}

const INICIO_POR_IDIOMA: Record<Language, string> = {
  es: "Inicio",
  en: "Home",
  fr: "Accueil",
};

/**
 * `trail` va en rutas "en español" (p. ej. `/carta/vinos`, sin prefijo) y con
 * el `nombre` ya en el idioma de la página — igual que hace el resto de la
 * página que llama a esta función. Aquí solo se añade el primer escalón
 * ("Inicio"/"Home"/"Accueil") y se prefija cada URL con `lang`.
 */
export const breadcrumbSchema = (trail: { nombre: string; path: string }[], lang: Language = "es") => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [{ nombre: INICIO_POR_IDIOMA[lang], path: "/" }, ...trail].map((x, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: x.nombre,
    item: `${SITE_URL}${construirRutaIdioma(x.path, lang)}`,
  })),
});
