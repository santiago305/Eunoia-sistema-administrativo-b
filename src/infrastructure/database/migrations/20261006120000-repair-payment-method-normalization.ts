import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Repairs legacy snapshots that were missed by the first normalization pass.
 * The text column remains for backward compatibility, but identity is always
 * repaired to the active canonical payment method when the alias is known.
 */
export class RepairPaymentMethodNormalization20261006120000 implements MigrationInterface {
  name = "RepairPaymentMethodNormalization20261006120000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);

    await queryRunner.query(`
      UPDATE payment_methods
      SET name = CASE code
        WHEN 'CASH' THEN 'Efectivo'
        WHEN 'BANK_TRANSFER' THEN 'Trans. bancaria'
        WHEN 'BANK_DEPOSIT' THEN 'Depósito bancario'
        WHEN 'CARD' THEN 'Tarjeta'
        WHEN 'DIGITAL_WALLET' THEN 'Billetera digital'
        WHEN 'CHECK' THEN 'Cheque'
        WHEN 'OTHER' THEN 'Otro'
        ELSE name
      END,
      updated_at = NOW()
      WHERE is_system = true
        AND code IN ('CASH', 'BANK_TRANSFER', 'BANK_DEPOSIT', 'CARD', 'DIGITAL_WALLET', 'CHECK', 'OTHER');
    `);

    await queryRunner.query(`
      UPDATE sale_payments sp
      SET method = pm.name
      FROM payment_methods pm
      WHERE sp.payment_method_id = pm.method_id
        AND pm.is_active = true;
    `);

    await queryRunner.query(`
      WITH candidates AS (
        SELECT
          sp.id,
          CASE regexp_replace(UPPER(BTRIM(unaccent(sp.method))), '\\s+', ' ', 'g')
            WHEN 'EFECTIVO' THEN 'CASH'
            WHEN 'CASH' THEN 'CASH'
            WHEN 'TRANSFERENCIA' THEN 'BANK_TRANSFER'
            WHEN 'TRANSFERENCIA BANCARIA' THEN 'BANK_TRANSFER'
            WHEN 'TRANS. BANCARIA' THEN 'BANK_TRANSFER'
            WHEN 'TRANFERENCIA BANCARIA' THEN 'BANK_TRANSFER'
            WHEN 'FRANFERENCIA BANCARIA' THEN 'BANK_TRANSFER'
            WHEN 'BANK_TRANSFER' THEN 'BANK_TRANSFER'
            WHEN 'BCP' THEN 'BANK_TRANSFER'
            WHEN 'BBVA' THEN 'BANK_TRANSFER'
            WHEN 'DEPÓSITO BANCARIO' THEN 'BANK_DEPOSIT'
            WHEN 'DEPOSITO BANCARIO' THEN 'BANK_DEPOSIT'
            WHEN 'BANK_DEPOSIT' THEN 'BANK_DEPOSIT'
            WHEN 'TARJETA' THEN 'CARD'
            WHEN 'CARD' THEN 'CARD'
            WHEN 'BILLETERA DIGITAL' THEN 'DIGITAL_WALLET'
            WHEN 'YAPE' THEN 'DIGITAL_WALLET'
            WHEN 'PLIN' THEN 'DIGITAL_WALLET'
            WHEN 'DIGITAL_WALLET' THEN 'DIGITAL_WALLET'
            WHEN 'CHEQUE' THEN 'CHECK'
            WHEN 'CHECK' THEN 'CHECK'
            WHEN 'OTRO' THEN 'OTHER'
            WHEN 'OTHER' THEN 'OTHER'
            ELSE NULL
          END AS code
        FROM sale_payments sp
      )
      UPDATE sale_payments sp
      SET payment_method_id = canonical.method_id,
          method = canonical.name
      FROM candidates, payment_methods canonical
      WHERE sp.id = candidates.id
        AND candidates.code = canonical.code
        AND canonical.is_active = true;
    `);

    await queryRunner.query(`
      UPDATE payment_documents pd
      SET method = pm.name
      FROM payment_methods pm
      WHERE pd.payment_method_id = pm.method_id
        AND pm.is_active = true;
    `);

    await queryRunner.query(`
      WITH candidates AS (
        SELECT
          pd.pay_doc_id AS id,
          CASE regexp_replace(UPPER(BTRIM(unaccent(pd.method))), '\\s+', ' ', 'g')
            WHEN 'EFECTIVO' THEN 'CASH'
            WHEN 'CASH' THEN 'CASH'
            WHEN 'TRANSFERENCIA' THEN 'BANK_TRANSFER'
            WHEN 'TRANSFERENCIA BANCARIA' THEN 'BANK_TRANSFER'
            WHEN 'TRANS. BANCARIA' THEN 'BANK_TRANSFER'
            WHEN 'TRANFERENCIA BANCARIA' THEN 'BANK_TRANSFER'
            WHEN 'FRANFERENCIA BANCARIA' THEN 'BANK_TRANSFER'
            WHEN 'BANK_TRANSFER' THEN 'BANK_TRANSFER'
            WHEN 'BCP' THEN 'BANK_TRANSFER'
            WHEN 'BBVA' THEN 'BANK_TRANSFER'
            WHEN 'DEPÓSITO BANCARIO' THEN 'BANK_DEPOSIT'
            WHEN 'DEPOSITO BANCARIO' THEN 'BANK_DEPOSIT'
            WHEN 'BANK_DEPOSIT' THEN 'BANK_DEPOSIT'
            WHEN 'TARJETA' THEN 'CARD'
            WHEN 'CARD' THEN 'CARD'
            WHEN 'BILLETERA DIGITAL' THEN 'DIGITAL_WALLET'
            WHEN 'YAPE' THEN 'DIGITAL_WALLET'
            WHEN 'PLIN' THEN 'DIGITAL_WALLET'
            WHEN 'DIGITAL_WALLET' THEN 'DIGITAL_WALLET'
            WHEN 'CHEQUE' THEN 'CHECK'
            WHEN 'CHECK' THEN 'CHECK'
            WHEN 'OTRO' THEN 'OTHER'
            WHEN 'OTHER' THEN 'OTHER'
            ELSE NULL
          END AS code
        FROM payment_documents pd
        WHERE pd.method IS NOT NULL
      )
      UPDATE payment_documents pd
      SET payment_method_id = canonical.method_id,
          method = canonical.name
      FROM candidates, payment_methods canonical
      WHERE pd.pay_doc_id = candidates.id
        AND candidates.code = canonical.code
        AND canonical.is_active = true;
    `);
  }

  async down(): Promise<void> {
    // Reparar snapshots es una operación idempotente e irreversible.
  }
}
