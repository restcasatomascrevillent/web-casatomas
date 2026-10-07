/**
 * "2", "2 kg"… no, aquí no: solo el código del cheque.
 *
 * Sin 0/O/1/I: se lee en voz alta por teléfono y por WhatsApp sin confusiones.
 * 8 caracteres de un alfabeto de 32 ⇒ más que de sobra para que un cheque
 * regalo no choque con otro por azar.
 *
 * `crypto.getRandomValues` y no `Math.random()`: el código vale dinero y no
 * puede ser predecible. 32 divide exacto a 256, así que `byte % 32` no
 * favorece a ninguna letra.
 *
 * Compartido entre `stripe-webhook-cheques-regalo` (código al confirmar el
 * pago) y `cheques-regalo-admin` (código al generar uno a mano): mismo
 * formato, una sola fuente de verdad.
 */
export function generarCodigo(): string {
  const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let codigo = "";
  for (const byte of crypto.getRandomValues(new Uint8Array(8))) codigo += ALFABETO[byte % ALFABETO.length];
  return `CT-${codigo}`;
}
