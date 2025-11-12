-- Crear tabla de platos con alérgenos y control de activación
CREATE TABLE public.platos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  precio_eur NUMERIC(10,2) NOT NULL,
  unidad TEXT,
  descripcion TEXT,
  alergenos_oficiales TEXT[] DEFAULT '{}',
  alergenos_inferidos TEXT[] DEFAULT '{}',
  alergenos_notas TEXT,
  activado BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear índices para búsquedas
CREATE INDEX idx_platos_categoria ON public.platos(categoria);
CREATE INDEX idx_platos_activado ON public.platos(activado);

-- Habilitar RLS
ALTER TABLE public.platos ENABLE ROW LEVEL SECURITY;

-- Política de lectura: solo platos activados son visibles públicamente
CREATE POLICY "Platos activados son visibles públicamente" 
ON public.platos 
FOR SELECT 
USING (activado = true);

-- Crear tabla de vinos con alérgenos y control de activación
CREATE TABLE public.vinos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  precio_eur NUMERIC(10,2) NOT NULL,
  denominacion_origen TEXT,
  ubicacion_pais TEXT,
  ubicacion_region TEXT,
  descripcion TEXT,
  alergenos_oficiales TEXT[] DEFAULT '{}',
  alergenos_inferidos TEXT[] DEFAULT '{}',
  alergenos_notas TEXT,
  activado BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear índices para búsquedas
CREATE INDEX idx_vinos_categoria ON public.vinos(categoria);
CREATE INDEX idx_vinos_activado ON public.vinos(activado);
CREATE INDEX idx_vinos_ubicacion_pais ON public.vinos(ubicacion_pais);
CREATE INDEX idx_vinos_ubicacion_region ON public.vinos(ubicacion_region);

-- Habilitar RLS
ALTER TABLE public.vinos ENABLE ROW LEVEL SECURITY;

-- Política de lectura: solo vinos activados son visibles públicamente
CREATE POLICY "Vinos activados son visibles públicamente" 
ON public.vinos 
FOR SELECT 
USING (activado = true);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para actualización automática de timestamps
CREATE TRIGGER update_platos_updated_at
BEFORE UPDATE ON public.platos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vinos_updated_at
BEFORE UPDATE ON public.vinos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();