import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAgenciesCore20260524000000 implements MigrationInterface {
  name = "CreateAgenciesCore20260524000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS agencies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        reference varchar(120),
        address varchar(300),
        department_id varchar(2),
        province_id varchar(4),
        district_id varchar(6),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(): Promise<void> {
    // No-op: this table may contain production data and is managed by later migrations.
  }
}
