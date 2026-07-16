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
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        email varchar(255) NOT NULL UNIQUE,
        password varchar(255) NOT NULL,
        first_name varchar(120),
        last_name varchar(120),
        avatar_url text,
        role_id uuid REFERENCES roles(role_id),
        company_id uuid REFERENCES companies(company_id),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        token_hash varchar(255) NOT NULL,
        user_agent text,
        ip_address varchar(80),
        revoked_at timestamptz,
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
        name varchar(255) NOT NULL UNIQUE,
        type varchar(50) NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_units (
        unit_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        code varchar(20) NOT NULL UNIQUE,
        name varchar(100) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_skus (
        sku_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id uuid NOT NULL REFERENCES pc_products(product_id) ON DELETE CASCADE,
        sku varchar(100) NOT NULL UNIQUE,
        name varchar(255) NOT NULL,
        image_url text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_attributes (
        attribute_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        code varchar(60) NOT NULL UNIQUE,
        name varchar(120) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pc_sku_attribute_values (
        sku_attribute_value_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku_id uuid NOT NULL REFERENCES pc_skus(sku_id) ON DELETE CASCADE,
        attribute_id uuid NOT NULL REFERENCES pc_attributes(attribute_id) ON DELETE CASCADE,
        value varchar(255) NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_series (
        serie_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        warehouse_id uuid REFERENCES warehouses(id),
        doc_type varchar(50) NOT NULL,
        serie varchar(20) NOT NULL,
        current_number int NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
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
