import { MigrationInterface, QueryRunner } from "typeorm";

/** Repairs legacy users and keeps financial role scopes mutually exclusive. */
export class RepairUserCompanyScope20261014020000 implements MigrationInterface {
  name = "RepairUserCompanyScope20261014020000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const companies: Array<{ company_id: string }> = await queryRunner.query(`
      SELECT company_id
      FROM companies
      WHERE is_active = true
      ORDER BY created_at ASC, company_id ASC
    `);

    const unassignedUsers: Array<{ total: string }> = await queryRunner.query(`
      SELECT COUNT(*)::text AS total
      FROM users
      WHERE company_id IS NULL AND is_super_admin = false
    `);
    const unassignedCount = Number(unassignedUsers[0]?.total ?? 0);

    if (unassignedCount > 0 && companies.length !== 1) {
      throw new Error(
        "No se pueden asignar usuarios automáticamente: debe existir exactamente una empresa activa o un mapeo explícito.",
      );
    }

    if (unassignedCount > 0 && companies.length === 1) {
      await queryRunner.query(
        `UPDATE users SET company_id = $1 WHERE company_id IS NULL AND is_super_admin = false`,
        [companies[0].company_id],
      );
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_company_id ON users (company_id)
    `);

    await queryRunner.query(`
      DELETE FROM role_permissions redundant
      USING permissions own_scope, permissions all_scope
      WHERE redundant.permission_id = own_scope.permission_id
        AND own_scope.code = 'income.view_own'
        AND all_scope.code = 'income.view_all'
        AND EXISTS (
          SELECT 1
          FROM role_permissions complete_scope
          WHERE complete_scope.role_id = redundant.role_id
            AND complete_scope.permission_id = all_scope.permission_id
        )
    `);
  }

  async down(): Promise<void> {
    // Forward-only: restoring NULL company assignments could revoke valid access.
  }
}
