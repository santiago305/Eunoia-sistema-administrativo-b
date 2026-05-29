import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveProfileSessionsPagePermissions20260529000000 implements MigrationInterface {
  name = 'RemoveProfileSessionsPagePermissions20260529000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permission_overrides
      WHERE permission_id IN (
        SELECT permission_id
        FROM permissions
        WHERE code IN ('page.profile.view', 'page.sessions.view')
      );
    `);

    await queryRunner.query(`
      DELETE FROM user_grantable_permissions
      WHERE permission_id IN (
        SELECT permission_id
        FROM permissions
        WHERE code IN ('page.profile.view', 'page.sessions.view')
      );
    `);

    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        SELECT permission_id
        FROM permissions
        WHERE code IN ('page.profile.view', 'page.sessions.view')
      );
    `);

    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN ('page.profile.view', 'page.sessions.view');
    `);
  }

  public async down(): Promise<void> {
    // No-op para evitar recrear permisos que ya no deben existir.
  }
}

