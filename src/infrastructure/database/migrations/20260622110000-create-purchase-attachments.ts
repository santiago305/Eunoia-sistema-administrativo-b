import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePurchaseAttachments20260622110000 implements MigrationInterface {
  name = "CreatePurchaseAttachments20260622110000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_attachment_type') THEN
          CREATE TYPE purchase_attachment_type AS ENUM (
            'PAYMENT_PROOF',
            'INVOICE',
            'RECEIPT',
            'QUOTATION',
            'DELIVERY_NOTE',
            'PRODUCT_PHOTO',
            'SERVICE_EVIDENCE',
            'CONTRACT',
            'OTHER'
          );
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_attachments (
        purchase_attachment_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        purchase_id uuid NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
        payment_id uuid NULL REFERENCES payment_documents(pay_doc_id) ON DELETE SET NULL,
        reception_id uuid NULL,
        type purchase_attachment_type NOT NULL,
        filename varchar(255) NOT NULL,
        original_name varchar(255) NOT NULL,
        mime_type varchar(120) NOT NULL,
        size_bytes integer NOT NULL,
        url varchar(700) NOT NULL,
        storage_path varchar(700) NOT NULL,
        note text NULL,
        uploaded_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        deleted_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_receptions'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_purchase_attachments_reception'
        ) THEN
          ALTER TABLE purchase_attachments
          ADD CONSTRAINT fk_purchase_attachments_reception
          FOREIGN KEY (reception_id) REFERENCES purchase_receptions(purchase_reception_id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_attachments_purchase ON purchase_attachments (purchase_id, deleted_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_attachments_payment ON purchase_attachments (payment_id, deleted_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_attachments_reception ON purchase_attachments (reception_id, deleted_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_attachments_type ON purchase_attachments (type);`);
    await queryRunner.query(`
      INSERT INTO permissions (code, name, description, module, resource, action, type, is_active)
      VALUES
        ('purchases.attachments.view', 'Ver documentos de compras', 'Ver documentos y evidencias adjuntas a compras', 'purchases', 'attachments', 'view', 'action', true),
        ('purchases.attachments.upload', 'Subir documentos de compras', 'Subir documentos y evidencias adjuntas a compras', 'purchases', 'attachments', 'upload', 'action', true),
        ('purchases.attachments.delete', 'Eliminar documentos de compras', 'Eliminar documentos y evidencias adjuntas a compras', 'purchases', 'attachments', 'delete', 'action', true)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        module = EXCLUDED.module,
        resource = EXCLUDED.resource,
        action = EXCLUDED.action,
        type = EXCLUDED.type,
        is_active = EXCLUDED.is_active;
    `);
  }

  public async down(): Promise<void> {
    // Additive migration. Keep data and permissions intact on rollback.
  }
}
