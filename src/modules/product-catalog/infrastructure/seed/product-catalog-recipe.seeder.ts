import { DataSource } from "typeorm";
import { ProductCatalogRecipeItemEntity } from "../../adapters/out/persistence/typeorm/entities/recipe-item.entity";
import { ProductCatalogRecipeEntity } from "../../adapters/out/persistence/typeorm/entities/recipe.entity";
import { ProductCatalogSkuEntity } from "../../adapters/out/persistence/typeorm/entities/sku.entity";
import { UnitEntity } from "src/shared/infrastructure/typeorm/entities/unit.entity";

type RecipeSeed = {
  skuCustomSku: string;
  yieldQuantity: number;
  notes?: string | null;
  items: Array<{
    materialCustomSku: string;
    quantity: number;
    unitCode: string;
  }>;
};

const PRODUCT_CATALOG_RECIPES: RecipeSeed[] = [
  {
    skuCustomSku: "JABON-01",
    yieldQuantity: 1,
    items: [
      { materialCustomSku: "EMBOL-02", quantity: 1, unitCode: "NIU" },
      { materialCustomSku: "PEGAT-02", quantity: 1, unitCode: "NIU" },
    ],
  },
  {
    skuCustomSku: "JABON-02",
    yieldQuantity: 1,
    items: [
      { materialCustomSku: "EMBOL-01", quantity: 1, unitCode: "NIU" },
      { materialCustomSku: "PEGAT-01", quantity: 1, unitCode: "NIU" },
    ],
  },
  {
    skuCustomSku: "ARCILL-01",
    yieldQuantity: 1,
    items: [
      { materialCustomSku: "ARCILL-PRE-01", quantity: 200, unitCode: "GRM" },
      { materialCustomSku: "BOLSA-01", quantity: 1, unitCode: "NIU" },
      { materialCustomSku: "STICKER-01", quantity: 1, unitCode: "NIU" },
    ],
  },
  {
    skuCustomSku: "ARCILL-02",
    yieldQuantity: 1,
    items: [
      { materialCustomSku: "ARCILL-PRE-02", quantity: 200, unitCode: "GRM" },
      { materialCustomSku: "BOLSA-02", quantity: 1, unitCode: "NIU" },
      { materialCustomSku: "STICKER-02", quantity: 1, unitCode: "NIU" },
    ],
  },
  {
    skuCustomSku: "AMPOLL-01",
    yieldQuantity: 1,
    items: [
      { materialCustomSku: "LIQUIDO-01", quantity: 35, unitCode: "GRM" },
      { materialCustomSku: "ENVASE-01", quantity: 1, unitCode: "NIU" },
      { materialCustomSku: "PEGAT-03", quantity: 1, unitCode: "NIU" },
    ],
  },
];

export const seedProductCatalogRecipes = async (dataSource: DataSource): Promise<void> => {
  const skuRepo = dataSource.getRepository(ProductCatalogSkuEntity);
  const recipeRepo = dataSource.getRepository(ProductCatalogRecipeEntity);
  const recipeItemRepo = dataSource.getRepository(ProductCatalogRecipeItemEntity);
  const unitRepo = dataSource.getRepository(UnitEntity);

  for (const seed of PRODUCT_CATALOG_RECIPES) {
    const sku = await skuRepo.findOne({ where: { customSku: seed.skuCustomSku } });
    if (!sku) throw new Error(`Sku ${seed.skuCustomSku} no encontrado. Ejecuta seedProductCatalog primero.`);

    const existing = await recipeRepo.findOne({
      where: { skuId: sku.id, isActive: true },
      order: { createdAt: "DESC" },
    });
    if (existing) continue;

    const recipe = await recipeRepo.save({
      skuId: sku.id,
      version: 1,
      yieldQuantity: seed.yieldQuantity,
      notes: seed.notes ?? null,
      isActive: true,
    });

    for (const itemSeed of seed.items) {
      const material = await skuRepo.findOne({ where: { customSku: itemSeed.materialCustomSku } });
      if (!material) {
        throw new Error(`Material ${itemSeed.materialCustomSku} no encontrado.`);
      }

      const unit = await unitRepo.findOne({ where: { code: itemSeed.unitCode } });
      if (!unit) throw new Error(`Unidad ${itemSeed.unitCode} no encontrada.`);

      await recipeItemRepo.save({
        recipeId: recipe.id,
        materialSkuId: material.id,
        quantity: itemSeed.quantity,
        unitId: unit.id,
      });
    }
  }
};
