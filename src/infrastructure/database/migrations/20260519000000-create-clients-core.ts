import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateClientsCore20260519000000 implements MigrationInterface {
  name = "CreateClientsCore20260519000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_type') THEN
          CREATE TYPE client_type AS ENUM ('NEW', 'LAGGING', 'REPURCHASE');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_type_client') THEN
          CREATE TYPE doc_type_client AS ENUM ('DNI', 'CE', 'RUC');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        type client_type NOT NULL,
        full_name varchar(255) NOT NULL,
        doc_type doc_type_client NOT NULL,
        doc_number varchar(60) NOT NULL,
        reference varchar(120),
        address varchar(300),
        department_id varchar(2) NOT NULL REFERENCES ubigeo_departments(id)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        province_id varchar(4) NOT NULL REFERENCES ubigeo_provinces(id)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        district_id varchar(6) NOT NULL REFERENCES ubigeo_districts(id)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_clients_document
      ON clients (doc_type, doc_number)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_department_id
      ON clients (department_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_province_id
      ON clients (province_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_district_id
      ON clients (district_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS telephones (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        number varchar(60) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        is_main boolean NOT NULL DEFAULT false,
        CONSTRAINT chk_telephones_main_requires_active CHECK (NOT is_main OR is_active)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_telephones_client_id
      ON telephones (client_id)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_telephones_client_main
      ON telephones (client_id)
      WHERE is_main = true
    `);
  }

  public async down(): Promise<void> {
    // No-op: migracion idempotente, no debe eliminar data.
  }
}

