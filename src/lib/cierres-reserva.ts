/**
 * Días SIN reservas para el calendario del formulario (encargo del dueño,
 * 2026-10-13): lunes y jueves (todo el día), domingo por la noche, más los
 * cierres y aperturas que el personal marque en el calendario del panel.
 *
 * La regla vive en Supabase y la sirve `reservas-web/cierres` (la misma que
 * aplica `/disponibilidad` y `/crear`). Si esa ruta falla (sin red, función
 * sin desplegar), se usa la regla semanal por defecto: misma que
 * adminpanelct `supabase/functions/_shared/cierres.ts`.
 *
 * Solo se deshabilitan en el calendario los días cerrados ENTEROS. Un día con
 * un servicio cerrado (domingo) se puede elegir: `/disponibilidad` solo ofrece
 * las horas del servicio abierto.
 */
import { FUNCTIONS_BASE_URL, functionHeaders } from "@/lib/supabase-functions";

export const RESERVAS_WEB_CIERRES_URL = `${FUNCTIONS_BASE_URL}/reservas-web/cierres`;

type Turno = "comida" | "cena";

/** 0 = domingo … 6 = sábado. */
export const CIERRE_SEMANAL_POR_DEFECTO: Record<Turno, readonly number[]> = {
  comida: [1, 4],
  cena: [0, 1, 4],
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Fechas (YYYY-MM-DD) cerradas el día entero según la regla por defecto. */
export function diasCerradosPorDefecto(desde: Date, dias: number): Set<string> {
  const salida = new Set<string>();
  for (let i = 0; i <= dias; i++) {
    const d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + i);
    const dow = d.getDay();
    if (CIERRE_SEMANAL_POR_DEFECTO.comida.includes(dow) && CIERRE_SEMANAL_POR_DEFECTO.cena.includes(dow)) {
      salida.add(iso(d));
    }
  }
  return salida;
}

/** De las filas `{ fecha, turno }` de la ruta: las fechas con los DOS servicios cerrados. */
export function diasCerradosEnteros(cierres: unknown): Set<string> {
  const porFecha = new Map<string, Set<string>>();
  if (Array.isArray(cierres)) {
    for (const c of cierres as Array<{ fecha?: unknown; turno?: unknown }>) {
      if (typeof c?.fecha !== "string" || (c.turno !== "comida" && c.turno !== "cena")) continue;
      const turnos = porFecha.get(c.fecha) ?? new Set<string>();
      turnos.add(c.turno);
      porFecha.set(c.fecha, turnos);
    }
  }
  return new Set([...porFecha].filter(([, t]) => t.size === 2).map(([f]) => f));
}

/** Días cerrados enteros entre hoy y `dias` días después (máx. 120). */
export async function leerDiasCerrados(hoy: Date = new Date(), dias = 120): Promise<Set<string>> {
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias);
  try {
    const respuesta = await fetch(RESERVAS_WEB_CIERRES_URL, {
      method: "POST",
      headers: functionHeaders(),
      body: JSON.stringify({ desde: iso(hoy), hasta: iso(hasta) }),
    });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const cuerpo = (await respuesta.json()) as { ok?: boolean; cierres?: unknown };
    if (!cuerpo?.ok) throw new Error("respuesta sin ok");
    return diasCerradosEnteros(cuerpo.cierres);
  } catch {
    return diasCerradosPorDefecto(hoy, dias);
  }
}

export const fechaIso = iso;
