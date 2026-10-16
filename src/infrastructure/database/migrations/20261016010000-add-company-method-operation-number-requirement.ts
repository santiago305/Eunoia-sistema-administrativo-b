import { MigrationInterface, QueryRunner } from "typeorm";

/** Makes the operation-number requirement configurable per company payment method. */
export class AddCompanyMethodOperationNumberRequirement20261016010000
  implements MigrationInterface
{
  name = "AddCompanyMethodOperationNumberRequirement20261016010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE company_methods
      ADD COLUMN IF NOT EXISTS requires_operation_number boolean NOT NULL DEFAULT true
    `);

    // Existing links must remain strict until they are deliberately recreated as optional.
    await queryRunner.query(`
      UPDATE company_methods
      SET requires_operation_number = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE company_methods
      DROP COLUMN IF EXISTS requires_operation_number
    `);
  }
}
