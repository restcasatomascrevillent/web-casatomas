/**
 * Clasificación en el navegador (lógica pura, probada con vitest):
 *   · qué es un clic (contacto por teléfono/WhatsApp/correo/mapa/red social,
 *     enlace interno o externo, botón) y con qué etiqueta;
 *   · de dónde viene la visita (host del referente, utm_*, ?qr=…).
 * Nunca lee valores de campos: solo el texto visible o `data-track`/`aria-label`.
 */

export interface ClicClasificado {
  tipo: "clic" | "contacto";
  accion?: "telefono" | "whatsapp" | "email" | "mapa" | "red_social";
  objetivo: string;
  props: { destino?: string; elemento?: "boton" | "enlace"; zona?: string };
}

const RE_WHATSAPP = /(^|\.)(wa\.me|whatsapp\.com)$/;
const RE_MAPAS = /(^|\.)(maps\.app\.goo\.gl|maps\.apple\.com|goo\.gl)$|^(www\.)?google\.[a-z.]+$|^maps\.google\.[a-z.]+$/;
const RE_REDES = /(^|\.)(instagram\.com|facebook\.com|fb\.com|tiktok\.com|x\.com|twitter\.com|youtube\.com|youtu\.be|tripadvisor\.[a-z.]+|thefork\.[a-z.]+|eltenedor\.es|linkedin\.com|pinterest\.[a-z.]+)$/;

const limpiarTexto = (t: string | null | undefined, max = 60): string =>
  (t ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Etiqueta de un elemento: data-track > aria-label > title > texto visible (sin cifras largas: nunca un teléfono). */
export function etiquetaDe(el: Element): string {
  const datos = el.closest("[data-track]")?.getAttribute("data-track");
  const crudo = datos || el.getAttribute("aria-label") || el.getAttribute("title") || (el as HTMLElement).innerText || el.textContent || "";
  return limpiarTexto(crudo).replace(/\+?\d[\d\s.-]{5,}\d/g, "[número]") || el.tagName.toLowerCase();
}

function zonaDe(el: Element): string | undefined {
  const marcada = el.closest("[data-zona]")?.getAttribute("data-zona");
  if (marcada) return marcada.slice(0, 30);
  if (el.closest("header")) return "cabecera";
  if (el.closest("footer")) return "pie";
  if (el.closest("nav")) return "menu";
  if (el.closest("[role=dialog]")) return "dialogo";
  return undefined;
}

/**
 * Clasifica el elemento pulsado. NULL = no es algo que interese (texto suelto,
 * campos de formulario, elementos marcados con data-track-ignorar).
 */
export function clasificarClic(objetivo: EventTarget | null, origenPagina: string): ClicClasificado | null {
  if (!(objetivo instanceof Element)) return null;
  if (objetivo.closest("[data-track-ignorar]")) return null;
  const el = objetivo.closest("a[href], button, [role=button], [data-track], summary, label[for]");
  if (!el || el.matches("input, textarea, select, option")) return null;
  const zona = zonaDe(el);
  const objetivoTexto = etiquetaDe(el);
  // Botones que son solo un número (días del calendario, paginación): no dicen nada como «botón más usado».
  if (!(el instanceof HTMLAnchorElement) && /^\d{1,3}$/.test(objetivoTexto)) return null;

  if (el instanceof HTMLAnchorElement) {
    const href = el.getAttribute("href") ?? "";
    if (/^tel:/i.test(href)) return { tipo: "contacto", accion: "telefono", objetivo: objetivoTexto, props: { destino: "tel", zona } };
    if (/^mailto:/i.test(href)) return { tipo: "contacto", accion: "email", objetivo: objetivoTexto, props: { destino: "email", zona } };
    if (/^whatsapp:/i.test(href)) return { tipo: "contacto", accion: "whatsapp", objetivo: objetivoTexto, props: { destino: "whatsapp", zona } };
    let url: URL | null = null;
    try {
      url = new URL(href, origenPagina);
    } catch {
      url = null;
    }
    if (url && /^https?:$/.test(url.protocol)) {
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      const propio = url.origin === new URL(origenPagina).origin;
      if (!propio) {
        if (RE_WHATSAPP.test(host)) return { tipo: "contacto", accion: "whatsapp", objetivo: objetivoTexto, props: { destino: host, zona } };
        if (RE_MAPAS.test(host) && (/maps/.test(url.pathname) || /maps|goo\.gl/.test(host))) {
          return { tipo: "contacto", accion: "mapa", objetivo: objetivoTexto, props: { destino: host, zona } };
        }
        if (RE_REDES.test(host)) return { tipo: "contacto", accion: "red_social", objetivo: host, props: { destino: host, zona } };
        return { tipo: "clic", objetivo: objetivoTexto, props: { destino: host, elemento: "enlace", zona } };
      }
      return { tipo: "clic", objetivo: objetivoTexto, props: { destino: url.pathname.slice(0, 120), elemento: "enlace", zona } };
    }
  }
  return { tipo: "clic", objetivo: objetivoTexto, props: { elemento: "boton", zona } };
}

export interface Procedencia {
  referente?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  qr?: string;
}

/** Host del referente (nunca la ruta: puede llevar datos) y los parámetros de campaña/QR de la URL. */
export function procedenciaDe(referrer: string, url: string): Procedencia {
  const p: Procedencia = {};
  try {
    if (referrer) p.referente = new URL(referrer).hostname.toLowerCase();
  } catch {
    // referente ilegible: sin él
  }
  try {
    const q = new URL(url).searchParams;
    for (const clave of ["utm_source", "utm_medium", "utm_campaign", "qr"] as const) {
      const v = q.get(clave);
      if (v) p[clave] = v.slice(0, 80);
    }
  } catch {
    // URL ilegible
  }
  return p;
}

/** Idioma por el prefijo de la ruta (/en, /fr; el resto, español). */
export const idiomaDeRuta = (ruta: string): "es" | "en" | "fr" => (/^\/en(\/|$)/.test(ruta) ? "en" : /^\/fr(\/|$)/.test(ruta) ? "fr" : "es");

/** Endpoint de una URL de Supabase: «reservas-web/crear» o «rest:configuracion_tienda». NULL si no es de Supabase. */
export function endpointDe(url: string, baseFunciones: string): string | null {
  if (!url) return null;
  const sinConsulta = url.split(/[?#]/)[0];
  if (baseFunciones && sinConsulta.startsWith(baseFunciones)) {
    const m = /^\/?([a-z0-9-]+(?:\/[a-z0-9-]+)?)/i.exec(sinConsulta.slice(baseFunciones.length).replace(/^\//, ""));
    return m ? m[1].toLowerCase() : null;
  }
  const rest = /\.supabase\.co\/rest\/v1\/(?:rpc\/)?([a-z0-9_]+)/i.exec(sinConsulta);
  return rest ? `rest:${rest[1].toLowerCase()}` : null;
}
