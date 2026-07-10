import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRecurringPurchaseDueNotificationPermission20260710172000 implements MigrationInterface {
  name = "AddRecurringPurchaseDueNotificationPermission20260710172000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, name, description, module, resource, action, type, is_active)
      VALUES (
        'recurring_purchases.receive_due_notifications',
        'Recibir alertas de vencimiento recurrente',
        'Recibir notificaciones cuando una compra recurrente esta por vencer o vence hoy',
        'recurring_purchases',
        'recurring_purchases',
        'receive_due_notifications',
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
