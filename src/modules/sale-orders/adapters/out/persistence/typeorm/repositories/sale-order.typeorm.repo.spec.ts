import { SaleOrderTypeormRepository } from "./sale-order.typeorm.repo";
import { ClientEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/client.entity";
import { TelephoneEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/telephone.entity";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { SourceEntity } from "src/modules/sources/adapters/out/persistence/typeorm/entities/source.entity";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import { WorkflowEntity } from "src/modules/workflow/adapters/out/persistence/typeorm/entities/workflow.entity";
import { WorkflowStateEntity } from "src/modules/workflow/adapters/out/persistence/typeorm/entities/workflow-state.entity";
import { SaleOrderEntity } from "../entities/sale-order.entity";
import { SalePaymentEntity } from "../entities/sale-payment.entity";
import { SaleOrderItemComponentEntity } from "../entities/sale-order-item-component.entity";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";

const createStatsQueryBuilder = (rawMany: unknown[] = [], rawOne: unknown = {}) => ({
  leftJoin: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  addGroupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  clone: jest.fn(),
  getRawMany: jest.fn().mockResolvedValue(rawMany),
  getRawOne: jest.fn().mockResolvedValue(rawOne),
});

describe("SaleOrderTypeormRepository", () => {
  it("builds SKUS and detail from item components in list items", async () => {
    const orderRow = {
      id: "order-1",
      serie: "P001",
      correlative: 12,
      clientId: "client-1",
      warehouseId: null,
      sourceId: null,
      agencySubsidiaryId: null,
      agencyDetail: null,
      assignedBy: null,
      createdBy: "user-1",
      workflowId: null,
      currentStateId: null,
      scheduleDate: null,
      deliveryDate: null,
      subTotal: 100,
      deliveryCost: 0,
      total: 100,
      note: null,
      advertisingCode: null,
      observation: null,
      invoiceSend: false,
      reserveBool: false,
      isActive: true,
      createdAt: new Date("2026-07-24T10:00:00.000Z"),
      updatedAt: null,
      items: [
        {
          id: "item-1",
          referencePackId: "pack-1",
          description: "Pack prueba",
          quantity: 1,
          unitPrice: 100,
          total: 100,
          createdAt: new Date("2026-07-24T10:01:00.000Z"),
        },
      ],
    };

    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[orderRow], 1]),
    };

    const componentRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: "component-1",
          saleOrderItemId: "item-1",
          skuId: "sku-1",
          quantity: 1,
          createdAt: new Date("2026-07-24T10:02:00.000Z"),
        },
        {
          id: "component-2",
          saleOrderItemId: "item-1",
          skuId: "sku-2",
          quantity: 1,
          createdAt: new Date("2026-07-24T10:03:00.000Z"),
        },
      ]),
    };

    const skuRepo = {
      find: jest.fn().mockResolvedValue([
        { id: "sku-1", customSku: "EVA01863", name: "AMPOLLA" },
        { id: "sku-2", customSku: "EVA01893", name: "AZUFRE" },
      ]),
    };

    const repositories = new Map<any, any>([
      [SaleOrderEntity, { createQueryBuilder: jest.fn().mockReturnValue(qb) }],
      [SalePaymentEntity, { find: jest.fn().mockResolvedValue([]) }],
      [ClientEntity, { find: jest.fn().mockResolvedValue([]) }],
      [TelephoneEntity, { find: jest.fn().mockResolvedValue([]) }],
      [WarehouseEntity, { find: jest.fn().mockResolvedValue([]) }],
      [SourceEntity, { find: jest.fn().mockResolvedValue([]) }],
      [User, { find: jest.fn().mockResolvedValue([{ id: "user-1", name: "User", email: "user@test.com" }]) }],
      [CompanyPaymentAccountEntity, { find: jest.fn().mockResolvedValue([]) }],
      [WorkflowEntity, { find: jest.fn().mockResolvedValue([]) }],
      [WorkflowStateEntity, { find: jest.fn().mockResolvedValue([]) }],
      [SaleOrderItemComponentEntity, componentRepo],
      [ProductCatalogSkuEntity, skuRepo],
    ]);

    const manager = {
      getRepository: jest.fn((entity) => repositories.get(entity) ?? { find: jest.fn().mockResolvedValue([]) }),
    };
    const repository = new SaleOrderTypeormRepository({ manager } as any);

    const result = await repository.list({ page: 1, limit: 10 });

    expect(componentRepo.find).toHaveBeenCalled();
    expect(skuRepo.find).toHaveBeenCalled();
    expect(result.items[0].SKUS).toBe("EVA01863(1);EVA01893(1)");
    expect(result.items[0].detail).toBe("AMPOLLA1AZUFRE1");
  });

  it("returns assignedBy and agencyDetail in list items", async () => {
    const orderRow = {
      id: "order-1",
      serie: "P001",
      correlative: 12,
      clientId: "client-1",
      warehouseId: null,
      sourceId: null,
      agencySubsidiaryId: "subsidiary-1",
      agencyDetail: "Agencia Norte - Av. Lima 123",
      assignedBy: "assigned-user-1",
      createdBy: "user-1",
      workflowId: null,
      currentStateId: null,
      scheduleDate: null,
      deliveryDate: null,
      subTotal: 100,
      deliveryCost: 10,
      total: 110,
      note: null,
      advertisingCode: null,
      observation: null,
      invoiceSend: false,
      isActive: true,
      createdAt: new Date("2026-07-07T00:00:00.000Z"),
      updatedAt: null,
      items: [],
    };

    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[orderRow], 1]),
    };

    const repositories = new Map<any, any>([
      [SaleOrderEntity, { createQueryBuilder: jest.fn().mockReturnValue(qb) }],
      [SalePaymentEntity, { find: jest.fn().mockResolvedValue([]) }],
      [ClientEntity, { find: jest.fn().mockResolvedValue([]) }],
      [TelephoneEntity, { find: jest.fn().mockResolvedValue([]) }],
      [WarehouseEntity, { find: jest.fn().mockResolvedValue([]) }],
      [SourceEntity, { find: jest.fn().mockResolvedValue([]) }],
      [
        User,
        {
          find: jest.fn().mockResolvedValue([
            { id: "user-1", name: "Santiago", email: "minecratf633@gmail.com" },
            { id: "assigned-user-1", name: "Asesor", email: "asesor@example.test" },
          ]),
        },
      ],
      [CompanyPaymentAccountEntity, { find: jest.fn().mockResolvedValue([]) }],
      [WorkflowEntity, { find: jest.fn().mockResolvedValue([]) }],
      [WorkflowStateEntity, { find: jest.fn().mockResolvedValue([]) }],
    ]);

    const manager = {
      getRepository: jest.fn((entity) => repositories.get(entity) ?? { find: jest.fn().mockResolvedValue([]) }),
    };
    const repository = new SaleOrderTypeormRepository({ manager } as any);

    const result = await repository.list({ page: 1, limit: 10 });

    expect(result.items[0].assignedBy).toEqual({
      id: "assigned-user-1",
      name: "Asesor",
      email: "asesor@example.test",
    });
    expect(result.items[0].agencyDetail).toBe("Agencia Norte - Av. Lima 123");
    expect(result.items[0]).not.toHaveProperty("agencySubsidiary");
  });
  it("maps and persists the sale order discount", async () => {
    const savedRow = {
      id: "order-1",
      clientId: "client-1",
      createdBy: "user-1",
      subTotal: 100,
      deliveryCost: 10,
      discount: 15,
      total: 95,
      invoiceSend: false,
      isActive: true,
      createdAt: new Date("2026-07-03T00:00:00.000Z"),
    };
    const entityRepo = {
      save: jest.fn().mockResolvedValue(savedRow),
    };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    const result = await repository.create({
      serie: "P001",
      correlative: 1,
      warehouseId: null,
      clientId: "client-1",
      subTotal: 100,
      deliveryCost: 10,
      discount: 15,
      total: 95,
      createdBy: "user-1",
    });

    expect(entityRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ discount: 15 }),
    );
    expect(result.discount).toBe(15);
  });

  it("forces imported creation date after creating the sale order", async () => {
    const importedCreatedAt = new Date("2026-07-04T00:00:00.000Z");
    const savedRow = {
      id: "order-1",
      clientId: "client-1",
      createdBy: "user-1",
      subTotal: 100,
      deliveryCost: 10,
      discount: 0,
      total: 110,
      invoiceSend: false,
      isActive: true,
      createdAt: new Date("2026-07-09T00:00:00.000Z"),
    };
    const entityRepo = {
      save: jest.fn().mockResolvedValue(savedRow),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    const result = await repository.create({
      serie: "P001",
      correlative: 1,
      warehouseId: null,
      clientId: "client-1",
      subTotal: 100,
      deliveryCost: 10,
      total: 110,
      createdBy: "user-1",
      createdAt: importedCreatedAt,
    });

    expect(entityRepo.update).toHaveBeenCalledWith(
      { id: "order-1" },
      { createdAt: importedCreatedAt },
    );
    expect(result.createdAt).toEqual(importedCreatedAt);
  });

  it("assigns a warehouse only while the current value is null", async () => {
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const entityRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn().mockResolvedValue({
        id: "order-1",
        clientId: "client-1",
        warehouseId: "warehouse-1",
        createdBy: "user-1",
        total: 0,
        subTotal: 0,
        deliveryCost: 0,
        invoiceSend: false,
        isActive: true,
        createdAt: new Date(),
      }),
    };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    const result = await repository.assignWarehouseIfEmpty({
      saleOrderId: "order-1",
      warehouseId: "warehouse-1",
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith("warehouse_id IS NULL");
    expect(result?.warehouseId).toBe("warehouse-1");
  });

  it("marks invoiceSend true idempotently", async () => {
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const entityRepo = { update };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    await repository.markInvoiceSent("order-1");

    expect(update).toHaveBeenCalledWith(
      { id: "order-1" },
      { invoiceSend: true },
    );
  });

  it("marks preguide true idempotently", async () => {
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const entityRepo = { update };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    await repository.markPreguide("order-1");

    expect(update).toHaveBeenCalledWith(
      { id: "order-1" },
      { preguide: true },
    );
  });

  it("marks prepared true idempotently", async () => {
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const entityRepo = { update };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    await repository.markPrepared("order-1");

    expect(update).toHaveBeenCalledWith(
      { id: "order-1" },
      { prepared: true },
    );
  });

  it("unmarks preguide false idempotently", async () => {
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const entityRepo = { update };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    await repository.unmarkPreguide("order-1");

    expect(update).toHaveBeenCalledWith(
      { id: "order-1" },
      { preguide: false },
    );
  });

  it("unmarks prepared false idempotently", async () => {
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const entityRepo = { update };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    await repository.unmarkPrepared("order-1");

    expect(update).toHaveBeenCalledWith(
      { id: "order-1" },
      { prepared: false },
    );
  });

  it("updates reserveBool explicitly", async () => {
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const entityRepo = { update };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    await repository.setReserveBool({ saleOrderId: "order-1", reserveBool: true });

    expect(update).toHaveBeenCalledWith(
      { id: "order-1" },
      { reserveBool: true },
    );
  });

  it("counts only active orders whose current state is final", async () => {
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(2),
    };
    const entityRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    await expect(repository.countSaleOrdersByClientId("client-1")).resolves.toBe(2);

    expect(qb.innerJoin).toHaveBeenCalledWith(
      expect.anything(),
      "state",
      "state.id = saleOrder.currentStateId",
    );
    expect(qb.andWhere).toHaveBeenCalledWith("state.isFinal = true");
  });

  it("excludes final and cancelled states from automatic workflow candidates", async () => {
    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ id: "order-1" }]),
    };
    const entityRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    await expect(repository.listIdsForAutomaticWorkflow()).resolves.toEqual(["order-1"]);

    expect(qb.innerJoin).toHaveBeenCalledWith(
      expect.anything(),
      "currentState",
      "currentState.id = so.currentStateId",
    );
    expect(qb.innerJoin).toHaveBeenCalledWith(
      expect.anything(),
      "globalState",
      "globalState.id = currentState.saleOrderStateId",
    );
    expect(qb.andWhere).toHaveBeenCalledWith("currentState.isFinal = false");
    expect(qb.andWhere).toHaveBeenCalledWith("upper(globalState.code) <> :cancelledCode", {
      cancelledCode: "CANCELLED",
    });
  });

  it("filters automatic workflow candidates by client id", async () => {
    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ id: "order-1" }]),
    };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue({ createQueryBuilder: jest.fn().mockReturnValue(qb) }) },
    } as any);

    await expect(repository.listIdsForAutomaticWorkflowByClientId("client-1")).resolves.toEqual(["order-1"]);

    expect(qb.andWhere).toHaveBeenCalledWith("so.client_id = :clientId", { clientId: "client-1" });
    expect(qb.andWhere).toHaveBeenCalledWith("currentState.isFinal = false");
    expect(qb.andWhere).toHaveBeenCalledWith("upper(globalState.code) <> :cancelledCode", { cancelledCode: "CANCELLED" });
    expect(qb.andWhere).toHaveBeenCalledWith("wt.auto_trigger = true");
    expect(qb.limit).toHaveBeenCalledWith(100);
  });

  it("filters automatic workflow candidates by inventory stock event", async () => {
    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ id: "order-1" }]),
    };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue({ createQueryBuilder: jest.fn().mockReturnValue(qb) }) },
    } as any);

    await expect(
      repository.listIdsForAutomaticWorkflowByInventoryStockEvent({
        warehouseId: "warehouse-1",
        stockItemId: "stock-1",
      }),
    ).resolves.toEqual(["order-1"]);

    expect(qb.andWhere).toHaveBeenCalledWith("so.warehouse_id = :warehouseId", { warehouseId: "warehouse-1" });
    expect(qb.andWhere).toHaveBeenCalledWith("inventoryStockItem.stock_item_id = :stockItemId", { stockItemId: "stock-1" });
    expect(qb.limit).toHaveBeenCalledWith(100);
  });

  it("loads the active main telephone when getting a sale order", async () => {
    const telephoneRepo = {
      findOne: jest.fn().mockResolvedValue({ number: "999999999" }),
      find: jest.fn().mockResolvedValue([
        {
          id: "telephone-1",
          number: "999999999",
          isMain: true,
          isActive: true,
        },
      ]),
    };
    const repositories = new Map<any, any>();
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === TelephoneEntity) return telephoneRepo;
        if (!repositories.has(entity)) {
          repositories.set(entity, {
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([]),
          });
        }
        return repositories.get(entity);
      }),
    };
    const repository = new SaleOrderTypeormRepository({ manager } as any);
    const saleOrderRepo = manager.getRepository(require("../entities/sale-order.entity").SaleOrderEntity);
    saleOrderRepo.findOne.mockResolvedValue({
      id: "order-1",
      clientId: "client-1",
      warehouseId: null,
      sourceId: null,
      createdBy: "user-1",
      workflowId: null,
      currentStateId: null,
      total: 0,
      subTotal: 0,
      deliveryCost: 0,
      invoiceSend: false,
      isActive: true,
      createdAt: new Date("2026-06-08T00:00:00.000Z"),
    });
    const clientRepo = manager.getRepository(
      require("src/modules/clients/adapters/out/persistence/typeorm/entities/client.entity").ClientEntity,
    );
    clientRepo.findOne.mockResolvedValue({
      id: "client-1",
      fullName: "Cliente",
      type: "NEW",
      docNumber: null,
      reference: null,
    });
    const userRepo = manager.getRepository(
      require("src/modules/users/adapters/out/persistence/typeorm/entities/user.entity").User,
    );
    userRepo.findOne.mockResolvedValue({ id: "user-1", name: "User", email: "user@test.com" });

    const result = await repository.findById("order-1");

    expect(telephoneRepo.findOne).toHaveBeenCalledWith({
      where: { clientId: "client-1", isMain: true, isActive: true },
    });
    expect(result?.client?.mainPhone).toBe("999999999");
    expect(result?.client?.telephones).toEqual([
      expect.objectContaining({ number: "999999999", isMain: true }),
    ]);
  });

  it("returns enriched item components when getting a sale order", async () => {
    const {
      SaleOrderEntity,
    } = require("../entities/sale-order.entity");
    const {
      SaleOrderItemEntity,
    } = require("../entities/sale-order-item.entity");
    const {
      SaleOrderItemComponentEntity,
    } = require("../entities/sale-order-item-component.entity");
    const {
      ProductCatalogSkuEntity,
    } = require("src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity");
    const {
      ProductCatalogStockItemEntity,
    } = require("src/modules/product-catalog/adapters/out/persistence/typeorm/entities/stock-item.entity");
    const {
      ProductCatalogSkuAttributeValueEntity,
    } = require("src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku-attribute-value.entity");

    const attributeQb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          sku_id: "sku-1",
          code: "variant",
          name: "Variante",
          value: "Azufre",
        },
      ]),
    };

    const repositories = new Map<any, any>();
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === SaleOrderEntity) {
          return {
            findOne: jest.fn().mockResolvedValue({
              id: "order-1",
              clientId: "client-1",
              warehouseId: null,
              sourceId: null,
              createdBy: "user-1",
              workflowId: null,
              currentStateId: null,
              total: 22,
              subTotal: 22,
              deliveryCost: 0,
              invoiceSend: false,
              isActive: true,
              createdAt: new Date("2026-07-06T20:00:00.000Z"),
            }),
          };
        }
        if (entity === SaleOrderItemEntity) {
          return {
            find: jest.fn().mockResolvedValue([
              {
                id: "item-1",
                referencePackId: null,
                description: "JABON AZUFRE",
                quantity: 1,
                unitPrice: 22,
                total: 22,
                createdAt: new Date("2026-07-06T20:00:00.000Z"),
              },
            ]),
          };
        }
        if (entity === SaleOrderItemComponentEntity) {
          return {
            find: jest.fn().mockResolvedValue([
              {
                id: "component-1",
                saleOrderItemId: "item-1",
                skuId: "sku-1",
                referencePackItemId: null,
                quantity: 1,
                unitPrice: 22,
                total: 22,
                createdAt: new Date("2026-07-06T20:00:00.000Z"),
              },
            ]),
          };
        }
        if (entity === ProductCatalogSkuEntity) {
          return {
            find: jest.fn().mockResolvedValue([
              {
                id: "sku-1",
                productId: "product-1",
                backendSku: "10017",
                customSku: "EVA01893",
                name: "JABON AZUFRE",
                barcode: null,
                image: "https://example.test/jabon.png",
                price: 22,
                cost: 10,
                isSellable: true,
                isPurchasable: false,
                isManufacturable: false,
                isStockTracked: true,
                isActive: true,
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                updatedAt: new Date("2026-01-02T00:00:00.000Z"),
                product: {
                  baseUnit: {
                    id: "unit-1",
                    name: "UNIDADES",
                    code: "NIU",
                  },
                },
              },
            ]),
          };
        }
        if (entity === ProductCatalogStockItemEntity) {
          return {
            find: jest.fn().mockResolvedValue([
              { id: "stock-1", skuId: "sku-1" },
            ]),
          };
        }
        if (entity === ProductCatalogSkuAttributeValueEntity) {
          return {
            createQueryBuilder: jest.fn().mockReturnValue(attributeQb),
          };
        }
        if (!repositories.has(entity)) {
          repositories.set(entity, {
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([]),
          });
        }
        return repositories.get(entity);
      }),
    };
    const repository = new SaleOrderTypeormRepository({ manager } as any);

    const result = await repository.findById("order-1");
    const component = result?.items[0]?.components[0];

    expect(result?.SKUS).toBe("EVA01893(1)");
    expect(result?.detail).toBe("JABONAZUFRE1");
    expect(component).toEqual(
      expect.objectContaining({
        stockItemId: "stock-1",
        unit: { id: "unit-1", name: "UNIDADES", code: "NIU" },
        attributes: [{ code: "variant", name: "Variante", value: "Azufre" }],
      }),
    );
    expect(component?.sku).toEqual(
      expect.objectContaining({
        id: "sku-1",
        productId: "product-1",
        image: "https://example.test/jabon.png",
        price: 22,
        cost: 10,
        isStockTracked: true,
      }),
    );
  });

  it("returns statistics grouped by payment description and bank account", async () => {
    const baseQb = createStatsQueryBuilder();
    const workflowQb = createStatsQueryBuilder([]);
    const stateQb = createStatsQueryBuilder([]);
    const clientTypeQb = createStatsQueryBuilder([]);
    const totalsQb = createStatsQueryBuilder([], {
      orders: "1",
      total: "180",
      collected: "180",
      pending: "0",
      deliveryCostSum: "10",
    });
    const bankAccountQb = createStatsQueryBuilder([
      {
        id: "bank-1",
        label: "BCP Soles",
        number: "001",
        description: "Anticipo",
        payments: "2",
        collected: "80",
      },
      {
        id: "bank-1",
        label: "BCP Soles",
        number: "001",
        description: "Saldo",
        payments: "1",
        collected: "40",
      },
      {
        id: null,
        label: "Sin cuenta",
        number: null,
        description: "Sin descripcion",
        payments: "3",
        collected: "60",
      },
    ]);

    baseQb.clone
      .mockReturnValueOnce(workflowQb)
      .mockReturnValueOnce(stateQb)
      .mockReturnValueOnce(clientTypeQb)
      .mockReturnValueOnce(totalsQb)
      .mockReturnValueOnce(bankAccountQb);

    const entityRepo = { createQueryBuilder: jest.fn().mockReturnValue(baseQb) };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    const result = await repository.statistics({});

    expect(result.byPaymentDescription).toEqual([
      {
        description: "Anticipo",
        label: "Anticipo",
        payments: 2,
        collected: 80,
        byBankAccount: [
          {
            id: "bank-1",
            label: "BCP Soles",
            number: "001",
            payments: 2,
            collected: 80,
          },
        ],
      },
      {
        description: "Sin descripcion",
        label: "Sin descripcion",
        payments: 3,
        collected: 60,
        byBankAccount: [
          {
            id: null,
            label: "Sin cuenta",
            number: null,
            payments: 3,
            collected: 60,
          },
        ],
      },
      {
        description: "Saldo",
        label: "Saldo",
        payments: 1,
        collected: 40,
        byBankAccount: [
          {
            id: "bank-1",
            label: "BCP Soles",
            number: "001",
            payments: 1,
            collected: 40,
          },
        ],
      },
    ]);
    expect(bankAccountQb.innerJoin).toHaveBeenCalledWith(
      expect.anything(),
      "payment",
      "payment.saleOrderId = so.id",
    );
    expect(bankAccountQb.addSelect).toHaveBeenCalledWith(
      "COALESCE(NULLIF(TRIM(payment.note), ''), 'Sin descripcion')",
      "description",
    );
    expect(bankAccountQb.addGroupBy).toHaveBeenCalledWith(
      "COALESCE(NULLIF(TRIM(payment.note), ''), 'Sin descripcion')",
    );
  });

  it("applies bank account and client type filters to statistics", async () => {
    const baseQb = createStatsQueryBuilder();
    baseQb.clone
      .mockReturnValueOnce(createStatsQueryBuilder([]))
      .mockReturnValueOnce(createStatsQueryBuilder([]))
      .mockReturnValueOnce(createStatsQueryBuilder([]))
      .mockReturnValueOnce(createStatsQueryBuilder([], {}))
      .mockReturnValueOnce(createStatsQueryBuilder([]));

    const entityRepo = { createQueryBuilder: jest.fn().mockReturnValue(baseQb) };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    await repository.statistics({
      filters: [
        { field: "bankAccountId", operator: "in", values: ["bank-1"] },
        { field: "clientType", operator: "in", values: ["NEW"] },
      ] as any,
    });

    expect(baseQb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("filter_payment.bank_account_id IN"),
      { stats_filter_0_value: ["bank-1"] },
    );
    expect(baseQb.andWhere).toHaveBeenCalledWith("client.type IN (:...stats_filter_1_value)", {
      stats_filter_1_value: ["NEW"],
    });
  });

  it("applies creator and assigned user filters to list queries", async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue({ createQueryBuilder: jest.fn().mockReturnValue(qb) }) },
    } as any);

    await repository.list({
      filters: [
        { field: "createdBy", operator: "in", values: ["creator-1", "creator-2"] },
        { field: "assignedBy", operator: "in", values: ["assignee-1"] },
      ] as any,
    });

    expect(qb.andWhere).toHaveBeenCalledWith("so.createdBy IN (:...filter_0_value)", {
      filter_0_value: ["creator-1", "creator-2"],
    });
    expect(qb.andWhere).toHaveBeenCalledWith("so.assignedBy IN (:...filter_1_value)", {
      filter_1_value: ["assignee-1"],
    });
  });

  it("applies workflow type filters to list queries", async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue({ createQueryBuilder: jest.fn().mockReturnValue(qb) }) },
    } as any);

    await repository.list({
      filters: [
        { field: "workflowId", operator: "in", values: ["workflow-1", "workflow-2"] },
      ] as any,
    });

    expect(qb.andWhere).toHaveBeenCalledWith("so.workflowId IN (:...filter_0_value)", {
      filter_0_value: ["workflow-1", "workflow-2"],
    });
  });

  it("applies preguide and prepared status filters to list queries", async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue({ createQueryBuilder: jest.fn().mockReturnValue(qb) }) },
    } as any);

    await repository.list({
      filters: [
        { field: "preguideStatus", operator: "in", values: ["WITH"] },
        { field: "preparedStatus", operator: "in", values: ["PENDING"] },
      ] as any,
    });

    expect(qb.andWhere).toHaveBeenCalledWith("COALESCE(so.preguide, false) IN (:...filter_0_value)", {
      filter_0_value: [true],
    });
    expect(qb.andWhere).toHaveBeenCalledWith("COALESCE(so.prepared, false) IN (:...filter_1_value)", {
      filter_1_value: [false],
    });
  });

  it("applies createdAt filters as full local Peru day ranges in list queries", async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue({ createQueryBuilder: jest.fn().mockReturnValue(qb) }) },
    } as any);

    await repository.list({
      filters: [
        { field: "createdAt", operator: "between", range: { start: "2026-07-09", end: "2026-07-09" } },
      ] as any,
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      "so.createdAt >= :filter_0_range_start AND so.createdAt < :filter_0_range_end",
      {
        filter_0_range_start: "2026-07-09 00:00:00",
        filter_0_range_end: "2026-07-10 00:00:00",
      },
    );
  });

  it("filters list queries to active sale orders", async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue({ createQueryBuilder: jest.fn().mockReturnValue(qb) }) },
    } as any);

    await repository.list({ page: 1, limit: 10 });

    expect(qb.where).toHaveBeenCalledWith("so.isActive = true");
  });

  it("filters list queries to inactive sale orders when requested", async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue({ createQueryBuilder: jest.fn().mockReturnValue(qb) }) },
    } as any);

    await repository.list({ page: 1, limit: 10, isActive: false });

    expect(qb.where).toHaveBeenCalledWith("so.isActive = false");
  });

  it("sets active state by existing sale order ids", async () => {
    const execute = jest.fn().mockResolvedValue({ affected: 2 });
    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute,
    };
    const entityRepo = {
      find: jest.fn().mockResolvedValue([{ id: "order-1" }, { id: "order-2" }]),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    const result = await repository.setActiveByIds({
      saleOrderIds: ["order-1", "order-1", "order-2"],
      isActive: false,
    });

    expect(result).toEqual(["order-1", "order-2"]);
    expect(entityRepo.find).toHaveBeenCalledWith({
      where: { id: expect.any(Object) },
      select: { id: true },
    });
    expect(qb.set).toHaveBeenCalledWith({ isActive: false });
    expect(qb.where).toHaveBeenCalledWith("id IN (:...saleOrderIds)", {
      saleOrderIds: ["order-1", "order-2"],
    });
  });

  it("creates and lists sale order audit rows with executor data", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const find = jest.fn().mockResolvedValue([
      {
        id: "audit-1",
        saleOrderId: "order-1",
        createdAt: new Date("2026-07-31T10:00:00.000Z"),
        executedBy: "user-1",
        executor: { name: "Admin", email: "admin@example.test" },
        actionExecution: "delete",
      },
    ]);
    const manager = {
      getRepository: jest.fn().mockReturnValue({ save, find }),
    };
    const repository = new SaleOrderTypeormRepository({ manager } as any);

    await repository.createAudit({
      saleOrderId: "order-1",
      executedBy: "user-1",
      actionExecution: "delete",
    });
    const rows = await repository.listAudit("order-1");

    expect(save).toHaveBeenCalledWith({
      saleOrderId: "order-1",
      executedBy: "user-1",
      actionExecution: "delete",
    });
    expect(find).toHaveBeenCalledWith({
      where: { saleOrderId: "order-1" },
      relations: { executor: true },
      order: { createdAt: "DESC" },
    });
    expect(rows).toEqual([
      expect.objectContaining({
        saleOrderId: "order-1",
        executedByName: "Admin",
        executedByEmail: "admin@example.test",
        actionExecution: "delete",
      }),
    ]);
  });

  it("applies lote text filters to list queries", async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue({ createQueryBuilder: jest.fn().mockReturnValue(qb) }) },
    } as any);

    await repository.list({
      filters: [
        { field: "lotes", operator: "contains", value: "3" },
      ] as any,
    });

    expect(qb.andWhere).toHaveBeenCalledWith("CAST(so.lotes AS text) ILIKE :filter_0_value", {
      filter_0_value: "%3%",
    });
  });

  it("applies creator and assigned user filters to statistics", async () => {
    const baseQb = createStatsQueryBuilder();
    baseQb.clone
      .mockReturnValueOnce(createStatsQueryBuilder([]))
      .mockReturnValueOnce(createStatsQueryBuilder([]))
      .mockReturnValueOnce(createStatsQueryBuilder([]))
      .mockReturnValueOnce(createStatsQueryBuilder([], {}))
      .mockReturnValueOnce(createStatsQueryBuilder([]));

    const entityRepo = { createQueryBuilder: jest.fn().mockReturnValue(baseQb) };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    await repository.statistics({
      filters: [
        { field: "createdBy", operator: "in", values: ["creator-1", "creator-2"] },
        { field: "assignedBy", operator: "in", mode: "exclude", values: ["assignee-1"] },
      ] as any,
    });

    expect(baseQb.andWhere).toHaveBeenCalledWith("so.createdBy IN (:...stats_filter_0_value)", {
      stats_filter_0_value: ["creator-1", "creator-2"],
    });
    expect(baseQb.andWhere).toHaveBeenCalledWith("so.assignedBy NOT IN (:...stats_filter_1_value)", {
      stats_filter_1_value: ["assignee-1"],
    });
  });

  it("applies preguide and prepared status filters to statistics", async () => {
    const baseQb = createStatsQueryBuilder();
    baseQb.clone
      .mockReturnValueOnce(createStatsQueryBuilder([]))
      .mockReturnValueOnce(createStatsQueryBuilder([]))
      .mockReturnValueOnce(createStatsQueryBuilder([]))
      .mockReturnValueOnce(createStatsQueryBuilder([], {}))
      .mockReturnValueOnce(createStatsQueryBuilder([]));

    const entityRepo = { createQueryBuilder: jest.fn().mockReturnValue(baseQb) };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    await repository.statistics({
      filters: [
        { field: "preguideStatus", operator: "in", values: ["WITHOUT"] },
        { field: "preparedStatus", operator: "in", mode: "exclude", values: ["PREPARED"] },
      ] as any,
    });

    expect(baseQb.andWhere).toHaveBeenCalledWith("COALESCE(so.preguide, false) IN (:...stats_filter_0_value)", {
      stats_filter_0_value: [false],
    });
    expect(baseQb.andWhere).toHaveBeenCalledWith("COALESCE(so.prepared, false) NOT IN (:...stats_filter_1_value)", {
      stats_filter_1_value: [true],
    });
  });

  it("applies inclusive month and calendar-week filters to statistics", async () => {
    const baseQb = createStatsQueryBuilder();
    baseQb.clone
      .mockReturnValueOnce(createStatsQueryBuilder([]))
      .mockReturnValueOnce(createStatsQueryBuilder([]))
      .mockReturnValueOnce(createStatsQueryBuilder([]))
      .mockReturnValueOnce(createStatsQueryBuilder([], {}))
      .mockReturnValueOnce(createStatsQueryBuilder([]));

    const entityRepo = { createQueryBuilder: jest.fn().mockReturnValue(baseQb) };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    await repository.statistics({
      filters: [
        { field: "scheduleDate", operator: "inMonth", value: "2028-02" },
        { field: "deliveryDate", operator: "inWeek", value: "2026-12-28" },
      ] as any,
    });

    expect(baseQb.andWhere).toHaveBeenCalledWith(
      "so.scheduleDate BETWEEN :stats_filter_0_value_start AND :stats_filter_0_value_end",
      {
        stats_filter_0_value_start: "2028-02-01",
        stats_filter_0_value_end: "2028-02-29",
      },
    );
    expect(baseQb.andWhere).toHaveBeenCalledWith(
      "so.deliveryDate BETWEEN :stats_filter_1_value_start AND :stats_filter_1_value_end",
      {
        stats_filter_1_value_start: "2026-12-28",
        stats_filter_1_value_end: "2027-01-03",
      },
    );
  });

  it("filters statistics to active sale orders and supports lote filters", async () => {
    const baseQb = createStatsQueryBuilder();
    baseQb.clone
      .mockReturnValueOnce(createStatsQueryBuilder([]))
      .mockReturnValueOnce(createStatsQueryBuilder([]))
      .mockReturnValueOnce(createStatsQueryBuilder([]))
      .mockReturnValueOnce(createStatsQueryBuilder([], {}))
      .mockReturnValueOnce(createStatsQueryBuilder([]));

    const entityRepo = { createQueryBuilder: jest.fn().mockReturnValue(baseQb) };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    await repository.statistics({
      filters: [
        { field: "lotes", operator: "eq", value: "4" },
      ] as any,
    });

    expect(baseQb.where).toHaveBeenCalledWith("so.isActive = true");
    expect(baseQb.andWhere).toHaveBeenCalledWith("CAST(so.lotes AS text) = :stats_filter_0_value", {
      stats_filter_0_value: "4",
    });
  });

  it("loads sale order details only when the sale order is active", async () => {
    const saleOrderRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(saleOrderRepo) },
    } as any);

    await expect(repository.findById("order-1")).resolves.toBeNull();

    expect(saleOrderRepo.findOne).toHaveBeenCalledWith({
      where: { id: "order-1", isActive: true },
    });
  });

  it("updates only assignedBy and returns the reloaded sale order", async () => {
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const findOne = jest.fn().mockResolvedValue({
      id: "order-1",
      clientId: "client-1",
      warehouseId: null,
      assignedBy: "adviser-1",
      createdBy: "user-1",
      total: 0,
      subTotal: 0,
      deliveryCost: 0,
      invoiceSend: false,
      isActive: true,
      createdAt: new Date("2026-07-08T00:00:00.000Z"),
    });
    const entityRepo = { update, findOne };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    const result = await repository.updateAssignedBy({
      saleOrderId: "order-1",
      assignedBy: "adviser-1",
    });

    expect(update).toHaveBeenCalledWith(
      { id: "order-1" },
      { assignedBy: "adviser-1" },
    );
    expect(result?.assignedBy).toBe("adviser-1");
  });

  it("returns null when assignedBy update finds no sale order", async () => {
    const update = jest.fn().mockResolvedValue({ affected: 0 });
    const entityRepo = { update, findOne: jest.fn() };
    const repository = new SaleOrderTypeormRepository({
      manager: { getRepository: jest.fn().mockReturnValue(entityRepo) },
    } as any);

    await expect(
      repository.updateAssignedBy({ saleOrderId: "missing-order", assignedBy: null }),
    ).resolves.toBeNull();

    expect(entityRepo.findOne).not.toHaveBeenCalled();
  });
});
