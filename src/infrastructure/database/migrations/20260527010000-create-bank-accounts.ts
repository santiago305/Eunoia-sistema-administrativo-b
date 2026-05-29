import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBankAccounts20260527010000 implements MigrationInterface {
  name = "CreateBankAccounts20260527010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name varchar(150) NOT NULL,
        number varchar(100),
        is_active boolean NOT NULL DEFAULT true
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bank_accounts_company_id ON bank_accounts (company_id);`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_accounts_company_number ON bank_accounts (company_id, number);`,
    );
  }

  public async down(): Promise<void> {
    // No-op: migracion idempotente, no debe eliminar data.
  }
}

