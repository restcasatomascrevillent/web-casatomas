export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_feature_toggles: {
        Row: {
          enabled: boolean
          id: string
          label: string
          section_key: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          id?: string
          label: string
          section_key: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          id?: string
          label?: string
          section_key?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ajustes_mesa_servicio: {
        Row: {
          espacio_id: string
          fecha: string
          id: string
          mesa_id: string
          picos: number
          piezas: number
          plazas: number | null
          turno: string
          unida_a: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          espacio_id: string
          fecha: string
          id?: string
          mesa_id: string
          picos?: number
          piezas: number
          plazas?: number | null
          turno: string
          unida_a?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          espacio_id?: string
          fecha?: string
          id?: string
          mesa_id?: string
          picos?: number
          piezas?: number
          plazas?: number | null
          turno?: string
          unida_a?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_mesa_servicio_espacio_id_fkey"
            columns: ["espacio_id"]
            isOneToOne: false
            referencedRelation: "espacios_reserva"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_mesa_servicio_espacio_id_fkey"
            columns: ["espacio_id"]
            isOneToOne: false
            referencedRelation: "vista_capacidad_espacios"
            referencedColumns: ["espacio_id"]
          },
          {
            foreignKeyName: "ajustes_mesa_servicio_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_mesa_servicio_unida_a_fkey"
            columns: ["unida_a"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_stock: {
        Row: {
          created_at: string | null
          id: string
          notificar_email: boolean | null
          producto_id: string
          producto_tipo: string
          stock_minimo: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notificar_email?: boolean | null
          producto_id: string
          producto_tipo: string
          stock_minimo?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notificar_email?: boolean | null
          producto_id?: string
          producto_tipo?: string
          stock_minimo?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      areas_trabajo: {
        Row: {
          activa: boolean | null
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          activa?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          activa?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      asignaciones_mesa: {
        Row: {
          asignada_por: string | null
          created_at: string | null
          espacio_id: string
          fecha: string
          id: string
          mesa_id: string
          reserva_id: string
          turno: string
        }
        Insert: {
          asignada_por?: string | null
          created_at?: string | null
          espacio_id: string
          fecha: string
          id?: string
          mesa_id: string
          reserva_id: string
          turno: string
        }
        Update: {
          asignada_por?: string | null
          created_at?: string | null
          espacio_id?: string
          fecha?: string
          id?: string
          mesa_id?: string
          reserva_id?: string
          turno?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_mesa_espacio_id_fkey"
            columns: ["espacio_id"]
            isOneToOne: false
            referencedRelation: "espacios_reserva"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_mesa_espacio_id_fkey"
            columns: ["espacio_id"]
            isOneToOne: false
            referencedRelation: "vista_capacidad_espacios"
            referencedColumns: ["espacio_id"]
          },
          {
            foreignKeyName: "asignaciones_mesa_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_mesa_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_mesa_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "vista_asignacion_dia"
            referencedColumns: ["reserva_id"]
          },
          {
            foreignKeyName: "asignaciones_mesa_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "vista_reservas_pendientes"
            referencedColumns: ["id"]
          },
        ]
      }
      asignaciones_mesa_descartadas: {
        Row: {
          descartada_at: string | null
          espacio_id: string | null
          fecha: string | null
          id: string
          mesa_id: string | null
          mesa_nombre: string | null
          motivo: string | null
          reserva_id: string | null
          turno: string | null
        }
        Insert: {
          descartada_at?: string | null
          espacio_id?: string | null
          fecha?: string | null
          id?: string
          mesa_id?: string | null
          mesa_nombre?: string | null
          motivo?: string | null
          reserva_id?: string | null
          turno?: string | null
        }
        Update: {
          descartada_at?: string | null
          espacio_id?: string | null
          fecha?: string | null
          id?: string
          mesa_id?: string | null
          mesa_nombre?: string | null
          motivo?: string | null
          reserva_id?: string | null
          turno?: string | null
        }
        Relationships: []
      }
      audit_auth_context: {
        Row: {
          actor_email: string | null
          actor_user_id: string
          device_id: string | null
          expires_at: string
          id: string
          ip_address: string | null
          operacion: string
          request_id: string | null
          subject_email: string | null
          subject_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_user_id: string
          device_id?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          operacion: string
          request_id?: string | null
          subject_email?: string | null
          subject_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_user_id?: string
          device_id?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          operacion?: string
          request_id?: string | null
          subject_email?: string | null
          subject_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          accion: string
          actor_email: string | null
          actor_label: string
          actor_origin: string
          actor_user_id: string | null
          created_at: string
          detalles: Json | null
          device_id: string | null
          id: string
          ip_address: string | null
          registro_id: string | null
          request_id: string | null
          session_id: string | null
          tabla: string | null
          user_agent: string | null
        }
        Insert: {
          accion: string
          actor_email?: string | null
          actor_label: string
          actor_origin: string
          actor_user_id?: string | null
          created_at?: string
          detalles?: Json | null
          device_id?: string | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          request_id?: string | null
          session_id?: string | null
          tabla?: string | null
          user_agent?: string | null
        }
        Update: {
          accion?: string
          actor_email?: string | null
          actor_label?: string
          actor_origin?: string
          actor_user_id?: string | null
          created_at?: string
          detalles?: Json | null
          device_id?: string | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          request_id?: string | null
          session_id?: string | null
          tabla?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      avisos_reserva_enviados: {
        Row: {
          clave: string
          creado_at: string
          reserva_id: string
        }
        Insert: {
          clave: string
          creado_at?: string
          reserva_id: string
        }
        Update: {
          clave?: string
          creado_at?: string
          reserva_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_reserva_enviados_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_reserva_enviados_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "vista_asignacion_dia"
            referencedColumns: ["reserva_id"]
          },
          {
            foreignKeyName: "avisos_reserva_enviados_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "vista_reservas_pendientes"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos_subida_precio: {
        Row: {
          cambio_proveedor: boolean
          created_at: string
          factura_id: number
          notificacion_id: string | null
          precio: number
          precio_ref: number
          producto_id: number
          proveedor: string | null
          proveedor_ref: string | null
          revisado_en: string
          unidad: string
          variacion_pct: number
        }
        Insert: {
          cambio_proveedor?: boolean
          created_at?: string
          factura_id: number
          notificacion_id?: string | null
          precio: number
          precio_ref: number
          producto_id: number
          proveedor?: string | null
          proveedor_ref?: string | null
          revisado_en?: string
          unidad: string
          variacion_pct: number
        }
        Update: {
          cambio_proveedor?: boolean
          created_at?: string
          factura_id?: number
          notificacion_id?: string | null
          precio?: number
          precio_ref?: number
          producto_id?: number
          proveedor?: string | null
          proveedor_ref?: string | null
          revisado_en?: string
          unidad?: string
          variacion_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "avisos_subida_precio_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_subida_precio_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "vista_ultimos_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_subida_precio_notificacion_id_fkey"
            columns: ["notificacion_id"]
            isOneToOne: false
            referencedRelation: "notificaciones_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_subida_precio_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      Bebidas: {
        Row: {
          activado: boolean | null
          categoria: string | null
          categoria_en: string | null
          categoria_fr: string | null
          created_at: string | null
          descripcion: string | null
          descripcion_en: string | null
          descripcion_fr: string | null
          featured: boolean | null
          id: string
          imagen_url: string | null
          nombre: string | null
          nombre_en: string | null
          nombre_fr: string | null
          orden: number | null
          precio_eur: number | null
          restaurante: boolean | null
          tag: string | null
          tamano: string | null
          tipo: string | null
          touza: boolean | null
          traducciones: Json | null
          updated_at: string | null
        }
        Insert: {
          activado?: boolean | null
          categoria?: string | null
          categoria_en?: string | null
          categoria_fr?: string | null
          created_at?: string | null
          descripcion?: string | null
          descripcion_en?: string | null
          descripcion_fr?: string | null
          featured?: boolean | null
          id: string
          imagen_url?: string | null
          nombre?: string | null
          nombre_en?: string | null
          nombre_fr?: string | null
          orden?: number | null
          precio_eur?: number | null
          restaurante?: boolean | null
          tag?: string | null
          tamano?: string | null
          tipo?: string | null
          touza?: boolean | null
          traducciones?: Json | null
          updated_at?: string | null
        }
        Update: {
          activado?: boolean | null
          categoria?: string | null
          categoria_en?: string | null
          categoria_fr?: string | null
          created_at?: string | null
          descripcion?: string | null
          descripcion_en?: string | null
          descripcion_fr?: string | null
          featured?: boolean | null
          id?: string
          imagen_url?: string | null
          nombre?: string | null
          nombre_en?: string | null
          nombre_fr?: string | null
          orden?: number | null
          precio_eur?: number | null
          restaurante?: boolean | null
          tag?: string | null
          tamano?: string | null
          tipo?: string | null
          touza?: boolean | null
          traducciones?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      BebidasVENTA: {
        Row: {
          activado: boolean | null
          categoria: string | null
          categoria_en: string | null
          categoria_fr: string | null
          created_at: string | null
          denominacion_origen: string | null
          descripcion: string | null
          descripcion_en: string | null
          descripcion_fr: string | null
          featured: boolean | null
          id: string
          imagen_url: string | null
          nombre: string
          nombre_en: string | null
          nombre_fr: string | null
          orden: number | null
          precio_coste: number | null
          precio_eur: number | null
          stock: number | null
          ubicacion_pais: string | null
          ubicacion_region: string | null
          updated_at: string | null
        }
        Insert: {
          activado?: boolean | null
          categoria?: string | null
          categoria_en?: string | null
          categoria_fr?: string | null
          created_at?: string | null
          denominacion_origen?: string | null
          descripcion?: string | null
          descripcion_en?: string | null
          descripcion_fr?: string | null
          featured?: boolean | null
          id?: string
          imagen_url?: string | null
          nombre: string
          nombre_en?: string | null
          nombre_fr?: string | null
          orden?: number | null
          precio_coste?: number | null
          precio_eur?: number | null
          stock?: number | null
          ubicacion_pais?: string | null
          ubicacion_region?: string | null
          updated_at?: string | null
        }
        Update: {
          activado?: boolean | null
          categoria?: string | null
          categoria_en?: string | null
          categoria_fr?: string | null
          created_at?: string | null
          denominacion_origen?: string | null
          descripcion?: string | null
          descripcion_en?: string | null
          descripcion_fr?: string | null
          featured?: boolean | null
          id?: string
          imagen_url?: string | null
          nombre?: string
          nombre_en?: string | null
          nombre_fr?: string | null
          orden?: number | null
          precio_coste?: number | null
          precio_eur?: number | null
          stock?: number | null
          ubicacion_pais?: string | null
          ubicacion_region?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bew: {
        Row: {
          activado: boolean | null
          alergenos_inferidos: Json | null
          alergenos_notas: string | null
          alergenos_oficiales: Json | null
          categoria: string | null
          contiene_carne: boolean | null
          contiene_gluten: boolean | null
          contiene_huevo: boolean | null
          contiene_lacteos: boolean | null
          contiene_lactosa: boolean | null
          contiene_marisco: boolean | null
          contiene_pescado: boolean | null
          created_at: string | null
          descripcion: string | null
          id: string | null
          imagen_url: string | null
          nombre: string | null
          orden: string | null
          precio_eur: number | null
          unidad: string | null
          updated_at: string | null
        }
        Insert: {
          activado?: boolean | null
          alergenos_inferidos?: Json | null
          alergenos_notas?: string | null
          alergenos_oficiales?: Json | null
          categoria?: string | null
          contiene_carne?: boolean | null
          contiene_gluten?: boolean | null
          contiene_huevo?: boolean | null
          contiene_lacteos?: boolean | null
          contiene_lactosa?: boolean | null
          contiene_marisco?: boolean | null
          contiene_pescado?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string | null
          imagen_url?: string | null
          nombre?: string | null
          orden?: string | null
          precio_eur?: number | null
          unidad?: string | null
          updated_at?: string | null
        }
        Update: {
          activado?: boolean | null
          alergenos_inferidos?: Json | null
          alergenos_notas?: string | null
          alergenos_oficiales?: Json | null
          categoria?: string | null
          contiene_carne?: boolean | null
          contiene_gluten?: boolean | null
          contiene_huevo?: boolean | null
          contiene_lacteos?: boolean | null
          contiene_lactosa?: boolean | null
          contiene_marisco?: boolean | null
          contiene_pescado?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string | null
          imagen_url?: string | null
          nombre?: string | null
          orden?: string | null
          precio_eur?: number | null
          unidad?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      blacklist: {
        Row: {
          aprobada_en: string | null
          aprobado_por: string | null
          caduca_el: string | null
          created_at: string
          id: string
          motivo: string | null
          nombre: string | null
          tipo: string
          updated_at: string
          valor: string
        }
        Insert: {
          aprobada_en?: string | null
          aprobado_por?: string | null
          caduca_el?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          nombre?: string | null
          tipo: string
          updated_at?: string
          valor: string
        }
        Update: {
          aprobada_en?: string | null
          aprobado_por?: string | null
          caduca_el?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          nombre?: string | null
          tipo?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          audio_metrics: Json | null
          call_success: boolean | null
          call_type: string | null
          caller_number: string | null
          cost_breakdown: Json | null
          cost_total_eur: number | null
          cost_total_usd: number | null
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          ended_reason: string | null
          id: string
          reservation_extraction: Json | null
          restaurant_id: string
          sentiment: string | null
          started_at: string | null
          status: string | null
          structured_data: Json | null
          structured_outputs: Json | null
          success_evaluation: string | null
          summary: string | null
          tool_calls: Json | null
          vapi_call_id: string | null
        }
        Insert: {
          audio_metrics?: Json | null
          call_success?: boolean | null
          call_type?: string | null
          caller_number?: string | null
          cost_breakdown?: Json | null
          cost_total_eur?: number | null
          cost_total_usd?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          reservation_extraction?: Json | null
          restaurant_id: string
          sentiment?: string | null
          started_at?: string | null
          status?: string | null
          structured_data?: Json | null
          structured_outputs?: Json | null
          success_evaluation?: string | null
          summary?: string | null
          tool_calls?: Json | null
          vapi_call_id?: string | null
        }
        Update: {
          audio_metrics?: Json | null
          call_success?: boolean | null
          call_type?: string | null
          caller_number?: string | null
          cost_breakdown?: Json | null
          cost_total_eur?: number | null
          cost_total_usd?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          reservation_extraction?: Json | null
          restaurant_id?: string
          sentiment?: string | null
          started_at?: string | null
          status?: string | null
          structured_data?: Json | null
          structured_outputs?: Json | null
          success_evaluation?: string | null
          summary?: string | null
          tool_calls?: Json | null
          vapi_call_id?: string | null
        }
        Relationships: []
      }
      campanas_marketing: {
        Row: {
          canal: string
          clics: number | null
          created_at: string | null
          estado: string | null
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          nombre: string
          presupuesto: number | null
          reservas_generadas: number | null
          updated_at: string | null
          visitas_web: number | null
        }
        Insert: {
          canal: string
          clics?: number | null
          created_at?: string | null
          estado?: string | null
          fecha_fin?: string | null
          fecha_inicio: string
          id?: string
          nombre: string
          presupuesto?: number | null
          reservas_generadas?: number | null
          updated_at?: string | null
          visitas_web?: number | null
        }
        Update: {
          canal?: string
          clics?: number | null
          created_at?: string | null
          estado?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          nombre?: string
          presupuesto?: number | null
          reservas_generadas?: number | null
          updated_at?: string | null
          visitas_web?: number | null
        }
        Relationships: []
      }
      carrito: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          producto_id: string
          producto_tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          id?: string
          producto_id: string
          producto_tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          producto_id?: string
          producto_tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categorias_producto: {
        Row: {
          activa: boolean
          clave: string | null
          created_at: string
          descripcion: string | null
          id: number
          nombre: string
          orden: number
          padre_id: number | null
          updated_at: string
        }
        Insert: {
          activa?: boolean
          clave?: string | null
          created_at?: string
          descripcion?: string | null
          id?: never
          nombre: string
          orden?: number
          padre_id?: number | null
          updated_at?: string
        }
        Update: {
          activa?: boolean
          clave?: string | null
          created_at?: string
          descripcion?: string | null
          id?: never
          nombre?: string
          orden?: number
          padre_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_producto_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "categorias_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_web_config: {
        Row: {
          activo: boolean
          alerta_pct: number
          duracion_max_min: number
          id: boolean
          max_chars: number
          max_output_tokens: number
          max_req_dia: number
          max_req_ip_hora: number
          max_req_sesion_hora: number
          max_turnos: number
          presupuesto_dia_usd: number
          telefono: string
          updated_at: string
          url_reservas: string | null
        }
        Insert: {
          activo?: boolean
          alerta_pct?: number
          duracion_max_min?: number
          id?: boolean
          max_chars?: number
          max_output_tokens?: number
          max_req_dia?: number
          max_req_ip_hora?: number
          max_req_sesion_hora?: number
          max_turnos?: number
          presupuesto_dia_usd?: number
          telefono?: string
          updated_at?: string
          url_reservas?: string | null
        }
        Update: {
          activo?: boolean
          alerta_pct?: number
          duracion_max_min?: number
          id?: boolean
          max_chars?: number
          max_output_tokens?: number
          max_req_dia?: number
          max_req_ip_hora?: number
          max_req_sesion_hora?: number
          max_turnos?: number
          presupuesto_dia_usd?: number
          telefono?: string
          updated_at?: string
          url_reservas?: string | null
        }
        Relationships: []
      }
      chat_web_conversaciones: {
        Row: {
          created_at: string
          id: string
          idioma: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          idioma?: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          idioma?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_web_mensajes: {
        Row: {
          contenido: string
          conversacion_id: string
          created_at: string
          id: string
          ip: string | null
          rol: string
          session_id: string
        }
        Insert: {
          contenido: string
          conversacion_id: string
          created_at?: string
          id?: string
          ip?: string | null
          rol: string
          session_id: string
        }
        Update: {
          contenido?: string
          conversacion_id?: string
          created_at?: string
          id?: string
          ip?: string | null
          rol?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_web_mensajes_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "chat_web_conversaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_web_uso: {
        Row: {
          cached_tokens: number
          completion_tokens: number
          conversacion_id: string | null
          coste_usd: number
          created_at: string
          estado: string
          id: string
          ip_hash: string | null
          llamadas_openai: number
          modelo: string | null
          motivo: string | null
          prompt_tokens: number
          session_id: string
        }
        Insert: {
          cached_tokens?: number
          completion_tokens?: number
          conversacion_id?: string | null
          coste_usd?: number
          created_at?: string
          estado: string
          id?: string
          ip_hash?: string | null
          llamadas_openai?: number
          modelo?: string | null
          motivo?: string | null
          prompt_tokens?: number
          session_id: string
        }
        Update: {
          cached_tokens?: number
          completion_tokens?: number
          conversacion_id?: string | null
          coste_usd?: number
          created_at?: string
          estado?: string
          id?: string
          ip_hash?: string | null
          llamadas_openai?: number
          modelo?: string | null
          motivo?: string | null
          prompt_tokens?: number
          session_id?: string
        }
        Relationships: []
      }
      cheques_regalo: {
        Row: {
          caduca_el: string | null
          canjeado_en: string | null
          canjeado_por: string | null
          codigo: string | null
          comprador_email: string
          comprador_nombre: string
          comprador_telefono: string | null
          creado_por: string | null
          created_at: string
          datos_factura: Json | null
          destinatario_nombre: string | null
          email_enviado_en: string | null
          emitido_en: string | null
          estado: string
          factura_enviada_en: string | null
          factura_nif: string | null
          factura_numero: string | null
          fecha_entrega_deseada: string | null
          id: string
          importe_eur: number
          mensaje: string | null
          ocultar_importe: boolean
          origen: string
          pago_manual_metodo: string | null
          plantilla_cheque: Json | null
          quiere_factura: boolean
          solicita_factura: boolean
          solicitud_manual_id: string | null
          stripe_fee_eur: number | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          usado: boolean
          usado_en: string | null
          usado_por: string | null
        }
        Insert: {
          caduca_el?: string | null
          canjeado_en?: string | null
          canjeado_por?: string | null
          codigo?: string | null
          comprador_email: string
          comprador_nombre: string
          comprador_telefono?: string | null
          creado_por?: string | null
          created_at?: string
          datos_factura?: Json | null
          destinatario_nombre?: string | null
          email_enviado_en?: string | null
          emitido_en?: string | null
          estado?: string
          factura_enviada_en?: string | null
          factura_nif?: string | null
          factura_numero?: string | null
          fecha_entrega_deseada?: string | null
          id?: string
          importe_eur: number
          mensaje?: string | null
          ocultar_importe?: boolean
          origen?: string
          pago_manual_metodo?: string | null
          plantilla_cheque?: Json | null
          quiere_factura?: boolean
          solicita_factura?: boolean
          solicitud_manual_id?: string | null
          stripe_fee_eur?: number | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          usado?: boolean
          usado_en?: string | null
          usado_por?: string | null
        }
        Update: {
          caduca_el?: string | null
          canjeado_en?: string | null
          canjeado_por?: string | null
          codigo?: string | null
          comprador_email?: string
          comprador_nombre?: string
          comprador_telefono?: string | null
          creado_por?: string | null
          created_at?: string
          datos_factura?: Json | null
          destinatario_nombre?: string | null
          email_enviado_en?: string | null
          emitido_en?: string | null
          estado?: string
          factura_enviada_en?: string | null
          factura_nif?: string | null
          factura_numero?: string | null
          fecha_entrega_deseada?: string | null
          id?: string
          importe_eur?: number
          mensaje?: string | null
          ocultar_importe?: boolean
          origen?: string
          pago_manual_metodo?: string | null
          plantilla_cheque?: Json | null
          quiere_factura?: boolean
          solicita_factura?: boolean
          solicitud_manual_id?: string | null
          stripe_fee_eur?: number | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          usado?: boolean
          usado_en?: string | null
          usado_por?: string | null
        }
        Relationships: []
      }
      cierres_reserva: {
        Row: {
          abierto: boolean
          created_at: string
          created_by: string | null
          fecha: string
          motivo: string | null
          turno: string
        }
        Insert: {
          abierto?: boolean
          created_at?: string
          created_by?: string | null
          fecha: string
          motivo?: string | null
          turno: string
        }
        Update: {
          abierto?: boolean
          created_at?: string
          created_by?: string | null
          fecha?: string
          motivo?: string | null
          turno?: string
        }
        Relationships: []
      }
      client_messages: {
        Row: {
          client_id: string
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          is_read: boolean
          message: string
          sender_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean
          message?: string
          sender_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean
          message?: string
          sender_id?: string
        }
        Relationships: []
      }
      Cocteles: {
        Row: {
          activado: boolean | null
          alergenos_notas: string | null
          alergenos_oficiales: Json | null
          base: string | null
          categoria: string | null
          categoria_en: string | null
          categoria_fr: string | null
          created_at: string | null
          descripcion: string | null
          descripcion_en: string | null
          descripcion_fr: string | null
          featured: boolean | null
          id: string
          imagen_url: string | null
          ingredientes: string | null
          ingredientes_en: string | null
          ingredientes_fr: string | null
          nombre: string | null
          nombre_en: string | null
          nombre_fr: string | null
          orden: number | null
          precio_eur: number | null
          preparacion: string | null
          restaurante: boolean | null
          touza: boolean | null
          traducciones: Json | null
          updated_at: string | null
        }
        Insert: {
          activado?: boolean | null
          alergenos_notas?: string | null
          alergenos_oficiales?: Json | null
          base?: string | null
          categoria?: string | null
          categoria_en?: string | null
          categoria_fr?: string | null
          created_at?: string | null
          descripcion?: string | null
          descripcion_en?: string | null
          descripcion_fr?: string | null
          featured?: boolean | null
          id?: string
          imagen_url?: string | null
          ingredientes?: string | null
          ingredientes_en?: string | null
          ingredientes_fr?: string | null
          nombre?: string | null
          nombre_en?: string | null
          nombre_fr?: string | null
          orden?: number | null
          precio_eur?: number | null
          preparacion?: string | null
          restaurante?: boolean | null
          touza?: boolean | null
          traducciones?: Json | null
          updated_at?: string | null
        }
        Update: {
          activado?: boolean | null
          alergenos_notas?: string | null
          alergenos_oficiales?: Json | null
          base?: string | null
          categoria?: string | null
          categoria_en?: string | null
          categoria_fr?: string | null
          created_at?: string | null
          descripcion?: string | null
          descripcion_en?: string | null
          descripcion_fr?: string | null
          featured?: boolean | null
          id?: string
          imagen_url?: string | null
          ingredientes?: string | null
          ingredientes_en?: string | null
          ingredientes_fr?: string | null
          nombre?: string | null
          nombre_en?: string | null
          nombre_fr?: string | null
          orden?: number | null
          precio_eur?: number | null
          preparacion?: string | null
          restaurante?: boolean | null
          touza?: boolean | null
          traducciones?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ComidaVENTA: {
        Row: {
          activado: boolean | null
          categoria: string | null
          categoria_en: string | null
          categoria_fr: string | null
          created_at: string | null
          descripcion: string | null
          descripcion_en: string | null
          descripcion_fr: string | null
          featured: boolean | null
          id: string
          imagen_url: string | null
          nombre: string
          nombre_en: string | null
          nombre_fr: string | null
          orden: number | null
          origen: string | null
          peso: string | null
          precio_coste: number | null
          precio_eur: number | null
          stock: number | null
          updated_at: string | null
        }
        Insert: {
          activado?: boolean | null
          categoria?: string | null
          categoria_en?: string | null
          categoria_fr?: string | null
          created_at?: string | null
          descripcion?: string | null
          descripcion_en?: string | null
          descripcion_fr?: string | null
          featured?: boolean | null
          id?: string
          imagen_url?: string | null
          nombre: string
          nombre_en?: string | null
          nombre_fr?: string | null
          orden?: number | null
          origen?: string | null
          peso?: string | null
          precio_coste?: number | null
          precio_eur?: number | null
          stock?: number | null
          updated_at?: string | null
        }
        Update: {
          activado?: boolean | null
          categoria?: string | null
          categoria_en?: string | null
          categoria_fr?: string | null
          created_at?: string | null
          descripcion?: string | null
          descripcion_en?: string | null
          descripcion_fr?: string | null
          featured?: boolean | null
          id?: string
          imagen_url?: string | null
          nombre?: string
          nombre_en?: string | null
          nombre_fr?: string | null
          orden?: number | null
          origen?: string | null
          peso?: string | null
          precio_coste?: number | null
          precio_eur?: number | null
          stock?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      config_google_places: {
        Row: {
          created_at: string | null
          direccion: string | null
          id: string
          place_id: string
          place_name: string
          rating_promedio: number | null
          telefono: string | null
          total_resenas: number | null
          ultima_sincronizacion: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          direccion?: string | null
          id?: string
          place_id: string
          place_name: string
          rating_promedio?: number | null
          telefono?: string | null
          total_resenas?: number | null
          ultima_sincronizacion?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          direccion?: string | null
          id?: string
          place_id?: string
          place_name?: string
          rating_promedio?: number | null
          telefono?: string | null
          total_resenas?: number | null
          ultima_sincronizacion?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      config_redes_sociales: {
        Row: {
          access_token: string | null
          account_id: string | null
          activo: boolean | null
          created_at: string | null
          id: string
          page_id: string | null
          red_social: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          activo?: boolean | null
          created_at?: string | null
          id?: string
          page_id?: string | null
          red_social: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          activo?: boolean | null
          created_at?: string | null
          id?: string
          page_id?: string | null
          red_social?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      configBotWeb: {
        Row: {
          created_at: string
          frases_personalizadas: string | null
          id: string
          idioma: string | null
          instrucciones_extra: string | null
          mensaje_bienvenida: string | null
          platos_recomendados: string | null
          tono: string | null
          updated_at: string
          vinos_recomendados: string | null
        }
        Insert: {
          created_at?: string
          frases_personalizadas?: string | null
          id?: string
          idioma?: string | null
          instrucciones_extra?: string | null
          mensaje_bienvenida?: string | null
          platos_recomendados?: string | null
          tono?: string | null
          updated_at?: string
          vinos_recomendados?: string | null
        }
        Update: {
          created_at?: string
          frases_personalizadas?: string | null
          id?: string
          idioma?: string | null
          instrucciones_extra?: string | null
          mensaje_bienvenida?: string | null
          platos_recomendados?: string | null
          tono?: string | null
          updated_at?: string
          vinos_recomendados?: string | null
        }
        Relationships: []
      }
      configuracion_facturas: {
        Row: {
          avisos_subida_precio: boolean
          id: boolean
          tope_ia_mes_eur: number
          umbral_subida_precio_pct: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          avisos_subida_precio?: boolean
          id?: boolean
          tope_ia_mes_eur?: number
          umbral_subida_precio_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          avisos_subida_precio?: boolean
          id?: boolean
          tope_ia_mes_eur?: number
          umbral_subida_precio_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      configuracion_reservas: {
        Row: {
          asignacion_aviso_activo: boolean
          asignacion_espacios_excluidos: string[]
          asignacion_mesas_excluidas: string[]
          asignacion_ventana_horas: number
          auto_confirmar: boolean
          created_at: string
          dias_cerrados_cena: number[]
          dias_cerrados_comida: number[]
          dias_max_antelacion: number
          email_obligatorio: boolean
          estancia_cena_minutos: number
          estancia_comida_minutos: number
          id: string
          max_comensales_por_reserva: number
          max_reservas_por_email_dia: number
          max_reservas_por_telefono_dia: number
          min_comensales_por_reserva: number
          minutos_corte_antes_servicio: number
          retraso_gracia_minutos: number
          telefono_obligatorio: boolean
          updated_at: string
        }
        Insert: {
          asignacion_aviso_activo?: boolean
          asignacion_espacios_excluidos?: string[]
          asignacion_mesas_excluidas?: string[]
          asignacion_ventana_horas?: number
          auto_confirmar?: boolean
          created_at?: string
          dias_cerrados_cena?: number[]
          dias_cerrados_comida?: number[]
          dias_max_antelacion?: number
          email_obligatorio?: boolean
          estancia_cena_minutos?: number
          estancia_comida_minutos?: number
          id?: string
          max_comensales_por_reserva?: number
          max_reservas_por_email_dia?: number
          max_reservas_por_telefono_dia?: number
          min_comensales_por_reserva?: number
          minutos_corte_antes_servicio?: number
          retraso_gracia_minutos?: number
          telefono_obligatorio?: boolean
          updated_at?: string
        }
        Update: {
          asignacion_aviso_activo?: boolean
          asignacion_espacios_excluidos?: string[]
          asignacion_mesas_excluidas?: string[]
          asignacion_ventana_horas?: number
          auto_confirmar?: boolean
          created_at?: string
          dias_cerrados_cena?: number[]
          dias_cerrados_comida?: number[]
          dias_max_antelacion?: number
          email_obligatorio?: boolean
          estancia_cena_minutos?: number
          estancia_comida_minutos?: number
          id?: string
          max_comensales_por_reserva?: number
          max_reservas_por_email_dia?: number
          max_reservas_por_telefono_dia?: number
          min_comensales_por_reserva?: number
          minutos_corte_antes_servicio?: number
          retraso_gracia_minutos?: number
          telefono_obligatorio?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      configuracion_turnos: {
        Row: {
          activo: boolean
          base_umbral: string
          created_at: string
          dias_semana: number[]
          espacio_id: string | null
          hora_fin: string
          hora_inicio: string
          id: string
          intervalo_base_minutos: number
          niveles_escalera: Json | null
          nombre_periodo: string
          ocultar_nivel_anterior: boolean
          ocultar_primario_si_secundario: boolean
          umbral_apertura_secundario: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          base_umbral?: string
          created_at?: string
          dias_semana?: number[]
          espacio_id?: string | null
          hora_fin: string
          hora_inicio: string
          id?: string
          intervalo_base_minutos?: number
          niveles_escalera?: Json | null
          nombre_periodo: string
          ocultar_nivel_anterior?: boolean
          ocultar_primario_si_secundario?: boolean
          umbral_apertura_secundario?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          base_umbral?: string
          created_at?: string
          dias_semana?: number[]
          espacio_id?: string | null
          hora_fin?: string
          hora_inicio?: string
          id?: string
          intervalo_base_minutos?: number
          niveles_escalera?: Json | null
          nombre_periodo?: string
          ocultar_nivel_anterior?: boolean
          ocultar_primario_si_secundario?: boolean
          umbral_apertura_secundario?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_turnos_espacio_id_fkey"
            columns: ["espacio_id"]
            isOneToOne: false
            referencedRelation: "espacios_reserva"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracion_turnos_espacio_id_fkey"
            columns: ["espacio_id"]
            isOneToOne: false
            referencedRelation: "vista_capacidad_espacios"
            referencedColumns: ["espacio_id"]
          },
        ]
      }
      configuracion_web: {
        Row: {
          id: boolean
          mostrar_fotos_platos_casa_tomas: boolean
          mostrar_fotos_platos_touza: boolean
          mostrar_menu_dia_casa_tomas: boolean
          mostrar_tapas_casa_tomas: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          mostrar_fotos_platos_casa_tomas?: boolean
          mostrar_fotos_platos_touza?: boolean
          mostrar_menu_dia_casa_tomas?: boolean
          mostrar_tapas_casa_tomas?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          mostrar_fotos_platos_casa_tomas?: boolean
          mostrar_fotos_platos_touza?: boolean
          mostrar_menu_dia_casa_tomas?: boolean
          mostrar_tapas_casa_tomas?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      consultas_chatbot: {
        Row: {
          created_at: string | null
          embedding: string | null
          id: number
          pregunta: string
          respuesta: string | null
          resultados: Json | null
          sql_generado: string | null
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          id?: number
          pregunta: string
          respuesta?: string | null
          resultados?: Json | null
          sql_generado?: string | null
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          id?: number
          pregunta?: string
          respuesta?: string | null
          resultados?: Json | null
          sql_generado?: string | null
        }
        Relationships: []
      }
      conversaciones: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          titulo: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          titulo?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          titulo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      costes_fijos: {
        Row: {
          activo: boolean
          actualizado_en: string
          categoria: string
          concepto: string
          creado_en: string
          eur_mes: number | null
          id: string
          naturaleza: string
          notas: string | null
          orden: number
          proveedor: string
          verificado_en: string | null
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          categoria: string
          concepto: string
          creado_en?: string
          eur_mes?: number | null
          id?: string
          naturaleza: string
          notas?: string | null
          orden?: number
          proveedor: string
          verificado_en?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          categoria?: string
          concepto?: string
          creado_en?: string
          eur_mes?: number | null
          id?: string
          naturaleza?: string
          notas?: string | null
          orden?: number
          proveedor?: string
          verificado_en?: string | null
        }
        Relationships: []
      }
      dashboard_config: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          nombre_vista: string
          orden_widgets: Json
          updated_at: string | null
          user_id: string
          widgets_activos: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          nombre_vista: string
          orden_widgets?: Json
          updated_at?: string | null
          user_id: string
          widgets_activos?: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          nombre_vista?: string
          orden_widgets?: Json
          updated_at?: string | null
          user_id?: string
          widgets_activos?: Json
        }
        Relationships: []
      }
      direcciones_email_suprimidas: {
        Row: {
          actualizado_at: string
          created_at: string
          detalle: string | null
          email: string
          motivo: string
          origen_email_id: string | null
        }
        Insert: {
          actualizado_at?: string
          created_at?: string
          detalle?: string | null
          email: string
          motivo: string
          origen_email_id?: string | null
        }
        Update: {
          actualizado_at?: string
          created_at?: string
          detalle?: string | null
          email?: string
          motivo?: string
          origen_email_id?: string | null
        }
        Relationships: []
      }
      documentos: {
        Row: {
          created_at: string
          fecha: string | null
          id: string
          importe_total: number | null
          moneda: string | null
          nombre_archivo: string | null
          numero_documento: string
          proveedor: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          fecha?: string | null
          id?: string
          importe_total?: number | null
          moneda?: string | null
          nombre_archivo?: string | null
          numero_documento: string
          proveedor?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          fecha?: string | null
          id?: string
          importe_total?: number | null
          moneda?: string | null
          nombre_archivo?: string | null
          numero_documento?: string
          proveedor?: string | null
          tipo?: string
        }
        Relationships: []
      }
      email_eventos: {
        Row: {
          created_at: string | null
          email_destinatario: string | null
          email_id: string
          id: string
          metadata: Json | null
          timestamp_evento: string | null
          tipo_evento: string
        }
        Insert: {
          created_at?: string | null
          email_destinatario?: string | null
          email_id: string
          id?: string
          metadata?: Json | null
          timestamp_evento?: string | null
          tipo_evento: string
        }
        Update: {
          created_at?: string | null
          email_destinatario?: string | null
          email_id?: string
          id?: string
          metadata?: Json | null
          timestamp_evento?: string | null
          tipo_evento?: string
        }
        Relationships: []
      }
      envios_email_reserva: {
        Row: {
          clave_aviso: string | null
          creado_at: string
          destinatario: string
          detalle: Json | null
          enviado_at: string | null
          error: string | null
          estado_entrega: string | null
          estado_entrega_at: string | null
          estado_entrega_detalle: string | null
          id: string
          intentos: number
          plantilla_id: string | null
          proximo_reintento_en: string | null
          resend_id: string | null
          reserva_id: string
          resultado: string
          tipo_email: string
          ultimo_intento_at: string
        }
        Insert: {
          clave_aviso?: string | null
          creado_at?: string
          destinatario: string
          detalle?: Json | null
          enviado_at?: string | null
          error?: string | null
          estado_entrega?: string | null
          estado_entrega_at?: string | null
          estado_entrega_detalle?: string | null
          id?: string
          intentos?: number
          plantilla_id?: string | null
          proximo_reintento_en?: string | null
          resend_id?: string | null
          reserva_id: string
          resultado?: string
          tipo_email: string
          ultimo_intento_at?: string
        }
        Update: {
          clave_aviso?: string | null
          creado_at?: string
          destinatario?: string
          detalle?: Json | null
          enviado_at?: string | null
          error?: string | null
          estado_entrega?: string | null
          estado_entrega_at?: string | null
          estado_entrega_detalle?: string | null
          id?: string
          intentos?: number
          plantilla_id?: string | null
          proximo_reintento_en?: string | null
          resend_id?: string | null
          reserva_id?: string
          resultado?: string
          tipo_email?: string
          ultimo_intento_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "envios_email_reserva_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "plantillas_email_reserva"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_email_reserva_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_email_reserva_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "vista_asignacion_dia"
            referencedColumns: ["reserva_id"]
          },
          {
            foreignKeyName: "envios_email_reserva_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "vista_reservas_pendientes"
            referencedColumns: ["id"]
          },
        ]
      }
      espacios_reserva: {
        Row: {
          activa: boolean | null
          capacidad_maxima: number
          caracteristicas: Json | null
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string | null
        }
        Insert: {
          activa?: boolean | null
          capacidad_maxima: number
          caracteristicas?: Json | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string | null
        }
        Update: {
          activa?: boolean | null
          capacidad_maxima?: number
          caracteristicas?: Json | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      estadisticas_redes: {
        Row: {
          alcance: number | null
          comentarios_totales: number | null
          created_at: string | null
          engagement_rate: number | null
          fecha: string
          id: string
          likes_totales: number | null
          publicaciones_mes: number | null
          red_social: string
          seguidores: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          alcance?: number | null
          comentarios_totales?: number | null
          created_at?: string | null
          engagement_rate?: number | null
          fecha?: string
          id?: string
          likes_totales?: number | null
          publicaciones_mes?: number | null
          red_social: string
          seguidores?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          alcance?: number | null
          comentarios_totales?: number | null
          created_at?: string | null
          engagement_rate?: number | null
          fecha?: string
          id?: string
          likes_totales?: number | null
          publicaciones_mes?: number | null
          red_social?: string
          seguidores?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      factura_contadores: {
        Row: {
          anio: number
          siguiente: number
        }
        Insert: {
          anio: number
          siguiente?: number
        }
        Update: {
          anio?: number
          siguiente?: number
        }
        Relationships: []
      }
      facturas: {
        Row: {
          alertas_validacion: Json | null
          archivo_path: string | null
          cif: string | null
          coste_lectura_usd: number | null
          created_at: string | null
          drive_url: string | null
          embedding: string | null
          embedding_observaciones: string | null
          facturado_en_id: number | null
          facturado_origen: string | null
          fecha: string
          id: number
          iva: number | null
          lectura_llamadas: number | null
          lectura_modelo: string | null
          numero_documento: string
          observaciones: string | null
          ocr_trabajo_id: string | null
          paginas: number
          procesado_en: string | null
          proveedor: string | null
          proveedor_id: number | null
          proveedor_normalizado: string | null
          resumen: string | null
          subtotal: number | null
          tipo: string
          total: number | null
          total_origen: string | null
          updated_at: string | null
          verificacion_origen: string | null
          verificada: boolean | null
        }
        Insert: {
          alertas_validacion?: Json | null
          archivo_path?: string | null
          cif?: string | null
          coste_lectura_usd?: number | null
          created_at?: string | null
          drive_url?: string | null
          embedding?: string | null
          embedding_observaciones?: string | null
          facturado_en_id?: number | null
          facturado_origen?: string | null
          fecha: string
          id?: number
          iva?: number | null
          lectura_llamadas?: number | null
          lectura_modelo?: string | null
          numero_documento: string
          observaciones?: string | null
          ocr_trabajo_id?: string | null
          paginas?: number
          procesado_en?: string | null
          proveedor?: string | null
          proveedor_id?: number | null
          proveedor_normalizado?: string | null
          resumen?: string | null
          subtotal?: number | null
          tipo: string
          total?: number | null
          total_origen?: string | null
          updated_at?: string | null
          verificacion_origen?: string | null
          verificada?: boolean | null
        }
        Update: {
          alertas_validacion?: Json | null
          archivo_path?: string | null
          cif?: string | null
          coste_lectura_usd?: number | null
          created_at?: string | null
          drive_url?: string | null
          embedding?: string | null
          embedding_observaciones?: string | null
          facturado_en_id?: number | null
          facturado_origen?: string | null
          fecha?: string
          id?: number
          iva?: number | null
          lectura_llamadas?: number | null
          lectura_modelo?: string | null
          numero_documento?: string
          observaciones?: string | null
          ocr_trabajo_id?: string | null
          paginas?: number
          procesado_en?: string | null
          proveedor?: string | null
          proveedor_id?: number | null
          proveedor_normalizado?: string | null
          resumen?: string | null
          subtotal?: number | null
          tipo?: string
          total?: number | null
          total_origen?: string | null
          updated_at?: string | null
          verificacion_origen?: string | null
          verificada?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "facturas_facturado_en_id_fkey"
            columns: ["facturado_en_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_facturado_en_id_fkey"
            columns: ["facturado_en_id"]
            isOneToOne: false
            referencedRelation: "vista_ultimos_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_ocr_trabajo_fk"
            columns: ["ocr_trabajo_id"]
            isOneToOne: true
            referencedRelation: "ocr_trabajos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas_cheques: {
        Row: {
          cheque_id: string
          cliente: Json
          email_enviado_en: string | null
          emisor: Json
          emitida_en: string
          id: string
          importe_eur: number
          iva_porcentaje: number
          numero: string
        }
        Insert: {
          cheque_id: string
          cliente: Json
          email_enviado_en?: string | null
          emisor: Json
          emitida_en?: string
          id?: string
          importe_eur: number
          iva_porcentaje: number
          numero?: string
        }
        Update: {
          cheque_id?: string
          cliente?: Json
          email_enviado_en?: string | null
          emisor?: Json
          emitida_en?: string
          id?: string
          importe_eur?: number
          iva_porcentaje?: number
          numero?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturas_cheques_cheque_id_fkey"
            columns: ["cheque_id"]
            isOneToOne: true
            referencedRelation: "cheques_regalo"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas_sustituciones: {
        Row: {
          factura_antes: Json
          factura_id: number
          historial_antes: Json
          id: number
          productos_antes: Json
          resumen_antes: Json
          resumen_despues: Json | null
          sustituida_at: string
          sustituida_por: string | null
          trabajo_id: string | null
        }
        Insert: {
          factura_antes: Json
          factura_id: number
          historial_antes: Json
          id?: number
          productos_antes: Json
          resumen_antes: Json
          resumen_despues?: Json | null
          sustituida_at?: string
          sustituida_por?: string | null
          trabajo_id?: string | null
        }
        Update: {
          factura_antes?: Json
          factura_id?: number
          historial_antes?: Json
          id?: number
          productos_antes?: Json
          resumen_antes?: Json
          resumen_despues?: Json | null
          sustituida_at?: string
          sustituida_por?: string | null
          trabajo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facturas_sustituciones_trabajo_id_fkey"
            columns: ["trabajo_id"]
            isOneToOne: false
            referencedRelation: "ocr_trabajos"
            referencedColumns: ["id"]
          },
        ]
      }
      favoritos: {
        Row: {
          created_at: string
          id: string
          producto_id: string
          producto_tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          producto_id: string
          producto_tipo?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          producto_id?: string
          producto_tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      gdpr_audit_log: {
        Row: {
          accion: string
          created_at: string | null
          detalles: Json | null
          ejecutado_por: string | null
          id: string
          registros_afectados: number | null
          tabla: string
        }
        Insert: {
          accion: string
          created_at?: string | null
          detalles?: Json | null
          ejecutado_por?: string | null
          id?: string
          registros_afectados?: number | null
          tabla: string
        }
        Update: {
          accion?: string
          created_at?: string | null
          detalles?: Json | null
          ejecutado_por?: string | null
          id?: string
          registros_afectados?: number | null
          tabla?: string
        }
        Relationships: []
      }
      gdpr_config: {
        Row: {
          accion: string
          activo: boolean | null
          campos_anonimizar: string[] | null
          created_at: string | null
          descripcion: string | null
          dias_retencion: number
          id: string
          tabla: string
          updated_at: string | null
        }
        Insert: {
          accion: string
          activo?: boolean | null
          campos_anonimizar?: string[] | null
          created_at?: string | null
          descripcion?: string | null
          dias_retencion: number
          id?: string
          tabla: string
          updated_at?: string | null
        }
        Update: {
          accion?: string
          activo?: boolean | null
          campos_anonimizar?: string[] | null
          created_at?: string | null
          descripcion?: string | null
          dias_retencion?: number
          id?: string
          tabla?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      historial_ajustes_precios: {
        Row: {
          categoria: string
          created_at: string
          fecha: string
          id: string
          items_afectados: number
          porcentaje: number
          snapshot: Json
          tipo_carta: string
          user_id: string | null
        }
        Insert: {
          categoria: string
          created_at?: string
          fecha?: string
          id?: string
          items_afectados?: number
          porcentaje: number
          snapshot?: Json
          tipo_carta: string
          user_id?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string
          fecha?: string
          id?: string
          items_afectados?: number
          porcentaje?: number
          snapshot?: Json
          tipo_carta?: string
          user_id?: string | null
        }
        Relationships: []
      }
      historial_precios: {
        Row: {
          created_at: string | null
          factura_id: number | null
          fecha: string | null
          id: string
          precio: number | null
          producto_nombre: string | null
          proveedor: string | null
        }
        Insert: {
          created_at?: string | null
          factura_id?: number | null
          fecha?: string | null
          id?: string
          precio?: number | null
          producto_nombre?: string | null
          proveedor?: string | null
        }
        Update: {
          created_at?: string | null
          factura_id?: number | null
          fecha?: string | null
          id?: string
          precio?: number | null
          producto_nombre?: string | null
          proveedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_precios_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_precios_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "vista_ultimos_documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_coste_estimado: {
        Row: {
          funcion: string
          medido_en: string | null
          modelo: string | null
          nota: string | null
          unidad: string
          unidades_mes_estimadas: number
          usd_por_unidad: number
        }
        Insert: {
          funcion: string
          medido_en?: string | null
          modelo?: string | null
          nota?: string | null
          unidad?: string
          unidades_mes_estimadas: number
          usd_por_unidad: number
        }
        Update: {
          funcion?: string
          medido_en?: string | null
          modelo?: string | null
          nota?: string | null
          unidad?: string
          unidades_mes_estimadas?: number
          usd_por_unidad?: number
        }
        Relationships: []
      }
      ia_funciones: {
        Row: {
          activo: boolean
          descripcion: string
          funcion: string
          instrumentada: boolean
          orden: number
          unidad: string
        }
        Insert: {
          activo?: boolean
          descripcion: string
          funcion: string
          instrumentada?: boolean
          orden?: number
          unidad?: string
        }
        Update: {
          activo?: boolean
          descripcion?: string
          funcion?: string
          instrumentada?: boolean
          orden?: number
          unidad?: string
        }
        Relationships: []
      }
      ia_precios: {
        Row: {
          actualizado_en: string
          fuente: string | null
          modelo: string
          notas: string | null
          razonamiento_como_output: boolean
          usd_por_m_cache_write: number | null
          usd_por_m_cached: number | null
          usd_por_m_input: number
          usd_por_m_output: number
          verificado_en: string | null
        }
        Insert: {
          actualizado_en?: string
          fuente?: string | null
          modelo: string
          notas?: string | null
          razonamiento_como_output?: boolean
          usd_por_m_cache_write?: number | null
          usd_por_m_cached?: number | null
          usd_por_m_input: number
          usd_por_m_output: number
          verificado_en?: string | null
        }
        Update: {
          actualizado_en?: string
          fuente?: string | null
          modelo?: string
          notas?: string | null
          razonamiento_como_output?: boolean
          usd_por_m_cache_write?: number | null
          usd_por_m_cached?: number | null
          usd_por_m_input?: number
          usd_por_m_output?: number
          verificado_en?: string | null
        }
        Relationships: []
      }
      ia_uso: {
        Row: {
          cache_write_tokens: number
          cached_tokens: number
          completion_tokens: number
          coste_usd: number | null
          created_at: string
          disparador: string | null
          duracion_ms: number | null
          estado: string
          funcion: string
          id: number
          llamadas: number
          modelo: string
          operacion: string
          prompt_tokens: number
          razonamiento_tokens: number
        }
        Insert: {
          cache_write_tokens?: number
          cached_tokens?: number
          completion_tokens?: number
          coste_usd?: number | null
          created_at?: string
          disparador?: string | null
          duracion_ms?: number | null
          estado?: string
          funcion: string
          id?: never
          llamadas?: number
          modelo: string
          operacion?: string
          prompt_tokens?: number
          razonamiento_tokens?: number
        }
        Update: {
          cache_write_tokens?: number
          cached_tokens?: number
          completion_tokens?: number
          coste_usd?: number | null
          created_at?: string
          disparador?: string | null
          duracion_ms?: number | null
          estado?: string
          funcion?: string
          id?: never
          llamadas?: number
          modelo?: string
          operacion?: string
          prompt_tokens?: number
          razonamiento_tokens?: number
        }
        Relationships: []
      }
      imagenes_base64: {
        Row: {
          categoria: string | null
          contenido_base64: string
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          tamano_bytes: number | null
          tipo_mime: string
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          contenido_base64: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          tamano_bytes?: number | null
          tipo_mime: string
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          contenido_base64?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          tamano_bytes?: number | null
          tipo_mime?: string
          updated_at?: string
        }
        Relationships: []
      }
      items_documento: {
        Row: {
          cantidad: number | null
          descripcion: string
          documento_id: string
          embedding: string | null
          id: string
          importe_linea: number | null
          precio_unitario: number | null
        }
        Insert: {
          cantidad?: number | null
          descripcion: string
          documento_id: string
          embedding?: string | null
          id?: string
          importe_linea?: number | null
          precio_unitario?: number | null
        }
        Update: {
          cantidad?: number | null
          descripcion?: string
          documento_id?: string
          embedding?: string | null
          id?: string
          importe_linea?: number | null
          precio_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_documento_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      lineas_pedido: {
        Row: {
          cantidad: number
          created_at: string | null
          id: string
          nombre_producto: string
          pedido_id: string
          precio_unitario: number
          producto_id: string
          producto_tipo: string
          total_linea: number
        }
        Insert: {
          cantidad?: number
          created_at?: string | null
          id?: string
          nombre_producto: string
          pedido_id: string
          precio_unitario: number
          producto_id: string
          producto_tipo: string
          total_linea: number
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          id?: string
          nombre_producto?: string
          pedido_id?: string
          precio_unitario?: number
          producto_id?: string
          producto_tipo?: string
          total_linea?: number
        }
        Relationships: [
          {
            foreignKeyName: "lineas_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_ecommerce"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes_chat: {
        Row: {
          adjuntos: Json | null
          content: string
          conversacion_id: string | null
          created_at: string | null
          id: string
          role: string
          session_id: string
        }
        Insert: {
          adjuntos?: Json | null
          content: string
          conversacion_id?: string | null
          created_at?: string | null
          id?: string
          role: string
          session_id: string
        }
        Update: {
          adjuntos?: Json | null
          content?: string
          conversacion_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_chat_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "chat_facturas_conversaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_chat_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_chat_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_facturas_conversaciones"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "mensajes_chat_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["session_id"]
          },
        ]
      }
      menus_diarios: {
        Row: {
          fecha: string
          id: string
          idiom: string | null
          menu: Json
        }
        Insert: {
          fecha: string
          id?: string
          idiom?: string | null
          menu: Json
        }
        Update: {
          fecha?: string
          id?: string
          idiom?: string | null
          menu?: Json
        }
        Relationships: []
      }
      mesas: {
        Row: {
          activa: boolean | null
          alto: number | null
          ancho: number | null
          capacidad: number
          created_at: string | null
          crece_hacia: string
          espacio_id: string
          etiqueta: string | null
          forma: string
          grupo_piezas: string | null
          id: string
          is_merged: boolean | null
          nombre: string
          original_mesas: Json | null
          picos_base: number
          picos_max: number
          piezas: number | null
          piezas_max: number | null
          plazas_max: number | null
          plazas_min: number | null
          pos_x: number | null
          pos_y: number | null
          rotacion: number | null
          updated_at: string | null
        }
        Insert: {
          activa?: boolean | null
          alto?: number | null
          ancho?: number | null
          capacidad?: number
          created_at?: string | null
          crece_hacia?: string
          espacio_id: string
          etiqueta?: string | null
          forma?: string
          grupo_piezas?: string | null
          id?: string
          is_merged?: boolean | null
          nombre: string
          original_mesas?: Json | null
          picos_base?: number
          picos_max?: number
          piezas?: number | null
          piezas_max?: number | null
          plazas_max?: number | null
          plazas_min?: number | null
          pos_x?: number | null
          pos_y?: number | null
          rotacion?: number | null
          updated_at?: string | null
        }
        Update: {
          activa?: boolean | null
          alto?: number | null
          ancho?: number | null
          capacidad?: number
          created_at?: string | null
          crece_hacia?: string
          espacio_id?: string
          etiqueta?: string | null
          forma?: string
          grupo_piezas?: string | null
          id?: string
          is_merged?: boolean | null
          nombre?: string
          original_mesas?: Json | null
          picos_base?: number
          picos_max?: number
          piezas?: number | null
          piezas_max?: number | null
          plazas_max?: number | null
          plazas_min?: number | null
          pos_x?: number | null
          pos_y?: number | null
          rotacion?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mesas_espacio_id_fkey"
            columns: ["espacio_id"]
            isOneToOne: false
            referencedRelation: "espacios_reserva"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mesas_espacio_id_fkey"
            columns: ["espacio_id"]
            isOneToOne: false
            referencedRelation: "vista_capacidad_espacios"
            referencedColumns: ["espacio_id"]
          },
        ]
      }
      movimientos_stock: {
        Row: {
          cantidad: number
          created_at: string | null
          id: string
          motivo: string | null
          producto_id: string
          producto_tipo: string
          referencia: string | null
          stock_anterior: number | null
          stock_nuevo: number | null
          tipo_movimiento: string
          usuario_id: string | null
        }
        Insert: {
          cantidad: number
          created_at?: string | null
          id?: string
          motivo?: string | null
          producto_id: string
          producto_tipo: string
          referencia?: string | null
          stock_anterior?: number | null
          stock_nuevo?: number | null
          tipo_movimiento: string
          usuario_id?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          id?: string
          motivo?: string | null
          producto_id?: string
          producto_tipo?: string
          referencia?: string | null
          stock_anterior?: number | null
          stock_nuevo?: number | null
          tipo_movimiento?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      newsletter_envios: {
        Row: {
          asunto: string
          canal: string
          created_at: string
          enviado_por: string | null
          estado: string | null
          id: string
          mensaje: string
          resend_broadcast_id: string | null
          tipo_newsletter: string | null
          total_destinatarios: number
        }
        Insert: {
          asunto: string
          canal?: string
          created_at?: string
          enviado_por?: string | null
          estado?: string | null
          id?: string
          mensaje: string
          resend_broadcast_id?: string | null
          tipo_newsletter?: string | null
          total_destinatarios?: number
        }
        Update: {
          asunto?: string
          canal?: string
          created_at?: string
          enviado_por?: string | null
          estado?: string | null
          id?: string
          mensaje?: string
          resend_broadcast_id?: string | null
          tipo_newsletter?: string | null
          total_destinatarios?: number
        }
        Relationships: []
      }
      newsletter_sincronizaciones_resend: {
        Row: {
          actualizados: number
          altas: number
          bajas_resend: number
          borrados: number
          contactos_ajenos: number | null
          contactos_resend: number | null
          contactos_segmento: number | null
          destinatarios: number | null
          detalle: Json | null
          ejecutada_por: string | null
          errores: number
          estado: string
          id: string
          iniciada_at: string
          mensaje_error: string | null
          origen: string
          pendientes: number
          segment_id: string | null
          terminada_at: string | null
        }
        Insert: {
          actualizados?: number
          altas?: number
          bajas_resend?: number
          borrados?: number
          contactos_ajenos?: number | null
          contactos_resend?: number | null
          contactos_segmento?: number | null
          destinatarios?: number | null
          detalle?: Json | null
          ejecutada_por?: string | null
          errores?: number
          estado?: string
          id?: string
          iniciada_at?: string
          mensaje_error?: string | null
          origen: string
          pendientes?: number
          segment_id?: string | null
          terminada_at?: string | null
        }
        Update: {
          actualizados?: number
          altas?: number
          bajas_resend?: number
          borrados?: number
          contactos_ajenos?: number | null
          contactos_resend?: number | null
          contactos_segmento?: number | null
          destinatarios?: number | null
          detalle?: Json | null
          ejecutada_por?: string | null
          errores?: number
          estado?: string
          id?: string
          iniciada_at?: string
          mensaje_error?: string | null
          origen?: string
          pendientes?: number
          segment_id?: string | null
          terminada_at?: string | null
        }
        Relationships: []
      }
      newsletter_suscriptores: {
        Row: {
          activo: boolean
          created_at: string
          email: string
          fecha_baja: string | null
          fecha_consentimiento: string | null
          fecha_verificacion_email: string | null
          id: string
          nombre: string | null
          origen_alta: string | null
          origen_baja: string | null
          resend_contact_id: string | null
          resend_sincronizado_at: string | null
          reserva_consentimiento_id: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email: string
          fecha_baja?: string | null
          fecha_consentimiento?: string | null
          fecha_verificacion_email?: string | null
          id?: string
          nombre?: string | null
          origen_alta?: string | null
          origen_baja?: string | null
          resend_contact_id?: string | null
          resend_sincronizado_at?: string | null
          reserva_consentimiento_id?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string
          fecha_baja?: string | null
          fecha_consentimiento?: string | null
          fecha_verificacion_email?: string | null
          id?: string
          nombre?: string | null
          origen_alta?: string | null
          origen_baja?: string | null
          resend_contact_id?: string | null
          resend_sincronizado_at?: string | null
          reserva_consentimiento_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_suscriptores_reserva_consentimiento_id_fkey"
            columns: ["reserva_consentimiento_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_suscriptores_reserva_consentimiento_id_fkey"
            columns: ["reserva_consentimiento_id"]
            isOneToOne: false
            referencedRelation: "vista_asignacion_dia"
            referencedColumns: ["reserva_id"]
          },
          {
            foreignKeyName: "newsletter_suscriptores_reserva_consentimiento_id_fkey"
            columns: ["reserva_consentimiento_id"]
            isOneToOne: false
            referencedRelation: "vista_reservas_pendientes"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_suscriptores_depurados: {
        Row: {
          depurado_at: string
          fila: Json
          id: number
          motivo: string
          reserva_id: string | null
          superviviente_id: string | null
          suscriptor_id: string
        }
        Insert: {
          depurado_at?: string
          fila: Json
          id?: never
          motivo: string
          reserva_id?: string | null
          superviviente_id?: string | null
          suscriptor_id: string
        }
        Update: {
          depurado_at?: string
          fila?: Json
          id?: never
          motivo?: string
          reserva_id?: string | null
          superviviente_id?: string | null
          suscriptor_id?: string
        }
        Relationships: []
      }
      noticias_hosteleria: {
        Row: {
          categoria: string
          created_at: string
          descripcion: string | null
          enlace: string
          fecha: string
          fuente: string
          id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          descripcion?: string | null
          enlace: string
          fecha?: string
          fuente: string
          id?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          descripcion?: string | null
          enlace?: string
          fecha?: string
          fuente?: string
          id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      notificaciones_dashboard: {
        Row: {
          created_at: string | null
          id: string
          leida: boolean
          mensaje: string | null
          origen: string | null
          prioridad: string
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          leida?: boolean
          mensaje?: string | null
          origen?: string | null
          prioridad?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          created_at?: string | null
          id?: string
          leida?: boolean
          mensaje?: string | null
          origen?: string | null
          prioridad?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      novedades: {
        Row: {
          activo: boolean | null
          badge_text: string | null
          badge_text_en: string | null
          badge_text_fr: string | null
          bebida_id: string | null
          botones: Json
          bullets: string[] | null
          bullets_en: string[] | null
          bullets_fr: string[] | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          descripcion_en: string | null
          descripcion_fr: string | null
          destacado: boolean | null
          fecha_fin: string | null
          fecha_inicio: string
          icono: string | null
          id: string
          imagen_posicion_y: number | null
          imagen_url: string | null
          menu: Json | null
          orden: number | null
          plato_id: string | null
          seccion: string | null
          tags: string[] | null
          tags_en: string[] | null
          tags_fr: string[] | null
          tipo: string
          tipo_asociacion: string | null
          titulo: string
          titulo_en: string | null
          titulo_fr: string | null
          updated_at: string | null
          vino_id: string | null
        }
        Insert: {
          activo?: boolean | null
          badge_text?: string | null
          badge_text_en?: string | null
          badge_text_fr?: string | null
          bebida_id?: string | null
          botones?: Json
          bullets?: string[] | null
          bullets_en?: string[] | null
          bullets_fr?: string[] | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          descripcion_en?: string | null
          descripcion_fr?: string | null
          destacado?: boolean | null
          fecha_fin?: string | null
          fecha_inicio?: string
          icono?: string | null
          id?: string
          imagen_posicion_y?: number | null
          imagen_url?: string | null
          menu?: Json | null
          orden?: number | null
          plato_id?: string | null
          seccion?: string | null
          tags?: string[] | null
          tags_en?: string[] | null
          tags_fr?: string[] | null
          tipo?: string
          tipo_asociacion?: string | null
          titulo: string
          titulo_en?: string | null
          titulo_fr?: string | null
          updated_at?: string | null
          vino_id?: string | null
        }
        Update: {
          activo?: boolean | null
          badge_text?: string | null
          badge_text_en?: string | null
          badge_text_fr?: string | null
          bebida_id?: string | null
          botones?: Json
          bullets?: string[] | null
          bullets_en?: string[] | null
          bullets_fr?: string[] | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          descripcion_en?: string | null
          descripcion_fr?: string | null
          destacado?: boolean | null
          fecha_fin?: string | null
          fecha_inicio?: string
          icono?: string | null
          id?: string
          imagen_posicion_y?: number | null
          imagen_url?: string | null
          menu?: Json | null
          orden?: number | null
          plato_id?: string | null
          seccion?: string | null
          tags?: string[] | null
          tags_en?: string[] | null
          tags_fr?: string[] | null
          tipo?: string
          tipo_asociacion?: string | null
          titulo?: string
          titulo_en?: string | null
          titulo_fr?: string | null
          updated_at?: string | null
          vino_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "novedades_bebida_id_fkey"
            columns: ["bebida_id"]
            isOneToOne: false
            referencedRelation: "Bebidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "novedades_plato_id_fkey"
            columns: ["plato_id"]
            isOneToOne: false
            referencedRelation: "Platos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "novedades_vino_id_fkey"
            columns: ["vino_id"]
            isOneToOne: false
            referencedRelation: "Vinos"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_trabajo_paginas: {
        Row: {
          bytes: number
          coste_usd: number | null
          created_at: string
          despachada_at: string | null
          duracion_ms: number | null
          error: string | null
          estado: string
          filas_contadas: number | null
          filas_extraidas: number | null
          franja: number | null
          franjas_pagina: number | null
          id: number
          intentos: number
          lease_hasta: string | null
          mime: string
          motivo_relectura: Json | null
          motivos: Json | null
          no_antes_de: string
          numero: number
          pagina_doc: number
          pieza: string
          recuento: Json | null
          relecturas: number
          resultado: Json | null
          storage_path: string
          tokens_entrada: number | null
          tokens_salida: number | null
          trabajo_id: string
          updated_at: string
          verificacion_pie: Json | null
        }
        Insert: {
          bytes: number
          coste_usd?: number | null
          created_at?: string
          despachada_at?: string | null
          duracion_ms?: number | null
          error?: string | null
          estado?: string
          filas_contadas?: number | null
          filas_extraidas?: number | null
          franja?: number | null
          franjas_pagina?: number | null
          id?: number
          intentos?: number
          lease_hasta?: string | null
          mime: string
          motivo_relectura?: Json | null
          motivos?: Json | null
          no_antes_de?: string
          numero: number
          pagina_doc?: number
          pieza?: string
          recuento?: Json | null
          relecturas?: number
          resultado?: Json | null
          storage_path: string
          tokens_entrada?: number | null
          tokens_salida?: number | null
          trabajo_id: string
          updated_at?: string
          verificacion_pie?: Json | null
        }
        Update: {
          bytes?: number
          coste_usd?: number | null
          created_at?: string
          despachada_at?: string | null
          duracion_ms?: number | null
          error?: string | null
          estado?: string
          filas_contadas?: number | null
          filas_extraidas?: number | null
          franja?: number | null
          franjas_pagina?: number | null
          id?: number
          intentos?: number
          lease_hasta?: string | null
          mime?: string
          motivo_relectura?: Json | null
          motivos?: Json | null
          no_antes_de?: string
          numero?: number
          pagina_doc?: number
          pieza?: string
          recuento?: Json | null
          relecturas?: number
          resultado?: Json | null
          storage_path?: string
          tokens_entrada?: number | null
          tokens_salida?: number | null
          trabajo_id?: string
          updated_at?: string
          verificacion_pie?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_trabajo_paginas_trabajo_id_fkey"
            columns: ["trabajo_id"]
            isOneToOne: false
            referencedRelation: "ocr_trabajos"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_trabajos: {
        Row: {
          consolidar_despachado_at: string | null
          contexto_p1: Json | null
          coste_usd: number
          creado_por: string
          created_at: string
          documento_pendiente: Json | null
          error: string | null
          estado: string
          factura_id: number | null
          id: string
          intentos_consolidacion: number
          lease_hasta: string | null
          limite_at: string
          llamadas: number
          modelo: string | null
          nombre_original: string
          num_paginas: number
          origen: string
          original_mime: string | null
          original_path: string | null
          paginas_documento: number
          resultado: Json | null
          ronda_relectura: number
          terminado_at: string | null
          updated_at: string
        }
        Insert: {
          consolidar_despachado_at?: string | null
          contexto_p1?: Json | null
          coste_usd?: number
          creado_por: string
          created_at?: string
          documento_pendiente?: Json | null
          error?: string | null
          estado?: string
          factura_id?: number | null
          id: string
          intentos_consolidacion?: number
          lease_hasta?: string | null
          limite_at?: string
          llamadas?: number
          modelo?: string | null
          nombre_original: string
          num_paginas: number
          origen: string
          original_mime?: string | null
          original_path?: string | null
          paginas_documento?: number
          resultado?: Json | null
          ronda_relectura?: number
          terminado_at?: string | null
          updated_at?: string
        }
        Update: {
          consolidar_despachado_at?: string | null
          contexto_p1?: Json | null
          coste_usd?: number
          creado_por?: string
          created_at?: string
          documento_pendiente?: Json | null
          error?: string | null
          estado?: string
          factura_id?: number | null
          id?: string
          intentos_consolidacion?: number
          lease_hasta?: string | null
          limite_at?: string
          llamadas?: number
          modelo?: string | null
          nombre_original?: string
          num_paginas?: number
          origen?: string
          original_mime?: string | null
          original_path?: string | null
          paginas_documento?: number
          resultado?: Json | null
          ronda_relectura?: number
          terminado_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocr_trabajos_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_trabajos_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "vista_ultimos_documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      ocupacion_diaria: {
        Row: {
          comensales_confirmados: number | null
          created_at: string | null
          dia_semana: number | null
          fecha: string
          hora: string | null
          id: string
          reservas_canceladas: number | null
          reservas_confirmadas: number | null
          reservas_no_show: number | null
          total_comensales: number
          total_reservas: number
          turno: string | null
          updated_at: string | null
        }
        Insert: {
          comensales_confirmados?: number | null
          created_at?: string | null
          dia_semana?: number | null
          fecha: string
          hora?: string | null
          id?: string
          reservas_canceladas?: number | null
          reservas_confirmadas?: number | null
          reservas_no_show?: number | null
          total_comensales?: number
          total_reservas?: number
          turno?: string | null
          updated_at?: string | null
        }
        Update: {
          comensales_confirmados?: number | null
          created_at?: string | null
          dia_semana?: number | null
          fecha?: string
          hora?: string | null
          id?: string
          reservas_canceladas?: number | null
          reservas_confirmadas?: number | null
          reservas_no_show?: number | null
          total_comensales?: number
          total_reservas?: number
          turno?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      oficiososia_borradores: {
        Row: {
          actualizado_en: string
          creado_en: string
          documento: Json
          factura_id: string | null
          id: string
          numero: string
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          documento: Json
          factura_id?: string | null
          id: string
          numero: string
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          documento?: Json
          factura_id?: string | null
          id?: string
          numero?: string
        }
        Relationships: [
          {
            foreignKeyName: "oficiososia_borradores_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "oficiososia_facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      oficiososia_facturacion_config: {
        Row: {
          actualizado_en: string
          documento: Json
          id: boolean
        }
        Insert: {
          actualizado_en?: string
          documento: Json
          id?: boolean
        }
        Update: {
          actualizado_en?: string
          documento?: Json
          id?: boolean
        }
        Relationships: []
      }
      oficiososia_facturas: {
        Row: {
          actualizado_en: string
          creado_en: string
          creado_por: string | null
          documento: Json
          id: string
          numero: string
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          documento: Json
          id: string
          numero: string
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          documento?: Json
          id?: string
          numero?: string
        }
        Relationships: []
      }
      openai_claves: {
        Row: {
          api_key_id: string
          creado_en: string
          nombre: string | null
          proceso: string
          project_id: string
        }
        Insert: {
          api_key_id: string
          creado_en?: string
          nombre?: string | null
          proceso?: string
          project_id: string
        }
        Update: {
          api_key_id?: string
          creado_en?: string
          nombre?: string | null
          proceso?: string
          project_id?: string
        }
        Relationships: []
      }
      openai_costes_diarios: {
        Row: {
          actualizado_en: string
          fecha: string
          line_item: string
          project_id: string
          usd: number
        }
        Insert: {
          actualizado_en?: string
          fecha: string
          line_item?: string
          project_id?: string
          usd: number
        }
        Update: {
          actualizado_en?: string
          fecha?: string
          line_item?: string
          project_id?: string
          usd?: number
        }
        Relationships: []
      }
      openai_proyectos: {
        Row: {
          creado_en: string
          nombre: string | null
          proceso: string | null
          project_id: string
        }
        Insert: {
          creado_en?: string
          nombre?: string | null
          proceso?: string | null
          project_id: string
        }
        Update: {
          creado_en?: string
          nombre?: string | null
          proceso?: string | null
          project_id?: string
        }
        Relationships: []
      }
      openai_uso_diario: {
        Row: {
          actualizado_en: string
          api_key_id: string
          cached_tokens: number
          fecha: string
          input_tokens: number
          modelo: string
          output_tokens: number
          peticiones: number
          project_id: string
        }
        Insert: {
          actualizado_en?: string
          api_key_id?: string
          cached_tokens?: number
          fecha: string
          input_tokens?: number
          modelo?: string
          output_tokens?: number
          peticiones?: number
          project_id?: string
        }
        Update: {
          actualizado_en?: string
          api_key_id?: string
          cached_tokens?: number
          fecha?: string
          input_tokens?: number
          modelo?: string
          output_tokens?: number
          peticiones?: number
          project_id?: string
        }
        Relationships: []
      }
      pedidos_ecommerce: {
        Row: {
          caja: string | null
          ciudad_envio: string | null
          codigo_postal_envio: string | null
          created_at: string | null
          descuento: number | null
          direccion_envio: string | null
          email: string | null
          estado: string | null
          fecha_entrega: string | null
          fecha_envio: string | null
          fecha_pago: string | null
          gastos_envio: number | null
          id: string
          iva: number | null
          metodo_pago: string | null
          nombre_completo: string | null
          notas_cliente: string | null
          notas_internas: string | null
          numero_pedido: string
          numero_seguimiento: string | null
          numero_ticket: string | null
          pagado: boolean | null
          pais_envio: string | null
          referencia_pago: string | null
          subtotal: number
          telefono: string | null
          tipo_venta: string | null
          total: number
          transportista: string | null
          updated_at: string | null
          user_id: string | null
          vendedor_id: string | null
        }
        Insert: {
          caja?: string | null
          ciudad_envio?: string | null
          codigo_postal_envio?: string | null
          created_at?: string | null
          descuento?: number | null
          direccion_envio?: string | null
          email?: string | null
          estado?: string | null
          fecha_entrega?: string | null
          fecha_envio?: string | null
          fecha_pago?: string | null
          gastos_envio?: number | null
          id?: string
          iva?: number | null
          metodo_pago?: string | null
          nombre_completo?: string | null
          notas_cliente?: string | null
          notas_internas?: string | null
          numero_pedido: string
          numero_seguimiento?: string | null
          numero_ticket?: string | null
          pagado?: boolean | null
          pais_envio?: string | null
          referencia_pago?: string | null
          subtotal?: number
          telefono?: string | null
          tipo_venta?: string | null
          total?: number
          transportista?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendedor_id?: string | null
        }
        Update: {
          caja?: string | null
          ciudad_envio?: string | null
          codigo_postal_envio?: string | null
          created_at?: string | null
          descuento?: number | null
          direccion_envio?: string | null
          email?: string | null
          estado?: string | null
          fecha_entrega?: string | null
          fecha_envio?: string | null
          fecha_pago?: string | null
          gastos_envio?: number | null
          id?: string
          iva?: number | null
          metodo_pago?: string | null
          nombre_completo?: string | null
          notas_cliente?: string | null
          notas_internas?: string | null
          numero_pedido?: string
          numero_seguimiento?: string | null
          numero_ticket?: string | null
          pagado?: boolean | null
          pais_envio?: string | null
          referencia_pago?: string | null
          subtotal?: number
          telefono?: string | null
          tipo_venta?: string | null
          total?: number
          transportista?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendedor_id?: string | null
        }
        Relationships: []
      }
      peso_paginas: {
        Row: {
          actualizado_en: string
          bytes_por_visita: number
          nota: string | null
          proyecto: string
          ruta: string
        }
        Insert: {
          actualizado_en?: string
          bytes_por_visita: number
          nota?: string | null
          proyecto: string
          ruta?: string
        }
        Update: {
          actualizado_en?: string
          bytes_por_visita?: number
          nota?: string | null
          proyecto?: string
          ruta?: string
        }
        Relationships: []
      }
      phone_system_config: {
        Row: {
          address: string | null
          bot_greeting: string | null
          bot_responses: Json
          created_at: string | null
          forward_phone: string | null
          id: string
          max_party_size: number | null
          mode: string
          opening_hours: string | null
          phone_number: string | null
          restaurant_id: string
          restaurant_name: string
          schedule: Json | null
          schedule_enabled: boolean | null
          updated_at: string | null
          vapi_assistant_id: string | null
          vapi_phone_number_id: string | null
          voice_id: string | null
          webhook_url: string | null
        }
        Insert: {
          address?: string | null
          bot_greeting?: string | null
          bot_responses?: Json
          created_at?: string | null
          forward_phone?: string | null
          id?: string
          max_party_size?: number | null
          mode?: string
          opening_hours?: string | null
          phone_number?: string | null
          restaurant_id: string
          restaurant_name?: string
          schedule?: Json | null
          schedule_enabled?: boolean | null
          updated_at?: string | null
          vapi_assistant_id?: string | null
          vapi_phone_number_id?: string | null
          voice_id?: string | null
          webhook_url?: string | null
        }
        Update: {
          address?: string | null
          bot_greeting?: string | null
          bot_responses?: Json
          created_at?: string | null
          forward_phone?: string | null
          id?: string
          max_party_size?: number | null
          mode?: string
          opening_hours?: string | null
          phone_number?: string | null
          restaurant_id?: string
          restaurant_name?: string
          schedule?: Json | null
          schedule_enabled?: boolean | null
          updated_at?: string | null
          vapi_assistant_id?: string | null
          vapi_phone_number_id?: string | null
          voice_id?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      planos_espacio: {
        Row: {
          alto: number | null
          alto_metros: number | null
          ancho: number | null
          ancho_metros: number | null
          configuracion: Json | null
          created_at: string | null
          espacio_id: string
          id: string
          metros_cuadrados: number | null
          pixels_per_meter: number | null
          updated_at: string | null
        }
        Insert: {
          alto?: number | null
          alto_metros?: number | null
          ancho?: number | null
          ancho_metros?: number | null
          configuracion?: Json | null
          created_at?: string | null
          espacio_id: string
          id?: string
          metros_cuadrados?: number | null
          pixels_per_meter?: number | null
          updated_at?: string | null
        }
        Update: {
          alto?: number | null
          alto_metros?: number | null
          ancho?: number | null
          ancho_metros?: number | null
          configuracion?: Json | null
          created_at?: string | null
          espacio_id?: string
          id?: string
          metros_cuadrados?: number | null
          pixels_per_meter?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planos_espacio_espacio_id_fkey"
            columns: ["espacio_id"]
            isOneToOne: true
            referencedRelation: "espacios_reserva"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_espacio_espacio_id_fkey"
            columns: ["espacio_id"]
            isOneToOne: true
            referencedRelation: "vista_capacidad_espacios"
            referencedColumns: ["espacio_id"]
          },
        ]
      }
      plantilla_cheques_regalo: {
        Row: {
          actualizado_en: string
          caducidad_meses: number
          color_acento: string
          color_fondo: string
          email_asunto: string
          email_mensaje: string
          id: boolean
          logo_data: string
          pdf_instrucciones: string
          pdf_pie: string
          pdf_subtitulo: string
          pdf_titulo: string
        }
        Insert: {
          actualizado_en?: string
          caducidad_meses?: number
          color_acento?: string
          color_fondo?: string
          email_asunto?: string
          email_mensaje?: string
          id?: boolean
          logo_data?: string
          pdf_instrucciones?: string
          pdf_pie?: string
          pdf_subtitulo?: string
          pdf_titulo?: string
        }
        Update: {
          actualizado_en?: string
          caducidad_meses?: number
          color_acento?: string
          color_fondo?: string
          email_asunto?: string
          email_mensaje?: string
          id?: boolean
          logo_data?: string
          pdf_instrucciones?: string
          pdf_pie?: string
          pdf_subtitulo?: string
          pdf_titulo?: string
        }
        Relationships: []
      }
      plantilla_factura_cheques: {
        Row: {
          actualizado_en: string
          email_mensaje: string
          emisor_direccion: string
          emisor_nif: string
          emisor_nombre: string
          id: boolean
          iva_porcentaje: number
          logo_data: string
          pie: string
        }
        Insert: {
          actualizado_en?: string
          email_mensaje?: string
          emisor_direccion?: string
          emisor_nif?: string
          emisor_nombre?: string
          id?: boolean
          iva_porcentaje?: number
          logo_data?: string
          pie?: string
        }
        Update: {
          actualizado_en?: string
          email_mensaje?: string
          emisor_direccion?: string
          emisor_nif?: string
          emisor_nombre?: string
          id?: boolean
          iva_porcentaje?: number
          logo_data?: string
          pie?: string
        }
        Relationships: []
      }
      plantillas_email_reserva: {
        Row: {
          asunto: string
          bloques: Json
          color_acento: string
          color_oscuro: string
          creado_at: string
          creado_por: string | null
          cuerpo: string
          es_actual: boolean
          id: string
          logo_url: string | null
          nota_version: string | null
          pie: string | null
          saludo: string
          texto_boton_principal: string | null
          texto_boton_secundario: string | null
          tipo: string
          version: number
        }
        Insert: {
          asunto: string
          bloques?: Json
          color_acento?: string
          color_oscuro?: string
          creado_at?: string
          creado_por?: string | null
          cuerpo: string
          es_actual?: boolean
          id?: string
          logo_url?: string | null
          nota_version?: string | null
          pie?: string | null
          saludo: string
          texto_boton_principal?: string | null
          texto_boton_secundario?: string | null
          tipo: string
          version: number
        }
        Update: {
          asunto?: string
          bloques?: Json
          color_acento?: string
          color_oscuro?: string
          creado_at?: string
          creado_por?: string | null
          cuerpo?: string
          es_actual?: boolean
          id?: string
          logo_url?: string | null
          nota_version?: string | null
          pie?: string | null
          saludo?: string
          texto_boton_principal?: string | null
          texto_boton_secundario?: string | null
          tipo?: string
          version?: number
        }
        Relationships: []
      }
      Platos: {
        Row: {
          activado: boolean | null
          alergenos_en: string | null
          alergenos_fr: string | null
          alergenos_inferidos: Json | null
          alergenos_notas: string | null
          alergenos_oficiales: Json | null
          categoria: string | null
          categoria_en: string | null
          categoria_fr: string | null
          created_at: string | null
          descripcion: string | null
          descripcion_en: string | null
          descripcion_fr: string | null
          expanded: boolean | null
          featured: boolean | null
          id: string
          imagen_posicion_y: number | null
          imagen_url: string | null
          ingredientes: string | null
          nombre: string | null
          nombre_en: string | null
          nombre_fr: string | null
          orden: string | null
          precio_eur: number | null
          restaurante: boolean | null
          sin_gluten_disponible: boolean
          touza: boolean | null
          traducciones: Json | null
          unidad: string | null
          updated_at: string | null
        }
        Insert: {
          activado?: boolean | null
          alergenos_en?: string | null
          alergenos_fr?: string | null
          alergenos_inferidos?: Json | null
          alergenos_notas?: string | null
          alergenos_oficiales?: Json | null
          categoria?: string | null
          categoria_en?: string | null
          categoria_fr?: string | null
          created_at?: string | null
          descripcion?: string | null
          descripcion_en?: string | null
          descripcion_fr?: string | null
          expanded?: boolean | null
          featured?: boolean | null
          id: string
          imagen_posicion_y?: number | null
          imagen_url?: string | null
          ingredientes?: string | null
          nombre?: string | null
          nombre_en?: string | null
          nombre_fr?: string | null
          orden?: string | null
          precio_eur?: number | null
          restaurante?: boolean | null
          sin_gluten_disponible?: boolean
          touza?: boolean | null
          traducciones?: Json | null
          unidad?: string | null
          updated_at?: string | null
        }
        Update: {
          activado?: boolean | null
          alergenos_en?: string | null
          alergenos_fr?: string | null
          alergenos_inferidos?: Json | null
          alergenos_notas?: string | null
          alergenos_oficiales?: Json | null
          categoria?: string | null
          categoria_en?: string | null
          categoria_fr?: string | null
          created_at?: string | null
          descripcion?: string | null
          descripcion_en?: string | null
          descripcion_fr?: string | null
          expanded?: boolean | null
          featured?: boolean | null
          id?: string
          imagen_posicion_y?: number | null
          imagen_url?: string | null
          ingredientes?: string | null
          nombre?: string | null
          nombre_en?: string | null
          nombre_fr?: string | null
          orden?: string | null
          precio_eur?: number | null
          restaurante?: boolean | null
          sin_gluten_disponible?: boolean
          touza?: boolean | null
          traducciones?: Json | null
          unidad?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      productos_alias: {
        Row: {
          created_at: string
          origen: string
          producto_id: number
          texto_normalizado: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          origen?: string
          producto_id: number
          texto_normalizado: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          origen?: string
          producto_id?: number
          texto_normalizado?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_alias_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      productos_catalogo: {
        Row: {
          categoria_id: number | null
          contenido_cantidad: number | null
          contenido_unidad: string | null
          creado_por: string | null
          created_at: string
          id: number
          nombre: string
          nombre_normalizado: string | null
          origen: string
          unidad_habitual: string | null
          updated_at: string
        }
        Insert: {
          categoria_id?: number | null
          contenido_cantidad?: number | null
          contenido_unidad?: string | null
          creado_por?: string | null
          created_at?: string
          id?: never
          nombre: string
          nombre_normalizado?: string | null
          origen?: string
          unidad_habitual?: string | null
          updated_at?: string
        }
        Update: {
          categoria_id?: number | null
          contenido_cantidad?: number | null
          contenido_unidad?: string | null
          creado_por?: string | null
          created_at?: string
          id?: never
          nombre?: string
          nombre_normalizado?: string | null
          origen?: string
          unidad_habitual?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_catalogo_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      productos_catalogo_antigua: {
        Row: {
          activo: boolean | null
          categoria: string | null
          created_at: string | null
          id: number
          nombre: string
          notas: string | null
          precio_actual: number | null
          proveedor_habitual_id: number | null
          unidad_medida: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          id?: number
          nombre: string
          notas?: string | null
          precio_actual?: number | null
          proveedor_habitual_id?: number | null
          unidad_medida?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          id?: number
          nombre?: string
          notas?: string | null
          precio_actual?: number | null
          proveedor_habitual_id?: number | null
          unidad_medida?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_catalogo_antigua_proveedor_habitual_id_fkey"
            columns: ["proveedor_habitual_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      productos_factura: {
        Row: {
          albaran_ref: string | null
          bultos: number | null
          cantidad: number
          contenido_cantidad: number | null
          contenido_origen: string | null
          contenido_unidad: string | null
          created_at: string | null
          embedding: string | null
          factura_id: number
          id: number
          iva_pct: number | null
          nombre: string
          nombre_normalizado: string | null
          orden: number | null
          pagina: number | null
          precio_unitario: number | null
          producto_id: number | null
          total: number | null
          unidad: string | null
        }
        Insert: {
          albaran_ref?: string | null
          bultos?: number | null
          cantidad?: number
          contenido_cantidad?: number | null
          contenido_origen?: string | null
          contenido_unidad?: string | null
          created_at?: string | null
          embedding?: string | null
          factura_id: number
          id?: number
          iva_pct?: number | null
          nombre: string
          nombre_normalizado?: string | null
          orden?: number | null
          pagina?: number | null
          precio_unitario?: number | null
          producto_id?: number | null
          total?: number | null
          unidad?: string | null
        }
        Update: {
          albaran_ref?: string | null
          bultos?: number | null
          cantidad?: number
          contenido_cantidad?: number | null
          contenido_origen?: string | null
          contenido_unidad?: string | null
          created_at?: string | null
          embedding?: string | null
          factura_id?: number
          id?: number
          iva_pct?: number | null
          nombre?: string
          nombre_normalizado?: string | null
          orden?: number | null
          pagina?: number | null
          precio_unitario?: number | null
          producto_id?: number | null
          total?: number | null
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_factura_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_factura_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "vista_ultimos_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_factura_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      productos_factura_unidades_respaldo: {
        Row: {
          copiado_at: string
          factura_id: number
          migracion: string
          producto_id: number
          respaldo_id: number
          revertida_at: string | null
          unidad_antes: string | null
          unidad_despues: string
        }
        Insert: {
          copiado_at?: string
          factura_id: number
          migracion?: string
          producto_id: number
          respaldo_id?: never
          revertida_at?: string | null
          unidad_antes?: string | null
          unidad_despues: string
        }
        Update: {
          copiado_at?: string
          factura_id?: number
          migracion?: string
          producto_id?: number
          respaldo_id?: never
          revertida_at?: string | null
          unidad_antes?: string | null
          unidad_despues?: string
        }
        Relationships: []
      }
      proveedores: {
        Row: {
          activo: boolean | null
          categoria: string | null
          cif: string | null
          cif_normalizado: string | null
          created_at: string | null
          direccion: string | null
          email: string | null
          id: number
          nombre: string
          nombre_comercial: string | null
          nombre_normalizado: string | null
          notas: string | null
          origen: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria?: string | null
          cif?: string | null
          cif_normalizado?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: number
          nombre: string
          nombre_comercial?: string | null
          nombre_normalizado?: string | null
          notas?: string | null
          origen?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria?: string | null
          cif?: string | null
          cif_normalizado?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: number
          nombre?: string
          nombre_comercial?: string | null
          nombre_normalizado?: string | null
          notas?: string | null
          origen?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proveedores_alias: {
        Row: {
          alias_normalizado: string | null
          cif_normalizado: string | null
          created_at: string
          id: number
          origen: string
          proveedor_id: number
          texto_original: string | null
        }
        Insert: {
          alias_normalizado?: string | null
          cif_normalizado?: string | null
          created_at?: string
          id?: never
          origen?: string
          proveedor_id: number
          texto_original?: string | null
        }
        Update: {
          alias_normalizado?: string | null
          cif_normalizado?: string | null
          created_at?: string
          id?: never
          origen?: string
          proveedor_id?: number
          texto_original?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_alias_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      publicaciones_redes: {
        Row: {
          contenido: string
          created_at: string | null
          error_mensaje: string | null
          estado: string | null
          fecha_programada: string | null
          fecha_publicacion: string | null
          id: string
          imagen_url: string | null
          post_id_facebook: string | null
          post_id_instagram: string | null
          red_social: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contenido: string
          created_at?: string | null
          error_mensaje?: string | null
          estado?: string | null
          fecha_programada?: string | null
          fecha_publicacion?: string | null
          id?: string
          imagen_url?: string | null
          post_id_facebook?: string | null
          post_id_instagram?: string | null
          red_social: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contenido?: string
          created_at?: string | null
          error_mensaje?: string | null
          estado?: string | null
          fecha_programada?: string | null
          fecha_publicacion?: string | null
          id?: string
          imagen_url?: string | null
          post_id_facebook?: string | null
          post_id_instagram?: string | null
          red_social?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rate_limit_log: {
        Row: {
          created_at: string
          id: string
          identifier: string
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
        }
        Relationships: []
      }
      resenas: {
        Row: {
          comentario: string | null
          created_at: string | null
          email: string | null
          estado: string | null
          fecha: string
          fecha_respuesta: string | null
          fuente: string | null
          google_rating: number | null
          google_review_id: string | null
          id: string
          nombre_cliente: string
          respuesta: string | null
          updated_at: string | null
          valoracion: number
        }
        Insert: {
          comentario?: string | null
          created_at?: string | null
          email?: string | null
          estado?: string | null
          fecha?: string
          fecha_respuesta?: string | null
          fuente?: string | null
          google_rating?: number | null
          google_review_id?: string | null
          id?: string
          nombre_cliente: string
          respuesta?: string | null
          updated_at?: string | null
          valoracion: number
        }
        Update: {
          comentario?: string | null
          created_at?: string | null
          email?: string | null
          estado?: string | null
          fecha?: string
          fecha_respuesta?: string | null
          fuente?: string | null
          google_rating?: number | null
          google_review_id?: string | null
          id?: string
          nombre_cliente?: string
          respuesta?: string | null
          updated_at?: string | null
          valoracion?: number
        }
        Relationships: []
      }
      reservas: {
        Row: {
          canal: string | null
          condiciones_aceptadas_at: string | null
          consentimiento_newsletter: boolean
          consentimiento_newsletter_at: string | null
          created_at: string | null
          email: string | null
          email_verificado_at: string | null
          en_blacklist: boolean | null
          espacio_id: string | null
          espacio_solicitado_id: string | null
          estado: string
          fecha: string
          hora: string
          hora_solicitada: string | null
          id: string
          importante: boolean
          llegada_at: string | null
          marca: string
          nombre: string | null
          notas_cliente: string | null
          numero_comensales: number
          salida_at: string | null
          solicitud_id: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          canal?: string | null
          condiciones_aceptadas_at?: string | null
          consentimiento_newsletter?: boolean
          consentimiento_newsletter_at?: string | null
          created_at?: string | null
          email?: string | null
          email_verificado_at?: string | null
          en_blacklist?: boolean | null
          espacio_id?: string | null
          espacio_solicitado_id?: string | null
          estado?: string
          fecha: string
          hora: string
          hora_solicitada?: string | null
          id?: string
          importante?: boolean
          llegada_at?: string | null
          marca?: string
          nombre?: string | null
          notas_cliente?: string | null
          numero_comensales: number
          salida_at?: string | null
          solicitud_id?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          canal?: string | null
          condiciones_aceptadas_at?: string | null
          consentimiento_newsletter?: boolean
          consentimiento_newsletter_at?: string | null
          created_at?: string | null
          email?: string | null
          email_verificado_at?: string | null
          en_blacklist?: boolean | null
          espacio_id?: string | null
          espacio_solicitado_id?: string | null
          estado?: string
          fecha?: string
          hora?: string
          hora_solicitada?: string | null
          id?: string
          importante?: boolean
          llegada_at?: string | null
          marca?: string
          nombre?: string | null
          notas_cliente?: string | null
          numero_comensales?: number
          salida_at?: string | null
          solicitud_id?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservas_espacio_id_fkey"
            columns: ["espacio_id"]
            isOneToOne: false
            referencedRelation: "espacios_reserva"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_espacio_id_fkey"
            columns: ["espacio_id"]
            isOneToOne: false
            referencedRelation: "vista_capacidad_espacios"
            referencedColumns: ["espacio_id"]
          },
          {
            foreignKeyName: "reservas_espacio_solicitado_id_fkey"
            columns: ["espacio_solicitado_id"]
            isOneToOne: false
            referencedRelation: "espacios_reserva"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_espacio_solicitado_id_fkey"
            columns: ["espacio_solicitado_id"]
            isOneToOne: false
            referencedRelation: "vista_capacidad_espacios"
            referencedColumns: ["espacio_id"]
          },
          {
            foreignKeyName: "reservas_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes_pendientes"
            referencedColumns: ["id"]
          },
        ]
      }
      respaldo_correcciones_lectura_20261010: {
        Row: {
          creado_at: string
          fila: Json | null
          id: number
          registro: number
          tabla: string
        }
        Insert: {
          creado_at?: string
          fila?: Json | null
          id?: number
          registro: number
          tabla: string
        }
        Update: {
          creado_at?: string
          fila?: Json | null
          id?: number
          registro?: number
          tabla?: string
        }
        Relationships: []
      }
      salas_cerradas_servicio: {
        Row: {
          created_at: string
          created_by: string | null
          espacio_id: string
          fecha: string
          turno: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          espacio_id: string
          fecha: string
          turno: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          espacio_id?: string
          fecha?: string
          turno?: string
        }
        Relationships: [
          {
            foreignKeyName: "salas_cerradas_servicio_espacio_id_fkey"
            columns: ["espacio_id"]
            isOneToOne: false
            referencedRelation: "espacios_reserva"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salas_cerradas_servicio_espacio_id_fkey"
            columns: ["espacio_id"]
            isOneToOne: false
            referencedRelation: "vista_capacidad_espacios"
            referencedColumns: ["espacio_id"]
          },
        ]
      }
      scope_prices: {
        Row: {
          currency: string
          scope_name: string
          unit_price_cents: number
        }
        Insert: {
          currency?: string
          scope_name: string
          unit_price_cents: number
        }
        Update: {
          currency?: string
          scope_name?: string
          unit_price_cents?: number
        }
        Relationships: []
      }
      security_log: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          type: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          type: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          type?: string
        }
        Relationships: []
      }
      sell_users: {
        Row: {
          acepta_marketing: boolean | null
          apellidos: string | null
          avatar_url: string | null
          ciudad: string | null
          codigo_postal: string | null
          created_at: string | null
          direccion: string | null
          fecha_nacimiento: string | null
          id: string
          nombre: string | null
          pais: string | null
          telefono: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          acepta_marketing?: boolean | null
          apellidos?: string | null
          avatar_url?: string | null
          ciudad?: string | null
          codigo_postal?: string | null
          created_at?: string | null
          direccion?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string | null
          pais?: string | null
          telefono?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          acepta_marketing?: boolean | null
          apellidos?: string | null
          avatar_url?: string | null
          ciudad?: string | null
          codigo_postal?: string | null
          created_at?: string | null
          direccion?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string | null
          pais?: string | null
          telefono?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      solicitudes_pendientes: {
        Row: {
          condiciones_aceptadas_at: string | null
          consentimiento_newsletter: boolean
          created_at: string | null
          descripcion_rechazo: string | null
          email: string | null
          espacio_propuesto_id: string | null
          estado: string
          fecha_solicitada: string | null
          hora_solicitada: string | null
          id: string
          marca: string
          motivo_rechazo: string
          nombre: string | null
          notas_cliente: string | null
          notas_internas: string | null
          numero_comensales: number | null
          propuesta_enviada_at: string | null
          propuesta_error: string | null
          propuesta_estado: string
          propuesta_respondida_at: string | null
          propuesta_respuesta_via: string | null
          reserva_id: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          condiciones_aceptadas_at?: string | null
          consentimiento_newsletter?: boolean
          created_at?: string | null
          descripcion_rechazo?: string | null
          email?: string | null
          espacio_propuesto_id?: string | null
          estado?: string
          fecha_solicitada?: string | null
          hora_solicitada?: string | null
          id?: string
          marca?: string
          motivo_rechazo: string
          nombre?: string | null
          notas_cliente?: string | null
          notas_internas?: string | null
          numero_comensales?: number | null
          propuesta_enviada_at?: string | null
          propuesta_error?: string | null
          propuesta_estado?: string
          propuesta_respondida_at?: string | null
          propuesta_respuesta_via?: string | null
          reserva_id?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          condiciones_aceptadas_at?: string | null
          consentimiento_newsletter?: boolean
          created_at?: string | null
          descripcion_rechazo?: string | null
          email?: string | null
          espacio_propuesto_id?: string | null
          estado?: string
          fecha_solicitada?: string | null
          hora_solicitada?: string | null
          id?: string
          marca?: string
          motivo_rechazo?: string
          nombre?: string | null
          notas_cliente?: string | null
          notas_internas?: string | null
          numero_comensales?: number | null
          propuesta_enviada_at?: string | null
          propuesta_error?: string | null
          propuesta_estado?: string
          propuesta_respondida_at?: string | null
          propuesta_respuesta_via?: string | null
          reserva_id?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_pendientes_espacio_propuesto_id_fkey"
            columns: ["espacio_propuesto_id"]
            isOneToOne: false
            referencedRelation: "espacios_reserva"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_pendientes_espacio_propuesto_id_fkey"
            columns: ["espacio_propuesto_id"]
            isOneToOne: false
            referencedRelation: "vista_capacidad_espacios"
            referencedColumns: ["espacio_id"]
          },
          {
            foreignKeyName: "solicitudes_pendientes_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_pendientes_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "vista_asignacion_dia"
            referencedColumns: ["reserva_id"]
          },
          {
            foreignKeyName: "solicitudes_pendientes_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "vista_reservas_pendientes"
            referencedColumns: ["id"]
          },
        ]
      }
      sugerencias_blacklist: {
        Row: {
          blacklist_id: string | null
          creada_at: string
          email: string | null
          estado: string
          historial: Json
          id: string
          motivo: string
          nombre_cliente: string | null
          nota_revision: string | null
          reserva_id: string
          revisada_at: string | null
          revisada_por: string | null
          telefono: string | null
        }
        Insert: {
          blacklist_id?: string | null
          creada_at?: string
          email?: string | null
          estado?: string
          historial?: Json
          id?: string
          motivo?: string
          nombre_cliente?: string | null
          nota_revision?: string | null
          reserva_id: string
          revisada_at?: string | null
          revisada_por?: string | null
          telefono?: string | null
        }
        Update: {
          blacklist_id?: string | null
          creada_at?: string
          email?: string | null
          estado?: string
          historial?: Json
          id?: string
          motivo?: string
          nombre_cliente?: string | null
          nota_revision?: string | null
          reserva_id?: string
          revisada_at?: string | null
          revisada_por?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sugerencias_blacklist_blacklist_id_fkey"
            columns: ["blacklist_id"]
            isOneToOne: false
            referencedRelation: "blacklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugerencias_blacklist_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugerencias_blacklist_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "vista_asignacion_dia"
            referencedColumns: ["reserva_id"]
          },
          {
            foreignKeyName: "sugerencias_blacklist_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "vista_reservas_pendientes"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string | null
          email: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tapas: {
        Row: {
          fecha: string
          id: string
          idiom: string | null
          tapas: Json
        }
        Insert: {
          fecha: string
          id?: string
          idiom?: string | null
          tapas: Json
        }
        Update: {
          fecha?: string
          id?: string
          idiom?: string | null
          tapas?: Json
        }
        Relationships: []
      }
      tipo_cambio_usd_eur: {
        Row: {
          actualizado_en: string
          eur_por_usd: number
          fecha: string
          fuente: string
        }
        Insert: {
          actualizado_en?: string
          eur_por_usd: number
          fecha: string
          fuente?: string
        }
        Update: {
          actualizado_en?: string
          eur_por_usd?: number
          fecha?: string
          fuente?: string
        }
        Relationships: []
      }
      trafico_web_desglose: {
        Row: {
          dimension: string
          fecha: string
          proyecto: string
          sincronizado_en: string
          valor: string
          visitantes: number | null
          visitas: number
        }
        Insert: {
          dimension: string
          fecha: string
          proyecto: string
          sincronizado_en?: string
          valor: string
          visitantes?: number | null
          visitas: number
        }
        Update: {
          dimension?: string
          fecha?: string
          proyecto?: string
          sincronizado_en?: string
          valor?: string
          visitantes?: number | null
          visitas?: number
        }
        Relationships: []
      }
      trafico_web_diario: {
        Row: {
          fecha: string
          proyecto: string
          ruta: string
          sincronizado_en: string
          visitantes: number | null
          visitas: number
        }
        Insert: {
          fecha: string
          proyecto: string
          ruta?: string
          sincronizado_en?: string
          visitantes?: number | null
          visitas: number
        }
        Update: {
          fecha?: string
          proyecto?: string
          ruta?: string
          sincronizado_en?: string
          visitantes?: number | null
          visitas?: number
        }
        Relationships: []
      }
      trafico_web_sync_estado: {
        Row: {
          dias_ultimo_sync: number | null
          fallos_consecutivos: number
          proyecto: string
          ultimo_error: string | null
          ultimo_intento_en: string | null
          ultimo_ok_en: string | null
        }
        Insert: {
          dias_ultimo_sync?: number | null
          fallos_consecutivos?: number
          proyecto: string
          ultimo_error?: string | null
          ultimo_intento_en?: string | null
          ultimo_ok_en?: string | null
        }
        Update: {
          dias_ultimo_sync?: number | null
          fallos_consecutivos?: number
          proyecto?: string
          ultimo_error?: string | null
          ultimo_intento_en?: string | null
          ultimo_ok_en?: string | null
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          client_id: string
          id: number
          installation_id: string | null
          metadata: Json | null
          occurred_at: string
          scope_name: string
          status: string
          unit_price_cents: number
          workflow_name: string | null
        }
        Insert: {
          client_id: string
          id?: number
          installation_id?: string | null
          metadata?: Json | null
          occurred_at?: string
          scope_name: string
          status?: string
          unit_price_cents: number
          workflow_name?: string | null
        }
        Update: {
          client_id?: string
          id?: number
          installation_id?: string | null
          metadata?: Json | null
          occurred_at?: string
          scope_name?: string
          status?: string
          unit_price_cents?: number
          workflow_name?: string | null
        }
        Relationships: []
      }
      user_access_status: {
        Row: {
          access_blocked: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          access_blocked: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          access_blocked?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          section_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          section_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          section_key?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_role_presets: {
        Row: {
          base_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          created_by: string | null
          id: string
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          base_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          base_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      Vinos: {
        Row: {
          activado: boolean | null
          alergenos_en: string | null
          alergenos_fr: string | null
          alergenos_inferidos: Json | null
          alergenos_notas: string | null
          alergenos_oficiales: Json | null
          categoria: string | null
          categoria_en: string | null
          categoria_fr: string | null
          created_at: string | null
          denominacion_origen: string | null
          descripcion: string | null
          descripcion_en: string | null
          descripcion_fr: string | null
          expanded: boolean | null
          featured: boolean | null
          id: string
          imagen_posicion_y: number | null
          imagen_url: string | null
          ingredientes: string | null
          nombre: string | null
          nombre_en: string | null
          nombre_fr: string | null
          orden: string | null
          precio_eur: number | null
          restaurante: boolean | null
          sulfitos_excluido_manualmente: boolean
          touza: boolean | null
          traducciones: Json | null
          ubicacion_pais: string | null
          ubicacion_pais_en: string | null
          ubicacion_pais_fr: string | null
          ubicacion_region: string | null
          ubicacion_region_en: string | null
          ubicacion_region_fr: string | null
          updated_at: string | null
        }
        Insert: {
          activado?: boolean | null
          alergenos_en?: string | null
          alergenos_fr?: string | null
          alergenos_inferidos?: Json | null
          alergenos_notas?: string | null
          alergenos_oficiales?: Json | null
          categoria?: string | null
          categoria_en?: string | null
          categoria_fr?: string | null
          created_at?: string | null
          denominacion_origen?: string | null
          descripcion?: string | null
          descripcion_en?: string | null
          descripcion_fr?: string | null
          expanded?: boolean | null
          featured?: boolean | null
          id: string
          imagen_posicion_y?: number | null
          imagen_url?: string | null
          ingredientes?: string | null
          nombre?: string | null
          nombre_en?: string | null
          nombre_fr?: string | null
          orden?: string | null
          precio_eur?: number | null
          restaurante?: boolean | null
          sulfitos_excluido_manualmente?: boolean
          touza?: boolean | null
          traducciones?: Json | null
          ubicacion_pais?: string | null
          ubicacion_pais_en?: string | null
          ubicacion_pais_fr?: string | null
          ubicacion_region?: string | null
          ubicacion_region_en?: string | null
          ubicacion_region_fr?: string | null
          updated_at?: string | null
        }
        Update: {
          activado?: boolean | null
          alergenos_en?: string | null
          alergenos_fr?: string | null
          alergenos_inferidos?: Json | null
          alergenos_notas?: string | null
          alergenos_oficiales?: Json | null
          categoria?: string | null
          categoria_en?: string | null
          categoria_fr?: string | null
          created_at?: string | null
          denominacion_origen?: string | null
          descripcion?: string | null
          descripcion_en?: string | null
          descripcion_fr?: string | null
          expanded?: boolean | null
          featured?: boolean | null
          id?: string
          imagen_posicion_y?: number | null
          imagen_url?: string | null
          ingredientes?: string | null
          nombre?: string | null
          nombre_en?: string | null
          nombre_fr?: string | null
          orden?: string | null
          precio_eur?: number | null
          restaurante?: boolean | null
          sulfitos_excluido_manualmente?: boolean
          touza?: boolean | null
          traducciones?: Json | null
          ubicacion_pais?: string | null
          ubicacion_pais_en?: string | null
          ubicacion_pais_fr?: string | null
          ubicacion_region?: string | null
          ubicacion_region_en?: string | null
          ubicacion_region_fr?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      visitas_producto: {
        Row: {
          ciudad: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          pais: string | null
          producto_id: string
          producto_tipo: string
          referer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          ciudad?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          pais?: string | null
          producto_id: string
          producto_tipo: string
          referer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          ciudad?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          pais?: string | null
          producto_id?: string
          producto_tipo?: string
          referer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      web_rebuild_state: {
        Row: {
          pendiente: boolean
          sitio: string
          ultima_solicitud: string | null
          ultimo_disparo: string | null
          ultimo_origen: string | null
        }
        Insert: {
          pendiente?: boolean
          sitio: string
          ultima_solicitud?: string | null
          ultimo_disparo?: string | null
          ultimo_origen?: string | null
        }
        Update: {
          pendiente?: boolean
          sitio?: string
          ultima_solicitud?: string | null
          ultimo_disparo?: string | null
          ultimo_origen?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      audit_log_visible: {
        Row: {
          accion: string | null
          actor_email: string | null
          actor_label: string | null
          actor_origin: string | null
          actor_user_id: string | null
          created_at: string | null
          detalles: Json | null
          device_id: string | null
          id: string | null
          ip_address: string | null
          registro_id: string | null
          request_id: string | null
          resultado: string | null
          session_id: string | null
          tabla: string | null
          texto_busqueda: string | null
          tipo_evento: string | null
          user_agent: string | null
          visible_por_defecto: boolean | null
        }
        Insert: {
          accion?: string | null
          actor_email?: string | null
          actor_label?: string | null
          actor_origin?: string | null
          actor_user_id?: string | null
          created_at?: string | null
          detalles?: Json | null
          device_id?: string | null
          id?: string | null
          ip_address?: string | null
          registro_id?: string | null
          request_id?: string | null
          resultado?: never
          session_id?: string | null
          tabla?: string | null
          texto_busqueda?: never
          tipo_evento?: never
          user_agent?: string | null
          visible_por_defecto?: never
        }
        Update: {
          accion?: string | null
          actor_email?: string | null
          actor_label?: string | null
          actor_origin?: string | null
          actor_user_id?: string | null
          created_at?: string | null
          detalles?: Json | null
          device_id?: string | null
          id?: string | null
          ip_address?: string | null
          registro_id?: string | null
          request_id?: string | null
          resultado?: never
          session_id?: string | null
          tabla?: string | null
          texto_busqueda?: never
          tipo_evento?: never
          user_agent?: string | null
          visible_por_defecto?: never
        }
        Relationships: []
      }
      chat_facturas_conversaciones: {
        Row: {
          created_at: string | null
          id: string | null
          session_id: string | null
          titulo: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          session_id?: string | null
          titulo?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          session_id?: string | null
          titulo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_facturas_mensajes: {
        Row: {
          adjuntos: Json | null
          contenido: string | null
          conversacion_id: string | null
          created_at: string | null
          id: string | null
          rol: string | null
          session_id: string | null
        }
        Insert: {
          adjuntos?: Json | null
          contenido?: string | null
          conversacion_id?: string | null
          created_at?: string | null
          id?: string | null
          rol?: string | null
          session_id?: string | null
        }
        Update: {
          adjuntos?: Json | null
          contenido?: string | null
          conversacion_id?: string | null
          created_at?: string | null
          id?: string | null
          rol?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_chat_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "chat_facturas_conversaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_chat_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_chat_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_facturas_conversaciones"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "mensajes_chat_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["session_id"]
          },
        ]
      }
      chat_web_uso_diario: {
        Row: {
          cached_tokens: number | null
          completion_tokens: number | null
          conversaciones: number | null
          coste_usd: number | null
          dia: string | null
          peticiones: number | null
          prompt_tokens: number | null
          rechazadas: number | null
        }
        Relationships: []
      }
      ia_uso_diario: {
        Row: {
          cached_tokens: number | null
          completion_tokens: number | null
          coste_usd: number | null
          dia: string | null
          errores: number | null
          funcion: string | null
          llamadas: number | null
          modelo: string | null
          peticiones: number | null
          prompt_tokens: number | null
          razonamiento_tokens: number | null
        }
        Relationships: []
      }
      vista_asignacion_dia: {
        Row: {
          espacio_id: string | null
          espacio_nombre: string | null
          estado: string | null
          fecha: string | null
          grado: string | null
          hora: string | null
          marca: string | null
          mesas_asignadas: number | null
          mesas_nombres: string[] | null
          nombre: string | null
          numero_comensales: number | null
          plazas_asignadas: number | null
          reserva_id: string | null
          turno: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservas_espacio_id_fkey"
            columns: ["espacio_id"]
            isOneToOne: false
            referencedRelation: "espacios_reserva"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_espacio_id_fkey"
            columns: ["espacio_id"]
            isOneToOne: false
            referencedRelation: "vista_capacidad_espacios"
            referencedColumns: ["espacio_id"]
          },
        ]
      }
      vista_calidad_audio: {
        Row: {
          audio_metrics: Json | null
          audio_score: number | null
          call_success: boolean | null
          created_at: string | null
          duration_seconds: number | null
          early_hangup: boolean | null
          ended_reason: string | null
          interruption_count: number | null
          interruption_rate: number | null
          latency_avg_ms: number | null
          latency_first_ms: number | null
          latency_max_ms: number | null
          latency_p50_ms: number | null
          latency_p95_ms: number | null
          long_silences: number | null
          number_cutoffs: number | null
          sentiment: string | null
          turn_count: number | null
          vapi_call_id: string | null
        }
        Insert: {
          audio_metrics?: Json | null
          audio_score?: never
          call_success?: boolean | null
          created_at?: string | null
          duration_seconds?: number | null
          early_hangup?: never
          ended_reason?: string | null
          interruption_count?: never
          interruption_rate?: never
          latency_avg_ms?: never
          latency_first_ms?: never
          latency_max_ms?: never
          latency_p50_ms?: never
          latency_p95_ms?: never
          long_silences?: never
          number_cutoffs?: never
          sentiment?: string | null
          turn_count?: never
          vapi_call_id?: string | null
        }
        Update: {
          audio_metrics?: Json | null
          audio_score?: never
          call_success?: boolean | null
          created_at?: string | null
          duration_seconds?: number | null
          early_hangup?: never
          ended_reason?: string | null
          interruption_count?: never
          interruption_rate?: never
          latency_avg_ms?: never
          latency_first_ms?: never
          latency_max_ms?: never
          latency_p50_ms?: never
          latency_p95_ms?: never
          long_silences?: never
          number_cutoffs?: never
          sentiment?: string | null
          turn_count?: never
          vapi_call_id?: string | null
        }
        Relationships: []
      }
      vista_capacidad_espacios: {
        Row: {
          activa: boolean | null
          capacidad_declarada: number | null
          cuadra: boolean | null
          diferencia: number | null
          espacio_id: string | null
          marca: string | null
          mesas_activas: number | null
          mesas_fusionadas: number | null
          mesas_originales_huerfanas: number | null
          mesas_reales: number | null
          mesas_totales: number | null
          nombre: string | null
          plazas_mesas: number | null
          plazas_mesas_fusionadas: number | null
          plazas_mesas_sin_duplicar: number | null
          plazas_mesas_todas: number | null
        }
        Relationships: []
      }
      vista_estadisticas_mensuales: {
        Row: {
          comensales_confirmados: number | null
          mes_fin: string | null
          mes_inicio: string | null
          reservas_canceladas: number | null
          reservas_confirmadas: number | null
          total_comensales: number | null
          total_reservas: number | null
        }
        Relationships: []
      }
      vista_estadisticas_semanales: {
        Row: {
          comensales_confirmados: number | null
          reservas_canceladas: number | null
          reservas_cena: number | null
          reservas_comida: number | null
          reservas_confirmadas: number | null
          reservas_no_show: number | null
          semana_fin: string | null
          semana_inicio: string | null
          total_comensales: number | null
          total_reservas: number | null
        }
        Relationships: []
      }
      vista_gastos_mensuales: {
        Row: {
          mes: string | null
          num_albaranes: number | null
          num_facturas: number | null
          num_proveedores: number | null
          promedio_factura: number | null
          total_facturas: number | null
        }
        Relationships: []
      }
      vista_gastos_proveedor_mes: {
        Row: {
          mes: string | null
          num_facturas: number | null
          promedio_factura: number | null
          proveedor_nombre: string | null
          proveedor_normalizado: string | null
          total_mes: number | null
        }
        Relationships: []
      }
      vista_ocupacion: {
        Row: {
          dia_semana: number | null
          fecha: string | null
          hora: string | null
          total_comensales: number | null
          total_reservas: number | null
          turno: string | null
        }
        Insert: {
          dia_semana?: number | null
          fecha?: string | null
          hora?: string | null
          total_comensales?: number | null
          total_reservas?: number | null
          turno?: string | null
        }
        Update: {
          dia_semana?: number | null
          fecha?: string | null
          hora?: string | null
          total_comensales?: number | null
          total_reservas?: number | null
          turno?: string | null
        }
        Relationships: []
      }
      vista_ocupacion_hoy: {
        Row: {
          comensales_activos: number | null
          comensales_confirmados: number | null
          reservas_activas: number | null
          reservas_canceladas: number | null
          reservas_completadas: number | null
          reservas_confirmadas: number | null
          reservas_no_show: number | null
          reservas_pendientes: number | null
          reservas_verificadas: number | null
          total_comensales: number | null
          total_reservas: number | null
        }
        Relationships: []
      }
      vista_productos_top: {
        Row: {
          cantidad_total: number | null
          nombre_completo: string | null
          nombre_normalizado: string | null
          num_proveedores: number | null
          precio_maximo: number | null
          precio_minimo: number | null
          precio_promedio: number | null
          unidad: string | null
          veces_comprado: number | null
          veces_con_precio: number | null
        }
        Relationships: []
      }
      vista_productos_vendidos: {
        Row: {
          nombre_producto: string | null
          producto_id: string | null
          producto_tipo: string | null
          total_ingresos: number | null
          unidades_vendidas: number | null
        }
        Relationships: []
      }
      vista_proveedores_resumen: {
        Row: {
          cif: string | null
          num_albaranes: number | null
          num_documentos: number | null
          num_facturas: number | null
          primera_compra: string | null
          proveedor_nombre_completo: string | null
          proveedor_normalizado: string | null
          ticket_promedio: number | null
          total_gastado: number | null
          ultima_compra: string | null
        }
        Relationships: []
      }
      vista_reservas_pendientes: {
        Row: {
          email: string | null
          estado: string | null
          fecha: string | null
          fecha_solicitud: string | null
          hora: string | null
          id: string | null
          nombre_cliente: string | null
          numero_comensales: number | null
          telefono: string | null
        }
        Insert: {
          email?: string | null
          estado?: string | null
          fecha?: string | null
          fecha_solicitud?: string | null
          hora?: string | null
          id?: string | null
          nombre_cliente?: string | null
          numero_comensales?: number | null
          telefono?: string | null
        }
        Update: {
          email?: string | null
          estado?: string | null
          fecha?: string | null
          fecha_solicitud?: string | null
          hora?: string | null
          id?: string | null
          nombre_cliente?: string | null
          numero_comensales?: number | null
          telefono?: string | null
        }
        Relationships: []
      }
      vista_stock_consolidado: {
        Row: {
          activado: boolean | null
          categoria: string | null
          id: string | null
          nombre: string | null
          precio_eur: number | null
          stock: number | null
          tipo: string | null
        }
        Relationships: []
      }
      vista_ultimos_documentos: {
        Row: {
          drive_url: string | null
          fecha: string | null
          fecha_procesado: string | null
          id: number | null
          num_productos: number | null
          numero_documento: string | null
          proveedor: string | null
          proveedor_normalizado: string | null
          tipo: string | null
          total: number | null
        }
        Relationships: []
      }
      vista_ventas_diarias: {
        Row: {
          fecha: string | null
          num_pedidos: number | null
          ticket_medio: number | null
          total_ventas: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      albaranes_candidatos: {
        Args: { p_factura_id: number; p_texto?: string }
        Returns: {
          base: number
          citado_en_factura: boolean
          dias: number
          fecha: string
          id: number
          lineas: number
          mismo_proveedor: boolean
          numero_documento: string
          proveedor: string
          total: number
        }[]
      }
      albaranes_facturados_agente: {
        Args: never
        Returns: {
          albaran_id: number
          factura_id: number
          motivo: string
        }[]
      }
      albaranes_sin_factura_agente: {
        Args: { p_desde?: string; p_hasta?: string; p_proveedor?: string }
        Returns: Json
      }
      alertas_resumen_agente: { Args: { p_alertas: Json }; Returns: Json }
      append_tool_call_log: {
        Args: { p_call_id: string; p_new_tools: Json }
        Returns: undefined
      }
      asignar_mesas_reserva: {
        Args: { p_mesa_ids: string[]; p_reserva_id: string }
        Returns: {
          asignada_por: string | null
          created_at: string | null
          espacio_id: string
          fecha: string
          id: string
          mesa_id: string
          reserva_id: string
          turno: string
        }[]
        SetofOptions: {
          from: "*"
          to: "asignaciones_mesa"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      audit_tabla_util: { Args: { p_tabla: string }; Returns: boolean }
      auditar_prompt_vapi: {
        Args: { p_evento?: string; p_resultado?: string }
        Returns: string
      }
      base_linea_agente: {
        Args: { p_cant: number; p_uni: string; p_unidad: string }
        Returns: {
          convertida: boolean
          factor: number
          unidad_base: string
        }[]
      }
      buscar_contexto_chatbot: {
        Args: { embedding_query: string }
        Returns: Json
      }
      buscar_documentos_agente: {
        Args: {
          p_desde?: string
          p_hasta?: string
          p_limite?: number
          p_texto?: string
          p_tipo?: string
        }
        Returns: Json
      }
      buscar_facturas_agente: {
        Args: {
          embedding_query: string
          limite?: number
          p_tipo?: string
          umbral?: number
        }
        Returns: Json
      }
      buscar_facturas_por_contexto: {
        Args: { limite?: number; query_embedding: string }
        Returns: {
          fecha: string
          id: number
          numero_documento: string
          observaciones: string
          proveedor: string
          similitud: number
          tipo: string
        }[]
      }
      buscar_producto: {
        Args: { termino: string }
        Returns: {
          nombre: string
          precio_promedio: number
          ultima_fecha: string
          ultimo_precio: number
          veces_comprado: number
        }[]
      }
      buscar_productos_agente: {
        Args: { embedding_query: string; limite?: number; umbral?: number }
        Returns: Json
      }
      buscar_productos_similares: {
        Args: { limite?: number; query_embedding: string }
        Returns: {
          cantidad: number
          fecha: string
          id: number
          nombre: string
          precio_unitario: number
          proveedor: string
          similitud: number
        }[]
      }
      buscar_productos_texto_agente: {
        Args: { p_limite?: number; p_texto: string }
        Returns: Json
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      can_edit_section: { Args: { _section: string }; Returns: boolean }
      can_read_section: { Args: { _section: string }; Returns: boolean }
      can_write_section: { Args: { _section: string }; Returns: boolean }
      canjear_cheque_regalo: { Args: { p_codigo: string }; Returns: Json }
      categoria_agente: { Args: { p_texto: string }; Returns: number }
      chat_web_cerrar_uso: {
        Args: {
          p_cached: number
          p_completion: number
          p_coste: number
          p_estado: string
          p_llamadas: number
          p_modelo: string
          p_prompt: number
          p_uso_id: string
        }
        Returns: undefined
      }
      chat_web_reservar_cupo: {
        Args: { p_ip_hash: string; p_session_id: string; p_turno: number }
        Returns: Json
      }
      cif_control_valido: { Args: { p_cif: string }; Returns: boolean }
      cif_distancia: { Args: { a: string; b: string }; Returns: number }
      cleanup_old_security_logs: { Args: never; Returns: undefined }
      cleanup_rate_limit_log: { Args: never; Returns: undefined }
      compras_producto_agente: {
        Args: {
          p_desde?: string
          p_embedding?: string
          p_excluir?: string
          p_hasta?: string
          p_limite?: number
          p_orden?: string
          p_texto: string
          p_tipo?: string
          p_unidad?: string
        }
        Returns: Json
      }
      configuracion_web_visibilidad_menu_tapas: {
        Args: { p_mostrar: boolean; p_seccion: string }
        Returns: undefined
      }
      consulta_flexible_agente: { Args: { p: Json }; Returns: Json }
      contenido_texto_agente: {
        Args: { p_cant: number; p_uni: string; p_unidad: string }
        Returns: string
      }
      cotejo_factura_albaranes: {
        Args: { p_albaran_id?: number; p_factura_id: number }
        Returns: Json
      }
      crear_cheque_manual: {
        Args: { p_datos: Json; p_solicitud_id: string }
        Returns: Json
      }
      crear_cheque_manual_v2: {
        Args: { p_datos: Json; p_solicitud_id: string }
        Returns: Json
      }
      desvincular_albaran: { Args: { p_albaran_id: number }; Returns: Json }
      detalle_cheque_regalo: { Args: { p_id: string }; Returns: Json }
      detalle_documento_agente: {
        Args: { p_id?: number; p_numero?: string }
        Returns: Json
      }
      docs_deducidos_agente: {
        Args: { p_desde?: string; p_hasta?: string; p_tipo?: string }
        Returns: Json
      }
      docs_sin_iva_agente: {
        Args: { p_desde?: string; p_hasta?: string; p_tipo?: string }
        Returns: Json
      }
      docs_sin_total_agente: {
        Args: { p_desde?: string; p_hasta?: string; p_tipo?: string }
        Returns: Json
      }
      documento_compacto_agente: {
        Args: {
          p_detalle?: boolean
          p_doc: Database["public"]["Tables"]["facturas"]["Row"]
        }
        Returns: Json
      }
      ejecutar_consulta_chatbot: { Args: { query_sql: string }; Returns: Json }
      ejecutar_limpieza_gdpr: {
        Args: never
        Returns: {
          accion: string
          registros_procesados: number
          tabla: string
        }[]
      }
      emitir_factura_cheque: { Args: { p_cheque_id: string }; Returns: Json }
      es_linea_servicio_agente: { Args: { p_nombre: string }; Returns: boolean }
      es_subproducto_agente: {
        Args: { p_nombre: string; p_raices: string[] }
        Returns: boolean
      }
      escalera_niveles_valida: { Args: { p_niveles: Json }; Returns: boolean }
      establecer_superadmin_panel: {
        Args: {
          p_email: string
          p_make_super_admin: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      estadisticas_globales_agente: { Args: never; Returns: Json }
      estadisticas_lectura: {
        Args: { p_dias?: number }
        Returns: {
          documentos: number
          llamadas_media: number
          mas_cara_id: number
          mas_cara_numero: string
          mas_cara_proveedor: string
          mas_cara_usd: number
          media_usd: number
          mediana_usd: number
          por_lineas: Json
          por_paginas: Json
          total_usd: number
        }[]
      }
      extraer_contenido: {
        Args: { p_texto: string }
        Returns: {
          cantidad: number
          unidad: string
        }[]
      }
      factura_cumple_autoverificacion: {
        Args: { p_factura_id: number }
        Returns: boolean
      }
      facturas_candidatas: {
        Args: { p_albaran_id: number }
        Returns: {
          base: number
          cita_albaran: boolean
          dias: number
          fecha: string
          id: number
          lineas: number
          numero_documento: string
          total: number
        }[]
      }
      fecha_dudosa_agente: { Args: { p_alertas: Json }; Returns: boolean }
      ficha_proveedor_agente: { Args: { p_texto: string }; Returns: Json }
      fijar_tope_ia_mes: { Args: { p_eur: number }; Returns: number }
      filtrar_documentos_agente: {
        Args: {
          p_desde?: string
          p_filtro?: string
          p_hasta?: string
          p_limite?: number
          p_orden?: string
          p_texto?: string
          p_tipo?: string
        }
        Returns: Json
      }
      finalizar_intento_panel: {
        Args: {
          p_actor?: string
          p_id: string
          p_resultado?: string
          p_session_id?: string
        }
        Returns: undefined
      }
      fn_aceptar_propuesta_solicitud: {
        Args: { p_solicitud_id: string; p_via?: string }
        Returns: Json
      }
      fn_aprobar_sugerencia_blacklist: {
        Args: {
          p_actor?: string
          p_caduca_el: string
          p_motivo?: string
          p_sugerencia_id: string
        }
        Returns: {
          aprobada_en: string | null
          aprobado_por: string | null
          caduca_el: string | null
          created_at: string
          id: string
          motivo: string | null
          nombre: string | null
          tipo: string
          updated_at: string
          valor: string
        }
        SetofOptions: {
          from: "*"
          to: "blacklist"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_asignaciones_futuras_de_mesas: {
        Args: { p_mesa_ids: string[] }
        Returns: {
          fecha: string
          mesa_id: string
          mesa_nombre: string
          reserva_nombre: string
          turno: string
        }[]
      }
      fn_audit_estado_permiso: {
        Args: { p_fila: Json; p_referencia: Json }
        Returns: Json
      }
      fn_audit_sanitizar: { Args: { p_dato: Json }; Returns: Json }
      fn_avisar_reservas_sin_asignar: { Args: never; Returns: number }
      fn_capacidad_efectiva_espacio: {
        Args: { p_espacio_id: string }
        Returns: number
      }
      fn_capacidad_efectiva_marca: {
        Args: { p_marca: string }
        Returns: number
      }
      fn_franja_ocupacion_mesa: {
        Args: { p_fecha: string; p_hora: string }
        Returns: unknown
      }
      fn_minutos_ocupacion_mesa: { Args: { p_hora: string }; Returns: number }
      fn_normalizar_telefono: { Args: { p_telefono: string }; Returns: string }
      fn_rechazar_propuesta_solicitud: {
        Args: { p_solicitud_id: string; p_via?: string }
        Returns: Json
      }
      fn_rechazar_sugerencia_blacklist: {
        Args: { p_actor?: string; p_nota?: string; p_sugerencia_id: string }
        Returns: {
          blacklist_id: string | null
          creada_at: string
          email: string | null
          estado: string
          historial: Json
          id: string
          motivo: string
          nombre_cliente: string | null
          nota_revision: string | null
          reserva_id: string
          revisada_at: string | null
          revisada_por: string | null
          telefono: string | null
        }
        SetofOptions: {
          from: "*"
          to: "sugerencias_blacklist"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_restaurar_version_plantilla: {
        Args: {
          p_actor?: string
          p_tipo: string
          p_version_a_restaurar: number
        }
        Returns: {
          asunto: string
          bloques: Json
          color_acento: string
          color_oscuro: string
          creado_at: string
          creado_por: string | null
          cuerpo: string
          es_actual: boolean
          id: string
          logo_url: string | null
          nota_version: string | null
          pie: string | null
          saludo: string
          texto_boton_principal: string | null
          texto_boton_secundario: string | null
          tipo: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "plantillas_email_reserva"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gasto_categorias_agente: {
        Args: {
          p_agrupar?: string
          p_categoria?: string
          p_desde?: string
          p_hasta?: string
          p_tipo?: string
        }
        Returns: Json
      }
      gasto_ia_real_resumen: {
        Args: { p_dias?: number }
        Returns: {
          proceso: string
          reparto: string
          ultimo_dia_real: string
          usd_estimado_hoy: number
          usd_real: number
        }[]
      }
      gasto_ia_resumen: {
        Args: { p_dias?: number; p_funciones?: string[] }
        Returns: {
          coste_usd: number
          documentos_ocr: number
          filas: number
          filas_sin_tarifa: number
          funcion: string
          llamadas: number
          ultima: string
          unidades: number
        }[]
      }
      gastos_periodo: {
        Args: { fecha_fin: string; fecha_inicio: string }
        Returns: {
          num_facturas: number
          proveedor_principal: string
          ticket_promedio: number
          total_gastado: number
        }[]
      }
      get_call_logs_analytics: {
        Args: { p_call_type?: string; p_date_from: string; p_date_to: string }
        Returns: Json
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_section_permission: {
        Args: { _permission: string; _section: string; _user_id: string }
        Returns: boolean
      }
      historial_precios_agente: {
        Args: { p_limite?: number; p_producto: string }
        Returns: Json
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      ia_coste_alternativa: {
        Args: {
          p_desde?: string
          p_hasta?: string
          p_modelo_alternativo: string
        }
        Returns: {
          coste_alternativo_usd: number
          coste_real_usd: number
          diferencia_pct: number
          diferencia_usd: number
          modelo_alternativo: string
          modelo_real: string
          peticiones: number
        }[]
      }
      ia_coste_mes: {
        Args: never
        Returns: {
          coste_acumulado_usd: number
          dias_con_dato: number
          dias_mes: number
          dias_restantes: number
          estimado_ia_usd_mes: number
          fijos_eur_mes: number
          fijos_sin_verificar: number
          mes: string
          peticiones: number
          proy_lineal_usd: number
          proy_media7_usd: number
          usd_medio_dia: number
        }[]
      }
      ia_coste_por_funcion: {
        Args: { p_desde?: string; p_hasta?: string }
        Returns: {
          completion_tokens: number
          coste_usd: number
          descripcion: string
          errores: number
          funcion: string
          instrumentada: boolean
          llamadas: number
          pct: number
          peticiones: number
          prompt_tokens: number
          razonamiento_tokens: number
          usd_por_peticion: number
        }[]
      }
      ia_coste_por_modelo: {
        Args: { p_desde?: string; p_hasta?: string }
        Returns: {
          cached_tokens: number
          completion_tokens: number
          coste_usd: number
          llamadas: number
          modelo: string
          pct: number
          pct_razonamiento: number
          peticiones: number
          prompt_tokens: number
          razonamiento_tokens: number
          tarifado: boolean
          usd_por_peticion: number
        }[]
      }
      ia_coste_serie: {
        Args: { p_desde?: string; p_funcion?: string; p_hasta?: string }
        Returns: {
          completion_tokens: number
          coste_usd: number
          desv_30: number
          desviacion_pct: number
          dia: string
          errores: number
          es_anomalia: boolean
          llamadas: number
          media_30: number
          media_7: number
          peticiones: number
          prompt_tokens: number
          razonamiento_tokens: number
          z_30: number
        }[]
      }
      ia_funciones_sin_registro: {
        Args: { p_dias?: number }
        Returns: {
          descripcion: string
          dias_sin_registro: number
          funcion: string
          instrumentada: boolean
          ultima_fila: string
        }[]
      }
      ia_grupo_de_funcion: { Args: { p_funcion: string }; Returns: string }
      ia_proceso_de_funcion: { Args: { p_funcion: string }; Returns: string }
      ia_proceso_gasto: { Args: { p_funcion: string }; Returns: string }
      ia_registrar_uso: {
        Args: {
          p_cache_write_tokens?: number
          p_cached_tokens?: number
          p_completion_tokens?: number
          p_disparador?: string
          p_duracion_ms?: number
          p_estado?: string
          p_funcion: string
          p_llamadas?: number
          p_modelo: string
          p_operacion?: string
          p_prompt_tokens?: number
          p_razonamiento_tokens?: number
        }
        Returns: {
          coste_usd: number
          id: number
          tarifado: boolean
        }[]
      }
      iniciar_intento_panel: {
        Args: { p_email: string; p_ruta?: string }
        Returns: Json
      }
      iniciar_validacion_reversion: {
        Args: { p_actor: string; p_evento: string }
        Returns: boolean
      }
      instalar_auditoria_panel: { Args: never; Returns: undefined }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      lineas_precio_agente: {
        Args: { p_base?: boolean; p_ids?: number[]; p_producto_id?: number }
        Returns: {
          cantidad: number
          convertida: boolean
          convertido_desde: string
          created_at: string
          factura_id: number
          fecha: string
          id: number
          numero: string
          precio: number
          producto_id: number
          prov_n: string
          proveedor: string
          tipo: string
          unidad: string
        }[]
      }
      lineas_producto_agente: {
        Args: { p_excluir?: string; p_texto: string }
        Returns: {
          ids: number[]
          metodo: string
          palabras: string[]
          subproductos: string[]
        }[]
      }
      listar_cheques_regalo: { Args: { p_pagina?: number }; Returns: Json }
      listar_cheques_regalo_v2: {
        Args: { p_busqueda?: string; p_pagina?: number }
        Returns: Json
      }
      listar_cheques_regalo_v3: {
        Args: {
          p_busqueda?: string
          p_desde?: string
          p_estado?: string
          p_hasta?: string
          p_orden?: string
          p_pagina?: number
          p_tamano?: number
        }
        Returns: Json
      }
      listar_tablas_auditoria_panel: {
        Args: never
        Returns: {
          tabla: string
        }[]
      }
      metricas_cheques_regalo: {
        Args: { p_desde?: string; p_hasta?: string }
        Returns: Json
      }
      mismo_proveedor_agente: {
        Args: { a: string; b: string }
        Returns: boolean
      }
      newsletter_estadisticas_broadcasts: {
        Args: { p_broadcast_ids: string[] }
        Returns: {
          broadcast_id: string
          destinatarios: number
          eventos: number
          tipo_evento: string
        }[]
      }
      newsletter_marcar_sincronizados: {
        Args: { p_items: Json }
        Returns: number
      }
      newsletter_peticion_privilegiada: { Args: never; Returns: boolean }
      newsletter_registrar_baja: {
        Args: { p_email: string; p_origen: string; p_suscriptor_id?: string }
        Returns: number
      }
      normalizar_cif: { Args: { p_cif: string }; Returns: string }
      normalizar_nombre_producto: {
        Args: { p_nombre: string }
        Returns: string
      }
      normalizar_proveedor: { Args: { p_proveedor: string }; Returns: string }
      normalizar_proveedor_base: {
        Args: { p_proveedor: string }
        Returns: string
      }
      normalizar_texto: { Args: { p_texto: string }; Returns: string }
      normalizar_unidad_factura: { Args: { u: string }; Returns: string }
      numero_documento_normalizado: { Args: { p: string }; Returns: string }
      ocr_anadir_pagina: {
        Args: {
          p_archivo_path: string
          p_cabecera: Json
          p_esperado: Json
          p_factura_id: number
          p_lineas: Json
          p_pagina: number
          p_paginas_total: number
          p_trabajo_id: string
          p_usuario: string
        }
        Returns: Json
      }
      ocr_cerrar_pagina: {
        Args: {
          p_contexto: Json
          p_coste: number
          p_duracion_ms: number
          p_filas_contadas: number
          p_filas_extraidas: number
          p_modelo: string
          p_motivos: Json
          p_pagina_id: number
          p_recuento: Json
          p_relecturas: number
          p_resultado: Json
          p_tokens_entrada: number
          p_tokens_salida: number
          p_verificacion: Json
        }
        Returns: boolean
      }
      ocr_despachar: { Args: { p_trabajo_id: string }; Returns: number }
      ocr_despachar_cola: { Args: never; Returns: number }
      ocr_factura_existente: {
        Args: {
          p_cif: string
          p_fecha: string
          p_numero: string
          p_proveedor: string
          p_total: number
        }
        Returns: Json
      }
      ocr_fallo_pagina: {
        Args: { p_error: string; p_pagina_id: number }
        Returns: string
      }
      ocr_pedir_relectura: {
        Args: { p_paginas: Json; p_trabajo_id: string }
        Returns: number
      }
      ocr_reclamar_consolidacion: {
        Args: { p_lease_seg?: number; p_trabajo_id: string }
        Returns: {
          consolidar_despachado_at: string | null
          contexto_p1: Json | null
          coste_usd: number
          creado_por: string
          created_at: string
          documento_pendiente: Json | null
          error: string | null
          estado: string
          factura_id: number | null
          id: string
          intentos_consolidacion: number
          lease_hasta: string | null
          limite_at: string
          llamadas: number
          modelo: string | null
          nombre_original: string
          num_paginas: number
          origen: string
          original_mime: string | null
          original_path: string | null
          paginas_documento: number
          resultado: Json | null
          ronda_relectura: number
          terminado_at: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "ocr_trabajos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ocr_reclamar_pagina: {
        Args: { p_lease_seg?: number; p_pagina_id: number }
        Returns: {
          bytes: number
          coste_usd: number | null
          created_at: string
          despachada_at: string | null
          duracion_ms: number | null
          error: string | null
          estado: string
          filas_contadas: number | null
          filas_extraidas: number | null
          franja: number | null
          franjas_pagina: number | null
          id: number
          intentos: number
          lease_hasta: string | null
          mime: string
          motivo_relectura: Json | null
          motivos: Json | null
          no_antes_de: string
          numero: number
          pagina_doc: number
          pieza: string
          recuento: Json | null
          relecturas: number
          resultado: Json | null
          storage_path: string
          tokens_entrada: number | null
          tokens_salida: number | null
          trabajo_id: string
          updated_at: string
          verificacion_pie: Json | null
        }[]
        SetofOptions: {
          from: "*"
          to: "ocr_trabajo_paginas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ocr_resumen_factura: { Args: { p_factura_id: number }; Returns: Json }
      ocr_resumen_factura_datos: {
        Args: { p_factura_id: number }
        Returns: Json
      }
      ocr_sumar_gasto: {
        Args: { p_coste: number; p_llamadas: number; p_trabajo_id: string }
        Returns: undefined
      }
      ocr_sustituir_factura: {
        Args: {
          p_archivo_path: string
          p_cabecera: Json
          p_esperado: Json
          p_factura_id: number
          p_lineas: Json
          p_trabajo_id: string
          p_usuario: string
        }
        Returns: Json
      }
      ocr_terminar_trabajo: {
        Args: {
          p_documento_pendiente?: Json
          p_error: string
          p_estado: string
          p_factura_id: number
          p_resultado: Json
          p_trabajo_id: string
        }
        Returns: boolean
      }
      oficiososia_facturacion_eliminar: {
        Args: { p_estado: string; p_id: string; p_version: string }
        Returns: Json
      }
      oficiososia_facturacion_guardar: {
        Args: {
          p_documento: Json
          p_id?: string
          p_version_config: string
          p_version_factura?: string
        }
        Returns: Json
      }
      oficiososia_facturacion_guardar_v2: {
        Args: {
          p_borrador_id?: string
          p_documento: Json
          p_emitir?: boolean
          p_factura_origen?: string
          p_id?: string
          p_version_borrador?: string
          p_version_config: string
          p_version_factura?: string
        }
        Returns: Json
      }
      oficiososia_facturacion_leer: { Args: never; Returns: Json }
      openai_despachar_sincronizacion_costes: { Args: never; Returns: number }
      openai_sincronizar_ahora: { Args: never; Returns: number }
      palabras_producto_agente: { Args: { p_texto: string }; Returns: string[] }
      precio_es_agente: {
        Args: { p: number; p_decimales?: number }
        Returns: string
      }
      precio_referencia_agente: {
        Args: {
          p_base?: boolean
          p_factura_id: number
          p_fecha: string
          p_producto_id: number
          p_unidad: string
        }
        Returns: {
          compras: number
          desde: string
          hasta: string
          metodo: string
          precio: number
          proveedor: string
          proveedores_n: string[]
        }[]
      }
      preparar_contexto_auditoria_auth: {
        Args: {
          p_actor_id: string
          p_email?: string
          p_operacion: string
          p_user_id?: string
        }
        Returns: string
      }
      productos_aplicar_clasificacion_ia: {
        Args: { p_items: Json }
        Returns: Json
      }
      productos_asignar_lineas: {
        Args: {
          p_categoria_id?: number
          p_linea_ids: number[]
          p_nombre_nuevo?: string
          p_producto_id?: number
        }
        Returns: Json
      }
      productos_avisar_subidas: { Args: { p_ids: number[] }; Returns: number }
      productos_borrar: { Args: { p_producto_id: number }; Returns: undefined }
      productos_contenido_guardar: {
        Args: { p_cantidad: number; p_producto_id: number; p_unidad: string }
        Returns: Json
      }
      productos_despachar_clasificacion: { Args: never; Returns: number }
      productos_fusionar: {
        Args: { p_destino_id: number; p_origen_ids: number[] }
        Returns: Json
      }
      productos_gasto_por_categoria: {
        Args: { p_desde?: string; p_hasta?: string; p_tipo?: string }
        Returns: {
          categoria: string
          categoria_id: number
          gasto: number
          lineas: number
          lineas_sin_importe: number
          padre: string
          padre_id: number
          productos: number
          sin_clasificar: boolean
        }[]
      }
      productos_puede_editar: { Args: never; Returns: boolean }
      productos_recategorizar: {
        Args: { p_categoria_id: number; p_producto_ids: number[] }
        Returns: number
      }
      productos_renombrar: {
        Args: { p_nombre: string; p_producto_id: number }
        Returns: Json
      }
      productos_resumen: {
        Args: { p_desde?: string; p_hasta?: string; p_tipo?: string }
        Returns: {
          cantidades: Json
          categoria_id: number
          compras: number
          documentos: number
          gasto: number
          lineas_sin_importe: number
          nombre: string
          origen: string
          producto_id: number
          proveedores: string[]
          ultima_fecha: string
          ultimo_precio: number
          unidad_habitual: string
        }[]
      }
      proveedor_cif_valido: { Args: { p_cif: string }; Returns: boolean }
      proveedor_clave: { Args: { p_nombre: string }; Returns: string }
      proveedor_es_cliente: {
        Args: { p_base: string; p_cif: string }
        Returns: boolean
      }
      proveedor_resolver: {
        Args: { p_cif: string; p_crear?: boolean; p_nombre: string }
        Returns: number
      }
      proveedores_editar: {
        Args: {
          p_cif?: string
          p_id: number
          p_nombre: string
          p_nombre_comercial?: string
        }
        Returns: Json
      }
      proveedores_fusionar: {
        Args: { p_destino_id: number; p_origen_ids: number[] }
        Returns: Json
      }
      proveedores_listado: {
        Args: never
        Returns: {
          activo: boolean
          albaranes: number
          alias: string[]
          cif: string
          cifs_extra: string[]
          documentos: number
          facturas: number
          id: number
          nombre: string
          nombre_comercial: string
          origen: string
          total_albaranes: number
          total_facturas: number
          ultima_fecha: string
          variantes: string[]
        }[]
      }
      proveedores_puede_editar: { Args: never; Returns: boolean }
      raices_producto_agente: { Args: { p_texto: string }; Returns: string[] }
      raiz_producto_agente: { Args: { p_palabra: string }; Returns: string }
      ranking_agente: {
        Args: {
          p_categoria?: string
          p_criterio: string
          p_desde?: string
          p_hasta?: string
          p_incluir_servicios?: boolean
          p_limite?: number
          p_orden?: string
          p_tipo?: string
          p_unidad?: string
        }
        Returns: Json
      }
      reanudar_trabajos_ocr: { Args: never; Returns: number }
      recalcular_alertas_factura: {
        Args: { p_factura_id: number }
        Returns: undefined
      }
      recalcular_ocupacion_historica: {
        Args: { fecha_desde?: string; fecha_hasta?: string }
        Returns: number
      }
      registrar_acceso_panel: {
        Args: { p_ruta?: string; p_tipo: string }
        Returns: string
      }
      registrar_accion_auditoria_panel: {
        Args: { p_detalles?: Json; p_operacion: string }
        Returns: string
      }
      resumen_periodo_agente: {
        Args: { p_desde?: string; p_hasta?: string }
        Returns: Json
      }
      revertir_cambio_auditoria: {
        Args: { p_actor: string; p_confirmar?: boolean; p_evento: string }
        Returns: Json
      }
      serie_precios_agente: {
        Args: {
          p_desde?: string
          p_hasta?: string
          p_texto: string
          p_unidad?: string
        }
        Returns: Json
      }
      servicios_cerrados_reserva: {
        Args: { p_desde: string; p_hasta: string }
        Returns: {
          fecha: string
          motivo: string
          origen: string
          turno: string
        }[]
      }
      siguiente_numero_factura_cheque_regalo: {
        Args: { p_anio: number }
        Returns: string
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      tipo_cambio_usd_eur_actual: {
        Args: never
        Returns: {
          eur_por_usd: number
          fecha: string
          fuente: string
        }[]
      }
      trafico_web_desglose_resumen: {
        Args: {
          p_desde?: string
          p_dimension?: string
          p_hasta?: string
          p_limite?: number
          p_proyecto?: string
        }
        Returns: {
          pct: number
          valor: string
          visitantes: number
          visitas: number
        }[]
      }
      trafico_web_fdt_mes: {
        Args: { p_mes?: string }
        Returns: {
          alerta_80: boolean
          bytes_acumulados: number
          bytes_medios_por_visita: number
          bytes_proy_lineal: number
          bytes_proy_regresion: number
          dias_con_dato: number
          dias_mes: number
          dias_restantes: number
          limite_bytes: number
          pct_limite: number
          pct_proyectado: number
          proyecto: string
          visitas_mes: number
        }[]
      }
      trafico_web_serie: {
        Args: { p_desde?: string; p_hasta?: string; p_proyecto?: string }
        Returns: {
          desv_30: number
          desv_dow: number
          desviacion_pct: number
          es_anomalia: boolean
          fecha: string
          media_30: number
          media_7: number
          media_dow: number
          n_dow: number
          visitantes: number
          visitas: number
          z_dow: number
        }[]
      }
      trafico_web_tendencia: {
        Args: { p_dias?: number; p_proyecto?: string }
        Returns: {
          fiable: boolean
          intercepto: number
          n: number
          pendiente: number
          proyeccion: Json
          r2: number
          total_30d: number
        }[]
      }
      trafico_web_top_paginas: {
        Args: {
          p_desde?: string
          p_hasta?: string
          p_limite?: number
          p_orden?: string
          p_proyecto?: string
        }
        Returns: {
          bytes_estimados: number
          pct_bytes: number
          pct_visitas: number
          proyecto: string
          ruta: string
          visitas: number
        }[]
      }
      unaccent: { Args: { "": string }; Returns: string }
      unidad_agente: { Args: { p: string }; Returns: string }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      validar_cordura_factura: { Args: { p_factura_id: number }; Returns: Json }
      variacion_precios_agente: {
        Args: {
          p_categoria?: string
          p_desde?: string
          p_hasta?: string
          p_limite?: number
          p_producto?: string
          p_sentido?: string
          p_umbral_pct?: number
        }
        Returns: Json
      }
      verificar_cheque_regalo: { Args: { p_codigo: string }; Returns: Json }
      verificar_duplicado_factura: {
        Args: {
          p_fecha: string
          p_numero_documento: string
          p_proveedor: string
          p_total: number
        }
        Returns: Json
      }
      version_auditoria_panel: { Args: never; Returns: number }
      vincular_albaran_factura: {
        Args: { p_albaran_id: number; p_factura_id: number; p_forzar?: boolean }
        Returns: Json
      }
      vincular_albaranes_proveedor: {
        Args: { p_proveedor_id: number }
        Returns: number
      }
      withdraw_stock_inventory: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "staff"
      estado_turno: "programado" | "activo" | "completado" | "cancelado"
      puesto_trabajo:
        | "gerente"
        | "camarero"
        | "ayudante_camarero"
        | "cocinero"
        | "ayudante_cocina"
        | "recepcionista"
        | "limpieza"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "staff"],
      estado_turno: ["programado", "activo", "completado", "cancelado"],
      puesto_trabajo: [
        "gerente",
        "camarero",
        "ayudante_camarero",
        "cocinero",
        "ayudante_cocina",
        "recepcionista",
        "limpieza",
      ],
    },
  },
} as const
