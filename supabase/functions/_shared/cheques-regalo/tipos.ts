/** Fila de `cheques_regalo` con lo necesario para generar el PDF y el email. */
export type ChequeParaEmail = import("./plantilla.ts").ChequeRegalo;

/** Selección de cada compra para el regalo; no modifica el cobro ni la factura. */
export interface OpcionesEnvioCheque {
  ocultarImporte: boolean;
}
