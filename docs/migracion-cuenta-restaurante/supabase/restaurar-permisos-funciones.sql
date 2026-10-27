-- Restaura los permisos de EXECUTE de las funciones tal y como estaban en el
-- proyecto viejo (jeamoczmbfsnwkfjxcyo) antes del corte del 27-10-2026.
-- La copia dejó 375 de 378 funciones ejecutables por `anon` (clave pública);
-- en el viejo solo lo eran 186. Atómico: si alguna firma no existe, no cambia nada.
do $$
declare
  auth_srv text[] := array[
    'public.albaranes_candidatos(p_factura_id bigint, p_texto text)',
    'public.albaranes_facturados_agente()',
    'public.albaranes_sin_factura_agente(p_proveedor text, p_desde date, p_hasta date)',
    'public.alertas_resumen_agente(p_alertas jsonb)',
    'public.append_tool_call_log(p_call_id text, p_new_tools jsonb)',
    'public.asignaciones_mesa_denormalizar()',
    'public.asignar_mesas_reserva(p_reserva_id uuid, p_mesa_ids uuid[])',
    'public.auditar_prompt_vapi(p_evento uuid, p_resultado text)',
    'public.base_linea_agente(p_unidad text, p_cant numeric, p_uni text)',
    'public.buscar_documentos_agente(p_texto text, p_tipo text, p_desde date, p_hasta date, p_limite integer)',
    'public.buscar_facturas_agente(embedding_query vector, limite integer, umbral double precision, p_tipo text)',
    'public.buscar_productos_agente(embedding_query vector, limite integer, umbral double precision)',
    'public.buscar_productos_texto_agente(p_texto text, p_limite integer)',
    'public.can_edit_section(_section text)',
    'public.can_read_section(_section text)',
    'public.can_write_section(_section text)',
    'public.canjear_cheque_regalo(p_codigo text)',
    'public.categoria_agente(p_texto text)',
    'public.compras_producto_agente(p_texto text, p_desde date, p_hasta date, p_tipo text, p_limite integer, p_orden text, p_excluir text, p_embedding vector, p_unidad text)',
    'public.configuracion_web_visibilidad_menu_tapas(p_seccion text, p_mostrar boolean)',
    'public.consulta_flexible_agente(p jsonb)',
    'public.contenido_texto_agente(p_unidad text, p_cant numeric, p_uni text)',
    'public.cotejo_factura_albaranes(p_factura_id bigint, p_albaran_id bigint)',
    'public.crear_cheque_manual(p_solicitud_id uuid, p_datos jsonb)',
    'public.crear_cheque_manual_v2(p_solicitud_id uuid, p_datos jsonb)',
    'public.desvincular_albaran(p_albaran_id bigint)',
    'public.detalle_cheque_regalo(p_id uuid)',
    'public.detalle_documento_agente(p_id bigint, p_numero text)',
    'public.docs_deducidos_agente(p_tipo text, p_desde date, p_hasta date)',
    'public.docs_sin_iva_agente(p_tipo text, p_desde date, p_hasta date)',
    'public.docs_sin_total_agente(p_tipo text, p_desde date, p_hasta date)',
    'public.documento_compacto_agente(p_doc facturas, p_detalle boolean)',
    'public.es_linea_servicio_agente(p_nombre text)',
    'public.es_subproducto_agente(p_nombre text, p_raices text[])',
    'public.estadisticas_globales_agente()',
    'public.estadisticas_lectura(p_dias integer)',
    'public.extraer_contenido(p_texto text)',
    'public.factura_cumple_autoverificacion(p_factura_id bigint)',
    'public.facturas_candidatas(p_albaran_id bigint)',
    'public.fecha_dudosa_agente(p_alertas jsonb)',
    'public.ficha_proveedor_agente(p_texto text)',
    'public.fijar_tope_ia_mes(p_eur numeric)',
    'public.filtrar_documentos_agente(p_filtro text, p_texto text, p_tipo text, p_desde date, p_hasta date, p_orden text, p_limite integer)',
    'public.fn_aceptar_propuesta_solicitud(p_solicitud_id uuid, p_via text)',
    'public.fn_aprobar_sugerencia_blacklist(p_sugerencia_id uuid, p_caduca_el date, p_motivo text, p_actor uuid)',
    'public.fn_asignaciones_futuras_de_mesas(p_mesa_ids uuid[])',
    'public.fn_capacidad_efectiva_espacio(p_espacio_id uuid)',
    'public.fn_capacidad_efectiva_marca(p_marca text)',
    'public.fn_franja_ocupacion_mesa(p_fecha date, p_hora time without time zone)',
    'public.fn_minutos_ocupacion_mesa(p_hora time without time zone)',
    'public.fn_normalizar_telefono(p_telefono text)',
    'public.fn_rechazar_propuesta_solicitud(p_solicitud_id uuid, p_via text)',
    'public.fn_rechazar_sugerencia_blacklist(p_sugerencia_id uuid, p_nota text, p_actor uuid)',
    'public.fn_restaurar_version_plantilla(p_tipo text, p_version_a_restaurar integer, p_actor uuid)',
    'public.gasto_categorias_agente(p_categoria text, p_desde date, p_hasta date, p_tipo text, p_agrupar text)',
    'public.gasto_ia_real_resumen(p_dias integer)',
    'public.gasto_ia_resumen(p_funciones text[], p_dias integer)',
    'public.has_section_permission(_user_id uuid, _section text, _permission text)',
    'public.historial_precios_agente(p_producto text, p_limite integer)',
    'public.ia_coste_alternativa(p_modelo_alternativo text, p_desde date, p_hasta date)',
    'public.ia_coste_mes()',
    'public.ia_coste_por_funcion(p_desde date, p_hasta date)',
    'public.ia_coste_por_modelo(p_desde date, p_hasta date)',
    'public.ia_coste_serie(p_desde date, p_hasta date, p_funcion text)',
    'public.ia_funciones_sin_registro(p_dias integer)',
    'public.ia_grupo_de_funcion(p_funcion text)',
    'public.ia_proceso_de_funcion(p_funcion text)',
    'public.ia_proceso_gasto(p_funcion text)',
    'public.lineas_precio_agente(p_producto_id bigint, p_ids bigint[], p_base boolean)',
    'public.lineas_producto_agente(p_texto text, p_excluir text)',
    'public.listar_cheques_regalo(p_pagina integer)',
    'public.listar_cheques_regalo_v2(p_pagina integer, p_busqueda text)',
    'public.listar_cheques_regalo_v3(p_pagina integer, p_busqueda text, p_tamano integer, p_orden text, p_estado text, p_desde date, p_hasta date)',
    'public.listar_tablas_auditoria_panel()',
    'public.mesas_auditar_asignaciones()',
    'public.metricas_cheques_regalo(p_desde date, p_hasta date)',
    'public.mismo_proveedor_agente(a text, b text)',
    'public.newsletter_estadisticas_broadcasts(p_broadcast_ids text[])',
    'public.normalizar_unidad_factura(u text)',
    'public.numero_documento_normalizado(p text)',
    'public.ocr_resumen_factura(p_factura_id bigint)',
    'public.openai_sincronizar_ahora()',
    'public.palabras_producto_agente(p_texto text)',
    'public.precio_es_agente(p numeric, p_decimales integer)',
    'public.precio_referencia_agente(p_producto_id bigint, p_unidad text, p_fecha date, p_factura_id bigint, p_base boolean)',
    'public.productos_asignar_lineas(p_linea_ids bigint[], p_producto_id bigint, p_nombre_nuevo text, p_categoria_id bigint)',
    'public.productos_borrar(p_producto_id bigint)',
    'public.productos_contenido_guardar(p_producto_id bigint, p_cantidad numeric, p_unidad text)',
    'public.productos_fusionar(p_origen_ids bigint[], p_destino_id bigint)',
    'public.productos_gasto_por_categoria(p_desde date, p_hasta date, p_tipo text)',
    'public.productos_puede_editar()',
    'public.productos_recategorizar(p_producto_ids bigint[], p_categoria_id bigint)',
    'public.productos_renombrar(p_producto_id bigint, p_nombre text)',
    'public.productos_resumen(p_desde date, p_hasta date, p_tipo text)',
    'public.proveedores_editar(p_id bigint, p_nombre text, p_nombre_comercial text, p_cif text)',
    'public.proveedores_fusionar(p_origen_ids bigint[], p_destino_id bigint)',
    'public.proveedores_listado()',
    'public.proveedores_puede_editar()',
    'public.raices_producto_agente(p_texto text)',
    'public.raiz_producto_agente(p_palabra text)',
    'public.ranking_agente(p_criterio text, p_tipo text, p_limite integer, p_desde date, p_hasta date, p_orden text, p_incluir_servicios boolean, p_unidad text, p_categoria text)',
    'public.recalcular_ocupacion_historica(fecha_desde date, fecha_hasta date)',
    'public.registrar_acceso_panel(p_tipo text, p_ruta text)',
    'public.reservas_sincronizar_asignaciones()',
    'public.resumen_periodo_agente(p_desde date, p_hasta date)',
    'public.serie_precios_agente(p_texto text, p_desde date, p_hasta date, p_unidad text)',
    'public.tipo_cambio_usd_eur_actual()',
    'public.trafico_web_desglose_resumen(p_proyecto text, p_dimension text, p_desde date, p_hasta date, p_limite integer)',
    'public.trafico_web_fdt_mes(p_mes date)',
    'public.trafico_web_serie(p_proyecto text, p_desde date, p_hasta date)',
    'public.trafico_web_tendencia(p_proyecto text, p_dias integer)',
    'public.trafico_web_top_paginas(p_proyecto text, p_desde date, p_hasta date, p_limite integer, p_orden text)',
    'public.unidad_agente(p text)',
    'public.validar_cordura_factura(p_factura_id bigint)',
    'public.variacion_precios_agente(p_desde date, p_hasta date, p_umbral_pct numeric, p_categoria text, p_producto text, p_limite integer, p_sentido text)',
    'public.verificar_cheque_regalo(p_codigo text)',
    'public.verificar_duplicado_factura(p_numero_documento character varying, p_proveedor character varying, p_fecha date, p_total numeric)',
    'public.vincular_albaran_factura(p_albaran_id bigint, p_factura_id bigint, p_forzar boolean)',
    'public.withdraw_stock_inventory(p_product_id uuid, p_quantity integer)'
  ];
  solo_srv text[] := array[
    'public.actualizar_ocupacion_diaria_espacios()',
    'public.buscar_contexto_chatbot(embedding_query vector)',
    'public.calcular_horas_trabajadas()',
    'public.categorias_producto_validar()',
    'public.chat_web_cerrar_uso(p_uso_id uuid, p_estado text, p_prompt integer, p_cached integer, p_completion integer, p_llamadas integer, p_modelo text, p_coste numeric)',
    'public.chat_web_config_touch()',
    'public.chat_web_reservar_cupo(p_session_id text, p_ip_hash text, p_turno integer)',
    'public.cleanup_old_security_logs()',
    'public.configuracion_facturas_tocar()',
    'public.configuracion_web_touch()',
    'public.ejecutar_consulta_chatbot(query_sql text)',
    'public.ejecutar_limpieza_gdpr()',
    'public.emitir_factura_cheque(p_cheque_id uuid)',
    'public.establecer_superadmin_panel(p_user_id uuid, p_make_super_admin boolean, p_email text)',
    'public.facturas_asignar_proveedor()',
    'public.finalizar_intento_panel(p_id uuid, p_actor uuid, p_resultado text, p_session_id text)',
    'public.fn_avisar_reservas_sin_asignar()',
    'public.fn_notificar_solicitud()',
    'public.fn_solicitudes_marca_desde_sala()',
    'public.get_user_role(_user_id uuid)',
    'public.handle_new_sell_user()',
    'public.handle_new_user_inventory()',
    'public.handle_new_user_role()',
    'public.ia_registrar_uso(p_funcion text, p_modelo text, p_prompt_tokens integer, p_completion_tokens integer, p_razonamiento_tokens integer, p_cached_tokens integer, p_cache_write_tokens integer, p_llamadas integer, p_operacion text, p_estado text, p_disparador text, p_duracion_ms integer)',
    'public.iniciar_intento_panel(p_email text, p_ruta text)',
    'public.iniciar_validacion_reversion(p_actor uuid, p_evento uuid)',
    'public.newsletter_alta_por_reserva_verificada()',
    'public.newsletter_marcar_sincronizados(p_items jsonb)',
    'public.newsletter_peticion_privilegiada()',
    'public.newsletter_registrar_baja(p_email text, p_origen text, p_suscriptor_id uuid)',
    'public.newsletter_suscriptores_normalizar_email()',
    'public.novedades_limpiar_foto()',
    'public.ocr_anadir_pagina(p_factura_id bigint, p_trabajo_id uuid, p_usuario uuid, p_pagina integer, p_paginas_total integer, p_cabecera jsonb, p_lineas jsonb, p_esperado jsonb, p_archivo_path text)',
    'public.ocr_cerrar_pagina(p_pagina_id bigint, p_resultado jsonb, p_recuento jsonb, p_verificacion jsonb, p_motivos jsonb, p_filas_extraidas integer, p_filas_contadas integer, p_relecturas integer, p_duracion_ms integer, p_tokens_entrada integer, p_tokens_salida integer, p_coste numeric, p_contexto jsonb, p_modelo text)',
    'public.ocr_despachar(p_trabajo_id uuid)',
    'public.ocr_despachar_cola()',
    'public.ocr_factura_existente(p_numero text, p_proveedor text, p_cif text, p_fecha date, p_total numeric)',
    'public.ocr_fallo_pagina(p_pagina_id bigint, p_error text)',
    'public.ocr_pedir_relectura(p_trabajo_id uuid, p_paginas jsonb)',
    'public.ocr_reclamar_consolidacion(p_trabajo_id uuid, p_lease_seg integer)',
    'public.ocr_reclamar_pagina(p_pagina_id bigint, p_lease_seg integer)',
    'public.ocr_resumen_factura_datos(p_factura_id bigint)',
    'public.ocr_sumar_gasto(p_trabajo_id uuid, p_coste numeric, p_llamadas integer)',
    'public.ocr_sustituir_factura(p_factura_id bigint, p_trabajo_id uuid, p_usuario uuid, p_cabecera jsonb, p_lineas jsonb, p_esperado jsonb, p_archivo_path text)',
    'public.ocr_terminar_trabajo(p_trabajo_id uuid, p_estado text, p_resultado jsonb, p_factura_id bigint, p_error text, p_documento_pendiente jsonb)',
    'public.openai_despachar_sincronizacion_costes()',
    'public.preparar_contexto_auditoria_auth(p_actor_id uuid, p_operacion text, p_user_id uuid, p_email text)',
    'public.productos_aplicar_clasificacion_ia(p_items jsonb)',
    'public.productos_avisar_subidas(p_ids bigint[])',
    'public.productos_despachar_clasificacion()',
    'public.productos_factura_asignar_producto()',
    'public.productos_factura_aviso_precio()',
    'public.productos_tocar_updated_at()',
    'public.proveedor_resolver(p_nombre text, p_cif text, p_crear boolean)',
    'public.proveedores_mantener_alias()',
    'public.reanudar_trabajos_ocr()',
    'public.recalcular_alertas_factura(p_factura_id bigint)',
    'public.registrar_accion_auditoria_panel(p_operacion text, p_detalles jsonb)',
    'public.reservas_proteger_consentimiento_newsletter()',
    'public.revertir_cambio_auditoria(p_evento uuid, p_actor uuid, p_confirmar boolean)',
    'public.siguiente_numero_factura_cheque_regalo(p_anio integer)',
    'public.solicitudes_proteger_consentimiento_newsletter()',
    'public.trg_facturas_vincular_albaranes()',
    'public.trg_productos_factura_normalizar_unidad()',
    'public.trg_productos_factura_rellenar_contenido()',
    'public.trg_productos_factura_vincular_albaranes()',
    'public.update_sell_users_updated_at()',
    'public.update_updated_at_column()',
    'public.vincular_albaranes_proveedor(p_proveedor_id bigint)'
  ];
  solo_auth text[] := array['private.sesion_panel_permitida()'];
  nadie text[] := array[
    'private.cheques_controlar_caducidad()',
    'private.sincronizar_bloqueo_usuario()',
    'public.instalar_auditoria_panel()'
  ];
  r record;
  hechas int := 0;
  esperadas int := cardinality(auth_srv) + cardinality(solo_srv) + cardinality(solo_auth) + cardinality(nadie);
