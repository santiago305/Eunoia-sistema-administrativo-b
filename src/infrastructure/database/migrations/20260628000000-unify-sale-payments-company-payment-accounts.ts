import { MigrationInterface, QueryRunner } from "typeorm";

export class UnifySalePaymentsCompanyPaymentAccounts20260628000000 implements MigrationInterface {
  name = "UnifySalePaymentsCompanyPaymentAccounts20260628000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO company_payment_accounts (
        company_id,
        type,
        name,
        bank_name,
        account_number,
        account_last_four,
        currency,
        is_active,
        is_default
      )
      SELECT
        ba.company_id,
        'BANK_ACCOUNT',
        ba.name,
        ba.name,
        ba.number,
        CASE
          WHEN ba.number IS NULL THEN NULL
          ELSE right(regexp_replace(ba.number, '\\D', '', 'g'), 4)
        END,
        'PEN',
        ba.is_active,
        false
      FROM bank_accounts ba
      WHERE NOT EXISTS (
        SELECT 1
        FROM company_payment_accounts cpa
        WHERE cpa.company_id = ba.company_id
          AND cpa.name = ba.name
      );
    `);

    await queryRunner.query(`
      UPDATE sale_payments sp
      SET bank_account_id = cpa.company_payment_account_id
      FROM bank_accounts ba
      INNER JOIN company_payment_accounts cpa
        ON cpa.company_id = ba.company_id
       AND cpa.name = ba.name
      WHERE sp.bank_account_id = ba.id;
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        constraint_name text;
      BEGIN
        SELECT tc.constraint_name
        INTO constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'sale_payments'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'bank_account_id'
        LIMIT 1;

        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE sale_payments DROP CONSTRAINT %I', constraint_name);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE sale_payments
      ADD CONSTRAINT fk_sale_payments_company_payment_account
      FOREIGN KEY (bank_account_id)
      REFERENCES company_payment_accounts(company_payment_account_id)
      ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_payments
      DROP CONSTRAINT IF EXISTS fk_sale_payments_company_payment_account;
    `);
  }
}
