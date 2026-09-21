import { MigrationInterface, QueryRunner } from "typeorm";
import { encryptPaymentAccountSensitiveData, hashPaymentAccountIdentifier } from "src/modules/company-payment-accounts/infrastructure/security/payment-account-sensitive-data";

export class CreateSupplierPaymentDestinations20260921110000 implements MigrationInterface {
  name = "CreateSupplierPaymentDestinations20260921110000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS supplier_payment_destinations (
        supplier_payment_destination_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id uuid NOT NULL REFERENCES suppliers(supplier_id),
        method_id uuid NOT NULL REFERENCES payment_methods(method_id),
        type varchar(30) NOT NULL,
        currency currency_type NOT NULL DEFAULT 'PEN',
        name varchar(160) NOT NULL,
        institution_name varchar(120),
        provider_name varchar(120),
        account_number varchar(120),
        account_last_four varchar(4),
        cci_last_four varchar(4),
        wallet_identifier_last_four varchar(4),
        holder_name varchar(160),
        sensitive_identifier_encrypted text,
        sensitive_identifier_hash varchar(64),
        masked_label varchar(220),
        is_active boolean NOT NULL DEFAULT true,
        is_default boolean NOT NULL DEFAULT false,
        requires_manual_review boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT ck_supplier_payment_destinations_type CHECK (type IN ('BANK_ACCOUNT', 'DIGITAL_WALLET', 'CARD', 'CASH')),
        CONSTRAINT ck_supplier_payment_destinations_default CHECK (NOT is_default OR (is_active AND NOT requires_manual_review))
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_supplier_payment_destinations_default_scope ON supplier_payment_destinations (supplier_id, currency, type) WHERE is_default = true AND is_active = true AND requires_manual_review = false`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_supplier_payment_destinations_sensitive_hash`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_supplier_payment_destinations_sensitive_hash ON supplier_payment_destinations (supplier_id, method_id, sensitive_identifier_hash) WHERE sensitive_identifier_hash IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_supplier_payment_destinations_supplier_lookup ON supplier_payment_destinations (supplier_id, currency, method_id, is_active)`);

    const legacy = await queryRunner.query(`
      SELECT sm.supplier_method_id AS id, sm.supplier_id AS "supplierId", sm.method_id AS "methodId", sm.number,
             pm.name AS "methodName", pm.code AS "methodCode"
      FROM supplier_methods sm
      JOIN payment_methods pm ON pm.method_id = sm.method_id
      WHERE sm.number IS NOT NULL AND BTRIM(sm.number) <> ''
        AND NOT EXISTS (SELECT 1 FROM supplier_payment_destinations d WHERE d.supplier_id = sm.supplier_id AND d.method_id = sm.method_id)
    `);
    for (const row of legacy as Array<{ id: string; supplierId: string; methodId: string; number: string; methodName: string; methodCode: string }>) {
      const isWallet = ["DIGITAL_WALLET", "YAPE", "PLIN", "BILLETERA"].some((value) => `${row.methodCode} ${row.methodName}`.toUpperCase().includes(value));
      const type = isWallet ? "DIGITAL_WALLET" : "BANK_ACCOUNT";
      const value = String(row.number).trim();
      const lastFour = value.replace(/\D/g, "").slice(-4) || null;
      const encrypted = encryptPaymentAccountSensitiveData(isWallet ? { walletPhone: value } : { accountNumber: value });
      const hash = hashPaymentAccountIdentifier(isWallet ? { type, walletProvider: row.methodName, walletPhone: value } : { type, accountNumber: value });
      await queryRunner.query(`
        INSERT INTO supplier_payment_destinations
          (supplier_id, method_id, type, currency, name, provider_name, account_last_four, wallet_identifier_last_four,
           sensitive_identifier_encrypted, sensitive_identifier_hash, masked_label, is_active, is_default, requires_manual_review)
        VALUES ($1, $2, $3, 'PEN', $4, $5, $6, $7, $8, $9, $10, false, false, true)
      `, [row.supplierId, row.methodId, type, `${row.methodName} (migrado)`, isWallet ? row.methodName : null, isWallet ? null : lastFour, isWallet ? lastFour : null, encrypted, hash, `${row.methodName} (migrado) ****${lastFour ?? "????"}`]);
    }
  }

  async down(): Promise<void> {
    // Deliberadamente no se elimina información financiera migrada.
  }
}
