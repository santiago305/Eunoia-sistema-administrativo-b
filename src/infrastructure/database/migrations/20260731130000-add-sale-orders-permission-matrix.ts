import { MigrationInterface, QueryRunner } from "typeorm";
import {
  SALE_ORDER_PERMISSION_CODES,
  SALE_ORDER_PERMISSIONS,
} from "../../../modules/sale-orders/application/constants/sale-order-permissions";

const sqlString = (value: string) => `'${value.replace(/'/g, "''")}'`;

export class AddSaleOrdersPermissionMatrix20260731130000 implements MigrationInterface {
  name = "AddSaleOrdersPermissionMatrix20260731130000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const values = SALE_ORDER_PERMISSIONS
      .map((permission) =>
        `(${sqlString(permission.code)}, ${sqlString(permission.name)}, ${sqlString(permission.description)}, ${sqlString(permission.module)}, ${sqlString(permission.resource)}, ${sqlString(permission.action)}, ${sqlString(permission.type)}, true)`,
      )
      .join(",\n        ");

    await queryRunner.query(`
      INSERT INTO permissions (code, name, description, module, resource, action, type, is_active)
      VALUES
        ${values}
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
    const newCodes = SALE_ORDER_PERMISSION_CODES
      .filter((code) => code !== "sale_orders.export")
      .map(sqlString)
      .join(", ");

    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN (${newCodes})
    `);
  }
}
