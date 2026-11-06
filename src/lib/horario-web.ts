/**
 * Días y horas en que la web enseña los botones «Menú del día» y «Tapas»
 * (04/11/2026, petición del dueño). Se configuran en el Gestor Web del panel y
 * se guardan en configuracion_web.horario_menu_dia_casa_tomas /
 * horario_tapas_casa_tomas (migración 20261104142000 de admin-casatomas, que
 * tiene la misma lógica en su src/lib/horario-web.ts):
 *
 *   {"dias": [1..7], "desde": "HH:MM" | null, "hasta": "HH:MM" | null}
 *
 * Días ISO (1 = lunes … 7 = domingo), horas de Madrid. Sin horas = todo el día.
 * Si «hasta» es menor que «desde» el horario cruza la medianoche: 20:00–01:00
 * del jueves sigue visible el viernes hasta la 01:00. NULL (o un valor raro) =
 * lo de siempre: menú de martes a jueves y tapas los jueves, todo el día.
 */
export interface HorarioWeb {
  dias: number[];
  desde: string | null;
  hasta: string | null;
}

export type BotonHorario = "menu" | "tapas";

export const HORARIO_POR_DEFECTO: Record<BotonHorario, HorarioWeb> = {
  menu: { dias: [2, 3, 4], desde: null, hasta: null },
  tapas: { dias: [4], desde: null, hasta: null },
};

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export function leerHorario(valor: unknown, boton: BotonHorario): HorarioWeb {
  const defecto = HORARIO_POR_DEFECTO[boton];
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return defecto;
  const v = valor as Record<string, unknown>;
  const dias = Array.isArray(v.dias) ? v.dias.filter((d): d is number => Number.isInteger(d) && d >= 1 && d <= 7) : [];
  if (dias.length === 0) return defecto;
  const desde = typeof v.desde === "string" && HORA.test(v.desde) ? v.desde : null;
  const hasta = typeof v.hasta === "string" && HORA.test(v.hasta) ? v.hasta : null;
  const conHoras = desde !== null && hasta !== null && desde !== hasta;
  return { dias: [...new Set(dias)].sort((a, b) => a - b), desde: conHoras ? desde : null, hasta: conHoras ? hasta : null };
}

/** Día ISO y minuto del día en Madrid para un instante. */
export interface MomentoMadrid {
  dia: number;
  minuto: number;
}

const FORMATO_MADRID = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Madrid",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const DIA_ISO: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

export function momentoMadrid(fecha: Date): MomentoMadrid {
  const partes = Object.fromEntries(FORMATO_MADRID.formatToParts(fecha).map((p) => [p.type, p.value]));
  return { dia: DIA_ISO[partes.weekday] ?? 1, minuto: Number(partes.hour) * 60 + Number(partes.minute) };
}

const minutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** ¿Se enseña el botón en ese momento? `desde` incluido, `hasta` excluido. */
export function dentroDeHorario(h: HorarioWeb, ahora: MomentoMadrid): boolean {
  if (h.desde === null || h.hasta === null) return h.dias.includes(ahora.dia);
  const desde = minutos(h.desde);
  const hasta = minutos(h.hasta);
  if (desde < hasta) return h.dias.includes(ahora.dia) && ahora.minuto >= desde && ahora.minuto < hasta;
  // Cruza la medianoche: la parte de la noche es del día que empieza; la de la
  // madrugada, del día anterior.
  const diaAnterior = ahora.dia === 1 ? 7 : ahora.dia - 1;
  return (h.dias.includes(ahora.dia) && ahora.minuto >= desde) || (h.dias.includes(diaAnterior) && ahora.minuto < hasta);
}
