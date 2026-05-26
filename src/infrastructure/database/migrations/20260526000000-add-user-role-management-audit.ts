import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRoleManagementAudit20260526000000 implements MigrationInterface {
  name = "AddUserRoleManagementAudit20260526000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS created_by_user_id uuid NULL,
      ADD COLUMN IF NOT EXISTS manageable_role_descriptions text[] NULL,
      ADD COLUMN IF NOT EXISTS manageable_user_ids uuid[] NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE roles
      ADD COLUMN IF NOT EXISTS created_by_user_id uuid NULL;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_users_created_by_user'
        ) THEN
          ALTER TABLE users
          ADD CONSTRAINT fk_users_created_by_user
          FOREIGN KEY (created_by_user_id)
          REFERENCES users(user_id)
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_roles_created_by_user'
        ) THEN
          ALTER TABLE roles
          ADD CONSTRAINT fk_roles_created_by_user
          FOREIGN KEY (created_by_user_id)
          REFERENCES users(user_id)
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_created_by_user_id
      ON users(created_by_user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_roles_created_by_user_id
      ON roles(created_by_user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_manageable_role_descriptions_gin
      ON users
      USING GIN(manageable_role_descriptions);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_manageable_user_ids_gin
      ON users
      USING GIN(manageable_user_ids);
    `);
  }

  public async down(): Promise<void> {
    // No-op para evitar pérdida de trazabilidad.
  }
}

