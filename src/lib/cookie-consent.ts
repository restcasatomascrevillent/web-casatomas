import { useEffect, useState } from "react";

/**
 * Único rastreador opcional real del sitio: el mapa de vinos (Mapbox),
 * que pide tiles a `api.mapbox.com` y manda telemetría anónima a
 * `events.mapbox.com` (ambos ya en el `connect-src` de `vercel.json`).
 * Todo lo demás con lo que se habla desde el navegador es Supabase (datos
 * del propio restaurante) o Vercel Analytics, que no usa cookies — no hay
 * nada más que clasificar, así que no se inventan categorías que no
 * controlen nada real.
 */
export type CookiePreferences = {
  /** Idioma, "Mi mesa", confirmación de edad para vinos... siempre activas. */
  necessary: true;
  maps: boolean;
};

type StoredConsent = { maps: boolean; ts: string };

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

export const saveConsent = (maps: boolean): void => {
  const value: StoredConsent = { maps, ts: new Date().toISOString() };
  const serialized = JSON.stringify(value);
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Sigue adelante: la cookie de abajo puede bastar igualmente.
  }
  escribirCookie(COOKIE_NAME, serialized);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: value }));
  }
};

/** Pide que se abra (o reabra) el diálogo de preferencias — lo usa el enlace del footer. */
export const openCookiePreferences = (): void => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
};

/**
 * Lee la preferencia del mapa y se mantiene al día si cambia en esta misma
 * pestaña (p. ej. el visitante la cambia desde "Configurar cookies" en el
 * footer mientras está viendo la carta de vinos).
 */
export const useMapsConsent = (): boolean => {
  const [maps, setMaps] = useState(() => getStoredConsent()?.maps === true);
  useEffect(() => {
    const onChange = (e: Event) => setMaps((e as CustomEvent<StoredConsent>).detail.maps === true);
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
  }, []);
  return maps;
};
