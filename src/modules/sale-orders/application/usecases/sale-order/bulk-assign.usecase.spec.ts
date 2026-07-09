import { BadRequestException } from "@nestjs/common";
import { BulkAssignSaleOrdersUsecase } from "./bulk-assign.usecase";

describe("BulkAssignSaleOrdersUsecase", () => {
  const createUsecase = (options?: { secondUpdate?: unknown }) => {
    const uow = {
      runInTransaction: jest.fn((work) => work({ tx: true })),
    };
    const saleOrders = {
      updateAssignedBy: jest
        .fn()
        .mockResolvedValueOnce({ id: "order-1" })
        .mockResolvedValueOnce(options?.secondUpdate ?? null),
    };
    const adviserMembership = {
      assertIsAdviser: jest.fn().mockResolvedValue(undefined),
    };
    const usecase = new BulkAssignSaleOrdersUsecase(
      uow as any,
      saleOrders as any,
      adviserMembership as any,
    );

    return { usecase, uow, saleOrders, adviserMembership };
  };

  it("validates adviser once and updates each order in isolated transactions", async () => {
    const { usecase, uow, saleOrders, adviserMembership } = createUsecase({
      secondUpdate: { id: "order-2" },
    });

    const result = await usecase.execute({
      saleOrderIds: ["order-1", "order-2"],
      assignedBy: "adviser-1",
    });

    expect(adviserMembership.assertIsAdviser).toHaveBeenCalledWith("adviser-1");
    expect(uow.runInTransaction).toHaveBeenCalledTimes(2);
    expect(saleOrders.updateAssignedBy).toHaveBeenNthCalledWith(
      1,
      { saleOrderId: "order-1", assignedBy: "adviser-1" },
      { tx: true },
    );
    expect(result.data).toEqual({
      requested: 2,
      succeeded: 2,
      failed: 0,
      results: [
        { saleOrderId: "order-1", status: "success" },
        { saleOrderId: "order-2", status: "success" },
      ],
    });
  });

  it("reports missing orders as row failures without cancelling successes", async () => {
    const { usecase } = createUsecase();

    const result = await usecase.execute({
      saleOrderIds: ["order-1", "missing-order"],
      assignedBy: null,
    });

    expect(result.data.succeeded).toBe(1);
    expect(result.data.failed).toBe(1);
    expect(result.data.results).toEqual([
      { saleOrderId: "order-1", status: "success" },
      {
        saleOrderId: "missing-order",
        status: "failed",
        message: "Pedido no encontrado",
      },
    ]);
  });

  it("fails before row processing when assigned user is not an adviser", async () => {
    const { usecase, adviserMembership, saleOrders } = createUsecase();
    adviserMembership.assertIsAdviser.mockRejectedValueOnce(
      new BadRequestException("El usuario asignado no es asesor"),
    );

    await expect(
      usecase.execute({ saleOrderIds: ["order-1"], assignedBy: "user-1" }),
    ).rejects.toThrow("El usuario asignado no es asesor");

    expect(saleOrders.updateAssignedBy).not.toHaveBeenCalled();
  });
});
