import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPurchaseTypesAndStatuses20260621190000 implements MigrationInterface {
  name = "AddPurchaseTypesAndStatuses20260621190000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE purchase_type AS ENUM ('INVENTORY', 'RAW_MATERIAL', 'INTERNAL_MATERIAL', 'FIXED_ASSET', 'SERVICE', 'SUBSCRIPTION', 'MIXED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE purchase_item_type AS ENUM ('PRODUCT', 'RAW_MATERIAL', 'INTERNAL_MATERIAL', 'FIXED_ASSET', 'SERVICE', 'SUBSCRIPTION');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE purchase_reception_status AS ENUM ('NOT_REQUIRED', 'PENDING', 'PARTIALLY_RECEIVED', 'RECEIVED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE purchase_payment_status AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_orders
      ALTER COLUMN warehouse_id DROP NOT NULL,
      ADD COLUMN IF NOT EXISTS purchase_type purchase_type NOT NULL DEFAULT 'INVENTORY',
      ADD COLUMN IF NOT EXISTS reception_status purchase_reception_status NOT NULL DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS payment_status purchase_payment_status NOT NULL DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS requested_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS approved_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
      ADD COLUMN IF NOT EXISTS rejected_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS rejected_at timestamptz NULL,
      ADD COLUMN IF NOT EXISTS rejection_reason text NULL,
      ADD COLUMN IF NOT EXISTS is_recurring_source boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS recurring_template_id uuid NULL,
      ADD COLUMN IF NOT EXISTS requires_receipt boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS requires_stock_entry boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS requires_asset_creation boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_order_items
      ALTER COLUMN stock_item_id DROP NOT NULL,
      ADD COLUMN IF NOT EXISTS item_type purchase_item_type NOT NULL DEFAULT 'PRODUCT',
      ADD COLUMN IF NOT EXISTS internal_material_id uuid NULL,
      ADD COLUMN IF NOT EXISTS asset_category_id uuid NULL,
      ADD COLUMN IF NOT EXISTS service_name varchar NULL,
      ADD COLUMN IF NOT EXISTS description text NULL,
      ADD COLUMN IF NOT EXISTS warehouse_id uuid NULL REFERENCES warehouses(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS affects_stock boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS generates_asset boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_service boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_subscription boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_orders_purchase_type ON purchase_orders (purchase_type);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_orders_reception_status ON purchase_orders (reception_status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_orders_payment_status ON purchase_orders (payment_status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item_type ON purchase_order_items (item_type);`);
  }

  public async down(): Promise<void> {
    // No-op: migration is additive/idempotent for local phased delivery.
  }
}
