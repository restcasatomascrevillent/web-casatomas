/** Fila de `cheques_regalo` con lo necesario para generar el PDF y el email. */
export type ChequeParaEmail = import("./plantilla.ts").ChequeRegalo;

/**
 * `ocultarImporte`: el cheque pagado por un cliente siempre enseña el importe
 * (lo pagó, lo sabe). Solo el generado a mano desde el panel puede ocultarlo
 * — un cheque de cortesía donde el restaurante no quiere imprimir la cifra.
 */
export interface OpcionesEnvioCheque {
  ocultarImporte: boolean;
}
