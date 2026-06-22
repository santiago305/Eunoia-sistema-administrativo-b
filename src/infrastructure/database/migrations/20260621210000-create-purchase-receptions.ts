import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePurchaseReceptions20260621210000 implements MigrationInterface {
  name = "CreatePurchaseReceptions20260621210000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_receptions (
        purchase_reception_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        purchase_id uuid NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
        warehouse_id uuid NULL REFERENCES warehouses(id) ON DELETE SET NULL,
        status varchar(20) NOT NULL DEFAULT 'DRAFT',
        received_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        received_at timestamptz NULL,
        note text NULL,
        evidence_urls jsonb NOT NULL DEFAULT '[]',
        inventory_document_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_reception_items (
        purchase_reception_item_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        purchase_reception_id uuid NOT NULL REFERENCES purchase_receptions(purchase_reception_id) ON DELETE CASCADE,
        purchase_item_id uuid NOT NULL REFERENCES purchase_order_items(po_item_id) ON DELETE CASCADE,
        stock_item_id uuid NULL,
        item_type purchase_item_type NOT NULL,
        ordered_quantity numeric(12,3) NOT NULL,
        received_quantity numeric(12,3) NOT NULL,
        accepted_quantity numeric(12,3) NOT NULL,
        rejected_quantity numeric(12,3) NOT NULL DEFAULT 0,
        affects_stock boolean NOT NULL DEFAULT false,
        stock_posted boolean NOT NULL DEFAULT false,
        service_confirmed boolean NOT NULL DEFAULT false,
        note text NULL
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_receptions_purchase ON purchase_receptions (purchase_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_receptions_status ON purchase_receptions (status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_reception_items_reception ON purchase_reception_items (purchase_reception_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_reception_items_purchase_item ON purchase_reception_items (purchase_item_id);`);

    await queryRunner.query(`
      INSERT INTO permissions (code, name, description, module, resource, action, type, is_system, is_active)
      VALUES
        ('purchases.receive', 'Registrar recepción de compra', 'Registrar recepciones parciales o totales de compras', 'purchases', 'purchase_receptions', 'receive', 'action', true, true),
        ('page.purchase-receptions.view', 'Ver recepción de compra', 'Acceso a la pantalla de recepción de una compra', 'purchases', 'purchase_receptions', 'view', 'page', true, true)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        module = EXCLUDED.module,
        resource = EXCLUDED.resource,
        action = EXCLUDED.action,
        type = EXCLUDED.type,
        is_system = true,
        is_active = true,
        updated_at = now();
    `);
  }

  public async down(): Promise<void> {
    // No-op: migration is intentionally additive/idempotent.
  }
}
