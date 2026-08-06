import { MigrationInterface, QueryRunner } from "typeorm";

export class RestoreLegacyProductEquivalenceDirection20260806110000 implements MigrationInterface {
  name = "RestoreLegacyProductEquivalenceDirection20260806110000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_prevent_product_base_unit_change_with_equivalences ON pc_products;
      DROP FUNCTION IF EXISTS prevent_product_base_unit_change_with_equivalences();
      DROP TRIGGER IF EXISTS trg_validate_product_equivalence_base_unit ON pc_equivalences;
      DROP FUNCTION IF EXISTS validate_product_equivalence_base_unit();

      DO $$
      DECLARE
        conflicting_products text;
      BEGIN
        SELECT string_agg(DISTINCT product.name, ', ' ORDER BY product.name)
        INTO conflicting_products
        FROM pc_equivalences current_direction
        JOIN pc_products product ON product.product_id = current_direction.product_id
        JOIN pc_equivalences legacy_direction
          ON legacy_direction.product_id = current_direction.product_id
         AND legacy_direction.from_unit_id = current_direction.to_unit_id
         AND legacy_direction.to_unit_id = current_direction.from_unit_id
        WHERE current_direction.to_unit_id = product.base_unit_id
          AND current_direction.from_unit_id <> product.base_unit_id;

        IF conflicting_products IS NOT NULL THEN
          RAISE EXCEPTION 'No se pueden restaurar equivalencias porque ya existen ambos sentidos para: %', conflicting_products;
        END IF;
      END $$;

      UPDATE pc_equivalences equivalence
      SET
        from_unit_id = equivalence.to_unit_id,
        to_unit_id = equivalence.from_unit_id
      FROM pc_products product
      WHERE product.product_id = equivalence.product_id
        AND product.base_unit_id IS NOT NULL
        AND equivalence.to_unit_id = product.base_unit_id
        AND equivalence.from_unit_id <> product.base_unit_id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE pc_equivalences equivalence
      SET
        from_unit_id = equivalence.to_unit_id,
        to_unit_id = equivalence.from_unit_id
      FROM pc_products product
      WHERE product.product_id = equivalence.product_id
        AND product.base_unit_id IS NOT NULL
        AND equivalence.from_unit_id = product.base_unit_id
        AND equivalence.to_unit_id <> product.base_unit_id;

      CREATE OR REPLACE FUNCTION validate_product_equivalence_base_unit()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $function$
      DECLARE
        product_base_unit_id uuid;
      BEGIN
        SELECT base_unit_id INTO product_base_unit_id
        FROM pc_products
        WHERE product_id = NEW.product_id;

        IF product_base_unit_id IS NULL THEN
          RAISE EXCEPTION 'El producto debe tener una unidad base para registrar equivalencias';
        END IF;
        IF NEW.to_unit_id <> product_base_unit_id THEN
          RAISE EXCEPTION 'La unidad destino de la equivalencia debe ser la unidad base del producto';
        END IF;
        RETURN NEW;
      END;
      $function$;

      CREATE TRIGGER trg_validate_product_equivalence_base_unit
      BEFORE INSERT OR UPDATE OF product_id, from_unit_id, to_unit_id
      ON pc_equivalences
      FOR EACH ROW
      EXECUTE FUNCTION validate_product_equivalence_base_unit();

      CREATE OR REPLACE FUNCTION prevent_product_base_unit_change_with_equivalences()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $function$
      BEGIN
        IF NEW.base_unit_id IS DISTINCT FROM OLD.base_unit_id
          AND EXISTS (SELECT 1 FROM pc_equivalences WHERE product_id = OLD.product_id)
        THEN
          RAISE EXCEPTION 'No se puede cambiar la unidad base mientras el producto tenga equivalencias registradas';
        END IF;
        RETURN NEW;
      END;
      $function$;

      CREATE TRIGGER trg_prevent_product_base_unit_change_with_equivalences
      BEFORE UPDATE OF base_unit_id
      ON pc_products
      FOR EACH ROW
      EXECUTE FUNCTION prevent_product_base_unit_change_with_equivalences();
    `);
  }
}
