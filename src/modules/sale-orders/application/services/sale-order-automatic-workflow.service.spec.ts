import {
  SaleOrderAutomaticWorkflowService,
  SaleOrderAutomaticWorkflowTriggerEnum,
} from "./sale-order-automatic-workflow.service";

describe("SaleOrderAutomaticWorkflowService", () => {
  it("emits sale-orders.updated when automatic workflow updates the order", async () => {
    const automaticWorkflowJob = {
      runForSaleOrder: jest.fn().mockResolvedValue({
        updated: 1,
        failed: 0,
        saleOrderIds: ["order-1"],
      }),
    };
    const realtimeService = {
      emitToAllConnected: jest.fn(),
    };
    const service = new SaleOrderAutomaticWorkflowService(
      automaticWorkflowJob as any,
      realtimeService as any,
    );

    await expect(
      service.evaluateAndNotify("order-1", SaleOrderAutomaticWorkflowTriggerEnum.SALE_ORDER_UPDATED),
    ).resolves.toEqual({
      updated: 1,
      failed: 0,
      saleOrderIds: ["order-1"],
    });

    expect(automaticWorkflowJob.runForSaleOrder).toHaveBeenCalledWith({ saleOrderId: "order-1" });
    expect(realtimeService.emitToAllConnected).toHaveBeenCalledWith("sale-orders.updated", {
      updated: 1,
      saleOrderIds: ["order-1"],
      source: "automatic-workflow",
      trigger: "sale-order-updated",
    });
  });

  it("does not emit when automatic workflow does not update the order", async () => {
    const automaticWorkflowJob = {
      runForSaleOrder: jest.fn().mockResolvedValue({
        updated: 0,
        failed: 0,
        saleOrderIds: [],
      }),
    };
    const realtimeService = {
      emitToAllConnected: jest.fn(),
    };
    const service = new SaleOrderAutomaticWorkflowService(
      automaticWorkflowJob as any,
      realtimeService as any,
    );

    await expect(
      service.evaluateAndNotify("order-1", SaleOrderAutomaticWorkflowTriggerEnum.PAYMENT_CREATED),
    ).resolves.toEqual({
      updated: 0,
      failed: 0,
      saleOrderIds: [],
    });

    expect(realtimeService.emitToAllConnected).not.toHaveBeenCalled();
  });
});
