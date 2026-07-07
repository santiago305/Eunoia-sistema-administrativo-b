import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSaleOrderAttachmentsAndDiscount20260704000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_orders
        ADD COLUMN IF NOT EXISTS discount numeric(12, 2) NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS sale_order_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sale_order_id uuid NOT NULL,
        sale_order_payment_id uuid NULL,
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
        CONSTRAINT chk_sale_order_attachments_type
          CHECK (type IN ('SHIPPING_PHOTO', 'PAYMENT_PROOF'))
      );

      CREATE INDEX IF NOT EXISTS idx_sale_order_attachments_order
        ON sale_order_attachments (sale_order_id);
      CREATE INDEX IF NOT EXISTS idx_sale_order_attachments_payment
        ON sale_order_attachments (sale_order_payment_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_sale_order_shipping_photo_active
        ON sale_order_attachments (sale_order_id, type)
        WHERE deleted_at IS NULL AND type = 'SHIPPING_PHOTO';
      CREATE UNIQUE INDEX IF NOT EXISTS uq_sale_order_payment_photo_active
        ON sale_order_attachments (sale_order_payment_id, type)
        WHERE deleted_at IS NULL
          AND type = 'PAYMENT_PROOF'
          AND sale_order_payment_id IS NOT NULL;

      DO $$ BEGIN
        ALTER TABLE sale_order_attachments
          ADD CONSTRAINT fk_sale_order_attachments_order
          FOREIGN KEY (sale_order_id) REFERENCES sale_orders(id)
          ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        ALTER TABLE sale_order_attachments
          ADD CONSTRAINT fk_sale_order_attachments_payment
          FOREIGN KEY (sale_order_payment_id) REFERENCES sale_payments(id)
          ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        ALTER TABLE sale_order_attachments
          ADD CONSTRAINT fk_sale_order_attachments_user
          FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
          ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      INSERT INTO sale_order_attachments (
        sale_order_id,
        type,
        filename,
        original_name,
        mime_type,
        size_bytes,
        url,
        storage_path
      )
      SELECT
        so.id,
        'SHIPPING_PHOTO',
        regexp_replace(so.send_photo, '^.*/', ''),
        regexp_replace(so.send_photo, '^.*/', ''),
        'application/octet-stream',
        0,
        so.send_photo,
        so.send_photo
      FROM sale_orders so
      WHERE so.send_photo IS NOT NULL
        AND btrim(so.send_photo) <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM sale_order_attachments soa
          WHERE soa.sale_order_id = so.id
            AND soa.type = 'SHIPPING_PHOTO'
            AND soa.deleted_at IS NULL
        );

      INSERT INTO sale_order_attachments (
        sale_order_id,
        sale_order_payment_id,
        type,
        filename,
        original_name,
        mime_type,
        size_bytes,
        url,
        storage_path
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
      WHERE sp.payment_photo IS NOT NULL
        AND btrim(sp.payment_photo) <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM sale_order_attachments soa
          WHERE soa.sale_order_payment_id = sp.id
            AND soa.type = 'PAYMENT_PROOF'
            AND soa.deleted_at IS NULL
        );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS sale_order_attachments;
      ALTER TABLE sale_orders DROP COLUMN IF EXISTS discount;
    `);
  }
}
