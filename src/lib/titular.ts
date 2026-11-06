/**
 * Módulo sin dependencias a propósito: lo importan los textos legales, que a su vez importan los
 * tests E2E (fuera de Vite, sin los módulos virtuales de la carta que arrastra `negocio.ts`).
 * La dirección es la misma que `NEGOCIO` (un test lo comprueba).
 */
/**
 * Titular de la web y responsable del tratamiento (aviso legal, política de privacidad). Fuente
 * única: la sociedad que explota Casa Tomás. `registroMercantil` es obligatorio en el aviso legal
 * de una SL (LSSI-CE, art. 10.1.b); si fuera `null` la línea no se pinta. Datos dados por el dueño
 * el 06/11/2026 y comprobados con el BORME núm. 178 de 2011 (BORME-A-2011-178-03, asiento 374831):
 * «T 3549, F 153, S 8, H A 126769, I/A 1 (6.09.11)», domicilio «C/ Santa María de la Cabeza 2 -
 * Local 2 (Crevillent)», constitución el 30/08/2011 con declaración de unipersonalidad. Es sociedad
 * unipersonal (confirmado por el dueño el 06/11/2026): la denominación lleva «S.L.U.» porque la
 * Ley de Sociedades de Capital (art. 13.2) obliga a hacerlo constar.
 */
export const TITULAR = {
  nombreComercial: "Restaurante Casa Tomás",
  denominacionSocial: "MASIDE 2011, S.L.U.",
  cif: "B54583356",
  domicilio: "Carrer Santa Maria de la Cabeza, 2, local 2, 03330 Crevillent (Alicante)",
  registroMercantil: "Registro Mercantil de Alicante, tomo 3549, folio 153, sección 8.ª, hoja A-126769, inscripción 1.ª" as string | null,
} as const;
