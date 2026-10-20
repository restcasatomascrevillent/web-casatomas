/**
 * Página de baja del newsletter (/newsletter/baja?sid&via&sig): contrato con la
 * Edge Function `newsletter-baja` en modo JSON (`formato=json`).
 *
 * Por qué vive en la web: Supabase fuerza `Content-Type: text/plain` en las
 * respuestas de `*.supabase.co/functions/v1/...`; la página HTML de la función
 * se veía como código fuente. Contrato en
 * adminpanelct/supabase/functions/newsletter-baja/enlace-web.ts.
 *   GET  ...&formato=json -> estado (no muta)
 *   POST ...&formato=json -> baja real (solo tras el clic)
 *
 * Gotcha SSG: nada de `window` a nivel de módulo.
 */
import { FUNCTIONS_BASE_URL, leerCuerpo } from "@/lib/supabase-functions";

export const NEWSLETTER_BAJA_URL = `${FUNCTIONS_BASE_URL}/newsletter-baja`;

export type EstadoBaja = "confirmar" | "baja_hecha" | "ya_estaba" | "invalido" | "error";

export interface RespuestaBaja {
  estado: EstadoBaja;
  email: string | null;
  fechaBaja: string | null;
}

export interface ParametrosBaja {
  sid: string;
  via: "body" | "header";
  sig: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ESTADOS: readonly EstadoBaja[] = ["confirmar", "baja_hecha", "ya_estaba", "invalido", "error"];

/** Parámetros firmados de la URL (o null si faltan o no tienen forma válida). */
export function leerParametrosBaja(search: string): ParametrosBaja | null {
  const q = new URLSearchParams(search);
  const sid = q.get("sid") ?? "";
  const sig = q.get("sig") ?? "";
  if (!UUID.test(sid) || !sig || sig.length > 256) return null;
  return { sid, sig, via: q.get("via") === "header" ? "header" : "body" };
}

export function urlFuncionBaja(p: ParametrosBaja): string {
  const qs = new URLSearchParams({ sid: p.sid, via: p.via, sig: p.sig, formato: "json" });
  return `${NEWSLETTER_BAJA_URL}?${qs.toString()}`;
}

export function normalizarRespuestaBaja(x: unknown): RespuestaBaja | null {
  if (typeof x !== "object" || x === null) return null;
  const o = x as Record<string, unknown>;
  if (!ESTADOS.includes(o.estado as EstadoBaja)) return null;
  return {
    estado: o.estado as EstadoBaja,
    email: typeof o.email === "string" ? o.email : null,
    fechaBaja: typeof o.fecha_baja === "string" ? o.fecha_baja : null,
  };
}

export class ErrorConexionBaja extends Error {}

export async function llamarBaja(
  modo: "consultar" | "confirmar",
  p: ParametrosBaja,
  fetchImpl: typeof fetch = fetch,
): Promise<RespuestaBaja> {
  let response: Response;
  try {
    response = await fetchImpl(urlFuncionBaja(p), {
      method: modo === "consultar" ? "GET" : "POST",
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
  } catch {
    throw new ErrorConexionBaja("sin_conexion");
  }
  const r = normalizarRespuestaBaja(await leerCuerpo(response));
  if (!r) throw new ErrorConexionBaja(`respuesta_invalida_${response.status}`);
  return r;
}

/** "2026-09-24T10:00:00Z" -> "24 de septiembre de 2026" (hora de Madrid). */
export function formatearFechaBaja(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });
}
