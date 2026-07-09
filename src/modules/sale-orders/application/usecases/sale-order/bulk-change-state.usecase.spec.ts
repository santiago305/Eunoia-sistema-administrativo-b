import { BadRequestException } from "@nestjs/common";
import { BulkChangeSaleOrderStateUsecase } from "./bulk-change-state.usecase";

describe("BulkChangeSaleOrderStateUsecase", () => {
  it("advances each order and keeps row failures isolated", async () => {
    const advance = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({ order: { id: "order-1" }, warnings: ["w1"] })
        .mockRejectedValueOnce(new BadRequestException("Transicion no disponible")),
    };
    const usecase = new BulkChangeSaleOrderStateUsecase(advance as any);

    const result = await usecase.execute({
      saleOrderIds: ["order-1", "order-2"],
      transitionId: "transition-1",
      metadata: { source: "bulk-action" },
      executedBy: "user-1",
    });

    expect(advance.execute).toHaveBeenNthCalledWith(1, {
      saleOrderId: "order-1",
      transitionId: "transition-1",
      metadata: { source: "bulk-action" },
      executedBy: "user-1",
    });
    expect(advance.execute).toHaveBeenNthCalledWith(2, {
      saleOrderId: "order-2",
      transitionId: "transition-1",
      metadata: { source: "bulk-action" },
      executedBy: "user-1",
    });
    expect(result.data).toEqual({
      requested: 2,
      succeeded: 1,
      failed: 1,
      results: [
        { saleOrderId: "order-1", status: "success", warnings: ["w1"] },
        {
          saleOrderId: "order-2",
          status: "failed",
          message: "Transicion no disponible",
        },
      ],
    });
  });
});
