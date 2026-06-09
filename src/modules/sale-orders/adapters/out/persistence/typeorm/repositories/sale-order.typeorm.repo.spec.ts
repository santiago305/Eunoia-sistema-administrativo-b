import { SaleOrderTypeormRepository } from "./sale-order.typeorm.repo";
import { TelephoneEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/telephone.entity";

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
});
