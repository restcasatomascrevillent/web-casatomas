import { useEffect, useState } from "react";

/**
 * Estado de la votación «Vota tu vino favorito» (04/11/2026). La abre y la
 * cierra el panel (Gestor Web › Carta › Vinos) en configuracion_web, de lectura
 * pública: `encuesta_vinos_activa`, y desde el 09/11/2026 el premio
 * (`encuesta_vinos_premio`) y el último día para votar (`encuesta_vinos_fin`),
 * que enseñan la votación y las bases del sorteo (`/condiciones#sorteo`).
 *
 * Se consulta en el navegador (no va en el HTML del build: así abrirla o
 * cerrarla no necesita republicar la web). Solo cuenta como abierta si además
 * tiene premio y último día, y ese día no ha pasado (hora de España): sin bases
 * completas no se ofrece votar. Ante cualquier fallo, cerrada.
 */
export interface EstadoEncuestaVinos {
  activa: boolean;
  premio: string | null;
  /** Último día para votar, incluido, `AAAA-MM-DD` (hora de España). */
  fin: string | null;
}

export const ENCUESTA_CERRADA: EstadoEncuestaVinos = { activa: false, premio: null, fin: null };

/** Hoy en España, `AAAA-MM-DD`. */
export function hoyEnEspana(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

/** Interpreta la fila de configuracion_web (puede no tener aún las columnas nuevas). */
export function estadoEncuestaDesdeFila(fila: Record<string, unknown> | null | undefined, ahora: Date = new Date()): EstadoEncuestaVinos {
  const premio = typeof fila?.encuesta_vinos_premio === "string" && fila.encuesta_vinos_premio.trim() ? fila.encuesta_vinos_premio.trim() : null;
  const fin = typeof fila?.encuesta_vinos_fin === "string" && /^\d{4}-\d{2}-\d{2}/.test(fila.encuesta_vinos_fin) ? fila.encuesta_vinos_fin.slice(0, 10) : null;
  const activa = fila?.encuesta_vinos_activa === true && premio !== null && fin !== null && fin >= hoyEnEspana(ahora);
  return { activa, premio, fin };
}

export async function consultarEncuestaVinos(): Promise<EstadoEncuestaVinos> {
  const url = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "").replace(/\/+$/, "");
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return ENCUESTA_CERRADA;
  // select=* para no romper si las columnas aún no existen en esa base de datos.
  const respuesta = await fetch(`${url}/rest/v1/configuracion_web?select=*&id=eq.true&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!respuesta.ok) return ENCUESTA_CERRADA;
  const filas = await respuesta.json();
  return estadoEncuestaDesdeFila(Array.isArray(filas) ? filas[0] : null);
}

/** ¿Está abierta la votación (con premio y último día vigentes)? */
export async function consultarEncuestaVinosActiva(): Promise<boolean> {
  return (await consultarEncuestaVinos()).activa;
}

/**
 * Una consulta al montar (la carta de vinos, las bases del sorteo). Sin React
 * Query a propósito: la carta también se pinta fuera de su proveedor (tests,
 * portada) y esto no necesita caché ni reintentos; cerrada hasta que llega la
 * respuesta.
 */
export function useEncuestaVinos(): EstadoEncuestaVinos {
  const [estado, setEstado] = useState<EstadoEncuestaVinos>(ENCUESTA_CERRADA);
  useEffect(() => {
    let vigente = true;
    consultarEncuestaVinos()
      .then((valor) => { if (vigente) setEstado(valor); })
      .catch(() => { if (vigente) setEstado(ENCUESTA_CERRADA); });
    return () => { vigente = false; };
  }, []);
  return estado;
}

export function useEncuestaVinosActiva(): boolean {
  return useEncuestaVinos().activa;
}

/** «15/12/2026» en los tres idiomas: el día tal cual, sin pasar por la zona horaria del navegador. */
export function formatearDiaEncuesta(fin: string, language: string): string {
  const [a, m, d] = fin.split("-").map(Number);
  const locale = language === "en" ? "en-GB" : language === "fr" ? "fr-FR" : "es-ES";
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(Date.UTC(a, m - 1, d)));
}

const CLAVE_VOTADO = "ct_voto_vino_favorito";

/** Recuerda en este navegador que ya votó (para no volver a pedírselo). */
export function yaVotoEnEsteNavegador(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(CLAVE_VOTADO) === "1";
  } catch {
    return false;
  }
}

export function marcarVotoEnEsteNavegador(): void {
  try {
    window.localStorage.setItem(CLAVE_VOTADO, "1");
  } catch {
    // Navegación privada o almacenamiento bloqueado: solo se volverá a ofrecer.
  }
}
