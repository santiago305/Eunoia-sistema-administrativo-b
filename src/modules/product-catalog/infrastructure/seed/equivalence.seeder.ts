import { DataSource } from "typeorm";
import { ProductCatalogEquivalencesEntity } from "../../adapters/out/persistence/typeorm/entities/equivalences.entity";
import { ProductCatalogProductEntity } from "../../adapters/out/persistence/typeorm/entities/product.entity";
import { ProductCatalogUnitEntity } from "../../adapters/out/persistence/typeorm/entities/unit.entity";

const ensureEquivalencesTable = async (dataSource: DataSource): Promise<void> => {
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS pc_equivalences (
      equivalence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id uuid NOT NULL,
      from_unit_id uuid NOT NULL,
      to_unit_id uuid NOT NULL,
      factor numeric(12,2) NOT NULL
    );
  `);

  await dataSource.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_pc_equivalences_product_from_to'
      ) THEN
        ALTER TABLE pc_equivalences
        ADD CONSTRAINT uq_pc_equivalences_product_from_to
        UNIQUE (product_id, from_unit_id, to_unit_id);
      END IF;
    END $$;
  `);

  await dataSource.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_pc_equivalences_product'
      ) THEN
        ALTER TABLE pc_equivalences
        ADD CONSTRAINT fk_pc_equivalences_product
        FOREIGN KEY (product_id)
        REFERENCES pc_products(product_id)
        ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  await dataSource.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_pc_equivalences_from_unit'
      ) THEN
        ALTER TABLE pc_equivalences
        ADD CONSTRAINT fk_pc_equivalences_from_unit
        FOREIGN KEY (from_unit_id)
        REFERENCES pc_units(unit_id)
        ON DELETE RESTRICT;
      END IF;
    END $$;
  `);

  await dataSource.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_pc_equivalences_to_unit'
      ) THEN
        ALTER TABLE pc_equivalences
        ADD CONSTRAINT fk_pc_equivalences_to_unit
        FOREIGN KEY (to_unit_id)
        REFERENCES pc_units(unit_id)
        ON DELETE RESTRICT;
      END IF;
    END $$;
  `);

  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_pc_equivalences_product_id
    ON pc_equivalences(product_id);
  `);
};

export const seedProductCatalogEquivalences = async (dataSource: DataSource): Promise<void> => {
  await ensureEquivalencesTable(dataSource);

  const equivalenceRepo = dataSource.getRepository(ProductCatalogEquivalencesEntity);
  const productRepo = dataSource.getRepository(ProductCatalogProductEntity);
  const unitRepo = dataSource.getRepository(ProductCatalogUnitEntity);

  const liquido = await productRepo.findOne({ where: { name: "Liquido" } });
  if (!liquido) {
    throw new Error("Producto 'Liquido' no encontrado. Ejecuta seedProductCatalog primero.");
  }

  const grams = await unitRepo.findOne({ where: { code: "GRM" } });
  const kilogram = await unitRepo.findOne({ where: { code: "KGM" } });
  if (!grams || !kilogram) {
    throw new Error("Unidades GRM/KGM no encontradas. Ejecuta seedUnits primero.");
  }

  // Requerimiento: origen GRM, destino KGM, factor 1000 para el producto Liquido.
  const existing = await equivalenceRepo.findOne({
    where: {
      productId: liquido.id,
      fromUnitId: grams.id,
      toUnitId: kilogram.id,
    },
  });

  if (!existing) {
    await equivalenceRepo.save(
      equivalenceRepo.create({
        productId: liquido.id,
        fromUnitId: grams.id,
        toUnitId: kilogram.id,
        factor: 1000,
      }),
    );
  }
};
