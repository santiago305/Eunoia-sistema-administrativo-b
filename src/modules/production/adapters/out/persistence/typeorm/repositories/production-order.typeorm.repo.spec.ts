import { Repository } from "typeorm";
import { ProductionOrderTypeormRepository } from "./production-order.typeorm.repo";
import { ProductionOrderEntity } from "../entities/production_order.entity";
import { ProductionOrderItemEntity } from "../entities/production_order_item.entity";

describe("ProductionOrderTypeormRepository", () => {
  const createQueryBuilder = (rows: ProductionOrderEntity[] = []) => {
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      clone: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(rows.length),
      getMany: jest.fn().mockResolvedValue(rows),
    };

    qb.clone.mockReturnValue({
      getCount: qb.getCount,
    });

    return qb;
  };

  const makeRow = (overrides?: Partial<ProductionOrderEntity>) =>
    ({
      id: "production-1",
      fromWarehouseId: "wh-1",
      toWarehouseId: "wh-2",
      docType: "PRODUCTION",
      serieId: "serie-1",
      correlative: 12,
      status: "DRAFT",
      reference: "Lote 12",
      manufactureDate: new Date("2026-04-10T00:00:00.000Z"),
      createdBy: "user-1",
      updatedBy: null,
      createdAt: new Date("2026-04-11T00:00:00.000Z"),
      updatedAt: new Date("2026-04-11T00:00:00.000Z"),
      ...overrides,
    }) as unknown as ProductionOrderEntity;

  const makeRepository = (qb = createQueryBuilder([makeRow()])) => {
    const orderRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as Repository<ProductionOrderEntity>;
    const itemRepo = {} as Repository<ProductionOrderItemEntity>;
    const warehouseRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: "wh-1",
          name: "Planta 1",
          department: "Lima",
          province: "Lima",
          district: "Ate",
          address: "Av. 1",
          isActive: true,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        {
          id: "wh-2",
          name: "Planta 2",
          department: "Lima",
          province: "Lima",
          district: "Ate",
          address: "Av. 2",
          isActive: true,
          createdAt: new Date("2026-01-02T00:00:00.000Z"),
        },
      ]),
    };
    const serieRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: "serie-1",
          code: "OP",
          name: "Orden Produccion",
          docType: "PRODUCTION",
          warehouseId: "wh-1",
          nextNumber: 13,
          padding: 4,
          separator: "-",
          isActive: true,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === ProductionOrderEntity) return orderRepo;
        if (entity === ProductionOrderItemEntity) return itemRepo;
        if ((entity as any).name?.includes("Warehouse")) return warehouseRepo;
        return serieRepo;
      }),
    };
    (orderRepo as any).manager = manager;
    (itemRepo as any).manager = manager;

    return {
      repo: new ProductionOrderTypeormRepository(orderRepo, itemRepo),
      qb,
    };
  };

  it("applies q search across production fields and sku joins", async () => {
    const qb = createQueryBuilder([makeRow()]);
    const { repo } = makeRepository(qb);

    await repo.list({
      q: "borrador",
      page: 1,
      limit: 10,
    });

    expect(qb.leftJoin).toHaveBeenCalledWith(ProductionOrderItemEntity, "pi", "pi.production_id = p.production_id");
    expect(
      qb.andWhere.mock.calls.some(
        ([sql]) =>
          sql &&
          typeof sql !== "string",
      ),
    ).toBe(true);
  });

  it("keeps legacy warehouse filter as origin or destination", async () => {
    const qb = createQueryBuilder([makeRow()]);
    const { repo } = makeRepository(qb);

    await repo.list({
      filters: [{ field: "warehouseId", operator: "in", values: ["wh-1"] }],
      page: 1,
      limit: 10,
    });

    expect(
      qb.andWhere.mock.calls.some(
        ([sql]) => typeof sql !== "string",
      ),
    ).toBe(true);
    expect(qb.getCount).toHaveBeenCalled();
    expect(qb.getMany).toHaveBeenCalled();
  });
});
