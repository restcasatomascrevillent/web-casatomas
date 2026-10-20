-- Crear tabla de bebidas
CREATE TABLE public.bebidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  precio_eur NUMERIC NOT NULL,
  descripcion TEXT,
  tamano TEXT,
  activado BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.bebidas ENABLE ROW LEVEL SECURITY;

-- Política para que las bebidas activadas sean visibles públicamente
CREATE POLICY "Bebidas activadas son visibles públicamente"
ON public.bebidas
FOR SELECT
USING (activado = true);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_bebidas_updated_at
BEFORE UPDATE ON public.bebidas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();