/** Fila de `cheques_regalo` con lo necesario para generar el PDF y el email. */
export interface ChequeParaEmail {
  id: string;
  comprador_email: string;
  comprador_nombre: string;
  destinatario_nombre: string | null;
  mensaje: string | null;
  fecha_entrega_deseada: string | null;
  importe_eur: number;
  codigo: string;
}

/**
 * `ocultarImporte`: el cheque pagado por un cliente siempre enseña el importe
 * (lo pagó, lo sabe). Solo el generado a mano desde el panel puede ocultarlo
 * — un cheque de cortesía donde el restaurante no quiere imprimir la cifra.
 */
export interface OpcionesEnvioCheque {
  ocultarImporte: boolean;
}
