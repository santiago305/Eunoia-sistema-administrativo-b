import {
  SaleOrderAutomaticWorkflowService,
  SaleOrderAutomaticWorkflowTriggerEnum,
} from "./sale-order-automatic-workflow.service";

describe("SaleOrderAutomaticWorkflowService", () => {
  const automaticPayload = {
    updated: 1,
    saleOrderIds: ["order-1"],
    source: "automatic-workflow",
    trigger: "sale-order-updated",
    saleOrders: [{ id: "order-1", currentState: { code: "PROCESSED" } }],
    statistics: { totals: { orders: 1 } },
  };

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
    const payloadBuilder = {
      build: jest.fn().mockResolvedValue(automaticPayload),
    };
    const service = new (SaleOrderAutomaticWorkflowService as any)(
      automaticWorkflowJob as any,
      realtimeService as any,
      payloadBuilder as any,
    );

    await expect(
      service.evaluateAndNotify("order-1", SaleOrderAutomaticWorkflowTriggerEnum.SALE_ORDER_UPDATED),
    ).resolves.toEqual({
      updated: 1,
      failed: 0,
      saleOrderIds: ["order-1"],
    });

    expect(automaticWorkflowJob.runForSaleOrder).toHaveBeenCalledWith({ saleOrderId: "order-1" });
    expect(payloadBuilder.build).toHaveBeenCalledWith({
      updated: 1,
      saleOrderIds: ["order-1"],
      source: "automatic-workflow",
      trigger: "sale-order-updated",
    });
    expect(realtimeService.emitToAllConnected).toHaveBeenCalledWith("sale-orders.updated", automaticPayload);
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
    const payloadBuilder = {
      build: jest.fn(),
    };
    const service = new (SaleOrderAutomaticWorkflowService as any)(
      automaticWorkflowJob as any,
      realtimeService as any,
      payloadBuilder as any,
    );

    await expect(
      service.evaluateAndNotify("order-1", SaleOrderAutomaticWorkflowTriggerEnum.PAYMENT_CREATED),
    ).resolves.toEqual({
      updated: 0,
      failed: 0,
      saleOrderIds: [],
    });

    expect(realtimeService.emitToAllConnected).not.toHaveBeenCalled();
    expect(payloadBuilder.build).not.toHaveBeenCalled();
  });

  it("evaluates many orders and emits one aggregate sale-orders.updated event", async () => {
    const automaticWorkflowJob = {
      runForSaleOrder: jest
        .fn()
        .mockResolvedValueOnce({
          updated: 1,
          failed: 0,
          saleOrderIds: ["order-1"],
        })
        .mockResolvedValueOnce({
          updated: 0,
          failed: 1,
          saleOrderIds: [],
        }),
    };
    const realtimeService = {
      emitToAllConnected: jest.fn(),
    };
    const clientPayload = {
      ...automaticPayload,
      trigger: "client-updated",
    };
    const payloadBuilder = {
      build: jest.fn().mockResolvedValue(clientPayload),
    };
    const service = new (SaleOrderAutomaticWorkflowService as any)(
      automaticWorkflowJob as any,
      realtimeService as any,
      payloadBuilder as any,
    );

    await expect(
      service.evaluateManyAndNotify(
        ["order-1", "order-1", "order-2"],
        SaleOrderAutomaticWorkflowTriggerEnum.CLIENT_UPDATED,
      ),
    ).resolves.toEqual({
      found: 2,
      updated: 1,
      failed: 1,
      saleOrderIds: ["order-1"],
    });

    expect(automaticWorkflowJob.runForSaleOrder).toHaveBeenCalledTimes(2);
    expect(automaticWorkflowJob.runForSaleOrder).toHaveBeenNthCalledWith(1, { saleOrderId: "order-1" });
    expect(automaticWorkflowJob.runForSaleOrder).toHaveBeenNthCalledWith(2, { saleOrderId: "order-2" });
    expect(payloadBuilder.build).toHaveBeenCalledWith({
      updated: 1,
      saleOrderIds: ["order-1"],
      source: "automatic-workflow",
      trigger: "client-updated",
    });
    expect(realtimeService.emitToAllConnected).toHaveBeenCalledWith("sale-orders.updated", clientPayload);
  });
});
