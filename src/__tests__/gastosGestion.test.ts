import { describe, expect, it } from "vitest";
import {
  calcularGastosGestion, GASTOS_GESTION_APAGADOS, leerConfigGastosGestion, normalizarConfigGastosGestion,
} from "../../supabase/functions/_shared/cheques-regalo/gastos-gestion";

const ESTANDAR = { activos: true, porcentaje: 1.5, fijo_eur: 0.25 };
/** Comisión de Stripe en céntimos sobre lo cobrado: % redondeado + fijo. */
const comisionStripe = (totalCent: number, pct = 1.5, fijoCent = 25) => Math.round(totalCent * pct / 100) + fijoCent;

describe("gastos de gestión de los cheques regalo", () => {
  it("apagados no cobran nada", () => {
    expect(calcularGastosGestion(50, GASTOS_GESTION_APAGADOS)).toBe(0);
    expect(calcularGastosGestion(50, { ...ESTANDAR, activos: false })).toBe(0);
  });

  it("un cheque de 50 € cuesta 51,02 € con la tarifa estándar", () => {
    expect(calcularGastosGestion(50, ESTANDAR)).toBe(1.02);
  });

  it("al restaurante le queda el cheque íntegro (como mucho 1 céntimo más) de 10 a 1000 €", () => {
    for (let importeCent = 1000; importeCent <= 100000; importeCent += 1) {
      const gastosCent = Math.round(calcularGastosGestion(importeCent / 100, ESTANDAR) * 100);
      const total = importeCent + gastosCent;
      const neto = total - comisionStripe(total);
      expect(neto, `cheque de ${importeCent / 100} €`).toBeGreaterThanOrEqual(importeCent);
      expect(neto, `cheque de ${importeCent / 100} €`).toBeLessThanOrEqual(importeCent + 1);
    }
  });

  it("devuelve siempre céntimos exactos", () => {
    for (const importe of [10, 25.5, 99.99, 333.33, 1000]) {
      const gastos = calcularGastosGestion(importe, { activos: true, porcentaje: 2.8, fijo_eur: 0.25 });
      expect(Math.round(gastos * 100) / 100).toBe(gastos);
    }
  });

  it("descarta configuraciones fuera de los límites de la base de datos", () => {
    for (const malo of [null, {}, { activos: "true", porcentaje: 1.5, fijo_eur: 0.25 }, { activos: true, porcentaje: 10, fijo_eur: 0.25 },
      { activos: true, porcentaje: -1, fijo_eur: 0.25 }, { activos: true, porcentaje: 1.5, fijo_eur: 5.01 }, { activos: true, porcentaje: "x", fijo_eur: 0 }]) {
      expect(normalizarConfigGastosGestion(malo)).toEqual(GASTOS_GESTION_APAGADOS);
    }
    expect(normalizarConfigGastosGestion({ activos: true, porcentaje: "1.50", fijo_eur: "0.25" })).toEqual(ESTANDAR);
  });

  it("lee las columnas de la plantilla, que PostgREST devuelve como texto en los numeric", () => {
    expect(leerConfigGastosGestion({ gastos_gestion_activos: true, gastos_gestion_porcentaje: "1.50", gastos_gestion_fijo_eur: "0.25" })).toEqual(ESTANDAR);
    expect(leerConfigGastosGestion(null)).toEqual(GASTOS_GESTION_APAGADOS);
  });
});
