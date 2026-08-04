import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeRoleDescriptionUniqueness20260804020000
  implements MigrationInterface
{
  name = 'NormalizeRoleDescriptionUniqueness20260804020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION normalize_role_description(value text)
      RETURNS text
      LANGUAGE sql
      IMMUTABLE
      STRICT
      PARALLEL SAFE
      AS $function$
        SELECT btrim(
          regexp_replace(
            translate(lower(value), 'áàäâãåéèëêíìïîóòöôõúùüû', 'aaaaaaeeeeiiiiooooouuuu'),
            '[[:space:]]+',
            ' ',
            'g'
          )
        );
      $function$;

      DO $$
      DECLARE
        duplicate_names text;
      BEGIN
        SELECT string_agg(normalized_description, ', ' ORDER BY normalized_description)
        INTO duplicate_names
        FROM (
          SELECT normalize_role_description(description) AS normalized_description
          FROM roles
          GROUP BY normalize_role_description(description)
          HAVING count(*) > 1
        ) duplicates;

        IF duplicate_names IS NOT NULL THEN
          RAISE EXCEPTION 'Duplicate normalized role descriptions exist: %', duplicate_names;
        END IF;
      END $$;

      ALTER TABLE roles
      DROP CONSTRAINT IF EXISTS roles_description_key;

      DROP INDEX IF EXISTS ux_roles_description_normalized;

      CREATE UNIQUE INDEX ux_roles_description_normalized
      ON roles (normalize_role_description(description));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS ux_roles_description_normalized;
      DROP FUNCTION IF EXISTS normalize_role_description(text);
      CREATE UNIQUE INDEX ux_roles_description_normalized
      ON roles (lower(btrim(description)));
    `);
  }
}
