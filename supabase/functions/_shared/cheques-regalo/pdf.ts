import { generarPdfRegalo } from "./pdf-plantilla.ts";
import { PLANTILLA_REGALO } from "./plantilla.ts";
import type { ChequeParaEmail, OpcionesEnvioCheque } from "./tipos.ts";

export function generarPdfCheque(cheque: ChequeParaEmail, opciones: OpcionesEnvioCheque, logoPng: Uint8Array): Promise<Uint8Array> {
  let binario = "";
  for (const byte of logoPng) binario += String.fromCharCode(byte);
  return generarPdfRegalo({ ...cheque, ocultar_importe: opciones.ocultarImporte },
    { ...PLANTILLA_REGALO, ...cheque.plantilla_cheque }, "data:image/png;base64," + btoa(binario));
}
