const EDAD_VINOS_KEY = 'edad_vinos_confirmada';

/**
 * Recuerda, durante la sesión del navegador, que el visitante ya confirmó
 * ser mayor de 18 años para ver la carta de vinos. Evita que se le pregunte
 * de nuevo si ya respondió al pulsar "Carta de vinos" en la portada.
 */
export const getEdadVinosConfirmada = (): boolean => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(EDAD_VINOS_KEY) === 'true';
};

export const setEdadVinosConfirmada = (): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(EDAD_VINOS_KEY, 'true');
};

/**
 * Genera un ID único de sesión para cada usuario
 * Este ID se mantiene durante toda la sesión del navegador
 */
export const getSessionId = (): string => {
  const SESSION_KEY = 'user_session_id';
  
  // Intentar obtener el ID de sesión existente
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  
  // Si no existe, generar uno nuevo
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  
  return sessionId;
};

/**
 * Obtiene el pedido del usuario actual basado en su sessionId
 * Usa sessionStorage que se borra automáticamente al recargar la página
 */
export const getUserPedido = (): any[] => {
  const sessionId = getSessionId();
  const allPedidos = JSON.parse(sessionStorage.getItem('pedidos') || '{}');
  return allPedidos[sessionId] || [];
};

/**
 * Guarda el pedido del usuario actual en sessionStorage (temporal)
 */
export const setUserPedido = (pedido: any[]): void => {
  const sessionId = getSessionId();
  const allPedidos = JSON.parse(sessionStorage.getItem('pedidos') || '{}');
  allPedidos[sessionId] = pedido;
  sessionStorage.setItem('pedidos', JSON.stringify(allPedidos));
  
  // Disparar evento para actualizar UI
  window.dispatchEvent(new Event('pedidoUpdated'));
};
