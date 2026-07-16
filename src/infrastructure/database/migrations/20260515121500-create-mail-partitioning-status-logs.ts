import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMailPartitioningStatusLogs20260515121500 implements MigrationInterface {
  name = "CreateMailPartitioningStatusLogs20260515121500";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
-- Endurece estrategia de particionado para messages:
-- 1) elimina indices fallback legacy
-- 2) registra diagnostico de readiness
-- 3) crea vista de estado operativo

-- 1) Limpieza de indices fallback creados por estrategias anteriores.
DO $$
DECLARE
  idx record;
BEGIN
  FOR idx IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND (
        indexname = 'idx_messages_created_at_fallback'
        OR indexname LIKE 'idx_messages_created_at\_%\_fallback' ESCAPE '\'
      )
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', idx.indexname);
  END LOOP;
END $$;

-- 2) Log de diagnostico para readiness de particionado real.
CREATE TABLE IF NOT EXISTS mail_partitioning_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name varchar(120) NOT NULL,
  relkind char(1) NULL,
  is_partitioned boolean NOT NULL,
  partition_strategy varchar(20) NULL,
  partition_key text NULL,
  fk_references_count integer NOT NULL DEFAULT 0,
  primary_key_def text NULL,
  primary_key_includes_created_at boolean NOT NULL DEFAULT false,
  can_partition_by_created_at_without_fk_redesign boolean NOT NULL DEFAULT false,
  blocker_reason text NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

DO $$
DECLARE
  v_relkind char(1);
  v_is_partitioned boolean;
  v_partstrat char(1);
  v_partkey text;
  v_fk_refs integer;
  v_pk_def text;
  v_pk_has_created_at boolean;
  v_blocker text;
BEGIN
  SELECT c.relkind
    INTO v_relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='messages'
  LIMIT 1;

  v_is_partitioned := (v_relkind = 'p');

  SELECT p.partstrat, pg_get_partkeydef(p.partrelid)
    INTO v_partstrat, v_partkey
  FROM pg_partitioned_table p
  JOIN pg_class c ON c.oid = p.partrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='messages'
  LIMIT 1;

  SELECT count(*)
    INTO v_fk_refs
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.confrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE c.contype = 'f'
    AND n.nspname = 'public'
    AND t.relname = 'messages';

  SELECT pg_get_constraintdef(c.oid)
    INTO v_pk_def
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE c.contype = 'p'
    AND n.nspname='public'
    AND t.relname='messages'
  LIMIT 1;

  v_pk_has_created_at := coalesce(v_pk_def ILIKE '%(id, created_at)%', false)
                      OR coalesce(v_pk_def ILIKE '%(created_at, id)%', false)
                      OR coalesce(v_pk_def ILIKE '%created_at%', false);

  IF v_is_partitioned THEN
    v_blocker := NULL;
  ELSIF NOT v_pk_has_created_at AND v_fk_refs > 0 THEN
    v_blocker := 'messages tiene FK referenciadas y PK sin created_at; para RANGE(created_at) se requiere rediseño de PK/FK o estrategia alternativa.';
  ELSE
    v_blocker := 'messages no es particionada; requiere migracion de conversion.';
  END IF;

  INSERT INTO mail_partitioning_status_logs (
    table_name,
    relkind,
    is_partitioned,
    partition_strategy,
    partition_key,
    fk_references_count,
    primary_key_def,
    primary_key_includes_created_at,
    can_partition_by_created_at_without_fk_redesign,
    blocker_reason
  ) VALUES (
    'messages',
    v_relkind,
    v_is_partitioned,
    CASE v_partstrat WHEN 'r' THEN 'RANGE' WHEN 'l' THEN 'LIST' WHEN 'h' THEN 'HASH' ELSE NULL END,
    v_partkey,
    coalesce(v_fk_refs, 0),
    v_pk_def,
    coalesce(v_pk_has_created_at, false),
    (v_is_partitioned OR (coalesce(v_fk_refs,0)=0 AND coalesce(v_pk_has_created_at,false))),
    v_blocker
  );
END $$;

-- 3) Vista operativa de ultimo estado.
CREATE OR REPLACE VIEW vw_mail_messages_partitioning_status AS
SELECT
  table_name,
  relkind,
  is_partitioned,
  partition_strategy,
  partition_key,
  fk_references_count,
  primary_key_def,
  primary_key_includes_created_at,
  can_partition_by_created_at_without_fk_redesign,
  blocker_reason,
  created_at
FROM mail_partitioning_status_logs
WHERE table_name = 'messages'
ORDER BY created_at DESC
LIMIT 1;

`);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}