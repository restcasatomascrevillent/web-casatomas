-- SOLO PARA DEMO/STAGING. Deja el esquema, la carta, la configuración, los
-- usuarios del panel y las facturas de proveedores, y vacía todo lo que
-- identifica a clientes: reservas, newsletter, chats, llamadas, cheques regalo
-- vendidos y el rastro de auditoría.
--
-- Sin CASCADE a propósito: todas las claves foráneas entre estas tablas están
-- dentro de la lista (comprobado el 26-10-2026). Si mañana otra tabla apunta a
-- una de ellas, el TRUNCATE falla y avisa en vez de vaciarla en silencio.
--
-- migrar.sh se niega a lanzarlo si DESTINO_REF es el de producción.

\set ON_ERROR_STOP on

begin;

truncate table
  public.reservas,
  public.solicitudes_pendientes,
  public.asignaciones_mesa,
  public.asignaciones_mesa_descartadas,
  public.avisos_reserva_enviados,
  public.envios_email_reserva,
  public.email_eventos,
  public.direcciones_email_suprimidas,
  public.blacklist,
  public.sugerencias_blacklist,
  public.newsletter_suscriptores,
  public.newsletter_suscriptores_depurados,
  public.newsletter_envios,
  public.newsletter_sincronizaciones_resend,
  public.conversaciones,
  public.mensajes_chat,
  public.n8n_chat_histories,
  public.chat_web_conversaciones,
  public.chat_web_mensajes,
  public.chat_web_uso,
  public.consultas_chatbot,
  public.call_logs,
  public.client_messages,
  public.cheques_regalo,
  public.facturas_cheques,
  public.pedidos_ecommerce,
  public.lineas_pedido,
  public.carrito,
  public.favoritos,
  public.notificaciones_dashboard,
  public.audit_log,
  public.audit_auth_context,
  public.gdpr_audit_log,
  public.security_log,
  public.rate_limit_log
restart identity;

commit;
