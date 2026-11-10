import { describe, expect, it } from "vitest";
import { admiteMenuDelDia, esHoyMadrid, hoyMadridIso, horaSoloTelefonoHoy, minutosDeHora } from "@/lib/reserva-menu-dia";
import { interpretarRechazoReserva } from "@/lib/reservas-web";

const martes = new Date(2026, 10, 10);
const miercoles = new Date(2026, 10, 11);
const jueves = new Date(2026, 10, 12);
const viernes = new Date(2026, 10, 13);
const domingo = new Date(2026, 10, 15);

describe("menú del día", () => {
  it("solo martes a jueves y en horas de comida", () => {
    for (const d of [martes, miercoles, jueves]) expect(admiteMenuDelDia(d, "13:30:00")).toBe(true);
    expect(admiteMenuDelDia(viernes, "13:30")).toBe(false);
    expect(admiteMenuDelDia(domingo, "13:30")).toBe(false);
    expect(admiteMenuDelDia(martes, "16:59")).toBe(true);
    expect(admiteMenuDelDia(martes, "17:00")).toBe(false);
    expect(admiteMenuDelDia(martes, "21:00:00")).toBe(false);
    expect(admiteMenuDelDia(martes, null)).toBe(false);
    expect(admiteMenuDelDia(undefined, "13:00")).toBe(false);
  });
});

describe("mismo día solo por teléfono", () => {
  // 10/11/2026 09:00 UTC = 10:00 en Madrid
  const ahora = new Date("2026-11-10T09:00:00Z");
  it("hoy en Madrid, cerca de medianoche UTC", () => {
    expect(hoyMadridIso(new Date("2026-11-10T23:30:00Z"))).toBe("2026-11-11");
    expect(esHoyMadrid("2026-11-10", ahora)).toBe(true);
  });
  it("bloquea 12:30–16:00 incluidas, solo hoy", () => {
    expect(horaSoloTelefonoHoy("12:30:00", "2026-11-10", ahora)).toBe(true);
    expect(horaSoloTelefonoHoy("16:00", "2026-11-10", ahora)).toBe(true);
    expect(horaSoloTelefonoHoy("12:00", "2026-11-10", ahora)).toBe(false);
    expect(horaSoloTelefonoHoy("16:30", "2026-11-10", ahora)).toBe(false);
    expect(horaSoloTelefonoHoy("21:00", "2026-11-10", ahora)).toBe(false);
    expect(horaSoloTelefonoHoy("13:00", "2026-11-11", ahora)).toBe(false);
  });
  it("minutosDeHora", () => {
    expect(minutosDeHora("12:30:00")).toBe(750);
    expect(minutosDeHora("x")).toBeNaN();
  });
});

describe("errores nuevos de reservas-web", () => {
  const textos = {
    title: "t", close: "c", invalidMessage: "i", offlineTitle: "o", offlineMessage: "om", errorMessage: "e", fallbackMessage: "f",
    exits: { call: "Llama al {phone}", offline: "", guests: "", otherTimeOrCall: "", otherDate: "", otherTime: "", checkForm: "", retryOrCall: "" },
    reasons: { SERVICIO_BLOQUEADO: "Ese servicio ya no admite reservas online. Llámanos por teléfono." },
  } as unknown as Parameters<typeof interpretarRechazoReserva>[2];
  it.each(["SERVICIO_BLOQUEADO", "MISMO_DIA_TELEFONO", "MENU_DIA_NO_DISPONIBLE"])("%s ofrece el teléfono", (codigo) => {
    const r = interpretarRechazoReserva(422, { ok: false, error: codigo }, textos);
    expect(r.salida).toBe("Llama al {phone}");
  });
  it("usa el texto propio del código", () => {
    const r = interpretarRechazoReserva(409, { motivo: "SERVICIO_BLOQUEADO" }, textos);
    expect(r.mensaje).toMatch(/ya no admite reservas online/);
  });
});
