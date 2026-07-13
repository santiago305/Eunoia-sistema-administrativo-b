import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRecurringPurchaseExportPermission20260712120000 implements MigrationInterface {
  name = "AddRecurringPurchaseExportPermission20260712120000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, name, description, module, resource, action, type, is_active)
      VALUES (
        'recurring_purchases.export',
        'Exportar compras recurrentes',
        'Exportar compras recurrentes a Excel',
        'recurring_purchases',
        'recurring_purchases',
        'export',
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
