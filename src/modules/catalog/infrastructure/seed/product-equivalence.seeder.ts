import { DataSource } from "typeorm";
import { ProductEntity } from "../../adapters/out/persistence/typeorm/entities/product.entity";
import { UnitEntity } from "../../adapters/out/persistence/typeorm/entities/unit.entity";
import { ProductEquivalenceEntity } from "../../adapters/out/persistence/typeorm/entities/product-equivalence.entity";

type SeedProductEquivalencesOptions = {
  minPerProduct?: number;
  maxPerProduct?: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const seedProductEquivalences = async (
  dataSource: DataSource,
  options: SeedProductEquivalencesOptions = {},
): Promise<void> => {
  const minPerProduct = clamp(options.minPerProduct ?? 1, 1, 4);
  const maxPerProduct = clamp(options.maxPerProduct ?? 4, minPerProduct, 4);

  const productRepo = dataSource.getRepository(ProductEntity);
  const unitRepo = dataSource.getRepository(UnitEntity);
  const equivalenceRepo = dataSource.getRepository(ProductEquivalenceEntity);

  const products = await productRepo.find();
  const units = await unitRepo.find();

  if (products.length === 0) {
    console.log("No hay productos para generar equivalencias.");
    return;
  }
  if (units.length < 2) {
    throw new Error("Se requieren al menos 2 unidades para equivalencias.");
  }

  const range = maxPerProduct - minPerProduct + 1;

  for (let pIndex = 0; pIndex < products.length; pIndex++) {
    const product = products[pIndex];
    const targetCount = minPerProduct + (pIndex % range);

    const existing = await equivalenceRepo.find({
      where: { productId: product.id },
    });

    const existingPairs = new Set(
      existing.map((row) => `${row.fromUnitId}|${row.toUnitId}`),
    );

    const ensureBaseKey = `${product.baseUnitId}|${product.baseUnitId}`;
    if (!existingPairs.has(ensureBaseKey)) {
      await equivalenceRepo.save(
        equivalenceRepo.create({
          productId: product.id,
          fromUnitId: product.baseUnitId,
          toUnitId: product.baseUnitId,
          factor: 1,
        }),
      );
      existingPairs.add(ensureBaseKey);
      console.log(`Equivalencia base creada para producto ${product.sku}`);
    }

    let createdCount = existingPairs.size;

    if (createdCount >= targetCount) {
      continue;
    }

    const availableUnits = units.filter((u) => u.id !== product.baseUnitId);
    let cursor = 0;

    while (createdCount < targetCount && cursor < availableUnits.length) {
      const unitIndex = (pIndex + cursor * 7) % availableUnits.length;
      const toUnitId = availableUnits[unitIndex].id;
      const key = `${product.baseUnitId}|${toUnitId}`;
      cursor += 1;
      if (existingPairs.has(key)) {
        continue;
      }

      const factor = Number((1 + cursor * 0.25 + (pIndex % 5) * 0.1).toFixed(6));
      await equivalenceRepo.save(
        equivalenceRepo.create({
          productId: product.id,
          fromUnitId: product.baseUnitId,
          toUnitId,
          factor,
        }),
      );
      existingPairs.add(key);
      createdCount += 1;
      console.log(`Equivalencia creada ${product.sku} -> ${toUnitId}`);
    }
  }
};
