import { DataSource, In } from "typeorm";
import { ProductEntity } from "../../adapters/out/persistence/typeorm/entities/product.entity";
import { ProductVariantEntity } from "../../adapters/out/persistence/typeorm/entities/product-variant.entity";
import { ProductRecipeEntity } from "../../adapters/out/persistence/typeorm/entities/product-recipe.entity";
import { ProductRecipeTypeormRepository } from "../../adapters/out/persistence/typeorm/repositories/product-recipe.typeorm.repo";
import { CreateProductRecipe } from "../../application/usecases/product-recipe/create.usecase";
import { ProductType } from "../../domain/value-object/productType";

type SeedRecipeOptions = {
  minPerFinished?: number;
  maxPerFinished?: number;
};

const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pickRandom = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

export const seedProductRecipes = async (
  dataSource: DataSource,
  options: SeedRecipeOptions = {},
): Promise<void> => {
  const productRepo = dataSource.getRepository(ProductEntity);
  const variantRepo = dataSource.getRepository(ProductVariantEntity);
  const recipeRepo = dataSource.getRepository(ProductRecipeEntity);
  const recipeRepoPort = new ProductRecipeTypeormRepository(recipeRepo);
  const createRecipe = new CreateProductRecipe(recipeRepoPort);

  const minPerFinished = options.minPerFinished ?? 1;
  const maxPerFinished = options.maxPerFinished ?? 2;

  const finishedProducts = await productRepo.find({
    select: ["id"],
    where: { type: ProductType.FINISHED },
  });
  const rawProducts = await productRepo.find({
    select: ["id"],
    where: { type: ProductType.PRIMA },
  });

  if (finishedProducts.length === 0) {
    throw new Error("No hay productos FINISHED. Ejecuta seedProducts primero.");
  }
  if (rawProducts.length === 0) {
    throw new Error("No hay productos PRIMA. Ejecuta seedProducts primero.");
  }

  const finishedVariants = await variantRepo.find({
    where: { productId: In(finishedProducts.map((p) => p.id)) },
  });
  const rawVariants = await variantRepo.find({
    where: { productId: In(rawProducts.map((p) => p.id)) },
  });

  if (finishedVariants.length === 0) {
    throw new Error("No hay variantes FINISHED. Ejecuta seedProducts primero.");
  }
  if (rawVariants.length === 0) {
    throw new Error("No hay variantes PRIMA. Ejecuta seedProducts primero.");
  }

  for (const finished of finishedVariants) {
    const existingCount = await recipeRepo.count({
      where: { finishedVariantId: finished.id },
    });
    if (existingCount > 0) {
      continue;
    }

    const total = randomBetween(minPerFinished, maxPerFinished);
    const used = new Set<string>();

    for (let i = 0; i < total; i++) {
      let raw = pickRandom(rawVariants);
      let guard = 0;
      while (used.has(raw.id) && guard < 10) {
        raw = pickRandom(rawVariants);
        guard++;
      }
      used.add(raw.id);

      await createRecipe.execute({
        finishedVariantId: finished.id,
        primaVariantId: raw.id,
        quantity: Number((Math.random() * 5 + 0.5).toFixed(3)),
        waste: null,
      });
    }
  }
};
