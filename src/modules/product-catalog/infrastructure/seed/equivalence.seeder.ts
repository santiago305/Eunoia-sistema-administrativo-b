import { DataSource } from "typeorm";
import { ProductCatalogEquivalencesEntity } from "../../adapters/out/persistence/typeorm/entities/equivalences.entity";
import { ProductCatalogProductEntity } from "../../adapters/out/persistence/typeorm/entities/product.entity";
import { ProductCatalogUnitEntity } from "../../adapters/out/persistence/typeorm/entities/unit.entity";

export const seedProductCatalogEquivalences = async (dataSource: DataSource): Promise<void> => {
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