begin
  if cardinality(auth_srv) <> 119 or cardinality(solo_srv) <> 69 or cardinality(solo_auth) <> 1 or cardinality(nadie) <> 3 then
    raise exception 'Listas incompletas: % / % / % / %', cardinality(auth_srv), cardinality(solo_srv), cardinality(solo_auth), cardinality(nadie);
  end if;
  for r in
    select p.oid::regprocedure as fn,
      n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public','private','inventory') and p.prokind in ('f','p')
  loop
    if r.sig = any(auth_srv) then
      execute format('revoke execute on function %s from public, anon', r.fn);
      execute format('grant execute on function %s to authenticated, service_role', r.fn);
    elsif r.sig = any(solo_srv) then
      execute format('revoke execute on function %s from public, anon, authenticated', r.fn);
      execute format('grant execute on function %s to service_role', r.fn);
    elsif r.sig = any(solo_auth) then
      execute format('revoke execute on function %s from public, anon, service_role', r.fn);
      execute format('grant execute on function %s to authenticated', r.fn);
    elsif r.sig = any(nadie) then
      execute format('revoke execute on function %s from public, anon, authenticated, service_role', r.fn);
    else
      continue;
    end if;
    hechas := hechas + 1;
  end loop;
  if hechas <> esperadas then
    raise exception 'Solo se encontraron % de % funciones: no se cambia nada', hechas, esperadas;
  end if;
  raise notice 'Permisos restaurados en % funciones', hechas;
end $$;
