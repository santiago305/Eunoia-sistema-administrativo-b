import { MigrationInterface, QueryRunner } from 'typeorm';

const PERMISSION = {
  code: 'sale_orders.repair_workflow',
  name: 'Reparar flujo de pedido',
  description:
    'Recalcular el flujo vigente y reconciliar estado e inventario de un pedido',
  module: 'sale_orders',
  resource: 'sale_orders',
  action: 'repair_workflow',
  type: 'action',
} as const;

const sqlString = (value: string) => `'${value.replace(/'/g, "''")}'`;

export class AddSaleOrderWorkflowRepairPermission20261003000000
  implements MigrationInterface
{
  name = 'AddSaleOrderWorkflowRepairPermission20261003000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, name, description, module, resource, action, type, is_active)
      VALUES (
        ${sqlString(PERMISSION.code)},
        ${sqlString(PERMISSION.name)},
        ${sqlString(PERMISSION.description)},
        ${sqlString(PERMISSION.module)},
        ${sqlString(PERMISSION.resource)},
        ${sqlString(PERMISSION.action)},
        ${sqlString(PERMISSION.type)},
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
    await queryRunner.query(
      `DELETE FROM permissions WHERE code = ${sqlString(PERMISSION.code)}`,
    );
  }
}
