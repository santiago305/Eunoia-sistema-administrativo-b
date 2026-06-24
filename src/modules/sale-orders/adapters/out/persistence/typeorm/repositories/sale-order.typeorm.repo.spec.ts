import { SaleOrderTypeormRepository } from "./sale-order.typeorm.repo";
import { TelephoneEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/telephone.entity";

const createStatsQueryBuilder = (rawMany: unknown[] = [], rawOne: unknown = {}) => ({
  leftJoin: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  addGroupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  clone: jest.fn(),
  getRawMany: jest.fn().mockResolvedValue(rawMany),
  getRawOne: jest.fn().mockResolvedValue(rawOne),
});

describe("SaleOrderTypeormRepository", () => {
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

  it("loads the active main telephone when getting a sale order", async () => {
    const telephoneRepo = {
      findOne: jest.fn().mockResolvedValue({ number: "999999999" }),
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
  });

  it("returns statistics grouped by bank account payment amounts", async () => {
    const baseQb = createStatsQueryBuilder();
    const workflowQb = createStatsQueryBuilder([]);
    const stateQb = createStatsQueryBuilder([]);
    const clientTypeQb = createStatsQueryBuilder([]);
    const totalsQb = createStatsQueryBuilder([], {
      orders: "1",
      total: "120",
      collected: "80",
      pending: "40",
      deliveryCostSum: "10",
    });
    const bankAccountQb = createStatsQueryBuilder([
      {
        id: "bank-1",
        label: "BCP Soles",
        number: "001",
        payments: "2",
        collected: "80",
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

    expect(result.byBankAccount).toEqual([
      {
        id: "bank-1",
        label: "BCP Soles",
        number: "001",
        payments: 2,
        collected: 80,
      },
    ]);
    expect(bankAccountQb.innerJoin).toHaveBeenCalledWith(
      expect.anything(),
      "payment",
      "payment.saleOrderId = so.id",
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
});
