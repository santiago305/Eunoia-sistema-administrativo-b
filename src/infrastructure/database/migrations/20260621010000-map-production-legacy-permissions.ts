import { MigrationInterface, QueryRunner } from 'typeorm';

export class MapProductionLegacyPermissions20260621010000 implements MigrationInterface {
  name = 'MapProductionLegacyPermissions20260621010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, name, description, module, resource, action, type, is_system, is_active)
      VALUES
        (
          'production.edit_draft',
          'Editar borradores de produccion',
          'Editar ordenes de produccion en estado borrador',
          'production',
          'production',
          'edit_draft',
          'action',
          true,
          true
        ),
        (
          'production.edit_processed',
          'Editar produccion procesada',
          'Editar campos controlados de ordenes de produccion ya iniciadas o completadas',
          'production',
          'production',
          'edit_processed',
          'action',
          true,
          true
        ),
        (
          'production.cancel_draft',
          'Cancelar borradores de produccion',
          'Cancelar ordenes de produccion en estado borrador',
          'production',
          'production',
          'cancel_draft',
          'action',
          true,
          true
        ),
        (
          'production.cancel_in_progress',
          'Cancelar produccion en proceso',
          'Cancelar ordenes de produccion en proceso o parciales',
          'production',
          'production',
          'cancel_in_progress',
          'action',
          true,
          true
        )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        module = EXCLUDED.module,
        resource = EXCLUDED.resource,
        action = EXCLUDED.action,
        type = EXCLUDED.type,
        is_system = EXCLUDED.is_system,
        is_active = true,
        updated_at = now();
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.role_permissions') IS NOT NULL THEN
          WITH permission_map (legacy_code, fine_code) AS (
            VALUES
              ('production.update', 'production.edit_draft'),
              ('production.update', 'production.edit_processed'),
              ('production.cancel', 'production.cancel_draft'),
              ('production.cancel', 'production.cancel_in_progress')
          )
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT DISTINCT legacy_role.role_id, fine_permission.permission_id
          FROM role_permissions legacy_role
          INNER JOIN permissions legacy_permission
            ON legacy_permission.permission_id = legacy_role.permission_id
          INNER JOIN permission_map
            ON permission_map.legacy_code = legacy_permission.code
          INNER JOIN permissions fine_permission
            ON fine_permission.code = permission_map.fine_code
          WHERE NOT EXISTS (
            SELECT 1
            FROM role_permissions existing
            WHERE existing.role_id = legacy_role.role_id
              AND existing.permission_id = fine_permission.permission_id
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.user_permission_overrides') IS NOT NULL THEN
          WITH permission_map (legacy_code, fine_code) AS (
            VALUES
              ('production.update', 'production.edit_draft'),
              ('production.update', 'production.edit_processed'),
              ('production.cancel', 'production.cancel_draft'),
              ('production.cancel', 'production.cancel_in_progress')
          )
          INSERT INTO user_permission_overrides (user_id, permission_id, effect, reason, created_by)
          SELECT DISTINCT
            legacy_override.user_id,
            fine_permission.permission_id,
            'ALLOW',
            'Migrado desde permiso legacy de produccion',
            legacy_override.created_by
          FROM user_permission_overrides legacy_override
          INNER JOIN permissions legacy_permission
            ON legacy_permission.permission_id = legacy_override.permission_id
          INNER JOIN permission_map
            ON permission_map.legacy_code = legacy_permission.code
          INNER JOIN permissions fine_permission
            ON fine_permission.code = permission_map.fine_code
          WHERE legacy_override.effect = 'ALLOW'
            AND NOT EXISTS (
              SELECT 1
              FROM user_permission_overrides existing
              WHERE existing.user_id = legacy_override.user_id
                AND existing.permission_id = fine_permission.permission_id
            );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.user_grantable_permissions') IS NOT NULL THEN
          WITH permission_map (legacy_code, fine_code) AS (
            VALUES
              ('production.update', 'production.edit_draft'),
              ('production.update', 'production.edit_processed'),
              ('production.cancel', 'production.cancel_draft'),
              ('production.cancel', 'production.cancel_in_progress')
          )
          INSERT INTO user_grantable_permissions (manager_user_id, permission_id, created_by_user_id)
          SELECT DISTINCT
            legacy_grant.manager_user_id,
            fine_permission.permission_id,
            legacy_grant.created_by_user_id
          FROM user_grantable_permissions legacy_grant
          INNER JOIN permissions legacy_permission
            ON legacy_permission.permission_id = legacy_grant.permission_id
          INNER JOIN permission_map
            ON permission_map.legacy_code = legacy_permission.code
          INNER JOIN permissions fine_permission
            ON fine_permission.code = permission_map.fine_code
          WHERE NOT EXISTS (
            SELECT 1
            FROM user_grantable_permissions existing
            WHERE existing.manager_user_id = legacy_grant.manager_user_id
              AND existing.permission_id = fine_permission.permission_id
          );
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // No-op: removing migrated permissions could revoke explicitly reviewed access.
  }
}
