import { Repository } from "typeorm";
import { ProductCatalogAttributeEntity } from "../entities/attribute.entity";
import { ProductCatalogSkuAttributeValueEntity } from "../entities/sku-attribute-value.entity";
import { ProductCatalogSkuEntity } from "../entities/sku.entity";
import { ProductCatalogSkuTypeormRepository } from "./sku.typeorm.repo";

describe("ProductCatalogSkuTypeormRepository", () => {
  const createSkuQueryBuilder = (rows: ProductCatalogSkuEntity[] = [], total = rows.length) => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([rows, total]),
    };

    return qb;
  };

  const createAttributeQueryBuilder = () => {
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    return qb;
  };

  const makeRepository = (overrides?: {
    skuQueryBuilder?: ReturnType<typeof createSkuQueryBuilder>;
    attributeQueryBuilder?: ReturnType<typeof createAttributeQueryBuilder>;
  }) => {
    const skuQueryBuilder = overrides?.skuQueryBuilder ?? createSkuQueryBuilder();
    const attributeQueryBuilder = overrides?.attributeQueryBuilder ?? createAttributeQueryBuilder();

    const skuRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(skuQueryBuilder),
      manager: {},
    } as unknown as Repository<ProductCatalogSkuEntity>;

    const attributeRepo = {} as Repository<ProductCatalogAttributeEntity>;

    const attributeValueRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(attributeQueryBuilder),
    } as unknown as Repository<ProductCatalogSkuAttributeValueEntity>;

    return {
      repo: new ProductCatalogSkuTypeormRepository(skuRepo, attributeRepo, attributeValueRepo),
      skuRepo,
      skuQueryBuilder,
    };
  };

  const makeSkuRow = (overrides?: Partial<ProductCatalogSkuEntity>): ProductCatalogSkuEntity =>
    ({
      id: "sku-1",
      productId: "product-1",
      backendSku: "00001",
      customSku: null,
      name: "Azucar refinada",
      barcode: null,
      price: 100,
      cost: 80,
      isSellable: true,
      isPurchasable: true,
      isManufacturable: false,
      isStockTracked: true,
      isActive: true,
      createdAt: new Date("2026-01-10T00:00:00.000Z"),
      updatedAt: new Date("2026-01-10T00:00:00.000Z"),
      product: {
        id: "product-1",
        name: "Azucar",
        description: "Materia prima",
        brand: "Marca 1",
        type: "MATERIAL",
        baseUnitId: "unit-1",
        baseUnit: { id: "unit-1", code: "KG", name: "Kilogramo" },
        isActive: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      ...overrides,
    }) as unknown as ProductCatalogSkuEntity;

  it("lists recent skus when q is omitted", async () => {
    const skuQueryBuilder = createSkuQueryBuilder([makeSkuRow()], 1);
    const { repo } = makeRepository({ skuQueryBuilder });

    const result = await repo.list({
      page: 1,
      limit: 5,
      isActive: true,
    });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(skuQueryBuilder.orderBy).toHaveBeenCalledWith("s.createdAt", "DESC");
    expect(skuQueryBuilder.take).toHaveBeenCalledWith(5);
    expect(
      skuQueryBuilder.andWhere.mock.calls.some(
        ([sql]) => typeof sql === "string" && sql.includes("LOWER(p.name) LIKE :q"),
      ),
    ).toBe(false);
  });

  it("searches by product fields as well as sku fields", async () => {
    const skuQueryBuilder = createSkuQueryBuilder([makeSkuRow()], 1);
    const { repo } = makeRepository({ skuQueryBuilder });

    await repo.list({
      page: 1,
      limit: 10,
      q: "azucar",
      isActive: true,
    });

    expect(
      skuQueryBuilder.andWhere.mock.calls.some(
        ([sql, params]) =>
          typeof sql === "string" &&
          sql.includes("LOWER(p.name) LIKE :q") &&
          sql.includes("LOWER(COALESCE(p.description, '')) LIKE :q") &&
          sql.includes("LOWER(COALESCE(p.brand, '')) LIKE :q") &&
          params?.q === "%azucar%",
      ),
    ).toBe(true);
  });
});
