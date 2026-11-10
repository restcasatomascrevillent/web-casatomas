/**
 * Reglas de la web para el menú del día y para las reservas del mismo día.
 * La decisión final la toma `reservas-web`; esto solo evita ofrecer lo que la
 * función va a rechazar.
 */

/** Días de la semana (0 = domingo … 6 = sábado) con menú del día: martes, miércoles y jueves. */
export const DIAS_MENU_DEL_DIA: readonly number[] = [2, 3, 4];
/** El menú del día es solo de comida: horas anteriores a esta (minutos desde las 00:00 → 17:00). */
export const MENU_DIA_HORA_LIMITE_MIN = 17 * 60;
/** Mismo día: de 12:30 a 16:00 (ambas incluidas) solo se reserva por teléfono. */
export const MISMO_DIA_TELEFONO_DESDE_MIN = 12 * 60 + 30;
export const MISMO_DIA_TELEFONO_HASTA_MIN = 16 * 60;
export const ZONA_RESTAURANTE = "Europe/Madrid";

/** "HH:MM" o "HH:MM:SS" a minutos desde medianoche; NaN si no es una hora. */
export function minutosDeHora(hora: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(hora);
  return m ? Number(m[1]) * 60 + Number(m[2]) : Number.NaN;
}

/** Fecha de hoy en Madrid como YYYY-MM-DD. */
export function hoyMadridIso(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_RESTAURANTE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

/** ¿Esa fecha (YYYY-MM-DD) es hoy en Madrid? */
export const esHoyMadrid = (fechaIso: string, ahora: Date = new Date()) => fechaIso === hoyMadridIso(ahora);

/** Hora de comida con menú del día posible: día martes–jueves y hora < 17:00. */
export function admiteMenuDelDia(fecha: Date | undefined | null, hora: string | null | undefined): boolean {
  if (!fecha || !hora) return false;
  const min = minutosDeHora(hora);
  return DIAS_MENU_DEL_DIA.includes(fecha.getDay()) && min < MENU_DIA_HORA_LIMITE_MIN;
}

/** Hora bloqueada para reservar online si la fecha es hoy: 12:30–16:00 incluidas. */
export function horaSoloTelefonoHoy(hora: string, fechaIso: string, ahora: Date = new Date()): boolean {
  if (!esHoyMadrid(fechaIso, ahora)) return false;
  const min = minutosDeHora(hora);
  return min >= MISMO_DIA_TELEFONO_DESDE_MIN && min <= MISMO_DIA_TELEFONO_HASTA_MIN;
}
