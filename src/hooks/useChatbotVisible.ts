import { useEffect, useState } from "react";
import { CHATBOT_PUBLICO, leerQaChatbot } from "@/lib/featureFlags";

const CLAVE_QA = "casa-tomas:qa-chatbot";

const leerQaGuardado = (): boolean => {
  try {
    return sessionStorage.getItem(CLAVE_QA) === "1";
  } catch {
    return false;
  }
};

const guardarQa = (activo: boolean) => {
  try {
    if (activo) sessionStorage.setItem(CLAVE_QA, "1");
    else sessionStorage.removeItem(CLAVE_QA);
  } catch {
    // Sin sessionStorage (modo privado estricto): vale solo para esta página.
  }
};

/**
 * ¿Se muestra el acceso al chatbot? `CHATBOT_PUBLICO` (build) o, si está
 * apagado, la puerta de QA `?tomy=1` (ver `src/lib/featureFlags.ts`).
 *
 * El estado inicial es solo el flag de build, idéntico en el prerender SSG y
 * en la hidratación; la URL y `sessionStorage` se leen en un efecto, tras
 * montar, así que nunca se toca `window` durante el render del servidor.
 */
export const useChatbotVisible = (): boolean => {
  const [visible, setVisible] = useState<boolean>(CHATBOT_PUBLICO);

  useEffect(() => {
    if (CHATBOT_PUBLICO) return;
    const pedido = leerQaChatbot(window.location.search);
    if (pedido !== null) guardarQa(pedido);
    setVisible(pedido ?? leerQaGuardado());
  }, []);

  return visible;
};
