import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUbigeoTables20260421010000 implements MigrationInterface {
  name = "CreateUbigeoTables20260421010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ubigeo_departments (
        id varchar(2) PRIMARY KEY,
        name varchar(160) NOT NULL,
        normalized_name varchar(160) NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ubigeo_departments_normalized_name
      ON ubigeo_departments (normalized_name)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ubigeo_provinces (
        id varchar(4) PRIMARY KEY,
        name varchar(160) NOT NULL,
        normalized_name varchar(160) NOT NULL,
        department_id varchar(2) NOT NULL REFERENCES ubigeo_departments(id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ubigeo_provinces_department_id
      ON ubigeo_provinces (department_id)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ubigeo_provinces_department_normalized_name
      ON ubigeo_provinces (department_id, normalized_name)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ubigeo_districts (
        id varchar(6) PRIMARY KEY,
        name varchar(160) NOT NULL,
        normalized_name varchar(160) NOT NULL,
        province_id varchar(4) NOT NULL REFERENCES ubigeo_provinces(id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ubigeo_districts_province_id
      ON ubigeo_districts (province_id)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ubigeo_districts_province_normalized_name
      ON ubigeo_districts (province_id, normalized_name)
    `);
  }

  public async down(): Promise<void> {
    // No-op: la migracion es idempotente y no debe eliminar datos catalogo.
  }
}
