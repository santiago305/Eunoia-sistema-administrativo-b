import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductionEvidenceStatus20260806090000 implements MigrationInterface {
  name = "AddProductionEvidenceStatus20260806090000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS evidence_status varchar(20) NOT NULL DEFAULT 'PENDING'`);
    await queryRunner.query(`UPDATE production_orders SET evidence_status = 'UPLOADED' WHERE jsonb_array_length(COALESCE(image_prodution, '[]'::jsonb)) > 0`);
    await queryRunner.query(`ALTER TABLE production_orders ADD CONSTRAINT chk_production_evidence_status CHECK (evidence_status IN ('PENDING', 'UPLOADED', 'SKIPPED'))`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE production_orders DROP CONSTRAINT IF EXISTS chk_production_evidence_status`);
    await queryRunner.query(`ALTER TABLE production_orders DROP COLUMN IF EXISTS evidence_status`);
  }
}
