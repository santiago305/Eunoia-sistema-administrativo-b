import { SaleOrder } from "src/modules/sale-orders/domain/entities/sale-order";
import { CorrectSaleOrderTotalUsecase } from "./correct-total.usecase";

describe("CorrectSaleOrderTotalUsecase", () => {
  const tx = { manager: {} } as any;

  const buildOrder = () =>
    new SaleOrder(
      "order-1",
      "PE",
      10,
      "warehouse-1",
      "client-1",
      null,
      null,
      null,
      null,
      null,
      0,
      0,
      0,
      0,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      "user-1",
      "workflow-1",
      "state-delivered",
      true,
      null,
      new Date("2026-08-20T00:00:00.000Z"),
      null,
      [],
      false,
      false,
      false,
      false,
    );

  function buildUsecase(options: {
    workflowName?: string;
    downstreamState?: boolean;
    withoutHistory?: boolean;
  } = {}) {
    const workflowName = options.workflowName ?? "ABONADO CE";
    const paymentTargetStateId = options.downstreamState
      ? "state-to-send"
      : "state-delivered";
    const states = [
      {
        id: "state-progress",
        code: options.downstreamState ? "WAITING_PAYMENT" : "IN_PROGRESS",
        name: options.downstreamState ? "Esperando pago" : "En curso",
        isActive: true,
      },
      ...(options.downstreamState
        ? [
            {
              id: "state-to-send",
              code: "TO_SEND",
              name: "Por enviar",
              isActive: true,
            },
          ]
        : []),
      {
        id: "state-delivered",
        code: "DELIVERED",
        name: "Entregado",
        isActive: true,
      },
    ];
    const transitions = [
      {
        id: "transition-paid",
        fromStateId: "state-progress",
        toStateId: paymentTargetStateId,
        elseToStateId: null,
        isActive: true,
      },
      ...(options.downstreamState
        ? [
            {
              id: "transition-delivered",
              fromStateId: "state-to-send",
              toStateId: "state-delivered",
              elseToStateId: null,
              isActive: true,
            },
          ]
        : []),
    ];
    const history = [
      {
        transitionId: "transition-paid",
        fromStateId: "state-progress",
        toStateId: paymentTargetStateId,
        metadata: { branch: "THEN" },
      },
      ...(options.downstreamState
        ? [
            {
              transitionId: "transition-delivered",
              fromStateId: "state-to-send",
              toStateId: "state-delivered",
              metadata: { branch: "THEN" },
            },
          ]
        : []),
    ];
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue(buildOrder()),
      updateAmounts: jest.fn().mockResolvedValue(buildOrder()),
      updateWorkflowState: jest.fn().mockResolvedValue(undefined),
    };
    const itemRepo = {
      listBySaleOrderId: jest.fn().mockResolvedValue([
        { id: "item-1", quantity: 1, total: 0 },
        { id: "item-2", quantity: 3, total: 0 },
      ]),
      updateAmounts: jest.fn().mockResolvedValue(undefined),
    };
    const componentRepo = {
      listBySaleOrderItemIds: jest.fn().mockResolvedValue([
        {
          id: "component-1",
          saleOrderItemId: "item-1",
          quantity: 1,
          total: 0,
        },
        {
          id: "component-2",
          saleOrderItemId: "item-2",
          quantity: 1,
          total: 0,
        },
        {
          id: "component-3",
          saleOrderItemId: "item-2",
          quantity: 2,
          total: 0,
        },
      ]),
      updateAmounts: jest.fn().mockResolvedValue(undefined),
    };
    const paymentRepo = {
      listBySaleOrderIds: jest.fn().mockResolvedValue([{ amount: 20 }]),
    };
    const workflowRepo = {
      findDetailedById: jest.fn().mockResolvedValue({
        workflow: { id: "workflow-1", name: workflowName },
        states,
        transitions,
        conditions: [
          {
            id: "condition-paid",
            transitionId: "transition-paid",
            type: "IS_PAID",
            config: {},
            position: 0,
          },
        ],
        actions: [],
      }),
    };
    const historyRepo = {
      listBySaleOrderId: jest
        .fn()
        .mockResolvedValue(options.withoutHistory ? [] : history),
      append: jest.fn().mockResolvedValue(undefined),
    };
    const stockReversal = {
      restoreAndReserve: jest.fn().mockResolvedValue(true),
    };
    const usecase = new CorrectSaleOrderTotalUsecase(
      { runInTransaction: (work: (context: unknown) => unknown) => work(tx) } as any,
      saleOrderRepo as any,
      itemRepo as any,
      componentRepo as any,
      paymentRepo as any,
      workflowRepo as any,
      historyRepo as any,
      { now: () => new Date("2026-08-21T12:00:00.000Z") } as any,
      stockReversal as any,
    );

    return {
      usecase,
      saleOrderRepo,
      itemRepo,
      componentRepo,
      historyRepo,
      stockReversal,
    };
  }

  it("recalculates the debt and returns a delivered CE order to in progress", async () => {
    const dependencies = buildUsecase();

    const result = await dependencies.usecase.execute({
      saleOrderId: "order-1",
      total: 100,
      executedBy: "user-2",
    });

    expect(result).toEqual(
      expect.objectContaining({
        previousTotal: 0,
        total: 100,
        totalPaid: 20,
        pendingAmount: 80,
        paymentStatus: "PENDING",
        stateChanged: true,
        stockRestoredAndReserved: true,
        currentState: expect.objectContaining({ code: "IN_PROGRESS" }),
      }),
    );
    expect(dependencies.itemRepo.updateAmounts).toHaveBeenCalledWith(
      [
        { id: "item-1", total: 25, unitPrice: 25 },
        { id: "item-2", total: 75, unitPrice: 25 },
      ],
      tx,
    );
    expect(dependencies.componentRepo.updateAmounts).toHaveBeenCalledWith(
      [
        { id: "component-1", total: 25, unitPrice: 25 },
        { id: "component-2", total: 25, unitPrice: 25 },
        { id: "component-3", total: 50, unitPrice: 25 },
      ],
      tx,
    );
    expect(dependencies.stockReversal.restoreAndReserve).toHaveBeenCalled();
    expect(dependencies.saleOrderRepo.updateWorkflowState).toHaveBeenCalledWith(
      { saleOrderId: "order-1", currentStateId: "state-progress" },
      tx,
    );
    expect(dependencies.historyRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        fromStateId: "state-delivered",
        toStateId: "state-progress",
        metadata: expect.objectContaining({
          source: "sale-order-total-correction",
          pendingAmount: 80,
          stockStatus: "RESERVED",
        }),
      }),
      tx,
    );
  });

  it("applies the same analysis to any workflow name", async () => {
    const { usecase } = buildUsecase({ workflowName: "VENTA REGULAR" });

    const result = await usecase.execute({
      saleOrderId: "order-1",
      total: 100,
      executedBy: "user-2",
    });

    expect(result.stateChanged).toBe(true);
    expect(result.currentState.code).toBe("IN_PROGRESS");
  });

  it("returns an Envíos order through downstream states to its payment gate", async () => {
    const { usecase, saleOrderRepo } = buildUsecase({
      workflowName: "ABONADO ENVIO",
      downstreamState: true,
    });

    const result = await usecase.execute({
      saleOrderId: "order-1",
      total: 100,
      executedBy: "user-2",
    });

    expect(result.currentState).toEqual(
      expect.objectContaining({
        code: "WAITING_PAYMENT",
        name: "Esperando pago",
      }),
    );
    expect(saleOrderRepo.updateWorkflowState).toHaveBeenCalledWith(
      { saleOrderId: "order-1", currentStateId: "state-progress" },
      tx,
    );
  });

  it("uses the workflow graph when a legacy order has no state history", async () => {
    const { usecase } = buildUsecase({
      workflowName: "FLUJO FUTURO",
      downstreamState: true,
      withoutHistory: true,
    });

    const result = await usecase.execute({
      saleOrderId: "order-1",
      total: 100,
      executedBy: "user-2",
    });

    expect(result.stateChanged).toBe(true);
    expect(result.currentState.code).toBe("WAITING_PAYMENT");
  });
});
