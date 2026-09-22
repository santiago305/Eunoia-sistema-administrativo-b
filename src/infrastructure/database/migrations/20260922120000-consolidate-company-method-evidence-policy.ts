import { MigrationInterface, QueryRunner } from "typeorm";

export class ConsolidateCompanyMethodEvidencePolicy20260922120000 implements MigrationInterface {
  name = "ConsolidateCompanyMethodEvidencePolicy20260922120000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE company_methods
      SET evidence_policy = CASE
        WHEN requires_voucher THEN 'REQUIRED'
        ELSE 'OPTIONAL'
      END
      WHERE evidence_policy = 'INHERIT'
    `);

    await queryRunner.query(`
      ALTER TABLE company_methods
      DROP CONSTRAINT IF EXISTS chk_company_methods_evidence_policy
    `);
    await queryRunner.query(`
      ALTER TABLE company_methods
      ADD CONSTRAINT chk_company_methods_evidence_policy
      CHECK (evidence_policy IN ('INHERIT', 'REQUIRED', 'OPTIONAL'))
    `);
    await queryRunner.query(`
      ALTER TABLE company_methods
      DROP COLUMN IF EXISTS requires_voucher
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE company_methods
      ADD COLUMN IF NOT EXISTS requires_voucher boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      UPDATE company_methods cm
      SET requires_voucher = CASE cm.evidence_policy
        WHEN 'REQUIRED' THEN true
        WHEN 'OPTIONAL' THEN false
        ELSE pm.requires_voucher
      END
      FROM payment_methods pm
      WHERE pm.method_id = cm.method_id
    `);
    await queryRunner.query(`
      ALTER TABLE company_methods
      DROP CONSTRAINT IF EXISTS chk_company_methods_evidence_policy
    `);
  }
}
