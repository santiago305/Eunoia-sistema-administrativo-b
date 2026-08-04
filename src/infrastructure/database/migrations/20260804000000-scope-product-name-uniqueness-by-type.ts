import { MigrationInterface, QueryRunner } from "typeorm";

export class ScopeProductNameUniquenessByType20260804000000
  implements MigrationInterface
{
  name = "ScopeProductNameUniquenessByType20260804000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION normalize_product_name(value text)
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

      DELETE FROM pc_recipes r
      WHERE EXISTS (
        SELECT 1
        FROM pc_skus s
        JOIN pc_products p ON p.product_id = s.product_id
        WHERE p.is_deleted = true
          AND s.sku_id = r.sku_id
      )
      OR EXISTS (
        SELECT 1
        FROM pc_recipe_items ri
        JOIN pc_skus material ON material.sku_id = ri.material_sku_id
        JOIN pc_products p ON p.product_id = material.product_id
        WHERE p.is_deleted = true
          AND ri.recipe_id = r.recipe_id
      );

      DELETE FROM pc_products
      WHERE is_deleted = true;

      DO $$
      DECLARE
        duplicate_names text;
      BEGIN
        SELECT string_agg(type::text || ':' || normalized_name, ', ' ORDER BY type::text, normalized_name)
        INTO duplicate_names
        FROM (
          SELECT type, normalize_product_name(name) AS normalized_name
          FROM pc_products
          GROUP BY type, normalize_product_name(name)
          HAVING count(*) > 1
        ) duplicates;

        IF duplicate_names IS NOT NULL THEN
          RAISE EXCEPTION 'Active duplicate product names remain after deleted products cleanup: %', duplicate_names;
        END IF;
      END $$;

      ALTER TABLE pc_products
      DROP CONSTRAINT IF EXISTS pc_products_name_key;

      ALTER TABLE pc_products
      DROP CONSTRAINT IF EXISTS ux_pc_products_name;

      DROP INDEX IF EXISTS ux_pc_products_name;

      UPDATE pc_products
      SET name = upper(left(formatted_name, 1)) || substring(formatted_name from 2)
      FROM (
        SELECT
          product_id,
          lower(btrim(regexp_replace(name, '[[:space:]]+', ' ', 'g'))) AS formatted_name
        FROM pc_products
      ) formatted
      WHERE formatted.product_id = pc_products.product_id;

      CREATE UNIQUE INDEX IF NOT EXISTS ux_pc_products_type_name
      ON pc_products (type, normalize_product_name(name));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS ux_pc_products_type_name;

      DROP FUNCTION IF EXISTS normalize_product_name(text);

      ALTER TABLE pc_products
      ADD CONSTRAINT pc_products_name_key UNIQUE (name);
    `);
  }
}
