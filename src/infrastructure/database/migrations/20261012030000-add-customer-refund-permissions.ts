import { MigrationInterface, QueryRunner } from "typeorm";

const permissions = [
  ["customer_refunds.post_own", "Confirmar reembolsos propios", "Excepción explícita para confirmar un reembolso registrado por el mismo usuario", "post_own"],
  ["customer_refunds.cancel", "Cancelar reembolsos pendientes", "Cancelar una reserva de reembolso que aún no se ha pagado", "cancel"],
] as const;

export class AddCustomerRefundPermissions20261012030000 implements MigrationInterface {
  name = "AddCustomerRefundPermissions20261012030000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [code, name, description, action] of permissions) {
      await queryRunner.query(`
        INSERT INTO permissions (code, name, description, module, resource, action, type, is_active)
        VALUES ($1, $2, $3, 'customer_refunds', 'customer_refunds', $4, 'action', true)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          module = EXCLUDED.module,
          resource = EXCLUDED.resource,
          action = EXCLUDED.action,
          type = EXCLUDED.type,
          is_active = true
      `, [code, name, description, action]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM permissions WHERE code = ANY($1::text[])`, [permissions.map(([code]) => code)]);
  }
}
