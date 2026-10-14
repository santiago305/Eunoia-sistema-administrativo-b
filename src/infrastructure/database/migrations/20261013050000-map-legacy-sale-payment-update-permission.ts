import { MigrationInterface, QueryRunner } from 'typeorm';

/** Migrate pending-edit grants and retire ambiguous legacy payment mutations. */
export class MapLegacySalePaymentUpdatePermission20261013050000
  implements MigrationInterface
{
  name = 'MapLegacySalePaymentUpdatePermission20261013050000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('permissions') IS NULL THEN
          RETURN;
        END IF;

        IF to_regclass('role_permissions') IS NOT NULL THEN
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT DISTINCT legacy_role.role_id, replacement.permission_id
          FROM role_permissions legacy_role
          INNER JOIN permissions legacy
            ON legacy.permission_id = legacy_role.permission_id
            AND legacy.code = 'sale_orders.payments.update'
          INNER JOIN permissions replacement
            ON replacement.code = 'sale_orders.payments.update_pending'
          WHERE NOT EXISTS (
            SELECT 1 FROM role_permissions existing
            WHERE existing.role_id = legacy_role.role_id
              AND existing.permission_id = replacement.permission_id
          );
        END IF;

        IF to_regclass('user_permission_overrides') IS NOT NULL THEN
          INSERT INTO user_permission_overrides (
            user_id, permission_id, effect, reason, created_by
          )
          SELECT legacy_override.user_id, replacement.permission_id,
            legacy_override.effect,
            COALESCE(legacy_override.reason, 'Migrado desde permiso genérico de pagos de pedidos'),
            legacy_override.created_by
          FROM user_permission_overrides legacy_override
          INNER JOIN permissions legacy
            ON legacy.permission_id = legacy_override.permission_id
            AND legacy.code = 'sale_orders.payments.update'
          INNER JOIN permissions replacement
            ON replacement.code = 'sale_orders.payments.update_pending'
          WHERE NOT EXISTS (
            SELECT 1 FROM user_permission_overrides existing
            WHERE existing.user_id = legacy_override.user_id
              AND existing.permission_id = replacement.permission_id
          );
        END IF;

        IF to_regclass('user_grantable_permissions') IS NOT NULL THEN
          INSERT INTO user_grantable_permissions (
            manager_user_id, permission_id, created_by_user_id
          )
          SELECT legacy_grant.manager_user_id, replacement.permission_id,
            legacy_grant.created_by_user_id
          FROM user_grantable_permissions legacy_grant
          INNER JOIN permissions legacy
            ON legacy.permission_id = legacy_grant.permission_id
            AND legacy.code = 'sale_orders.payments.update'
          INNER JOIN permissions replacement
            ON replacement.code = 'sale_orders.payments.update_pending'
          WHERE NOT EXISTS (
            SELECT 1 FROM user_grantable_permissions existing
            WHERE existing.manager_user_id = legacy_grant.manager_user_id
              AND existing.permission_id = replacement.permission_id
          );
        END IF;

        IF to_regclass('user_permission_overrides') IS NOT NULL THEN
          DELETE FROM user_permission_overrides
          WHERE permission_id IN (
            SELECT permission_id FROM permissions
            WHERE code IN (
              'sale_orders.payments.update',
              'sale_orders.payments.delete',
              'sale_orders.payments.void'
            )
          );
        END IF;

        IF to_regclass('user_grantable_permissions') IS NOT NULL THEN
          DELETE FROM user_grantable_permissions
          WHERE permission_id IN (
            SELECT permission_id FROM permissions
            WHERE code IN (
              'sale_orders.payments.update',
              'sale_orders.payments.delete',
              'sale_orders.payments.void'
            )
          );
        END IF;

        IF to_regclass('role_permissions') IS NOT NULL THEN
          DELETE FROM role_permissions
          WHERE permission_id IN (
            SELECT permission_id FROM permissions
            WHERE code IN (
              'sale_orders.payments.update',
              'sale_orders.payments.delete',
              'sale_orders.payments.void'
            )
          );
        END IF;

        DELETE FROM permissions
        WHERE code IN (
          'sale_orders.payments.update',
          'sale_orders.payments.delete',
          'sale_orders.payments.void'
        );
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // Forward-only: the new capability may have been granted independently after migration.
  }
}
