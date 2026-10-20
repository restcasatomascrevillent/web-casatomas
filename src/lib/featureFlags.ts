/**
 * Feature flags de build (se resuelven al compilar con `import.meta.env`).
 *
 * `VITE_CHATBOT_PUBLICO`: muestra al público el chatbot "Pregunta a Tomy"
 * (botón flotante global y botón dentro del ticket del pedido). Solo el
 * string exacto `"true"` lo activa; sin definir o cualquier otro valor lo
 * deja oculto. Está apagado hasta que el bot pase la batería de pruebas.
 *
 * Con el flag apagado, el equipo puede probar el bot en la web real abriendo
 * cualquier página con `?tomy=1` (se lee en el cliente tras montar y se
 * recuerda durante la sesión del navegador; `?tomy=0` lo olvida). Ver
 * `useChatbotVisible`.
 */

/** Solo el string exacto "true" activa un flag. */
export const esFlagActivo = (valor: unknown): boolean => valor === "true";

export const CHATBOT_PUBLICO: boolean = esFlagActivo(import.meta.env.VITE_CHATBOT_PUBLICO);

/** Parámetro de la URL que abre la puerta trasera de QA del chatbot. */
export const PARAM_QA_CHATBOT = "tomy";

/**
 * Lee `?tomy=` de un `location.search`: `true` si pide activar el modo QA,
 * `false` si pide desactivarlo, `null` si no dice nada.
 */
export const leerQaChatbot = (search: string): boolean | null => {
  const valor = new URLSearchParams(search).get(PARAM_QA_CHATBOT);
  if (valor === "1") return true;
  if (valor === "0") return false;
  return null;
};
