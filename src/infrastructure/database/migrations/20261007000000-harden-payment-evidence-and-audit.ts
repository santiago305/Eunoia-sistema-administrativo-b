import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Makes the payment-proof backfill idempotent and prepares the existing order
 * audit stream for evidence uploads. Legacy payment_photo values remain
 * readable through the fallback query; no file is moved by this migration.
 */
export class HardenPaymentEvidenceAndAudit20261007000000
  implements MigrationInterface
{
  name = 'HardenPaymentEvidenceAndAudit20261007000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE sale_order_attachments older
      SET deleted_at = COALESCE(older.deleted_at, timezone('America/Lima', CURRENT_TIMESTAMP))
      FROM sale_order_attachments newer
      WHERE older.sale_order_payment_id = newer.sale_order_payment_id
        AND older.type = 'PAYMENT_PROOF'
        AND newer.type = 'PAYMENT_PROOF'
        AND older.deleted_at IS NULL
        AND newer.deleted_at IS NULL
        AND (
          older.created_at < newer.created_at
          OR (older.created_at = newer.created_at AND older.id < newer.id)
        );

      INSERT INTO sale_order_attachments (
        sale_order_id, sale_order_payment_id, type, filename,
        original_name, mime_type, size_bytes, url, storage_path
      )
      SELECT
        sp.sale_order_id,
        sp.id,
        'PAYMENT_PROOF',
        regexp_replace(sp.payment_photo, '^.*/', ''),
        regexp_replace(sp.payment_photo, '^.*/', ''),
        'application/octet-stream',
        0,
        sp.payment_photo,
        sp.payment_photo
      FROM sale_payments sp
      WHERE NULLIF(btrim(sp.payment_photo), '') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM sale_order_attachments soa
          WHERE soa.sale_order_payment_id = sp.id
            AND soa.type = 'PAYMENT_PROOF'
            AND soa.deleted_at IS NULL
        );

      CREATE INDEX IF NOT EXISTS idx_sale_order_attachments_payment_type_active
        ON sale_order_attachments (sale_order_payment_id, type, deleted_at);
    `);

    await queryRunner.query(`
      ALTER TABLE sale_order_auditory
        ALTER COLUMN action_execution TYPE varchar(50);
      ALTER TABLE sale_order_auditory
        DROP CONSTRAINT IF EXISTS chk_sale_order_auditory_action;
      ALTER TABLE sale_order_auditory
        ADD CONSTRAINT chk_sale_order_auditory_action CHECK (action_execution IN (
          'delete', 'restore', 'preguide_on', 'preguide_off',
          'prepared_on', 'prepared_off', 'payment_evidence_attached'
        ));
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM sale_order_auditory
      WHERE action_execution = 'payment_evidence_attached';
      ALTER TABLE sale_order_auditory
        DROP CONSTRAINT IF EXISTS chk_sale_order_auditory_action;
      ALTER TABLE sale_order_auditory
        ALTER COLUMN action_execution TYPE varchar(20);
      ALTER TABLE sale_order_auditory
        ADD CONSTRAINT chk_sale_order_auditory_action CHECK (action_execution IN (
          'delete', 'restore', 'preguide_on', 'preguide_off',
          'prepared_on', 'prepared_off'
        ));
      DROP INDEX IF EXISTS idx_sale_order_attachments_payment_type_active;
    `);
  }
}
