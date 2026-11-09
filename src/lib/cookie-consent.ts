import { useSyncExternalStore } from "react";

/**
 * Rastreadores opcionales reales del sitio, cada uno con su interruptor:
 *  · el mapa de vinos (Mapbox), que pide tiles a `api.mapbox.com` y manda
 *    telemetría anónima a `events.mapbox.com`;
 *  · las estadísticas de uso propias (Super Admin › Logs, `src/lib/actividad`):
 *    un identificador aleatorio del navegador y de la visita para unir las
 *    páginas y acciones de una misma visita. Sin consentimiento no se crea ni
 *    se manda nada de actividad (solo errores técnicos, sin identificadores).
 * Todo lo demás con lo que se habla desde el navegador es Supabase (datos
 * del propio restaurante) o Vercel Analytics, que no usa cookies.
 *
 * Las elecciones guardadas ANTES de existir «Estadísticas» no traen ese campo:
 * cuentan como «no» (nada se activa sin que el visitante lo elija) y el aviso
 * no se vuelve a enseñar; se puede activar desde «Configurar cookies».
 */
export type CookiePreferences = {
  /** Idioma, "Mi mesa", confirmación de edad para vinos... siempre activas. */
  necessary: true;
  maps: boolean;
  estadisticas: boolean;
};

type StoredConsent = { maps: boolean; estadisticas?: boolean; ts: string };

const STORAGE_KEY = "cookieConsent";
const COOKIE_NAME = "cookie_consent";
const COOKIE_MAX_AGE_DAYS = 365;

export const CONSENT_CHANGED_EVENT = "cookie-consent:changed";
export const OPEN_PREFERENCES_EVENT = "cookie-consent:open-preferences";

const leerCookie = (nombre: string): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${nombre}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const escribirCookie = (nombre: string, valor: string) => {
  if (typeof document === "undefined") return;
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  const segura = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${nombre}=${encodeURIComponent(valor)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${segura}`;
};

/**
 * Antes de este cambio el valor guardado era el string suelto "accepted" /
 * "rejected" (aceptar/rechazar TODO, sin categorías). Un visitante que ya
 * había elegido no debería volver a ver el aviso solo porque el formato
 * cambió — se migra su elección ("accepted" implicaba también el mapa).
 */
const parsearConsentimiento = (raw: string | null): StoredConsent | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.maps === "boolean") return parsed as StoredConsent;
  } catch {
    if (raw === "accepted") return { maps: true, ts: new Date(0).toISOString() };
    if (raw === "rejected") return { maps: false, ts: new Date(0).toISOString() };
  }
  return null;
};

/**
 * localStorage primero (más barato de leer) y la cookie real como respaldo:
 * si el navegador borra uno de los dos (modo privado, "borrar solo
 * cookies"...) el otro mantiene la elección y no hay que volver a preguntar.
 */
export const getStoredConsent = (): StoredConsent | null => {
  try {
    const desdeLocal = parsearConsentimiento(localStorage.getItem(STORAGE_KEY));
    if (desdeLocal) return desdeLocal;
  } catch {
    // localStorage puede lanzar en modo privado estricto o con el origen bloqueado.
  }
  return parsearConsentimiento(leerCookie(COOKIE_NAME));
};

/**
 * Elección que no se pudo guardar en ningún sitio: con `localStorage` y cookies
 * bloqueados, el visitante que pulsa «Aceptar» tiene que ver el mapa igualmente
 * mientras no recargue (`useMapsConsent`). Es `null` si algo la guardó.
 */
let eleccionSinGuardar: StoredConsent | null = null;

/** `estadisticas` por defecto igual que `maps`: «Aceptar todas» / «Rechazar» deciden las dos. */
export const saveConsent = (maps: boolean, estadisticas: boolean = maps): void => {
  const value: StoredConsent = { maps, estadisticas, ts: new Date().toISOString() };
  const serialized = JSON.stringify(value);
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Sigue adelante: la cookie de abajo puede bastar igualmente.
  }
  escribirCookie(COOKIE_NAME, serialized);
  eleccionSinGuardar = getStoredConsent() === null ? value : null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: value }));
  }
};

/** Pide que se abra (o reabra) el diálogo de preferencias — lo usa el enlace del footer. */
export const openCookiePreferences = (): void => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
};

const suscribirseAlConsentimiento = (avisar: () => void) => {
  window.addEventListener(CONSENT_CHANGED_EVENT, avisar);
  return () => window.removeEventListener(CONSENT_CHANGED_EVENT, avisar);
};
const mapaAceptado = (): boolean => (getStoredConsent() ?? eleccionSinGuardar)?.maps === true;
/** Lo que ve el prerender (Node) y el primer render al hidratar: sin consentimiento, sin mapa. */
const mapaAceptadoEnElServidor = (): boolean => false;

/**
 * Lee la preferencia del mapa y se mantiene al día si cambia en esta misma
 * pestaña (p. ej. el visitante la cambia desde "Configurar cookies" en el
 * footer mientras está viendo la carta de vinos).
 *
 * `useSyncExternalStore` con `getServerSnapshot`: el HTML del SSG se pinta sin
 * `localStorage` (aviso «Activar mapa») y el primer render del navegador tiene
 * que coincidir con él aunque el visitante ya hubiera aceptado — si leyera el
 * almacén ya en el primer render, React descartaría el HTML (errores #418 y
 * #422). Nada más hidratar, React vuelve a leer `mapaAceptado` y, si hay
 * consentimiento, monta el mapa en ese mismo momento, sin esperar a ningún
 * efecto propio.
 */
export const useMapsConsent = (): boolean =>
  useSyncExternalStore(suscribirseAlConsentimiento, mapaAceptado, mapaAceptadoEnElServidor);

/**
 * ¿Ha aceptado las estadísticas de uso propias? Global Privacy Control (señal
 * del navegador de «no vender ni compartir») cuenta como «no».
 */
export const estadisticasAceptadas = (): boolean => {
  if (typeof navigator !== "undefined" && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) {
    return false;
  }
  return (getStoredConsent() ?? eleccionSinGuardar)?.estadisticas === true;
};

/** Se llama cada vez que cambia la elección en esta pestaña; devuelve la función para dejar de escuchar. */
export const alCambiarConsentimiento = (avisar: () => void): (() => void) => {
  if (typeof window === "undefined") return () => {};
  return suscribirseAlConsentimiento(avisar);
};
