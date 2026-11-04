/**
 * Módulo sin dependencias a propósito: lo importan los textos legales, que a su vez importan los
 * tests E2E (fuera de Vite, sin los módulos virtuales de la carta que arrastra `negocio.ts`).
 * La dirección es la misma que `NEGOCIO` (un test lo comprueba).
 */
/**
 * Titular de la web y responsable del tratamiento (aviso legal, política de privacidad). Fuente
 * única: la sociedad que explota Casa Tomás. `registroMercantil` es obligatorio en el aviso legal
 * de una SL (LSSI-CE, art. 10.1.b): mientras sea `null` la línea no se pinta. Hay que pedirlo al
 * dueño tal como figura en la escritura o en la nota simple (p. ej. «Registro Mercantil de
 * Alicante, tomo X, folio Y, hoja A-Z, inscripción 1.ª»).
 */
export const TITULAR = {
  nombreComercial: "Restaurante Casa Tomás",
  denominacionSocial: "MASIDE 2011 SL",
  cif: "B54583356",
  domicilio: "Carrer Santa Maria de la Cabeza, 2, 03330 Crevillent (Alicante)",
  registroMercantil: null as string | null,
} as const;
