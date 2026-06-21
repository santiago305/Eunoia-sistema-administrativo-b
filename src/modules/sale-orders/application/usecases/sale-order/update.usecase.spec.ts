import "reflect-metadata";
import { ACTIONS } from "src/modules/workflow/domain/constants/workflow-action.constants";
import { UpdateSaleOrderUsecase } from "./update.usecase";

describe("UpdateSaleOrderUsecase", () => {
  const input = {
    saleOrderId: "order-1",
    warehouseId: "warehouse-1",
    clientId: "client-1",
    items: [{
      quantity: 1,
      unitPrice: 10,
      total: 10,
      components: [{ skuId: "sku-1", quantity: 1, unitPrice: 10, total: 10 }],
    }],
  };

  const createFixture = (
    stockActions: Array<
      string | { type: string; actionBranch?: "THEN" | "ELSE"; executedBranch?: "THEN" | "ELSE" }
    > = [],
  ) => {
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({
        id: "order-1",
        warehouseId: "warehouse-1",
        workflowId: "workflow-1",
        currentStateId: "state-1",
      }),
      update: jest.fn().mockResolvedValue({
        id: "order-1",
        serie: "PED",
        correlative: 1,
        workflowId: "workflow-1",
        currentStateId: "state-1",
      }),
    };
    const saleOrderItemRepo = {
      listBySaleOrderId: jest.fn().mockResolvedValue([{ id: "old-item" }]),
      deleteBySaleOrderId: jest.fn(),
      bulkCreate: jest.fn().mockResolvedValue([{ id: "new-item" }]),
    };
    const componentRepo = {
      listBySaleOrderItemIds: jest.fn().mockResolvedValue([
        { skuId: "sku-1", quantity: 1 },
      ]),
      deleteBySaleOrderItemIds: jest.fn(),
      bulkCreate: jest.fn(),
    };
    const paymentRepo = {
      deleteBySaleOrderId: jest.fn(),
      bulkCreate: jest.fn(),
    };
    const historyRepo = {
      listBySaleOrderId: jest.fn().mockResolvedValue(
        stockActions.map((action, index) => ({
          transitionId: `transition-${index}`,
          metadata: typeof action === "string" || !action.executedBranch
            ? null
            : { branch: action.executedBranch },
        })),
      ),
    };
    const transitionRepo = {
      findDetailedById: jest.fn().mockImplementation((transitionId: string) => {
        const index = Number(transitionId.split("-")[1]);
        const action = stockActions[index];
        return Promise.resolve({
          actions: [{
            type: typeof action === "string" ? action : action.type,
            branch: typeof action === "string" ? "THEN" : action.actionBranch ?? "THEN",
            position: 0,
          }],
        });
      }),
    };
    const usecase = new UpdateSaleOrderUsecase(
      { runInTransaction: (work: any) => work({}) } as any,
      { findByIdWithItems: jest.fn() } as any,
      saleOrderRepo as any,
      saleOrderItemRepo as any,
      componentRepo as any,
      paymentRepo as any,
      { findDetailedById: jest.fn() } as any,
      historyRepo as any,
      transitionRepo as any,
    );

    return {
      usecase,
      saleOrderRepo,
      saleOrderItemRepo,
      componentRepo,
      paymentRepo,
    };
  };

  it("replaces order lines without mutating inventory", async () => {
    const { usecase, componentRepo } = createFixture();

    await usecase.execute(input);

    expect(componentRepo.bulkCreate).toHaveBeenCalled();
  });

  it("rejects changing warehouse while stock is reserved before deleting related data", async () => {
    const fixture = createFixture([ACTIONS.RESERVE_STOCK]);

    await expect(fixture.usecase.execute({
      ...input,
      warehouseId: "warehouse-2",
    })).rejects.toThrow(
      "No se puede cambiar el almacén porque el pedido tiene stock reservado.",
    );

    expect(fixture.componentRepo.deleteBySaleOrderItemIds).not.toHaveBeenCalled();
    expect(fixture.saleOrderItemRepo.deleteBySaleOrderId).not.toHaveBeenCalled();
    expect(fixture.paymentRepo.deleteBySaleOrderId).not.toHaveBeenCalled();
  });

  it("rejects changing warehouse after stock was consumed before deleting related data", async () => {
    const fixture = createFixture([ACTIONS.RESERVE_STOCK, ACTIONS.CONSUME_STOCK]);

    await expect(fixture.usecase.execute({
      ...input,
      warehouseId: "warehouse-2",
    })).rejects.toThrow(
      "No se puede cambiar el almacén porque el pedido ya consumió stock.",
    );

    expect(fixture.componentRepo.deleteBySaleOrderItemIds).not.toHaveBeenCalled();
    expect(fixture.saleOrderItemRepo.deleteBySaleOrderId).not.toHaveBeenCalled();
    expect(fixture.paymentRepo.deleteBySaleOrderId).not.toHaveBeenCalled();
  });

  it("allows changing warehouse after reserved stock was reverted", async () => {
    const { usecase, saleOrderRepo } = createFixture([
      ACTIONS.RESERVE_STOCK,
      ACTIONS.REVERT_STOCK,
    ]);

    await usecase.execute({ ...input, warehouseId: "warehouse-2" });

    expect(saleOrderRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: "warehouse-2" }),
      expect.anything(),
    );
  });

  it("ignores THEN stock actions when the automatic transition executed ELSE", async () => {
    const { usecase, saleOrderRepo } = createFixture([{
      type: ACTIONS.RESERVE_STOCK,
      actionBranch: "THEN",
      executedBranch: "ELSE",
    }]);

    await usecase.execute({ ...input, warehouseId: "warehouse-2" });

    expect(saleOrderRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: "warehouse-2" }),
      expect.anything(),
    );
  });

  it("allows changing warehouse when the order has no stock history", async () => {
    const { usecase, saleOrderRepo } = createFixture();

    await usecase.execute({ ...input, warehouseId: "warehouse-2" });

    expect(saleOrderRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: "warehouse-2" }),
      expect.anything(),
    );
  });

  it("allows keeping the same warehouse while stock is reserved", async () => {
    const { usecase, saleOrderRepo } = createFixture([ACTIONS.RESERVE_STOCK]);

    await usecase.execute(input);

    expect(saleOrderRepo.update).toHaveBeenCalled();
  });
});
