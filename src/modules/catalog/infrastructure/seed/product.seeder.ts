import { DataSource } from "typeorm";
import { ProductEntity } from "../../adapters/out/persistence/typeorm/entities/product.entity";
import { ProductVariantEntity } from "../../adapters/out/persistence/typeorm/entities/product-variant.entity";
import { UnitEntity } from "../../adapters/out/persistence/typeorm/entities/unit.entity";
import { ProductType } from "../../domain/value-object/productType";
import { StockItemEntity } from "src/modules/inventory/adapters/out/typeorm/entities/stock-item.entity";
import { StockItemTypeormRepository } from "src/modules/inventory/adapters/out/typeorm/repositories/stock-item.typeorm.repo";
import { CreateStockItemForProduct } from "src/modules/inventory/application/use-cases/stock-item/create-for-product.usecase";
import { CreateStockItemForVariant } from "src/modules/inventory/application/use-cases/stock-item/create-for-variant.usecase";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { ProductTypeormRepository } from "../../adapters/out/persistence/typeorm/repositories/product.typeorm.repo";
import { ProductVariantTypeormRepository } from "../../adapters/out/persistence/typeorm/repositories/product-variant.typeorm.repo";
import { SkuCounterTypeormRepository } from "../../adapters/out/persistence/typeorm/repositories/sku-counter.typeorm.repo";
import { SkuCounterEntity } from "../../adapters/out/persistence/typeorm/entities/sku-counter.entity";
import { ProductEquivalenceTypeormRepository } from "../../adapters/out/persistence/typeorm/repositories/product-equivalence.typeorm.repo";
import { ProductEquivalenceEntity } from "../../adapters/out/persistence/typeorm/entities/product-equivalence.entity";
import { CreateProduct } from "../../application/usecases/product/created.usecase";
import { CreateProductVariant } from "../../application/usecases/product-variant/create.usecase";
import { ProductRecipeEntity } from "../../adapters/out/persistence/typeorm/entities/product-recipe.entity";
import { ProductRecipeTypeormRepository } from "../../adapters/out/persistence/typeorm/repositories/product-recipe.typeorm.repo";
import { CreateProductRecipe } from "../../application/usecases/product-recipe/create.usecase";
import { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";

type ManualProductSeed = {
  product: {
    customSku: string;
    name: string;
    description?: string;
    baseUnitCode: string;
    barcode?: string | null;
    price: number;
    cost: number;
    attributes?: Record<string, unknown>;
    type: ProductType;
    isActive?: boolean;
  };
  variants?: Array<{
    customSku: string;
    barcode?: string | null;
    price: number;
    cost: number;
    attributes?: Record<string, unknown>;
    isActive?: boolean;
  }>;
  equivalences?: Array<{
    fromUnitCode: string;
    toUnitCode: string;
    factor: number;
  }>;
};

type ManualRecipeSeed = {
  finishedType: StockItemType;
  finishedCustomSku: string;
  primaCustomSku: string;
  quantity: number;
  waste?: number | null;
};

const PRODUCTS_MANUAL: ManualProductSeed[] = [
  {
    product: {
      customSku: "JABON-01",
      name: "Jabon",
      description: "",
      baseUnitCode: "NIU",
      barcode: "",
      price: 0,
      cost: 0,
      attributes: { presentation:"", variant: "Azufre", color: "" },
      type: ProductType.FINISHED,
      isActive: true,
    },
    equivalences: [
      { fromUnitCode: "NIU", toUnitCode: "NIU", factor: 1 },
    ],
    variants: [
      {
        customSku: "JABON-02",
        barcode: "",
        price: 0,
        cost: 0,
        attributes: { presentation:"", variant: "Curcuma", color:"" },
        isActive: true,
      },
    ],
  },
  {
    product: {
      customSku: "ARCILL-01",
      name: "Arcilla para piel",
      baseUnitCode: "NIU",
      barcode: "",
      price: 0,
      cost: 0,
      attributes: { presentation:"200gr", variant: "", color:"Verde" },
      type: ProductType.FINISHED,
      isActive: true,
    },
    equivalences: [
      { fromUnitCode: "NIU", toUnitCode: "NIU", factor: 1 },
    ],
    variants: [
      {
        customSku: "ARCILL-02",
        barcode: "",
        price: 0,
        cost: 0,
        attributes: { presentation:"200gr", variant: "", color:"Rosa" },
      },
    ],
  },
  {
    product: {
      customSku: "AMPOLL-01",
      name: "Ampolla antiacne",
      baseUnitCode: "NIU",
      barcode: "",
      price: 0,
      cost: 0,
      attributes: { presentation:"35gr", variant: "", color:"" },
      type: ProductType.FINISHED,
      isActive: true,
    },
    equivalences: [
      { fromUnitCode: "NIU", toUnitCode: "NIU", factor: 1 },
    ],
  },
  {
    product: {
      customSku: "EMBOL-01",
      name: "Emboltorio",
      baseUnitCode: "NIU",
      barcode: "",
      price: 0,
      cost: 0,
      attributes: { presentation:"", variant: "Curcuma", color:"" },
      type: ProductType.PRIMA,
      isActive: true,
    },
    equivalences: [
      { fromUnitCode: "NIU", toUnitCode: "NIU", factor: 1 },
      { fromUnitCode: "NIU", toUnitCode: "PKE", factor: 500 },
    ],
    variants: [
      {
        customSku: "EMBOL-02",
        barcode: "",
        price: 0,
        cost: 0,
        attributes: { presentation:"", variant: "Azufre", color:"" },
      },
    ],
  },
  {
    product: {
      customSku: "PEGAT-01",
      name: "Pegatina",
      baseUnitCode: "NIU",
      barcode: "",
      price: 0,
      cost: 0,
      attributes: { presentation:"", variant: "Curcuma", color:"" },
      type: ProductType.PRIMA,
      isActive: true,
    },
    equivalences: [
      { fromUnitCode: "NIU", toUnitCode: "NIU", factor: 1 },
      { fromUnitCode: "NIU", toUnitCode: "PKE", factor: 500 },
    ],
    variants: [
      {
        customSku: "PEGAT-02",
        barcode: "",
        price: 0,
        cost: 0,
        attributes: { presentation:"", variant: "Azufre", color:"" },
      },
      {
        customSku: "PEGAT-03",
        barcode: "",
        price: 0,
        cost: 0,
        attributes: { presentation:"", variant: "Ampolla", color:"" },
      },
    ],
  },
  {
    product: {
      customSku: "ARCILL-PRE-01",
      name: "Arcilla preparada",
      baseUnitCode: "GRM",
      barcode: "",
      price: 0,
      cost: 0,
      attributes: { presentation:"", variant: "Verde", color:"" },
      type: ProductType.PRIMA,
      isActive: true,
    },
    equivalences: [
      { fromUnitCode: "GRM", toUnitCode: "GRM", factor: 1 },
      { fromUnitCode: "GRM", toUnitCode: "KGM", factor: 1000 },
    ],
    variants: [
      {
        customSku: "ARCILL-PRE-02",
        barcode: "",
        price: 0,
        cost: 0,
        attributes: { presentation:"", variant: "Rosa", color:"" },
      },
    ],
  },
  {
    product: {
      customSku: "BOLSA-01",
      name: "Bolsa",
      baseUnitCode: "NIU",
      barcode: "",
      price: 0,
      cost: 0,
      attributes: { presentation:"", variant: "Verde", color:"" },
      type: ProductType.PRIMA,
      isActive: true,
    },
    equivalences: [
      { fromUnitCode: "NIU", toUnitCode: "NIU", factor: 1 },
      { fromUnitCode: "NIU", toUnitCode: "PKE", factor: 500 },
    ],
    variants: [
      {
        customSku: "BOLSA-02",
        barcode: "",
        price: 0,
        cost: 0,
        attributes: { presentation:"", variant: "Rosa", color:"" },
      },
    ],
  },
  {
    product: {
      customSku: "STICKER-01",
      name: "Sticker",
      baseUnitCode: "NIU",
      barcode: "",
      price: 0,
      cost: 0,
      attributes: { presentation:"", variant: "Verde", color:"" },
      type: ProductType.PRIMA,
      isActive: true,
    },
    equivalences: [
      { fromUnitCode: "NIU", toUnitCode: "NIU", factor: 1 },
      { fromUnitCode: "NIU", toUnitCode: "PKE", factor: 500 },
    ],
    variants: [
      {
        customSku: "STICKER-02",
        barcode: "",
        price: 0,
        cost: 0,
        attributes: { presentation:"", variant: "Rosa", color:"" },
      },
    ],
  },
  {
    product: {
      customSku: "LIQUIDO-01",
      name: "Liquido",
      baseUnitCode: "GRM",
      barcode: "",
      price: 0,
      cost: 0,
      attributes: { presentation:"", variant: "Ampoya", color:"" },
      type: ProductType.PRIMA,
      isActive: true,
    },
    equivalences: [
      { fromUnitCode: "GRM", toUnitCode: "GRM", factor: 1 },
      { fromUnitCode: "GRM", toUnitCode: "KGM", factor: 1000 },
    ],
  },
  {
    product: {
    customSku: "EMBASE-01",
    name: "Embase",
    baseUnitCode: "NIU",
    barcode: "",
    price: 0,
    cost: 0,
    attributes: { presentation:"", variant: "Ampoya", color:"" },
    type: ProductType.PRIMA,
    isActive: true,
  },
  equivalences: [
    { fromUnitCode: "NIU", toUnitCode: "NIU", factor: 1 },
    { fromUnitCode: "NIU", toUnitCode: "BX", factor: 50 },
  ],
},
];
const RECIPES_MANUAL: ManualRecipeSeed[] = [
  {
    finishedType: StockItemType.PRODUCT,
    finishedCustomSku: "JABON-01",
    primaCustomSku: "EMBOL-01",
    quantity: 1,
    waste: 0,
  },
  {
    finishedType: StockItemType.PRODUCT,
    finishedCustomSku: "JABON-01",
    primaCustomSku: "PEGAT-01",
    quantity: 1,
    waste: 0,
  },

  {
    finishedType: StockItemType.VARIANT,
    finishedCustomSku: "JABON-02",
    primaCustomSku: "EMBOL-02",
    quantity: 1,
    waste: 0,
  },
  {
    finishedType: StockItemType.VARIANT,
    finishedCustomSku: "JABON-02",
    primaCustomSku: "PEGAT-02",
    quantity: 1,
    waste: 0,
  },
  
  {
    finishedType: StockItemType.PRODUCT,
    finishedCustomSku: "ARCILL-01",
    primaCustomSku: "ARCILL-PRE-01",
    quantity: 200,
    waste: 0,
  },
  {
    finishedType: StockItemType.PRODUCT,
    finishedCustomSku: "ARCILL-01",
    primaCustomSku: "BOLSA-01",
    quantity: 1,
    waste: 0,
  },
  {
    finishedType: StockItemType.PRODUCT,
    finishedCustomSku: "ARCILL-01",
    primaCustomSku: "STICKER-01",
    quantity: 1,
    waste: 0,
  },

  {
    finishedType: StockItemType.VARIANT,
    finishedCustomSku: "ARCILL-02",
    primaCustomSku: "ARCILL-PRE-02",
    quantity: 200,
    waste: 0,
  },
  {
    finishedType: StockItemType.VARIANT,
    finishedCustomSku: "ARCILL-02",
    primaCustomSku: "BOLSA-02",
    quantity: 1,
    waste: 0,
  },
  {
    finishedType: StockItemType.VARIANT,
    finishedCustomSku: "ARCILL-02",
    primaCustomSku: "STICKER-02",
    quantity: 1,
    waste: 0,
  },

  {
    finishedType: StockItemType.PRODUCT,
    finishedCustomSku: "AMPOLL-01",
    primaCustomSku: "LIQUIDO-01",
    quantity: 35,
    waste: 0,
  },
  {
    finishedType: StockItemType.PRODUCT,
    finishedCustomSku: "AMPOLL-01",
    primaCustomSku: "EMBASE-01",
    quantity: 1,
    waste: 0,
  },
  {
    finishedType: StockItemType.PRODUCT,
    finishedCustomSku: "AMPOLL-01",
    primaCustomSku: "PEGAT-03",
    quantity: 1,
    waste: 0,
  },

];

export const seedProductsManual = async (dataSource: DataSource): Promise<void> => {
  const unitRepo = dataSource.getRepository(UnitEntity);
  const productEntityRepo = dataSource.getRepository(ProductEntity);
  const variantEntityRepo = dataSource.getRepository(ProductVariantEntity);
  const equivalenceEntityRepo = dataSource.getRepository(ProductEquivalenceEntity);
  const recipeRepo = dataSource.getRepository(ProductRecipeEntity);

  const stockItemRepo = new StockItemTypeormRepository(
    dataSource.getRepository(StockItemEntity),
  );
  const productRepo = new ProductTypeormRepository(
    dataSource.getRepository(ProductEntity),
  );
  const variantRepo = new ProductVariantTypeormRepository(
    dataSource.getRepository(ProductVariantEntity),
  );
  const skuCounterRepo = new SkuCounterTypeormRepository(
    dataSource.getRepository(SkuCounterEntity),
  );
  const equivalenceRepo = new ProductEquivalenceTypeormRepository(
    dataSource.getRepository(ProductEquivalenceEntity),
  );
  const recipeRepoPort = new ProductRecipeTypeormRepository(recipeRepo);
  const createRecipe = new CreateProductRecipe(recipeRepoPort);

  const uow = new TypeormUnitOfWork(dataSource);
  const clock = { now: () => new Date() };
  const createStockItemForProduct = new CreateStockItemForProduct(uow, stockItemRepo, clock);
  const createStockItemForVariant = new CreateStockItemForVariant(uow, stockItemRepo, clock);

  const createProductUsecase = new CreateProduct(
    uow,
    productRepo,
    skuCounterRepo,
    clock,
    equivalenceRepo,
    createStockItemForProduct,
  );

  const createVariantUsecase = new CreateProductVariant(
    uow,
    productRepo,
    variantRepo,
    skuCounterRepo,
    clock,
    createStockItemForVariant,
  );

  const units = await unitRepo.find();
  const unitByCode = new Map(units.map((u) => [u.code, u]));

  const resolveCatalogItemByCustomSku = async (customSku: string) => {
    let variant = await variantEntityRepo.findOne({ where: { customSku } });
    if (variant) return variant;

    const product = await productEntityRepo.findOne({ where: { customSku } });
    if (!product) {
      throw new Error(`No existe producto ni variante con customSku: ${customSku}`);
    }

    let item:any;
    return  item = product ?? variant;
  };

  for (const item of PRODUCTS_MANUAL) {
    const baseUnit = unitByCode.get(item.product.baseUnitCode);
    if (!baseUnit) {
      throw new Error(`Unidad no encontrada: ${item.product.baseUnitCode}`);
    }

    let product = await productEntityRepo.findOne({
      where: { customSku: item.product.customSku },
    });

    if (!product) {
      await createProductUsecase.execute({
        name: item.product.name,
        description: item.product.description,
        baseUnitId: baseUnit.id,
        customSku: item.product.customSku,
        barcode: item.product.barcode ?? null,
        price: item.product.price,
        cost: item.product.cost,
        attributes: item.product.attributes ?? {},
        type: item.product.type,
        isActive: item.product.isActive ?? true,
      });

      product = await productEntityRepo.findOne({
        where: { customSku: item.product.customSku },
      });
    }

    if (!product) {
      throw new Error(`No se pudo resolver producto ${item.product.customSku}`);
    }

    if (item.equivalences?.length) {
      for (const eq of item.equivalences) {
        const fromUnit = unitByCode.get(eq.fromUnitCode);
        const toUnit = unitByCode.get(eq.toUnitCode);
        if (!fromUnit || !toUnit) {
          throw new Error(`Unidad inválida: ${eq.fromUnitCode} -> ${eq.toUnitCode}`);
        }

        const exists = await equivalenceEntityRepo.findOne({
          where: {
            productId: product.id,
            fromUnitId: fromUnit.id,
            toUnitId: toUnit.id,
          },
        });

        if (!exists) {
          await equivalenceEntityRepo.save(
            equivalenceEntityRepo.create({
              productId: product.id,
              fromUnitId: fromUnit.id,
              toUnitId: toUnit.id,
              factor: eq.factor,
            }),
          );
        }
      }
    }

    for (const v of item.variants ?? []) {
      let variant = await variantEntityRepo.findOne({
        where: { customSku: v.customSku },
      });

      if (!variant) {
        await createVariantUsecase.execute({
          productId: product.id,
          customSku: v.customSku,
          barcode: v.barcode ?? null,
          price: v.price,
          cost: v.cost,
          attributes: v.attributes ?? {},
          isActive: v.isActive ?? true,
        });

        variant = await variantEntityRepo.findOne({
          where: { customSku: v.customSku },
        });
      }

      if (!variant) {
        throw new Error(`No se pudo resolver variante ${v.customSku}`);
      }
    }
  }

  for (const r of RECIPES_MANUAL) {
    const finishedItem = await resolveCatalogItemByCustomSku(r.finishedCustomSku);
    const primaItem = await resolveCatalogItemByCustomSku(r.primaCustomSku);

    const exists = await recipeRepo.findOne({
      where: {
        finishedType: r.finishedType,
        finishedItemId: finishedItem.id,
        primaVariantId: primaItem.id,
      },
    });

    if (!exists) {
      await createRecipe.execute({
        finishedType: r.finishedType,
        finishedItemId: finishedItem.id,
        primaVariantId: primaItem.id,
        quantity: r.quantity,
        waste: r.waste ?? null,
      });
    }
  }
};
