import { MigrationInterface, QueryRunner } from "typeorm";

export class DropRecognitionCodeDescriptions20260820122000
  implements MigrationInterface
{
  name = "DropRecognitionCodeDescriptions20260820122000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_order_sku_recognition_codes
      DROP COLUMN IF EXISTS description
    `);
    await queryRunner.query(`
      ALTER TABLE source_recognition_codes
      DROP COLUMN IF EXISTS description
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_order_sku_recognition_codes
      ADD COLUMN IF NOT EXISTS description varchar(180) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE source_recognition_codes
      ADD COLUMN IF NOT EXISTS description varchar(180) NULL
    `);
  }
}
