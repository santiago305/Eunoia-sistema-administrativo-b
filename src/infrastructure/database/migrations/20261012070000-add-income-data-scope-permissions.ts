import { MigrationInterface, QueryRunner } from "typeorm";

/** Install the read-scope permissions without broadening existing income readers to view-all. */
export class AddIncomeDataScopePermissions20261012070000 implements MigrationInterface {
  name = "AddIncomeDataScopePermissions20261012070000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, name, description, module, resource, action, type, is_active)
      VALUES
        ('income.view_all', 'Ver todos los ingresos', 'Consultar ingresos de todos los usuarios', 'income', 'income', 'view_all', 'action', true),
        ('income.view_own', 'Ver ingresos propios', 'Consultar ingresos propios o asociados al usuario', 'income', 'income', 'view_own', 'action', true)
      ON CONFLICT (code) DO NOTHING;

      INSERT INTO role_permissions (role_id, permission_id)
      SELECT read_access.role_id, own_scope.permission_id
      FROM role_permissions read_access
      JOIN permissions income_read ON income_read.permission_id = read_access.permission_id AND income_read.code = 'income.read'
      JOIN permissions own_scope ON own_scope.code = 'income.view_own' AND own_scope.is_active = true
      WHERE NOT EXISTS (
        SELECT 1 FROM role_permissions scoped
        JOIN permissions scope_permission ON scope_permission.permission_id = scoped.permission_id
        WHERE scoped.role_id = read_access.role_id
          AND scope_permission.code IN ('income.view_all', 'income.view_own', '*')
      )
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    // Permission assignments are intentionally preserved; removing them could change live access policy.
  }
}
