import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductionAttachments20260715090000
  implements MigrationInterface
{
  name = 'CreateProductionAttachments20260715090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS production_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        production_id uuid NOT NULL,
        type varchar(40) NOT NULL,
        filename varchar NOT NULL,
        original_name varchar NOT NULL,
        mime_type varchar(120) NOT NULL,
        size_bytes bigint NOT NULL,
        url varchar NOT NULL,
        storage_path varchar NOT NULL,
        uploaded_by_user_id uuid NULL,
        note varchar(255) NULL,
        deleted_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_production_attachments_type
          CHECK (type IN ('EVIDENCE_PHOTO'))
      );

      CREATE INDEX IF NOT EXISTS idx_production_attachments_order
        ON production_attachments (production_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_production_attachment_active_path
        ON production_attachments (production_id, storage_path)
        WHERE deleted_at IS NULL;

      DO $$ BEGIN
        ALTER TABLE production_attachments
          ADD CONSTRAINT fk_production_attachments_order
          FOREIGN KEY (production_id) REFERENCES production_orders(production_id)
          ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        ALTER TABLE production_attachments
          ADD CONSTRAINT fk_production_attachments_user
          FOREIGN KEY (uploaded_by_user_id) REFERENCES users(user_id)
          ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      INSERT INTO production_attachments (
        production_id,
        type,
        filename,
        original_name,
        mime_type,
        size_bytes,
        url,
        storage_path,
        note,
        uploaded_by_user_id,
        created_at
      )
      SELECT
        legacy.production_id,
        'EVIDENCE_PHOTO',
        legacy.filename,
        legacy.filename,
        'image/*',
        0,
        legacy.storage_path,
        legacy.storage_path,
        'Migrado desde image_prodution legacy.',
        CASE
          WHEN legacy.created_by IS NOT NULL
            AND EXISTS (SELECT 1 FROM users u WHERE u.user_id = legacy.created_by)
          THEN legacy.created_by
          ELSE NULL
        END,
        legacy.created_at
      FROM (
        SELECT
          po.production_id,
          po.created_by,
          po.created_at,
          image_path AS storage_path,
          LEFT(COALESCE(NULLIF(regexp_replace(image_path, '^.*/', ''), ''), 'legacy-production-image'), 255) AS filename
        FROM production_orders po
        CROSS JOIN LATERAL jsonb_array_elements_text(
          CASE WHEN jsonb_typeof(po.image_prodution) = 'array' THEN po.image_prodution ELSE '[]'::jsonb END
        ) AS image_path
        WHERE COALESCE(NULLIF(image_path, ''), '') <> ''
      ) legacy
      WHERE NOT EXISTS (
        SELECT 1
        FROM production_attachments existing
        WHERE existing.production_id = legacy.production_id
          AND existing.storage_path = legacy.storage_path
          AND existing.deleted_at IS NULL
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS production_attachments;`);
  }
}

