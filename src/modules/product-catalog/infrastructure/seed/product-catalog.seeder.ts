import { DataSource } from "typeorm";
import { ProductCatalogAttributeEntity } from "../../adapters/out/persistence/typeorm/entities/attribute.entity";
import { ProductCatalogProductEntity } from "../../adapters/out/persistence/typeorm/entities/product.entity";
import { ProductCatalogSkuAttributeValueEntity } from "../../adapters/out/persistence/typeorm/entities/sku-attribute-value.entity";
import { ProductCatalogSkuEntity } from "../../adapters/out/persistence/typeorm/entities/sku.entity";
import { ProductCatalogStockItemEntity } from "../../adapters/out/persistence/typeorm/entities/stock-item.entity";
import { UnitEntity } from "src/shared/infrastructure/typeorm/entities/unit.entity";

type SeedSku = {
  backendSku: string;
  customSku: string;
  name: string;
  barcode?: string | null;
  price?: number;
  cost?: number;
  isSellable?: boolean;
  isPurchasable?: boolean;
  isManufacturable?: boolean;
  isStockTracked?: boolean;
  isActive?: boolean;
  attributes?: Record<string, string>;
};

type SeedFamily = {
  name: string;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  baseUnitCode: string;
  isActive?: boolean;
  skus: SeedSku[];
};

const PRODUCT_CATALOG_SEED: SeedFamily[] = [
  {
    name: "Jabon",
    category: "FINISHED",
    baseUnitCode: "NIU",
    skus: [
      {
        backendSku: "00001",
        customSku: "JABON-01",
        name: "Jabon de Azufre",
        isSellable: true,
        isManufacturable: true,
        attributes: { ingredient: "Azufre", presentation: "", color: "" },
      },
      {
        backendSku: "00002",
        customSku: "JABON-02",
        name: "Jabon de Curcuma",
        isSellable: true,
        isManufacturable: true,
        attributes: { ingredient: "Curcuma", presentation: "", color: "" },
      },
    ],
  },
  {
    name: "Arcilla para piel",
    category: "FINISHED",
    baseUnitCode: "NIU",
    skus: [
      {
        backendSku: "00003",
        customSku: "ARCILL-01",
        name: "Arcilla para piel Verde",
        isSellable: true,
        isManufacturable: true,
        attributes: { ingredient: "", presentation: "200gr", color: "Verde" },
      },
      {
        backendSku: "00004",
        customSku: "ARCILL-02",
        name: "Arcilla para piel Rosa",
        isSellable: true,
        isManufacturable: true,
        attributes: { ingredient: "", presentation: "200gr", color: "Rosa" },
      },
    ],
  },
  {
    name: "Ampolla antiacne",
    category: "FINISHED",
    baseUnitCode: "NIU",
    skus: [
      {
        backendSku: "00005",
        customSku: "AMPOLL-01",
        name: "Ampolla antiacne 35gr",
        isSellable: true,
        isManufacturable: true,
        attributes: { ingredient: "", presentation: "35gr", color: "" },
      },
    ],
  },
  {
    name: "Emboltorio",
    category: "PRIMA",
    baseUnitCode: "NIU",
    skus: [
      {
        backendSku: "10001",
        customSku: "EMBOL-01",
        name: "Emboltorio Curcuma",
        isSellable: false,
        isPurchasable: true,
        attributes: { ingredient: "Curcuma", presentation: "", color: "" },
      },
      {
        backendSku: "10002",
        customSku: "EMBOL-02",
        name: "Emboltorio Azufre",
        isSellable: false,
        isPurchasable: true,
        attributes: { ingredient: "Azufre", presentation: "", color: "" },
      },
    ],
  },
  {
    name: "Pegatina",
    category: "PRIMA",
    baseUnitCode: "NIU",
    skus: [
      {
        backendSku: "10003",
        customSku: "PEGAT-01",
        name: "Pegatina Curcuma",
        isSellable: false,
        isPurchasable: true,
        attributes: { ingredient: "Curcuma", presentation: "", color: "" },
      },
      {
        backendSku: "10004",
        customSku: "PEGAT-02",
        name: "Pegatina Azufre",
        isSellable: false,
        isPurchasable: true,
        attributes: { ingredient: "Azufre", presentation: "", color: "" },
      },
      {
        backendSku: "10005",
        customSku: "PEGAT-03",
        name: "Pegatina Ampolla",
        isSellable: false,
        isPurchasable: true,
        attributes: { ingredient: "Ampolla", presentation: "", color: "" },
      },
    ],
  },
  {
    name: "Arcilla preparada",
    category: "PRIMA",
    baseUnitCode: "GRM",
    skus: [
      {
        backendSku: "10006",
        customSku: "ARCILL-PRE-01",
        name: "Arcilla preparada Verde",
        isSellable: false,
        isPurchasable: true,
        attributes: { ingredient: "Verde", presentation: "", color: "" },
      },
      {
        backendSku: "10007",
        customSku: "ARCILL-PRE-02",
        name: "Arcilla preparada Rosa",
        isSellable: false,
        isPurchasable: true,
        attributes: { ingredient: "Rosa", presentation: "", color: "" },
      },
    ],
  },
  {
    name: "Bolsa",
    category: "PRIMA",
    baseUnitCode: "NIU",
    skus: [
      {
        backendSku: "10008",
        customSku: "BOLSA-01",
        name: "Bolsa Verde",
        isSellable: false,
        isPurchasable: true,
        attributes: { ingredient: "", presentation: "", color: "Verde" },
      },
      {
        backendSku: "10009",
        customSku: "BOLSA-02",
        name: "Bolsa Rosa",
        isSellable: false,
        isPurchasable: true,
        attributes: { ingredient: "", presentation: "", color: "Rosa" },
      },
    ],
  },
  {
    name: "Sticker",
    category: "PRIMA",
    baseUnitCode: "NIU",
    skus: [
      {
        backendSku: "10010",
        customSku: "STICKER-01",
        name: "Sticker Verde",
        isSellable: false,
        isPurchasable: true,
        attributes: { ingredient: "", presentation: "", color: "Verde" },
      },
      {
        backendSku: "10011",
        customSku: "STICKER-02",
        name: "Sticker Rosa",
        isSellable: false,
        isPurchasable: true,
        attributes: { ingredient: "", presentation: "", color: "Rosa" },
      },
    ],
  },
  {
    name: "Liquido",
    category: "PRIMA",
    baseUnitCode: "GRM",
    skus: [
      {
        backendSku: "10012",
        customSku: "LIQUIDO-01",
        name: "Liquido Ampolla",
        isSellable: false,
        isPurchasable: true,
        attributes: { ingredient: "Ampolla", presentation: "", color: "" },
      },
    ],
  },
  {
    name: "Envase",
    category: "PRIMA",
    baseUnitCode: "NIU",
    skus: [
      {
        backendSku: "10013",
        customSku: "ENVASE-01",
        name: "Envase Ampolla",
        isSellable: false,
        isPurchasable: true,
        attributes: { ingredient: "Ampolla", presentation: "", color: "" },
      },
    ],
  },
];

