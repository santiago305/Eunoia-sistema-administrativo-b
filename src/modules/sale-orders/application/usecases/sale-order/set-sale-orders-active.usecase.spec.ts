import { BadRequestException } from "@nestjs/common";
import { SetSaleOrdersActiveUsecase } from "./set-sale-orders-active.usecase";

describe("SetSaleOrdersActiveUsecase", () => {
  const createUsecase = (updatedIds = ["order-1", "order-2"]) => {
    const tx = { id: "tx" };
    const uow = { runInTransaction: jest.fn((work) => work(tx)) };
    const saleOrderRepo = {
      setActiveByIds: jest.fn().mockResolvedValue(updatedIds),
      createAudit: jest.fn().mockResolvedValue(undefined),
    };
    const usecase = new SetSaleOrdersActiveUsecase(uow as any, saleOrderRepo as any);

    return { usecase, uow, tx, saleOrderRepo };
  };

  it("deduplicates ids, updates active state, and writes delete audit rows in one transaction", async () => {
    const { usecase, uow, tx, saleOrderRepo } = createUsecase();

    const result = await usecase.execute({
      saleOrderIds: ["order-1", "order-1", "order-2"],
      isActive: false,
      executedBy: "user-1",
    });

    expect(uow.runInTransaction).toHaveBeenCalledTimes(1);
    expect(saleOrderRepo.setActiveByIds).toHaveBeenCalledWith(
      { saleOrderIds: ["order-1", "order-2"], isActive: false },
      tx,
    );
    expect(saleOrderRepo.createAudit).toHaveBeenNthCalledWith(
      1,
      { saleOrderId: "order-1", executedBy: "user-1", actionExecution: "delete" },
      tx,
    );
    expect(saleOrderRepo.createAudit).toHaveBeenNthCalledWith(
      2,
      { saleOrderId: "order-2", executedBy: "user-1", actionExecution: "delete" },
      tx,
    );
    expect(result.data).toEqual({
      requested: 2,
      succeeded: 2,
      failed: 0,
      partiallyCompleted: false,
      results: [
        { saleOrderId: "order-1", status: "success" },
        { saleOrderId: "order-2", status: "success" },
      ],
    });
  });

  it("writes restore audit rows when activating sale orders", async () => {
    const { usecase, saleOrderRepo, tx } = createUsecase(["order-1"]);

    await usecase.execute({
      saleOrderIds: ["order-1"],
      isActive: true,
      executedBy: "user-2",
    });

    expect(saleOrderRepo.createAudit).toHaveBeenCalledWith(
      { saleOrderId: "order-1", executedBy: "user-2", actionExecution: "restore" },
      tx,
    );
  });

  it("reports missing sale orders as row failures", async () => {
    const { usecase } = createUsecase(["order-1"]);

    const result = await usecase.execute({
      saleOrderIds: ["order-1", "missing-order"],
      isActive: false,
      executedBy: "user-1",
    });

    expect(result.data.succeeded).toBe(1);
    expect(result.data.failed).toBe(1);
    expect(result.data.partiallyCompleted).toBe(true);
    expect(result.data.results).toEqual([
      { saleOrderId: "order-1", status: "success" },
      { saleOrderId: "missing-order", status: "failed", message: "Pedido no encontrado" },
    ]);
  });

  it("rejects empty sale order ids", async () => {
    const { usecase, saleOrderRepo } = createUsecase();

    await expect(
      usecase.execute({ saleOrderIds: [], isActive: false, executedBy: "user-1" }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(saleOrderRepo.setActiveByIds).not.toHaveBeenCalled();
  });
});
