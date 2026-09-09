import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurchaseReceivedAt20260909000000 implements MigrationInterface {
  name = 'AddPurchaseReceivedAt20260909000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_orders
      ADD COLUMN IF NOT EXISTS received_at timestamptz NULL
    `);

    // Preserve the actual date for purchases that were already received before
    // this field existed. Inventory documents are the most precise source;
    // the history event covers purchases without stock items.
    await queryRunner.query(`
      UPDATE purchase_orders po
      SET received_at = COALESCE(
        (
          SELECT MAX(d.posted_at)
          FROM pc_inventory_documents d
          WHERE d.reference_id = po.po_id
            AND d.reference_type = 'PURCHASE'
            AND d.doc_type = 'IN'
            AND d.status = 'POSTED'
            AND d.posted_at IS NOT NULL
        ),
        (
          SELECT MAX(h.created_at)
          FROM purchase_history_events h
          WHERE h.purchase_id = po.po_id
            AND h.event_type = 'PURCHASE_FULLY_RECEIVED'
        )
      )
      WHERE po.status = 'RECEIVED'
        AND po.received_at IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_orders
      DROP COLUMN IF EXISTS received_at
    `);
  }
}
