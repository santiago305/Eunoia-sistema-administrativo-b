import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFoundationSchema20260410000000 implements MigrationInterface {
  name = "CreateFoundationSchema20260410000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'production_status') THEN
          CREATE TYPE production_status AS ENUM ('DRAFT','IN_PROGRESS','PARTIAL','COMPLETED','CANCELLED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pc_product_type') THEN
          CREATE TYPE pc_product_type AS ENUM ('MATERIAL','PRODUCT');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_doc_type') THEN
          CREATE TYPE inv_doc_type AS ENUM ('IN','OUT','TRANSFER','ADJUSTMENT','PRODUCTION','SALE_ORDER');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_doc_status') THEN
          CREATE TYPE inv_doc_status AS ENUM ('DRAFT','POSTED','CANCELLED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_direction') THEN
          CREATE TYPE inv_direction AS ENUM ('IN','OUT');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_type') THEN
          CREATE TYPE currency_type AS ENUM ('PEN','USD');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS companies (
        company_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        ruc varchar(11) NOT NULL UNIQUE,
        name varchar(255) NOT NULL,
        email varchar(255),
        phone varchar(50),
        address text,
        logo_url text,
        isotype_url text,
        certificate_url text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        role_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(100) NOT NULL UNIQUE,
        description varchar(255),
        deleted boolean NOT NULL DEFAULT false,
        created_by_user_id uuid,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar NOT NULL DEFAULT '',
        email varchar(255) NOT NULL UNIQUE,
        password varchar(255) NOT NULL,
        first_name varchar(120),
        last_name varchar(120),
        avatar_url text,
        telefono varchar(30),
        preferred_home_path varchar(255),
        role_id uuid REFERENCES roles(role_id),
        company_id uuid REFERENCES companies(company_id),
        is_active boolean NOT NULL DEFAULT true,
        deleted boolean NOT NULL DEFAULT false,
        deleted_at timestamptz,
        is_super_admin boolean NOT NULL DEFAULT false,
        created_by_user_id uuid REFERENCES users(user_id) ON DELETE SET NULL,
        manageable_role_descriptions text[],
        manageable_user_ids uuid[],
        failed_login_attempts integer NOT NULL DEFAULT 0,
        lockout_level integer NOT NULL DEFAULT 0,
        locked_until timestamp,
        security_disabled_at timestamp,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        refresh_token_hash varchar(500) NOT NULL,
        user_agent varchar(500),
        ip varchar(45),
        device_name varchar(120),
        last_used_at timestamp,
        revoked_at timestamp,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS products (
        product_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(255) NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        supplier_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        doc_type varchar(20),
        doc_number varchar(30),
        name varchar(255) NOT NULL,
        email varchar(255),
        phone varchar(50),
        address text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        method_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(100) NOT NULL UNIQUE,
        description varchar(255),
        requires_voucher boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS supplier_methods (
        supplier_method_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        supplier_id uuid NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
        method_id uuid NOT NULL REFERENCES payment_methods(method_id),
        number varchar(100),
        requires_voucher boolean NOT NULL DEFAULT false,
        is_default boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS company_methods (
        company_method_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id uuid NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        method_id uuid NOT NULL REFERENCES payment_methods(method_id),
        number varchar(100),
        requires_voucher boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar NOT NULL,
        department varchar NOT NULL,
        province varchar NOT NULL,
        district varchar NOT NULL,
        address varchar,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS warehouse_locations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        code varchar NOT NULL,
        description varchar,
        is_active boolean NOT NULL DEFAULT true
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_products (
        product_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(180) NOT NULL UNIQUE,
        description text,
        type pc_product_type NOT NULL,
        brand varchar(120),
        base_unit_id uuid,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_units (
        unit_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        code varchar(50) NOT NULL UNIQUE,
        name varchar(180) NOT NULL
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_pc_products_base_unit'
        ) THEN
          ALTER TABLE pc_products
          ADD CONSTRAINT fk_pc_products_base_unit
          FOREIGN KEY (base_unit_id) REFERENCES pc_units(unit_id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_skus (
        sku_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id uuid NOT NULL REFERENCES pc_products(product_id) ON DELETE CASCADE,
        backend_sku varchar(80) NOT NULL UNIQUE,
        custom_sku varchar(80),
        name varchar(180) NOT NULL,
        barcode varchar(80),
        image text,
        price numeric(12,2) NOT NULL DEFAULT 0,
        cost numeric(12,2) NOT NULL DEFAULT 0,
        is_sellable boolean NOT NULL DEFAULT true,
        is_purchasable boolean NOT NULL DEFAULT false,
        is_manufacturable boolean NOT NULL DEFAULT false,
        is_stock_tracked boolean NOT NULL DEFAULT true,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_pc_skus_custom_sku
      ON pc_skus(custom_sku)
      WHERE custom_sku IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_pc_skus_barcode
      ON pc_skus(barcode)
      WHERE barcode IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_attributes (
        attribute_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        code varchar(80) NOT NULL UNIQUE,
        name varchar(120) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_sku_attribute_values (
        sku_attribute_value_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku_id uuid NOT NULL REFERENCES pc_skus(sku_id) ON DELETE CASCADE,
        attribute_id uuid NOT NULL REFERENCES pc_attributes(attribute_id) ON DELETE CASCADE,
        value varchar(255) NOT NULL,
        CONSTRAINT ux_pc_sku_attribute_values_sku_attribute UNIQUE (sku_id, attribute_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_series (
        serie_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        code varchar(250) NOT NULL,
        name varchar(100) NOT NULL,
        doc_type varchar(80) NOT NULL,
        warehouse_id uuid NOT NULL REFERENCES warehouses(id),
        next_number integer NOT NULL DEFAULT 1,
        padding smallint NOT NULL DEFAULT 50,
        separator varchar(50) NOT NULL DEFAULT '-',
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT uq_document_series_warehouse_code UNIQUE (warehouse_id, code)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_stock_items (
        stock_item_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku_id uuid NOT NULL REFERENCES pc_skus(sku_id) ON DELETE CASCADE,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT ux_pc_stock_items_sku UNIQUE (sku_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS supplier_skus (
        supplier_sku_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        supplier_id uuid NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
        sku_id uuid NOT NULL REFERENCES pc_skus(sku_id) ON DELETE CASCADE,
        supplier_code varchar(120),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS production_orders (
        production_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        from_warehouse_id uuid NOT NULL REFERENCES warehouses(id),
        to_warehouse_id uuid NOT NULL REFERENCES warehouses(id),
        doc_type varchar(50) NOT NULL,
        serie_id uuid NOT NULL REFERENCES document_series(serie_id),
        correlative int NOT NULL,
        status production_status NOT NULL DEFAULT 'DRAFT',
        reference varchar,
        manufacture_date timestamptz NOT NULL,
        created_by uuid NOT NULL REFERENCES users(user_id),
        updated_by varchar,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        image_prodution jsonb NOT NULL DEFAULT '[]'::jsonb
      );
    `);
  }

  public async down(): Promise<void> {
    // Baseline migration is intentionally not destructive.
  }
}
