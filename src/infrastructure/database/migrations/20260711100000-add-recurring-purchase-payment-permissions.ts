import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRecurringPurchasePaymentPermissions20260711100000 implements MigrationInterface {
  name = "AddRecurringPurchasePaymentPermissions20260711100000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, name, description, module, resource, action, type, is_active)
      VALUES
        (
          'recurring_purchases.register_payment',
          'Registrar pagos recurrentes',
          'Registrar pagos asociados a compras recurrentes vencidas o por vencer',
          'recurring_purchases',
          'recurring_purchases',
          'register_payment',
          'action',
          true
        ),
        (
          'recurring_purchases.upload_payment_evidence',
          'Subir evidencia de pago recurrente',
          'Subir foto o comprobante de pago para compras recurrentes',
          'recurring_purchases',
          'recurring_purchases',
          'upload_payment_evidence',
          'action',
          true
        )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        module = EXCLUDED.module,
        resource = EXCLUDED.resource,
        action = EXCLUDED.action,
        type = EXCLUDED.type,
        is_active = EXCLUDED.is_active;
    `);
  }

  async down(): Promise<void> {
    // Additive permission migration. Keep permission history intact on rollback.
  }
}
