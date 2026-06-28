import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFiscalDocumentTypeToPurchaseAttachments20260628010000 implements MigrationInterface {
  name = "AddFiscalDocumentTypeToPurchaseAttachments20260628010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'purchase_attachment_type'
            AND e.enumlabel = 'FISCAL_DOCUMENT'
        ) THEN
          ALTER TYPE purchase_attachment_type ADD VALUE 'FISCAL_DOCUMENT';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_attachments
      ADD COLUMN IF NOT EXISTS fiscal_document_type voucher_doc_type NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_purchase_attachments_one_fiscal_document
      ON purchase_attachments (purchase_id)
      WHERE deleted_at IS NULL
        AND type::text IN ('FISCAL_DOCUMENT', 'INVOICE', 'RECEIPT');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_purchase_attachments_one_fiscal_document;`);
    await queryRunner.query(`ALTER TABLE purchase_attachments DROP COLUMN IF EXISTS fiscal_document_type;`);
  }
}
