-- Permite leer la configuración del chatbot desde el frontend público.
DO $$
BEGIN
  IF to_regclass('public."configBotWeb"') IS NULL THEN
    RAISE NOTICE 'La tabla public."configBotWeb" no existe. Se omite esta migración.';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public."configBotWeb" ENABLE ROW LEVEL SECURITY';
  EXECUTE 'GRANT USAGE ON SCHEMA public TO anon, authenticated';
  EXECUTE 'GRANT SELECT ON TABLE public."configBotWeb" TO anon, authenticated';

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'configBotWeb'
      AND policyname = 'configBotWeb lectura publica'
  ) THEN
    EXECUTE '
      CREATE POLICY "configBotWeb lectura publica"
      ON public."configBotWeb"
      FOR SELECT
      TO anon, authenticated
      USING (true)
    ';
  END IF;
END
$$;
