import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSaleOrdersAdvancedPermission20260822120000
  implements MigrationInterface
{
  name = 'AddSaleOrdersAdvancedPermission20260822120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (
        code,
        name,
        description,
        module,
        resource,
        action,
        type,
        is_active
      )
      VALUES (
        'sale_orders.advanced_orders',
        'Pedidos avanzados',
        'Corregir importes, productos, packs, cantidades e insumos en pedidos finalizados o con stock reservado o consumido',
        'sale_orders',
        'sale_order_advanced',
        'manage',
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
        is_active = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code = 'sale_orders.advanced_orders'
    `);
  }
}
