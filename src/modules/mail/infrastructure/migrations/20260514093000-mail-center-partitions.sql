-- Particionado anual para messages (solo si la tabla padre ya es particionada).
-- Esta migracion es segura para ambientes donde messages aun es tabla normal.

DO $$
DECLARE
  is_partitioned boolean;
BEGIN
  SELECT c.relkind = 'p'
    INTO is_partitioned
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'messages'
  LIMIT 1;

  IF is_partitioned THEN
    EXECUTE '
      CREATE TABLE IF NOT EXISTS messages_2026
      PARTITION OF messages
      FOR VALUES FROM (''2026-01-01'') TO (''2027-01-01'')
    ';
    EXECUTE '
      CREATE TABLE IF NOT EXISTS messages_2027
      PARTITION OF messages
      FOR VALUES FROM (''2027-01-01'') TO (''2028-01-01'')
    ';
    EXECUTE '
      CREATE TABLE IF NOT EXISTS messages_default
      PARTITION OF messages DEFAULT
    ';
  ELSE
    RAISE NOTICE 'messages no es una tabla particionada; se omite creacion de particiones.';
  END IF;
END $$;
