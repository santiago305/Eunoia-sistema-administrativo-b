import { DataSource } from "typeorm";
import { ProductEntity } from "../../adapters/out/persistence/typeorm/entities/product.entity";
import { ProductVariantEntity } from "../../adapters/out/persistence/typeorm/entities/product-variant.entity";
import { UnitEntity } from "../../adapters/out/persistence/typeorm/entities/unit.entity";
import { ProductType } from "../../domain/value-object/productType";

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

  const productRepo = dataSource.getRepository(ProductEntity);
  const variantRepo = dataSource.getRepository(ProductVariantEntity);
  const unitRepo = dataSource.getRepository(UnitEntity);

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

    for (let v = 1; v <= variantsPerProduct; v++) {
      const variantSku = `${sku}-V${v}`;
      const variantExists = await variantRepo.findOne({ where: { sku: variantSku } });
      if (variantExists) {
        console.log(`Variante ${variantSku} ya existe, omitiendo...`);
        continue;
      }

      const variantPrice =
        type === ProductType.FINISHED ? product.price + v : product.price;

      await variantRepo.save(
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
  };

  for (let i = 1; i <= finishedCount; i++) {
    await createProduct(ProductType.FINISHED, i - 1, i);
  }
  for (let i = 1; i <= rawCount; i++) {
    await createProduct(ProductType.PRIMA, finishedCount + i - 1, i);
  }
};
