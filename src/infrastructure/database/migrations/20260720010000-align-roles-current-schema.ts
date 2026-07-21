import { MigrationInterface, QueryRunner } from "typeorm";

export class AlignRolesCurrentSchema20260720010000 implements MigrationInterface {
  name = "AlignRolesCurrentSchema20260720010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE roles ADD COLUMN IF NOT EXISTS description varchar(255);
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'roles' AND column_name = 'name'
        ) THEN
          UPDATE roles
          SET description = lower(
            COALESCE(
              NULLIF(btrim(description), ''),
              NULLIF(btrim(name), ''),
              'rol-' || left(replace(role_id::text, '-', ''), 12)
            )
          );
        ELSE
          UPDATE roles
          SET description = lower(
            COALESCE(
              NULLIF(btrim(description), ''),
              'rol-' || left(replace(role_id::text, '-', ''), 12)
            )
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      WITH duplicated AS (
        SELECT
          role_id,
          description,
          row_number() OVER (
            PARTITION BY lower(btrim(description))
            ORDER BY created_at, role_id
          ) AS duplicate_number
        FROM roles
      )
      UPDATE roles role
      SET description = left(duplicated.description, 248) || '-' || duplicated.duplicate_number::text
      FROM duplicated
      WHERE role.role_id = duplicated.role_id
        AND duplicated.duplicate_number > 1;
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        constraint_name text;
        description_attnum smallint;
      BEGIN
        SELECT attnum
        INTO description_attnum
        FROM pg_attribute
        WHERE attrelid = 'roles'::regclass
          AND attname = 'description'
          AND NOT attisdropped;

        FOR constraint_name IN
          SELECT conname
          FROM pg_constraint
          WHERE conrelid = 'roles'::regclass
            AND contype = 'u'
            AND conkey = ARRAY[description_attnum]
        LOOP
          EXECUTE format('ALTER TABLE roles DROP CONSTRAINT %I', constraint_name);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE roles ALTER COLUMN description SET NOT NULL;`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN IF EXISTS name;`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_roles_description_normalized
      ON roles (lower(btrim(description)));
    `);
  }

  public async down(): Promise<void> {
    // Removing the legacy column is intentionally irreversible to preserve current role data.
  }
}
