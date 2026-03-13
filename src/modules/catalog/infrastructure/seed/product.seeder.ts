import { DataSource } from "typeorm";
import { ProductEntity } from "../../adapters/out/persistence/typeorm/entities/product.entity";
import { ProductVariantEntity } from "../../adapters/out/persistence/typeorm/entities/product-variant.entity";
import { UnitEntity } from "../../adapters/out/persistence/typeorm/entities/unit.entity";
import { ProductType } from "../../domain/value-object/productType";
import { StockItemEntity } from "src/modules/inventory/adapters/out/typeorm/entities/stock-item/stock-item.entity";
import { StockItemTypeormRepository } from "src/modules/inventory/adapters/out/typeorm/repositories/stock-item/stock-item.typeorm.repo";
import { CreateStockItemForProduct } from "src/modules/inventory/application/use-cases/stock-item/create-for-product.usecase";
import { CreateStockItemForVariant } from "src/modules/inventory/application/use-cases/stock-item/create-for-variant.usecase";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";

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

    await uow.runInTransaction(async (tx) => {
      const manager = (tx as TypeormTransactionContext).manager;
      const productRepo = manager.getRepository(ProductEntity);
      const variantRepo = manager.getRepository(ProductVariantEntity);

      let product = await productRepo.findOne({ where: { sku } });
      if (!product) {
        const baseUnitId = units[index % units.length].id;
        const baseCost = type === ProductType.FINISHED ? 10 + seq : 5 + seq / 2;
        const price = type === ProductType.FINISHED ? baseCost * 1.4 : baseCost * 1.2;

        product = await productRepo.save(
          productRepo.create({
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
          }),
        );
        console.log(`Producto creado: ${sku}`);
      } else {
        console.log(`Producto ${sku} ya existe, omitiendo...`);
      }

      const existingProductLink = await stockItemRepo.findByProductId(product.id, tx);
      if (!existingProductLink) {
        await createStockItemForProduct.execute(
          { productId: product.id, isActive: true },
          tx,
        );
      }

      for (let v = 1; v <= variantsPerProduct; v++) {
        const variantSku = `${sku}-V${v}`;
        let variant = await variantRepo.findOne({ where: { sku: variantSku } });
        if (variant) {
          console.log(`Variante ${variantSku} ya existe, omitiendo...`);
        } else {
          const variantPrice =
            type === ProductType.FINISHED ? product.price + v : product.price;

          variant = await variantRepo.save(
            variantRepo.create({
              productId: product.id,
              sku: variantSku,
              barcode: `VB-${variantSku}`,
              attributes: {
                variant: `V${v}`,
                color: v === 1 ? "Rojo" : "Azul",
              },
              price: Number(variantPrice.toFixed(2)),
              cost: product.cost,
              isActive: true,
            }),
          );
          console.log(`Variante creada: ${variantSku}`);
        }

        const existingVariantLink = await stockItemRepo.findByVariantId(variant.id, tx);
        if (!existingVariantLink) {
          await createStockItemForVariant.execute(
            { variantId: variant.id, isActive: true },
            tx,
          );
        }
      }
    });
  };

  for (let i = 1; i <= finishedCount; i++) {
    await createProduct(ProductType.FINISHED, i - 1, i);
  }
  for (let i = 1; i <= rawCount; i++) {
    await createProduct(ProductType.PRIMA, finishedCount + i - 1, i);
  }
};
