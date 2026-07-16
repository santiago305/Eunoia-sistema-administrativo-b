import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowSuperAdminWithoutRole20260528000000 implements MigrationInterface {
  name = 'AllowSuperAdminWithoutRole20260528000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN role_id DROP NOT NULL;
    `);

    await queryRunner.query(`
      UPDATE users
      SET role_id = NULL
      WHERE is_super_admin = true;
    `);
  }

  public async down(): Promise<void> {
    // No-op para evitar pérdida de trazabilidad.
  }
}
