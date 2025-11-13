/**
 * Genera un ID único de sesión para cada usuario
 * Este ID se mantiene durante toda la sesión del navegador
 */
export const getSessionId = (): string => {
  // Generar un ID nuevo en cada carga de página para que el pedido se reinicie
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Obtiene el pedido del usuario actual basado en su sessionId
 */
export const getUserPedido = (): any[] => {
  const sessionId = getSessionId();
  const allPedidos = JSON.parse(localStorage.getItem('pedidos') || '{}');
  return allPedidos[sessionId] || [];
};

/**
 * Guarda el pedido del usuario actual
 */
export const setUserPedido = (pedido: any[]): void => {
  const sessionId = getSessionId();
  const allPedidos = JSON.parse(localStorage.getItem('pedidos') || '{}');
  allPedidos[sessionId] = pedido;
  localStorage.setItem('pedidos', JSON.stringify(allPedidos));
  
  // También actualizar el pedido legacy para compatibilidad
  localStorage.setItem('pedido', JSON.stringify(pedido));
  
  // Disparar evento para actualizar UI
  window.dispatchEvent(new Event('pedidoUpdated'));
};
