import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeSalePaymentMethodSnapshots20261006000000 implements MigrationInterface {
  name = 'NormalizeSalePaymentMethodSnapshots20261006000000';

  async up(queryRunner: QueryRunner): Promise<void> {
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
      END
      WHERE is_system = true
        AND code IN ('CASH', 'BANK_TRANSFER', 'BANK_DEPOSIT', 'CARD', 'DIGITAL_WALLET', 'CHECK', 'OTHER');

      UPDATE sale_payments sp
      SET method = pm.name
      FROM payment_methods pm
      WHERE sp.payment_method_id = pm.method_id
        AND pm.is_active = true;

    `);
  }

  async down(): Promise<void> {
    // La normalización de snapshots es deliberadamente irreversible.
  }
}
