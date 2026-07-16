import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMailPartitions20260514093000 implements MigrationInterface {
  name = "CreateMailPartitions20260514093000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
    -- Fallback operativo: mantener performance si la tabla aun no fue migrada a particionada.
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_messages_created_at_fallback ON messages (created_at DESC)';
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_messages_created_at_2026_fallback
      ON messages (created_at DESC)
      WHERE created_at >= ''2026-01-01'' AND created_at < ''2027-01-01''
    ';
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_messages_created_at_2027_fallback
      ON messages (created_at DESC)
      WHERE created_at >= ''2027-01-01'' AND created_at < ''2028-01-01''
    ';
    RAISE NOTICE 'messages no es particionada; se crearon indices fallback por fecha.';
  END IF;
END $$;
`);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}