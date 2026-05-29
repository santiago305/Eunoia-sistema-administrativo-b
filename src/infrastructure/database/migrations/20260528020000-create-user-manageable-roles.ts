import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserManageableRoles20260528020000 implements MigrationInterface {
  name = 'CreateUserManageableRoles20260528020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_manageable_roles (
        user_manageable_role_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        manager_user_id uuid NOT NULL,
        role_id uuid NOT NULL,
        created_by_user_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_user_manageable_roles_manager_role'
        ) THEN
          ALTER TABLE user_manageable_roles
          ADD CONSTRAINT uq_user_manageable_roles_manager_role
          UNIQUE (manager_user_id, role_id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_user_manageable_roles_manager_user'
        ) THEN
          ALTER TABLE user_manageable_roles
          ADD CONSTRAINT fk_user_manageable_roles_manager_user
          FOREIGN KEY (manager_user_id)
          REFERENCES users(user_id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_user_manageable_roles_role'
        ) THEN
          ALTER TABLE user_manageable_roles
          ADD CONSTRAINT fk_user_manageable_roles_role
          FOREIGN KEY (role_id)
          REFERENCES roles(role_id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_user_manageable_roles_created_by_user'
        ) THEN
          ALTER TABLE user_manageable_roles
          ADD CONSTRAINT fk_user_manageable_roles_created_by_user
          FOREIGN KEY (created_by_user_id)
          REFERENCES users(user_id)
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_manageable_roles_manager_user_id
      ON user_manageable_roles(manager_user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_manageable_roles_role_id
      ON user_manageable_roles(role_id);
    `);

    await queryRunner.query(`
      INSERT INTO user_manageable_roles (manager_user_id, role_id, created_by_user_id)
      SELECT DISTINCT
        users.user_id AS manager_user_id,
        roles.role_id AS role_id,
        users.created_by_user_id AS created_by_user_id
      FROM users
      CROSS JOIN LATERAL unnest(COALESCE(users.manageable_role_descriptions, '{}')) AS managed_role(role_description)
      JOIN roles ON LOWER(roles.description) = LOWER(managed_role.role_description)
      WHERE managed_role.role_description IS NOT NULL
        AND btrim(managed_role.role_description) <> ''
      ON CONFLICT ON CONSTRAINT uq_user_manageable_roles_manager_role DO NOTHING;
    `);
  }

  public async down(): Promise<void> {
    // No-op para evitar perdida de trazabilidad.
  }
}
