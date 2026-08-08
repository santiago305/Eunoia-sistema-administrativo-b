import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSupplyCatalogType20260808010000 implements MigrationInterface {
  name = "AddSupplyCatalogType20260808010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE pc_product_type ADD VALUE IF NOT EXISTS 'SUPPLY'`);
    await queryRunner.query(`ALTER TYPE purchase_type ADD VALUE IF NOT EXISTS 'SUPPLY'`);
    await queryRunner.query(`ALTER TYPE purchase_item_type ADD VALUE IF NOT EXISTS 'SUPPLY'`);

    await queryRunner.query(`
      INSERT INTO permissions (permission_id, code, name, description, module, resource, action, type, is_system, is_active)
      VALUES
        (uuid_generate_v4(), 'page.supplies.view', 'Ver insumos', 'Acceso a pantalla de insumos', 'supplies', 'supplies', 'view', 'page', true, true),
        (uuid_generate_v4(), 'page.supply-transfers.view', 'Ver transferencias de insumos', 'Acceso a transferencias de insumos', 'supplies', 'supply_transfers', 'view', 'page', true, true),
        (uuid_generate_v4(), 'page.supply-adjustments.view', 'Ver ajustes de insumos', 'Acceso a ajustes de insumos', 'supplies', 'supply_adjustments', 'view', 'page', true, true),
        (uuid_generate_v4(), 'page.supply-movements.view', 'Ver movimientos de insumos', 'Acceso a movimientos de insumos', 'supplies', 'supply_movements', 'view', 'page', true, true),
        (uuid_generate_v4(), 'page.supply-inventory.view', 'Ver inventario de insumos', 'Acceso a inventario de insumos', 'supplies', 'supply_inventory', 'view', 'page', true, true),
        (uuid_generate_v4(), 'supplies.view', 'Listar insumos', 'Consultar listado de insumos', 'supplies', 'supplies', 'view', 'action', true, true),
        (uuid_generate_v4(), 'supplies.view_detail', 'Ver detalle de insumo', 'Consultar detalle, SKUs y equivalencias de insumos', 'supplies', 'supplies', 'view_detail', 'action', true, true),
        (uuid_generate_v4(), 'supplies.create', 'Crear insumos', 'Crear insumos', 'supplies', 'supplies', 'create', 'action', true, true),
        (uuid_generate_v4(), 'supplies.update', 'Editar insumos', 'Editar insumos', 'supplies', 'supplies', 'update', 'action', true, true),
        (uuid_generate_v4(), 'supplies.delete', 'Desactivar insumos', 'Desactivar insumos', 'supplies', 'supplies', 'delete', 'action', true, true),
        (uuid_generate_v4(), 'supplies.restore', 'Restaurar insumos', 'Restaurar insumos', 'supplies', 'supplies', 'restore', 'action', true, true),
        (uuid_generate_v4(), 'supplies.export', 'Exportar insumos', 'Exportar insumos a Excel', 'supplies', 'supplies', 'export', 'action', true, true),
        (uuid_generate_v4(), 'supplies.equivalences.manage', 'Gestionar equivalencias de insumos', 'Crear y eliminar equivalencias de insumos', 'supplies', 'supplies_equivalences', 'manage', 'action', true, true),
        (uuid_generate_v4(), 'inventory.supplies.view', 'Ver inventario de insumos', 'Consultar inventario de insumos', 'supplies', 'inventory_supplies', 'view', 'action', true, true),
        (uuid_generate_v4(), 'inventory.supplies.export', 'Exportar inventario de insumos', 'Exportar inventario de insumos', 'supplies', 'inventory_supplies', 'export', 'action', true, true),
        (uuid_generate_v4(), 'inventory-ledger.supplies.view', 'Ver movimientos de insumos', 'Consultar movimientos de insumos', 'supplies', 'inventory_ledger_supplies', 'view', 'action', true, true),
        (uuid_generate_v4(), 'inventory-ledger.supplies.export', 'Exportar movimientos de insumos', 'Exportar movimientos de insumos', 'supplies', 'inventory_ledger_supplies', 'export', 'action', true, true),
        (uuid_generate_v4(), 'transfers.supplies.view', 'Ver transferencias de insumos', 'Consultar transferencias de insumos', 'supplies', 'transfers_supplies', 'view', 'action', true, true),
        (uuid_generate_v4(), 'transfers.supplies.create', 'Crear transferencias de insumos', 'Crear transferencias de insumos en borrador', 'supplies', 'transfers_supplies', 'create', 'action', true, true),
        (uuid_generate_v4(), 'transfers.supplies.process', 'Procesar transferencias de insumos', 'Procesar transferencias de insumos', 'supplies', 'transfers_supplies', 'process', 'action', true, true),
        (uuid_generate_v4(), 'transfers.supplies.cancel', 'Cancelar transferencias de insumos', 'Cancelar transferencias de insumos', 'supplies', 'transfers_supplies', 'cancel', 'action', true, true),
        (uuid_generate_v4(), 'transfers.supplies.export', 'Exportar transferencias de insumos', 'Exportar transferencias de insumos', 'supplies', 'transfers_supplies', 'export', 'action', true, true),
        (uuid_generate_v4(), 'adjustments.supplies.view', 'Ver ajustes de insumos', 'Consultar ajustes de insumos', 'supplies', 'adjustments_supplies', 'view', 'action', true, true),
        (uuid_generate_v4(), 'adjustments.supplies.create', 'Crear ajustes de insumos', 'Crear ajustes de insumos en borrador', 'supplies', 'adjustments_supplies', 'create', 'action', true, true),
        (uuid_generate_v4(), 'adjustments.supplies.process', 'Procesar ajustes de insumos', 'Procesar ajustes de insumos', 'supplies', 'adjustments_supplies', 'process', 'action', true, true),
        (uuid_generate_v4(), 'adjustments.supplies.cancel', 'Cancelar ajustes de insumos', 'Cancelar ajustes de insumos', 'supplies', 'adjustments_supplies', 'cancel', 'action', true, true),
        (uuid_generate_v4(), 'adjustments.supplies.export', 'Exportar ajustes de insumos', 'Exportar ajustes de insumos', 'supplies', 'adjustments_supplies', 'export', 'action', true, true)
      ON CONFLICT (code) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM permissions WHERE code LIKE 'supplies.%' OR code LIKE 'inventory.supplies.%' OR code LIKE 'inventory-ledger.supplies.%' OR code LIKE 'transfers.supplies.%' OR code LIKE 'adjustments.supplies.%' OR code LIKE 'page.supply%'`);
    // PostgreSQL enum values cannot be removed safely without rebuilding dependent columns.
  }
}
