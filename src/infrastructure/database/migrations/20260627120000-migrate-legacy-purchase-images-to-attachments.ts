import { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateLegacyPurchaseImagesToAttachments20260627120000 implements MigrationInterface {
  name = "MigrateLegacyPurchaseImagesToAttachments20260627120000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`
      INSERT INTO purchase_attachments (
        purchase_attachment_id,
        purchase_id,
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
        uuid_generate_v4(),
        legacy.purchase_id,
        'PRODUCT_PHOTO'::purchase_attachment_type,
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
          po.po_id AS purchase_id,
          po.created_by,
          po.created_at,
          image_path AS storage_path,
          LEFT(COALESCE(NULLIF(regexp_replace(image_path, '^.*/', ''), ''), 'legacy-purchase-image'), 255) AS filename
        FROM purchase_orders po
        CROSS JOIN LATERAL jsonb_array_elements_text(
          CASE WHEN jsonb_typeof(po.image_prodution) = 'array' THEN po.image_prodution ELSE '[]'::jsonb END
        ) AS image_path
        WHERE COALESCE(NULLIF(image_path, ''), '') <> ''
      ) legacy
      WHERE NOT EXISTS (
        SELECT 1
        FROM purchase_attachments existing
        WHERE existing.purchase_id = legacy.purchase_id
          AND existing.storage_path = legacy.storage_path
          AND existing.deleted_at IS NULL
      );
    `);
  }

  public async down(): Promise<void> {
    // Additive data migration. Keep migrated attachments intact on rollback.
  }
}
