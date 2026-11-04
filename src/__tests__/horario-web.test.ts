import { describe, expect, it } from "vitest";
import { dentroDeHorario, HORARIO_POR_DEFECTO, leerHorario, momentoMadrid } from "@/lib/horario-web";

const M = (dia: number, hhmm: string) => ({ dia, minuto: Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)) });

describe("Horario de los botones Menú del día y Tapas (web)", () => {
  it("sin horario guardado: menú de martes a jueves y tapas los jueves, todo el día (lo de siempre)", () => {
    const menu = leerHorario(null, "menu");
    const tapas = leerHorario(undefined, "tapas");
    expect([1, 2, 3, 4, 5, 6, 7].filter((d) => dentroDeHorario(menu, M(d, "09:00")))).toEqual([2, 3, 4]);
    expect([1, 2, 3, 4, 5, 6, 7].filter((d) => dentroDeHorario(tapas, M(d, "23:59")))).toEqual([4]);
  });
  it("un valor raro cae en lo de siempre", () => {
    expect(leerHorario({ dias: [9] }, "menu")).toEqual(HORARIO_POR_DEFECTO.menu);
    expect(leerHorario([1, 2], "tapas")).toEqual(HORARIO_POR_DEFECTO.tapas);
  });
  it("con horas: aparece a la de inicio y desaparece a la de fin", () => {
    const h = leerHorario({ dias: [2, 3], desde: "13:00", hasta: "16:00" }, "menu");
    expect(dentroDeHorario(h, M(2, "12:59"))).toBe(false);
    expect(dentroDeHorario(h, M(2, "13:00"))).toBe(true);
    expect(dentroDeHorario(h, M(3, "15:59"))).toBe(true);
    expect(dentroDeHorario(h, M(3, "16:00"))).toBe(false);
    expect(dentroDeHorario(h, M(4, "14:00"))).toBe(false);
  });
  it("cruzando la medianoche sigue hasta la hora del día siguiente", () => {
    const h = leerHorario({ dias: [7], desde: "20:00", hasta: "01:00" }, "tapas");
    expect(dentroDeHorario(h, M(7, "19:59"))).toBe(false);
    expect(dentroDeHorario(h, M(7, "23:30"))).toBe(true);
    expect(dentroDeHorario(h, M(1, "00:30"))).toBe(true); // lunes de madrugada = domingo por la noche
    expect(dentroDeHorario(h, M(1, "01:00"))).toBe(false);
    expect(dentroDeHorario(h, M(7, "00:30"))).toBe(false); // domingo de madrugada es del sábado
  });
  it("calcula el día y la hora de Madrid (horario de verano e invierno)", () => {
    expect(momentoMadrid(new Date("2026-11-05T12:30:00Z"))).toEqual({ dia: 4, minuto: 13 * 60 + 30 }); // jueves, UTC+1
    expect(momentoMadrid(new Date("2026-07-02T22:30:00Z"))).toEqual({ dia: 5, minuto: 30 }); // viernes 00:30, UTC+2
  });
});
