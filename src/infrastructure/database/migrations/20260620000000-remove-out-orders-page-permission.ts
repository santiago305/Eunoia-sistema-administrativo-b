import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveOutOrdersPagePermission20260620000000 implements MigrationInterface {
  name = 'RemoveOutOrdersPagePermission20260620000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permission_overrides
      WHERE permission_id IN (
        SELECT permission_id
        FROM permissions
        WHERE code = 'page.out-orders.view'
      );
    `);

    await queryRunner.query(`
      DELETE FROM user_grantable_permissions
      WHERE permission_id IN (
        SELECT permission_id
        FROM permissions
        WHERE code = 'page.out-orders.view'
      );
    `);

    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        SELECT permission_id
        FROM permissions
        WHERE code = 'page.out-orders.view'
      );
    `);

    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code = 'page.out-orders.view';
    `);
  }

  public async down(): Promise<void> {
    // No-op: la pantalla de ordenes de salida fue retirada del sistema.
  }
}
