import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSaleOrdersExportPermission20260709170000 implements MigrationInterface {
  name = "AddSaleOrdersExportPermission20260709170000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, name, description, module, resource, action, type, is_active)
      VALUES
        ('sale_orders.export', 'Exportar pedidos', 'Exportar pedidos a archivos', 'sale_orders', 'sale_orders', 'export', 'action', true)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        module = EXCLUDED.module,
        resource = EXCLUDED.resource,
        action = EXCLUDED.action,
        type = EXCLUDED.type,
        is_active = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code = 'sale_orders.export'
    `);
  }
}
