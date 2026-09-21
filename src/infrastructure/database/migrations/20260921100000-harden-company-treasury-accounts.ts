import { MigrationInterface, QueryRunner } from "typeorm";
import {
  encryptPaymentAccountSensitiveData,
  hashPaymentAccountIdentifier,
} from "../../../modules/company-payment-accounts/infrastructure/security/payment-account-sensitive-data";

type LegacyAccountRow = {
  id: string;
  companyId: string;
  type: string;
  institutionName?: string | null;
  walletProvider?: string | null;
  accountNumber?: string | null;
  cardLastFour?: string | null;
};

export class HardenCompanyTreasuryAccounts20260921100000 implements MigrationInterface {
  name = "HardenCompanyTreasuryAccounts20260921100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE company_payment_accounts
      ADD COLUMN IF NOT EXISTS usage varchar(20) NOT NULL DEFAULT 'BOTH',
      ADD COLUMN IF NOT EXISTS institution_name varchar(120),
      ADD COLUMN IF NOT EXISTS cci_last_four varchar(4),
      ADD COLUMN IF NOT EXISTS wallet_provider varchar(120),
      ADD COLUMN IF NOT EXISTS wallet_phone_last_four varchar(4),
      ADD COLUMN IF NOT EXISTS holder_name varchar(150),
      ADD COLUMN IF NOT EXISTS sensitive_identifier_encrypted text,
      ADD COLUMN IF NOT EXISTS sensitive_identifier_hash varchar(64),
      ADD COLUMN IF NOT EXISTS masked_label varchar(220)
    `);

    await queryRunner.query(`
      UPDATE company_payment_accounts
      SET institution_name = COALESCE(institution_name, NULLIF(BTRIM(bank_name), '')),
          wallet_provider = COALESCE(wallet_provider, NULLIF(BTRIM(wallet_name), '')),
          card_last_four = CASE
            WHEN REGEXP_REPLACE(COALESCE(card_last_four, ''), '[^0-9]', '', 'g') ~ '^[0-9]{4}$'
              THEN REGEXP_REPLACE(card_last_four, '[^0-9]', '', 'g')
            ELSE NULL
          END,
          account_last_four = COALESCE(
            NULLIF(account_last_four, ''),
            NULLIF(RIGHT(REGEXP_REPLACE(COALESCE(account_number, ''), '[^0-9]', '', 'g'), 4), '')
          )
    `);

    const legacyRows = (await queryRunner.query(`
      SELECT
        company_payment_account_id AS "id",
        company_id AS "companyId",
        type,
        institution_name AS "institutionName",
        wallet_provider AS "walletProvider",
        account_number AS "accountNumber",
        card_last_four AS "cardLastFour"
      FROM company_payment_accounts
      WHERE account_number IS NOT NULL
        OR sensitive_identifier_encrypted IS NULL
    `)) as LegacyAccountRow[];

    const usedHashes = new Set<string>();
    for (const row of legacyRows) {
      const encrypted = encryptPaymentAccountSensitiveData({ accountNumber: row.accountNumber });
      const candidateHash = hashPaymentAccountIdentifier(row);
      const scopedHash = candidateHash ? `${row.companyId}:${candidateHash}` : null;
      const identifierHash = scopedHash && !usedHashes.has(scopedHash) ? candidateHash : null;
      if (scopedHash && identifierHash) usedHashes.add(scopedHash);

      await queryRunner.query(
        `UPDATE company_payment_accounts
         SET sensitive_identifier_encrypted = COALESCE(sensitive_identifier_encrypted, $1),
             sensitive_identifier_hash = COALESCE(sensitive_identifier_hash, $2),
             account_number = NULL
         WHERE company_payment_account_id = $3`,
        [encrypted, identifierHash, row.id],
      );
    }

    await queryRunner.query(`
      UPDATE company_payment_accounts account
      SET sensitive_identifier_hash = NULL
      FROM (
        SELECT company_payment_account_id
        FROM (
          SELECT
            company_payment_account_id,
            ROW_NUMBER() OVER (
              PARTITION BY company_id, sensitive_identifier_hash
              ORDER BY created_at, company_payment_account_id
            ) AS duplicate_rank
          FROM company_payment_accounts
          WHERE sensitive_identifier_hash IS NOT NULL
        ) ranked
        WHERE duplicate_rank > 1
      ) duplicates
      WHERE account.company_payment_account_id = duplicates.company_payment_account_id
    `);

    await queryRunner.query(`
      UPDATE company_payment_accounts
      SET is_default = false
      WHERE is_default = true AND is_active = false
    `);

    await queryRunner.query(`
      UPDATE company_payment_accounts
      SET masked_label = name || CASE
        WHEN COALESCE(card_last_four, account_last_four, cci_last_four, wallet_phone_last_four) IS NOT NULL
          THEN ' ****' || COALESCE(card_last_four, account_last_four, cci_last_four, wallet_phone_last_four)
        ELSE ''
      END
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS ux_company_payment_accounts_single_default`);
    await queryRunner.query(`
      ALTER TABLE company_payment_accounts
      DROP CONSTRAINT IF EXISTS uq_company_payment_accounts_company_number
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_company_payment_accounts_default_scope
      ON company_payment_accounts (company_id, currency, usage)
      WHERE is_default = true AND is_active = true
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_company_payment_accounts_sensitive_hash
      ON company_payment_accounts (company_id, sensitive_identifier_hash)
      WHERE sensitive_identifier_hash IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_company_payment_accounts_operational
      ON company_payment_accounts (company_id, currency, usage, type, is_active)
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_company_payment_accounts_type') THEN
          ALTER TABLE company_payment_accounts ADD CONSTRAINT ck_company_payment_accounts_type
          CHECK (type IN ('BANK_ACCOUNT', 'CREDIT_CARD', 'CASH', 'DIGITAL_WALLET')) NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_company_payment_accounts_usage') THEN
          ALTER TABLE company_payment_accounts ADD CONSTRAINT ck_company_payment_accounts_usage
          CHECK (usage IN ('OUTFLOW', 'INFLOW', 'BOTH'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_company_payment_accounts_default_active') THEN
          ALTER TABLE company_payment_accounts ADD CONSTRAINT ck_company_payment_accounts_default_active
          CHECK (NOT is_default OR is_active);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_company_payment_accounts_card_last_four') THEN
          ALTER TABLE company_payment_accounts ADD CONSTRAINT ck_company_payment_accounts_card_last_four
          CHECK (card_last_four IS NULL OR card_last_four ~ '^[0-9]{4}$');
        END IF;
      END $$
    `);
  }

  public async down(): Promise<void> {
    // Migracion aditiva: no se descifran ni eliminan datos financieros al revertir.
  }
}
