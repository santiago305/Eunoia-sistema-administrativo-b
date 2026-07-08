import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPurchaseDashboardGroupPermissions20260707010000 implements MigrationInterface {
  name = "AddPurchaseDashboardGroupPermissions20260707010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, name, description, module, resource, action, type, is_active)
      VALUES
        ('purchases_dashboard.view_payments', 'Ver pagos en dashboard de compras', 'Ver proximos pagos, pagos vencidos y uso de metodos de pago', 'purchases_dashboard', 'purchases_dashboard', 'view_payments', 'action', true),
        ('purchases_dashboard.view_suppliers', 'Ver proveedores en dashboard de compras', 'Ver ranking y metricas agregadas de proveedores', 'purchases_dashboard', 'purchases_dashboard', 'view_suppliers', 'action', true),
        ('purchases_dashboard.view_items', 'Ver items en dashboard de compras', 'Ver ranking y metricas agregadas de items comprados', 'purchases_dashboard', 'purchases_dashboard', 'view_items', 'action', true),
        ('purchases_dashboard.view_operations', 'Ver operaciones en dashboard de compras', 'Ver clasificacion operativa de compras e inventario', 'purchases_dashboard', 'purchases_dashboard', 'view_operations', 'action', true)
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

  public async down(): Promise<void> {
    // Additive permission migration. Permissions stay available for rollback compatibility.
  }
}
