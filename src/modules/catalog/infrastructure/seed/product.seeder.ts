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
import { ProductOutput } from "../../application/dto/products/output/product-out";
import { ProductId } from "../../domain/value-object/product-id.vo";

type SeedProductsOptions = {
  finishedCount?: number;
  rawCount?: number;
  variantsPerProduct?: number;
};

const pad = (value: number, size: number) => String(value).padStart(size, "0");

const FINISHED_BASE_NAMES = [
  "Crema de manos",
  "Crema corporal",
  "Locion hidratante",
  "Jabon liquido",
  "Shampoo",
  "Acondicionador",
  "Gel de ducha",
  "Exfoliante corporal",
  "Tonico facial",
  "Serum facial",
  "Protector solar",
  "Desodorante",
  "Balsamo labial",
  "Crema antiarrugas",
  "Mascarilla facial",
  "Crema de noche",
  "Crema de dia",
  "Agua micelar",
  "Limpiador facial",
  "Crema para pies",
];

const RAW_BASE_NAMES = [
  "Glicerina vegetal",
  "Aceite de coco",
  "Aceite de almendras",
  "Aceite de jojoba",
  "Manteca de karite",
  "Manteca de cacao",
  "Alcohol cetilico",
  "Cera emulsionante",
  "Acido hialuronico",
  "Vitamina E",
  "Vitamina C",
  "Pantenol",
  "Niacinamida",
  "Aloe vera",
  "Extracto de manzanilla",
  "Extracto de calendula",
  "Fragancia floral",
  "Fragancia citrica",
  "Conservante cosmetico",
  "Colorante cosmetico",
  "Envase plastico 250ml",
  "Envase PET 500ml",
  "Envase vidrio 100ml",
  "Tapa rosca 28mm",
  "Tapa flip-top 24mm",
  "Etiqueta frontal",
  "Etiqueta trasera",
  "Caja carton individual",
  "Sachet muestra",
  "Bomba dosificadora",
];

export const seedProducts = async (
  dataSource: DataSource,
  options: SeedProductsOptions = {},
): Promise<void> => {
  const finishedCount = options.finishedCount ?? 90;
  const rawCount = options.rawCount ?? 110;
  const variantsPerProduct = options.variantsPerProduct ?? 2;

  const unitRepo = dataSource.getRepository(UnitEntity);
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
  const uow = new TypeormUnitOfWork(dataSource);
  const clock = { now: () => new Date() };
  const createStockItemForProduct = new CreateStockItemForProduct(
    uow,
    stockItemRepo,
    clock,
  );
  const createStockItemForVariant = new CreateStockItemForVariant(
    uow,
    stockItemRepo,
    clock,
  );
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
  if (units.length === 0) {
    throw new Error("No hay unidades base. Ejecuta seedUnits primero.");
  }

  const createProduct = async (type: ProductType, index: number, seq: number) => {
    const prefix = type === ProductType.FINISHED ? "FIN" : "PRI";
    const sku = `${prefix}-${pad(seq, 4)}`;
    const baseNames = type === ProductType.FINISHED ? FINISHED_BASE_NAMES : RAW_BASE_NAMES;
    const baseName = baseNames[(seq - 1) % baseNames.length];
    const name = `${baseName} ${pad(seq, 3)}`;
    const description =
      type === ProductType.FINISHED
        ? "Cosmetico terminado para venta"
        : "Ingrediente o material para produccion";

    const baseUnitId = units[index % units.length].id;
    const baseCost = type === ProductType.FINISHED ? 10 + seq : 5 + seq / 2;
    const price = type === ProductType.FINISHED ? baseCost * 1.4 : baseCost * 1.2;

    let product = await productRepo.findBySku(sku);
    if (!product) {
      try {
        const createdProduct: ProductOutput = await createProductUsecase.execute({
          name,
          description,
          baseUnitId,
          sku,
          barcode: `BC-${sku}`,
          price: Number(price.toFixed(2)),
          cost: Number(baseCost.toFixed(2)),
          attributes: { tipo: type },
          type,
          isActive: true,
        });
        product = await productRepo.findById(ProductId.create(createdProduct.id));
        console.log(`Producto creado: ${sku}`);
      } catch {
        console.log(`Producto ${sku} ya existe, omitiendo...`);
        product = await productRepo.findBySku(sku);
      }
    } else {
      console.log(`Producto ${sku} ya existe, omitiendo...`);
    }

    if (!product) {
      throw new Error(`No se pudo resolver el producto ${sku}`);
    }

    const productId = product.getId()?.value;
    if (!productId) {
      throw new Error(`Producto sin id: ${sku}`);
    }

    const existingProductLink = await stockItemRepo.findByProductId(productId);
    if (!existingProductLink) {
      await createStockItemForProduct.execute(
        { productId, isActive: product.getIsActive() },
      );
    }

    for (let v = 1; v <= variantsPerProduct; v++) {
      const variantSku = `${sku}-V${v}`;
      let variant = await variantRepo.findBySku(variantSku);
      if (!variant) {
        const variantPrice = type === ProductType.FINISHED ? price + v : price;
        try {
          const createdVariant = await createVariantUsecase.execute({
            productId,
            sku: variantSku,
            barcode: `VB-${variantSku}`,
            attributes: {
              variant: `V${v}`,
              color: v === 1 ? "Rojo" : "Azul",
            },
            price: Number(variantPrice.toFixed(2)),
            cost: Number(baseCost.toFixed(2)),
            isActive: true,
          });
          variant = await variantRepo.findById(createdVariant.variant.id);
          console.log(`Variante creada: ${variantSku}`);
        } catch {
          console.log(`Variante ${variantSku} ya existe, omitiendo...`);
          variant = await variantRepo.findBySku(variantSku);
        }
      } else {
        console.log(`Variante ${variantSku} ya existe, omitiendo...`);
      }

      if (!variant) {
        throw new Error(`No se pudo resolver la variante ${variantSku}`);
      }

      const existingVariantLink = await stockItemRepo.findByVariantId(variant.getId());
      if (!existingVariantLink) {
        await createStockItemForVariant.execute(
          { variantId: variant.getId(), isActive: variant.getIsActive() },
        );
      }
    }
  };

  for (let i = 1; i <= finishedCount; i++) {
    await createProduct(ProductType.FINISHED, i - 1, i);
  }
  for (let i = 1; i <= rawCount; i++) {
    await createProduct(ProductType.PRIMA, finishedCount + i - 1, i);
  }
};
