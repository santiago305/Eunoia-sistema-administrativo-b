import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSkuImageColumn20260502000000 implements MigrationInterface {
  name = "AddSkuImageColumn20260502000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pc_skus
      ADD COLUMN IF NOT EXISTS image text NULL
    `);
  }

  public async down(): Promise<void> {
    // No-op para evitar perdida de datos de imagenes.
  }
}
