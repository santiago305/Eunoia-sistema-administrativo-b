import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserGrantablePermissions20260528010000 implements MigrationInterface {
  name = 'CreateUserGrantablePermissions20260528010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_grantable_permissions (
        user_grantable_permission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        manager_user_id uuid NOT NULL,
        permission_id uuid NOT NULL,
        created_by_user_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        permission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar NOT NULL UNIQUE,
        name varchar NOT NULL,
        description varchar NULL,
        module varchar NULL,
        resource varchar NULL,
        action varchar NULL,
        type varchar NOT NULL DEFAULT 'action',
        is_system boolean NOT NULL DEFAULT true,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_user_grantable_permission_user_permission'
        ) THEN
          ALTER TABLE user_grantable_permissions
          ADD CONSTRAINT uq_user_grantable_permission_user_permission
          UNIQUE (manager_user_id, permission_id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_user_grantable_permissions_manager_user'
        ) THEN
          ALTER TABLE user_grantable_permissions
          ADD CONSTRAINT fk_user_grantable_permissions_manager_user
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
          WHERE conname = 'fk_user_grantable_permissions_permission'
        ) THEN
          ALTER TABLE user_grantable_permissions
          ADD CONSTRAINT fk_user_grantable_permissions_permission
          FOREIGN KEY (permission_id)
          REFERENCES permissions(permission_id)
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
          WHERE conname = 'fk_user_grantable_permissions_created_by_user'
        ) THEN
          ALTER TABLE user_grantable_permissions
          ADD CONSTRAINT fk_user_grantable_permissions_created_by_user
          FOREIGN KEY (created_by_user_id)
          REFERENCES users(user_id)
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_grantable_permissions_manager_user_id
      ON user_grantable_permissions(manager_user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_grantable_permissions_permission_id
      ON user_grantable_permissions(permission_id);
    `);
  }

  public async down(): Promise<void> {
    // No-op para evitar pérdida de trazabilidad.
  }
}
