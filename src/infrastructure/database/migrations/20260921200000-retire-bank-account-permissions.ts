import { MigrationInterface, QueryRunner } from 'typeorm';

export class RetireBankAccountPermissions20260921200000 implements MigrationInterface {
  name = 'RetireBankAccountPermissions20260921200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.permissions') IS NULL THEN
          RETURN;
        END IF;

        IF to_regclass('public.role_permissions') IS NOT NULL THEN
          WITH permission_map (legacy_code, replacement_code) AS (
            VALUES
              ('bank-accounts.read', 'payment_accounts.view'),
              ('bank-accounts.manage', 'payment_accounts.view'),
              ('bank-accounts.manage', 'payment_accounts.create'),
              ('bank-accounts.manage', 'payment_accounts.edit'),
              ('bank-accounts.manage', 'payment_accounts.disable')
          )
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT DISTINCT legacy_role.role_id, replacement.permission_id
          FROM role_permissions legacy_role
          INNER JOIN permissions legacy
            ON legacy.permission_id = legacy_role.permission_id
          INNER JOIN permission_map
            ON permission_map.legacy_code = legacy.code
          INNER JOIN permissions replacement
            ON replacement.code = permission_map.replacement_code
          WHERE NOT EXISTS (
            SELECT 1
            FROM role_permissions existing
            WHERE existing.role_id = legacy_role.role_id
              AND existing.permission_id = replacement.permission_id
          );
        END IF;

        IF to_regclass('public.user_permission_overrides') IS NOT NULL THEN
          WITH permission_map (legacy_code, replacement_code) AS (
            VALUES
              ('bank-accounts.read', 'payment_accounts.view'),
              ('bank-accounts.manage', 'payment_accounts.view'),
              ('bank-accounts.manage', 'payment_accounts.create'),
              ('bank-accounts.manage', 'payment_accounts.edit'),
              ('bank-accounts.manage', 'payment_accounts.disable')
          ), mapped_overrides AS (
            SELECT
              legacy_override.user_id,
              replacement.permission_id,
              legacy_override.effect,
              legacy_override.created_by
            FROM user_permission_overrides legacy_override
            INNER JOIN permissions legacy
              ON legacy.permission_id = legacy_override.permission_id
            INNER JOIN permission_map
              ON permission_map.legacy_code = legacy.code
            INNER JOIN permissions replacement
              ON replacement.code = permission_map.replacement_code
          )
          INSERT INTO user_permission_overrides (
            user_id,
            permission_id,
            effect,
            reason,
            created_by
          )
          SELECT DISTINCT ON (mapped.user_id, mapped.permission_id)
            mapped.user_id,
            mapped.permission_id,
            mapped.effect,
            'Migrado desde permiso legacy de cuentas bancarias',
            mapped.created_by
          FROM mapped_overrides mapped
          WHERE NOT EXISTS (
            SELECT 1
            FROM user_permission_overrides existing
            WHERE existing.user_id = mapped.user_id
              AND existing.permission_id = mapped.permission_id
          )
          ORDER BY
            mapped.user_id,
            mapped.permission_id,
            CASE WHEN mapped.effect = 'DENY' THEN 0 ELSE 1 END;
        END IF;

        IF to_regclass('public.user_grantable_permissions') IS NOT NULL THEN
          WITH permission_map (legacy_code, replacement_code) AS (
            VALUES
              ('bank-accounts.read', 'payment_accounts.view'),
              ('bank-accounts.manage', 'payment_accounts.view'),
              ('bank-accounts.manage', 'payment_accounts.create'),
              ('bank-accounts.manage', 'payment_accounts.edit'),
              ('bank-accounts.manage', 'payment_accounts.disable')
          )
          INSERT INTO user_grantable_permissions (
            manager_user_id,
            permission_id,
            created_by_user_id
          )
          SELECT DISTINCT
            legacy_grant.manager_user_id,
            replacement.permission_id,
            legacy_grant.created_by_user_id
          FROM user_grantable_permissions legacy_grant
          INNER JOIN permissions legacy
            ON legacy.permission_id = legacy_grant.permission_id
          INNER JOIN permission_map
            ON permission_map.legacy_code = legacy.code
          INNER JOIN permissions replacement
            ON replacement.code = permission_map.replacement_code
          WHERE NOT EXISTS (
            SELECT 1
            FROM user_grantable_permissions existing
            WHERE existing.manager_user_id = legacy_grant.manager_user_id
              AND existing.permission_id = replacement.permission_id
          );
        END IF;

        IF to_regclass('public.user_permission_overrides') IS NOT NULL THEN
          DELETE FROM user_permission_overrides
          WHERE permission_id IN (
            SELECT permission_id
            FROM permissions
            WHERE code IN ('bank-accounts.read', 'bank-accounts.manage')
          );
        END IF;

        IF to_regclass('public.user_grantable_permissions') IS NOT NULL THEN
          DELETE FROM user_grantable_permissions
          WHERE permission_id IN (
            SELECT permission_id
            FROM permissions
            WHERE code IN ('bank-accounts.read', 'bank-accounts.manage')
          );
        END IF;

        IF to_regclass('public.role_permissions') IS NOT NULL THEN
          DELETE FROM role_permissions
          WHERE permission_id IN (
            SELECT permission_id
            FROM permissions
            WHERE code IN ('bank-accounts.read', 'bank-accounts.manage')
          );
        END IF;

        DELETE FROM permissions
        WHERE code IN ('bank-accounts.read', 'bank-accounts.manage');
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // No-op: restoring legacy permissions would reintroduce a retired module.
  }
}
