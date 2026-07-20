import { MigrationInterface, QueryRunner } from "typeorm";

export class StrengthenProductEquivalences20260720020000 implements MigrationInterface {
  name = "StrengthenProductEquivalences20260720020000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pc_equivalences
      ALTER COLUMN factor TYPE numeric(12, 6);
    `);
    await queryRunner.query(`
      ALTER TABLE pc_equivalences
      ADD CONSTRAINT ck_pc_equivalences_factor_positive CHECK (factor > 0);
    `);
    await queryRunner.query(`
      ALTER TABLE pc_equivalences
      ADD CONSTRAINT ck_pc_equivalences_distinct_units CHECK (from_unit_id <> to_unit_id);
    `);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}
