import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveOutOrdersPagePermission20260620000000 implements MigrationInterface {
  name = 'RemoveOutOrdersPagePermission20260620000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.permissions') IS NULL THEN
          RETURN;
        END IF;

        IF to_regclass('public.user_permission_overrides') IS NOT NULL THEN
          DELETE FROM user_permission_overrides
          WHERE permission_id IN (
            SELECT permission_id
            FROM permissions
            WHERE code = 'page.out-orders.view'
          );
        END IF;

        IF to_regclass('public.user_grantable_permissions') IS NOT NULL THEN
          DELETE FROM user_grantable_permissions
          WHERE permission_id IN (
            SELECT permission_id
            FROM permissions
            WHERE code = 'page.out-orders.view'
          );
        END IF;

        IF to_regclass('public.role_permissions') IS NOT NULL THEN
          DELETE FROM role_permissions
          WHERE permission_id IN (
            SELECT permission_id
            FROM permissions
            WHERE code = 'page.out-orders.view'
          );
        END IF;

        DELETE FROM permissions
        WHERE code = 'page.out-orders.view';
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // No-op: la pantalla de ordenes de salida fue retirada del sistema.
  }
}
