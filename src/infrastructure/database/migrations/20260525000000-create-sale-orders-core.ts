import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSaleOrdersCore20260525000000 implements MigrationInterface {
  name = "CreateSaleOrdersCore20260525000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agenda_status') THEN
          CREATE TYPE agenda_status AS ENUM ('COORDINATED', 'PROGRAMMED', 'CANCELED');
        ELSE
          BEGIN
            ALTER TYPE agenda_status ADD VALUE 'COORDINATED';
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END;
          BEGIN
            ALTER TYPE agenda_status ADD VALUE 'PROGRAMMED';
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END;
          BEGIN
            ALTER TYPE agenda_status ADD VALUE 'CANCELED';
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
          CREATE TYPE delivery_status AS ENUM ('IN_PROGRESS', 'DELIVERED', 'CANCELED', 'WAITING');
        ELSE
          BEGIN
            ALTER TYPE delivery_status ADD VALUE 'IN_PROGRESS';
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END;
          BEGIN
            ALTER TYPE delivery_status ADD VALUE 'DELIVERED';
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END;
          BEGIN
            ALTER TYPE delivery_status ADD VALUE 'CANCELED';
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END;
          BEGIN
            ALTER TYPE delivery_status ADD VALUE 'WAITING';
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_type') THEN
          CREATE TYPE delivery_type AS ENUM ('CONTRA_ENTREGA', 'ABONADO_ENVIO');
        ELSE
          BEGIN
            ALTER TYPE delivery_type ADD VALUE 'CONTRA_ENTREGA';
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END;
          BEGIN
            ALTER TYPE delivery_type ADD VALUE 'ABONADO_ENVIO';
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sale_orders (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        serie varchar(10),
        correlative int,
        schedule_date date,
        delivery_date date,
        delivery_type delivery_type,
        sub_total numeric(12,2) NOT NULL DEFAULT 0,
        delivery_cost numeric(12,2) NOT NULL DEFAULT 0,
        total numeric(12,2) NOT NULL DEFAULT 0,
        note text,
        client_id uuid NOT NULL REFERENCES clients(id),
        agency_id uuid REFERENCES agencies(id),
        source_id uuid REFERENCES sources(id),
        warehouse_id uuid NOT NULL REFERENCES warehouses(id),
        created_by uuid NOT NULL REFERENCES users(user_id),
        agenda_status agenda_status NOT NULL DEFAULT 'COORDINATED',
        delivery_status delivery_status,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sale_order_items (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_order_id uuid NOT NULL REFERENCES sale_orders(id) ON DELETE CASCADE,
        reference_pack_id uuid REFERENCES packs(id),
        description varchar(255),
        quantity numeric(12,2) NOT NULL DEFAULT 1,
        unit_price numeric(12,2) NOT NULL DEFAULT 0,
        total numeric(12,2) NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_sale_order_items_quantity CHECK (quantity > 0),
        CONSTRAINT chk_sale_order_items_unit_price CHECK (unit_price >= 0),
        CONSTRAINT chk_sale_order_items_total CHECK (total >= 0)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sale_order_item_components (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_order_item_id uuid NOT NULL REFERENCES sale_order_items(id) ON DELETE CASCADE,
        sku_id uuid NOT NULL REFERENCES pc_skus(sku_id) ON DELETE RESTRICT,
        reference_pack_item_id uuid REFERENCES pack_items(id) ON DELETE SET NULL,
        quantity numeric(12,2) NOT NULL,
        unit_price numeric(12,2) NOT NULL DEFAULT 0,
        total numeric(12,2) NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_soic_quantity CHECK (quantity > 0),
        CONSTRAINT chk_soic_unit_price CHECK (unit_price >= 0),
        CONSTRAINT chk_soic_total CHECK (total >= 0)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sale_payments (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_order_id uuid NOT NULL REFERENCES sale_orders(id) ON DELETE CASCADE,
        date timestamptz NOT NULL DEFAULT now(),
        method varchar(100) NOT NULL,
        operation_number varchar(100),
        amount numeric(12,2) NOT NULL,
        note varchar(255),
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_sale_payments_amount CHECK (amount > 0)
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sale_orders_client ON sale_orders (client_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sale_orders_source ON sale_orders (source_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sale_orders_created_by ON sale_orders (created_by);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sale_orders_schedule_date ON sale_orders (schedule_date);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sale_orders_warehouse ON sale_orders (warehouse_id);`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sale_order_items_sale_order ON sale_order_items (sale_order_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sale_order_item_components_item ON sale_order_item_components (sale_order_item_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sale_order_item_components_sku ON sale_order_item_components (sku_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_order ON sale_payments (sale_order_id);`);
  }

  public async down(): Promise<void> {
    // No-op: migracion idempotente, no debe eliminar data.
  }
}