export const seedProductCatalog = async (dataSource: DataSource): Promise<void> => {
  const unitRepo = dataSource.getRepository(UnitEntity);
  const productRepo = dataSource.getRepository(ProductCatalogProductEntity);
  const skuRepo = dataSource.getRepository(ProductCatalogSkuEntity);
  const attributeRepo = dataSource.getRepository(ProductCatalogAttributeEntity);
  const attributeValueRepo = dataSource.getRepository(ProductCatalogSkuAttributeValueEntity);
  const stockItemRepo = dataSource.getRepository(ProductCatalogStockItemEntity);

  for (const family of PRODUCT_CATALOG_SEED) {
    const unit = await unitRepo.findOne({ where: { code: family.baseUnitCode } });
    if (!unit) {
      throw new Error(`Unidad ${family.baseUnitCode} no encontrada. Ejecuta seedUnits primero.`);
    }

    let product = await productRepo.findOne({ where: { name: family.name } });
    if (!product) {
      product = await productRepo.save({
        name: family.name,
        description: family.description ?? null,
        category: family.category ?? null,
        brand: family.brand ?? null,
        baseUnitId: unit.id,
        isActive: family.isActive ?? true,
      });
    }

    for (const skuSeed of family.skus) {
      let sku = await skuRepo.findOne({ where: { customSku: skuSeed.customSku } });
      if (!sku) {
        sku = await skuRepo.save({
          productId: product.id,
          backendSku: skuSeed.backendSku,
          customSku: skuSeed.customSku,
          name: skuSeed.name,
          barcode: skuSeed.barcode ?? null,
          price: skuSeed.price ?? 0,
          cost: skuSeed.cost ?? 0,
          isSellable: skuSeed.isSellable ?? true,
          isPurchasable: skuSeed.isPurchasable ?? false,
          isManufacturable: skuSeed.isManufacturable ?? false,
          isStockTracked: skuSeed.isStockTracked ?? true,
          isActive: skuSeed.isActive ?? true,
        });
      }

      const attributes = skuSeed.attributes ?? {};
      for (const [code, value] of Object.entries(attributes)) {
        let attribute = await attributeRepo.findOne({ where: { code } });
        if (!attribute) {
          attribute = await attributeRepo.save({
            code,
            name: code,
          });
        }

        const existingValue = await attributeValueRepo.findOne({
          where: {
            skuId: sku.id,
            attributeId: attribute.id,
          },
        });

        if (!existingValue) {
          await attributeValueRepo.save({
            skuId: sku.id,
            attributeId: attribute.id,
            value,
          });
        }
      }

      const stockItem = await stockItemRepo.findOne({ where: { skuId: sku.id } });
      if (!stockItem) {
        await stockItemRepo.save({
          skuId: sku.id,
          isActive: true,
        });
      }
    }
  }
};
