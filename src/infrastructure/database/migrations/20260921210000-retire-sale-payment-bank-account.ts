import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Final compatibility cleanup for sale payments.
 *
 * The legacy column is removed only after every historical receiver has been
 * reconciled into company_payment_account_id. The guard intentionally fails
 * before any DDL when unmapped values remain.
 */
export class RetireSalePaymentBankAccount20260921210000 implements MigrationInterface {
  name = "RetireSalePaymentBankAccount20260921210000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM sale_payments
      WHERE bank_account_id IS NOT NULL
        AND company_payment_account_id IS NULL
    `);
    if (Number(rows?.[0]?.count ?? 0) > 0) {
      throw new Error(
        "No se puede retirar sale_payments.bank_account_id: existen cobros sin cuenta receptora normalizada.",
      );
    }

    await queryRunner.query(`
      ALTER TABLE sale_payments
      DROP COLUMN IF EXISTS bank_account_id
    `);
  }

  public async down(): Promise<void> {
    throw new Error(
      "La retirada de sale_payments.bank_account_id es destructiva y no tiene rollback automatico. Restaurar desde el respaldo previo a Fase 10.",
    );
  }
}
