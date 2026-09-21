import { MigrationInterface, QueryRunner } from "typeorm";

export class NormalizeLegacyPaymentMethodNames20260921120000 implements MigrationInterface {
  name = "NormalizeLegacyPaymentMethodNames20260921120000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        bank_method uuid;
        wallet_method uuid;
      BEGIN
        SELECT method_id INTO bank_method
        FROM payment_methods
        WHERE code = 'BANK_TRANSFER' AND is_active = true
        ORDER BY method_id
        LIMIT 1;

        SELECT method_id INTO wallet_method
        FROM payment_methods
        WHERE code = 'DIGITAL_WALLET' AND is_active = true
        ORDER BY method_id
        LIMIT 1;

        IF bank_method IS NOT NULL THEN
          UPDATE company_methods cm
          SET method_id = bank_method
          FROM payment_methods old
          WHERE cm.method_id = old.method_id
            AND UPPER(BTRIM(old.name)) IN ('BCP', 'BBVA')
            AND NOT EXISTS (
              SELECT 1 FROM company_methods existing
              WHERE existing.company_id = cm.company_id
                AND existing.method_id = bank_method
                AND COALESCE(BTRIM(existing.number), '') = COALESCE(BTRIM(cm.number), '')
            );
          UPDATE supplier_methods sm SET method_id = bank_method FROM payment_methods old
          WHERE sm.method_id = old.method_id AND UPPER(BTRIM(old.name)) IN ('BCP', 'BBVA');
          UPDATE payment_documents pd SET payment_method_id = bank_method FROM payment_methods old
          WHERE pd.payment_method_id = old.method_id AND UPPER(BTRIM(old.name)) IN ('BCP', 'BBVA');
          UPDATE supplier_payment_destinations d SET method_id = bank_method FROM payment_methods old
          WHERE d.method_id = old.method_id AND UPPER(BTRIM(old.name)) IN ('BCP', 'BBVA');
        END IF;

        IF wallet_method IS NOT NULL THEN
          UPDATE supplier_methods sm SET method_id = wallet_method FROM payment_methods old
          WHERE sm.method_id = old.method_id AND UPPER(BTRIM(old.name)) = 'YAPE';
          UPDATE payment_documents pd SET payment_method_id = wallet_method FROM payment_methods old
          WHERE pd.payment_method_id = old.method_id AND UPPER(BTRIM(old.name)) = 'YAPE';
          UPDATE supplier_payment_destinations d SET method_id = wallet_method FROM payment_methods old
          WHERE d.method_id = old.method_id AND UPPER(BTRIM(old.name)) = 'YAPE';
        END IF;
      END $$;

      UPDATE payment_methods
      SET name = CASE
        WHEN code = 'DIGITAL_WALLET' THEN 'Billetera digital'
        WHEN code = 'BANK_TRANSFER' THEN 'Transferencia bancaria'
        ELSE name
      END
      WHERE code IN ('DIGITAL_WALLET', 'BANK_TRANSFER');

      UPDATE payment_methods
      SET name = CASE
        WHEN UPPER(BTRIM(name)) IN ('BCP', 'BBVA') THEN 'Transferencia bancaria (histórico)'
        WHEN UPPER(BTRIM(name)) = 'YAPE' THEN 'Billetera digital (histórico)'
        ELSE name
      END,
      is_active = false,
      is_system = false,
      code = 'LEGACY_PROVIDER_' || RIGHT(REPLACE(method_id::text, '-', ''), 12)
      WHERE UPPER(BTRIM(name)) IN ('BCP', 'BBVA', 'YAPE');
    `);
  }

  async down(): Promise<void> {
    // Los nombres y relaciones normalizados no se revierten automáticamente.
  }
}
