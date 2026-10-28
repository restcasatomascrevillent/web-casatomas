/**
 * Gastos de gestión de la compra online de cheques regalo.
 *
 * Se calculan para que, con la tarifa configurada en el panel (por defecto la
 * estándar de Stripe para tarjetas del EEE, 1,5 % + 0,25 €), al restaurante le
 * quede el valor íntegro del cheque: total = (importe + fijo) / (1 − %).
 *
 * Son IGUALES para cualquier forma de pago y se enseñan antes de pagar: en
 * España el comercio no puede cobrar un recargo por usar un medio de pago
 * concreto (art. 35.2 del Real Decreto-ley 19/2018). Por eso no dependen de la
 * tarjeta que acabe usando el comprador, y el panel los deja apagados hasta
 * que la gestoría dé el visto bueno.
 *
 * Lo usan la web (para enseñar el total) y `cheques-regalo-web` (para
 * cobrarlo): un solo cálculo, sin descuadres de céntimos entre los dos.
 * El panel lleva una copia en `adminpanelct/src/lib/cheques/gastosGestion.ts`.
 */

export interface ConfigGastosGestion {
  activos: boolean;
  porcentaje: number;
  fijo_eur: number;
}

export const GASTOS_GESTION_APAGADOS: ConfigGastosGestion = { activos: false, porcentaje: 0, fijo_eur: 0 };

/** Valida `{ activos, porcentaje, fijo_eur }`; ante cualquier dato raro, sin gastos. */
export function normalizarConfigGastosGestion(valor: unknown): ConfigGastosGestion {
  const config = valor as Partial<Record<keyof ConfigGastosGestion, unknown>> | null;
  const porcentaje = Number(config?.porcentaje);
  const fijo = Number(config?.fijo_eur);
  // Mismos límites que los CHECK de `plantilla_cheques_regalo`.
  if (config?.activos !== true || !Number.isFinite(porcentaje) || !Number.isFinite(fijo)
    || porcentaje < 0 || porcentaje >= 10 || fijo < 0 || fijo > 5) return GASTOS_GESTION_APAGADOS;
  return { activos: true, porcentaje, fijo_eur: fijo };
}

/** La misma configuración, leída de las columnas de `plantilla_cheques_regalo`. */
export function leerConfigGastosGestion(fila: Record<string, unknown> | null | undefined): ConfigGastosGestion {
  return normalizarConfigGastosGestion({
    activos: fila?.gastos_gestion_activos,
    porcentaje: fila?.gastos_gestion_porcentaje,
    fijo_eur: fila?.gastos_gestion_fijo_eur,
  });
}

/** Gastos de gestión en euros para un cheque de `importeEur`; 0 si están apagados. */
export function calcularGastosGestion(importeEur: number, config: ConfigGastosGestion): number {
  if (!config.activos || !Number.isFinite(importeEur) || importeEur <= 0) return 0;
  const importe = Math.round(importeEur * 100);
  const fijo = Math.round(config.fijo_eur * 100);
  // Redondeo hacia arriba (con margen para el ruido de coma flotante) para que
  // lo que quede tras la comisión no baje nunca del valor del cheque.
  const total = Math.ceil((importe + fijo) / (1 - config.porcentaje / 100) - 1e-9);
  return (total - importe) / 100;
}
