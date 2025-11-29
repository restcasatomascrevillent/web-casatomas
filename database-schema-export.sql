-- =====================================================
-- ESQUEMA SQL COMPLETO - CASA TOMÁS
-- Tablas: platos, vinos, bebidas
-- Incluye: Políticas RLS, Funciones y Triggers
-- =====================================================

-- =====================================================
-- 1. FUNCIÓN PARA ACTUALIZAR TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- =====================================================
-- 2. TABLA: platos
-- =====================================================

CREATE TABLE public.platos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  categoria text NOT NULL,
  precio_eur numeric NOT NULL,
  unidad text,
  descripcion text,
  alergenos_oficiales text[] DEFAULT '{}'::text[],
  alergenos_inferidos text[] DEFAULT '{}'::text[],
  alergenos_notas text,
  activado boolean NOT NULL DEFAULT true,
  orden integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS en platos
ALTER TABLE public.platos ENABLE ROW LEVEL SECURITY;

-- Política RLS: Solo platos activados son visibles públicamente
CREATE POLICY "Platos activados son visibles públicamente"
ON public.platos
FOR SELECT
USING (activado = true);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_platos_updated_at
BEFORE UPDATE ON public.platos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 3. TABLA: vinos
-- =====================================================

CREATE TABLE public.vinos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  categoria text NOT NULL,
  precio_eur numeric NOT NULL,
  denominacion_origen text,
  ubicacion_pais text,
  ubicacion_region text,
  descripcion text,
  alergenos_oficiales text[] DEFAULT '{}'::text[],
  alergenos_inferidos text[] DEFAULT '{}'::text[],
  alergenos_notas text,
  activado boolean NOT NULL DEFAULT true,
  orden integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS en vinos
ALTER TABLE public.vinos ENABLE ROW LEVEL SECURITY;

-- Política RLS: Solo vinos activados son visibles públicamente
CREATE POLICY "Vinos activados son visibles públicamente"
ON public.vinos
FOR SELECT
USING (activado = true);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_vinos_updated_at
BEFORE UPDATE ON public.vinos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. TABLA: bebidas
-- =====================================================

CREATE TABLE public.bebidas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  categoria text NOT NULL,
  precio_eur numeric NOT NULL,
  tamano text,
  descripcion text,
  activado boolean NOT NULL DEFAULT true,
  orden integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS en bebidas
ALTER TABLE public.bebidas ENABLE ROW LEVEL SECURITY;

-- Política RLS: Solo bebidas activadas son visibles públicamente
CREATE POLICY "Bebidas activadas son visibles públicamente"
ON public.bebidas
FOR SELECT
USING (activado = true);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_bebidas_updated_at
BEFORE UPDATE ON public.bebidas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FIN DEL ESQUEMA
-- =====================================================

-- NOTAS:
-- - Todas las tablas tienen RLS habilitado
-- - Solo los registros con activado=true son visibles públicamente
-- - Los campos created_at y updated_at se gestionan automáticamente
-- - Para insertar/actualizar/eliminar datos necesitarás crear políticas adicionales
--   según tus necesidades de autenticación y autorización
