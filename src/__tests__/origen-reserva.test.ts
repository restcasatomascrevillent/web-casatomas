/**
 * «Cómo se hizo la reserva»: lo que el formulario mide y manda en `origen`.
 */
import { describe, it, expect } from "vitest";
import { construirOrigen, crearEstadoOrigen, duracionSegundos } from "@/lib/origen-reserva";

const T0 = Date.parse("2026-11-10T17:55:00.000Z");

describe("duracionSegundos", () => {
  it("cuenta desde el primer contacto hasta el envío", () => {
    expect(duracionSegundos({ abiertoMs: T0, primerContactoMs: T0 + 60_000 }, T0 + 215_000)).toBe(155);
  });
  it("sin contacto, desde que se abrió el formulario", () => {
    expect(duracionSegundos({ abiertoMs: T0, primerContactoMs: null }, T0 + 40_400)).toBe(40);
  });
  it("nunca negativa (reloj que retrocede)", () => {
    expect(duracionSegundos({ abiertoMs: T0, primerContactoMs: null }, T0 - 5_000)).toBe(0);
  });
});

describe("construirOrigen", () => {
  it("manda horas, campos, intentos, entrada sin query, host del referente y utm", () => {
    const estado = { ...crearEstadoOrigen(T0), primerContactoMs: T0 + 60_000, campos: ["fecha", "hora"], consultas: 2, consultasSinHueco: 1, intentosFallidos: 1 };
    const o = construirOrigen(
      estado,
      {
        idioma: "en",
        idiomaNavegador: "en-GB",
        urlEntrada: "https://restaurantecasatomascrevillente.es/en/carta?utm_source=instagram&utm_campaign=navidad&email=a@b.c",
        urlActual: "https://restaurantecasatomascrevillente.es/en/reservas",
        referrer: "https://www.instagram.com/p/xyz?igsh=123",
        pantalla: { ancho: 390, alto: 844 },
        tactil: true,
      },
      T0 + 215_000,
    );
    expect(o).toMatchObject({
      formulario_abierto_at: "2026-11-10T17:55:00.000Z",
      primer_contacto_at: "2026-11-10T17:56:00.000Z",
      enviado_at: "2026-11-10T17:58:35.000Z",
      duracion_segundos: 155,
      campos_cambiados: ["fecha", "hora"],
      consultas_disponibilidad: 2,
      consultas_sin_hueco: 1,
      intentos_fallidos: 1,
      idioma: "en",
      pagina_entrada: "/en/carta",
      pagina_formulario: "/en/reservas",
      referente: "www.instagram.com",
      utm_source: "instagram",
      utm_campaign: "navidad",
      pantalla: { ancho: 390, alto: 844 },
      tactil: true,
    });
    // Nada de la query que no sea campaña, ni rutas del referente.
    expect(JSON.stringify(o)).not.toContain("a@b.c");
    expect(JSON.stringify(o)).not.toContain("igsh");
  });

  it("sin referente ni campaña no inventa nada", () => {
    const o = construirOrigen(crearEstadoOrigen(T0), { idioma: "es", urlEntrada: "https://x.es/", referrer: "" }, T0 + 1000);
    expect(o.referente).toBeNull();
    expect(o).not.toHaveProperty("utm_source");
    expect(o.primer_contacto_at).toBeNull();
  });
});
