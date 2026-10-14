import { SaleOrder } from "src/modules/sale-orders/domain/entities/sale-order";
import { SaleOrderPaymentWorkflowReconciliationService } from "../../services/sale-order-payment-workflow-reconciliation.service";
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
    reservationBeforePayment?: boolean;
  } = {}) {
    (tx as any).manager.query = jest.fn().mockResolvedValue([]);
    const workflowName = options.workflowName ?? "ABONADO CE";
    const reservationBeforePayment =
      options.reservationBeforePayment ?? true;
    const paymentTargetStateId = options.downstreamState
      ? "state-to-send"
      : "state-delivered";
    const states = [
      ...(reservationBeforePayment
        ? [
            {
              id: "state-coordinated",
              code: "COORDINATED",
              name: "Coordinado",
              isActive: true,
              isInitial: true,
            },
          ]
        : []),
      {
        id: "state-progress",
        code: options.downstreamState ? "WAITING_PAYMENT" : "IN_PROGRESS",
        name: options.downstreamState ? "Esperando pago" : "En curso",
        isActive: true,
        isInitial: !reservationBeforePayment,
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
      ...(reservationBeforePayment
        ? [
            {
              id: "transition-reserve",
              fromStateId: "state-coordinated",
              toStateId: "state-progress",
              elseToStateId: null,
              isActive: true,
            },
          ]
        : []),
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
      ...(reservationBeforePayment
        ? [
            {
              transitionId: "transition-reserve",
              fromStateId: "state-coordinated",
              toStateId: "state-progress",
              metadata: { branch: "THEN" },
            },
          ]
        : []),
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
      listBySaleOrderIds: jest.fn().mockResolvedValue([{ amount: 20, status: "POSTED" }]),
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
        actions: reservationBeforePayment
          ? [
              {
                id: "action-reserve",
                transitionId: "transition-reserve",
                type: "RESERVE_STOCK",
                config: {},
                position: 0,
                branch: "THEN",
              },
            ]
          : [],
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
      restoreAndRelease: jest.fn().mockResolvedValue(true),
    };
    const stockCorrection = {
      releaseCurrentReservation: jest.fn().mockResolvedValue(undefined),
    };
    const paymentWorkflowReconciliation =
      new SaleOrderPaymentWorkflowReconciliationService(
        saleOrderRepo as any,
        paymentRepo as any,
        workflowRepo as any,
        historyRepo as any,
        { now: () => new Date("2026-08-21T12:00:00.000Z") } as any,
        stockReversal as any,
        stockCorrection as any,
      );
    const usecase = new CorrectSaleOrderTotalUsecase(
      { runInTransaction: (work: (context: unknown) => unknown) => work(tx) } as any,
      saleOrderRepo as any,
      itemRepo as any,
      componentRepo as any,
      paymentWorkflowReconciliation,
    );

    return {
      usecase,
      saleOrderRepo,
      itemRepo,
      componentRepo,
      historyRepo,
      stockReversal,
      stockCorrection,
    };
  }

  async function executeWithPreview(usecase: CorrectSaleOrderTotalUsecase, total: number) {
    const preview = await usecase.preview({ saleOrderId: "order-1", total });
    return usecase.execute({ saleOrderId: "order-1", total, executedBy: "user-2", previewToken: preview.previewToken });
  }

  it("recalculates the debt and returns a delivered CE order to in progress", async () => {
    const dependencies = buildUsecase();

    const result = await executeWithPreview(dependencies.usecase, 100);

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

  it("releases allocations above a reduced total into immutable customer credit", async () => {
    const dependencies = buildUsecase();
    dependencies.saleOrderRepo.findByIdForUpdate.mockResolvedValue({
      ...buildOrder(),
      total: 100,
      clientId: "client-1",
    });
    const query = jest.fn(async () => [{ id: "payment-1", currency: "PEN", applied: "100.00" }]);
    (tx as any).manager.query = query;

    const preview = await dependencies.usecase.preview({ saleOrderId: "order-1", total: 70 });
    await dependencies.usecase.execute({ saleOrderId: "order-1", total: 70, executedBy: "user-2", previewToken: preview.previewToken });

    expect(query).toHaveBeenCalledWith(expect.stringContaining("FOR UPDATE OF sp"), ["order-1"]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO sale_payment_allocations"), ["payment-1", "order-1", -30, "PEN", "user-2"]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO customer_credit_movements"), ["client-1", "payment-1", "order-1", 30, "PEN", "user-2"]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("income.customer_credit_created"), expect.any(Array));
  });

  it("distributes corrected totals with exact centavo remainders and stable tie-breaking", () => {
    const { usecase } = buildUsecase();
    const allocate = (usecase as any).allocate.bind(usecase) as (total: number, rows: Array<{ id: string; quantity: number; total: number }>) => Array<{ id: string; total: number; unitPrice: number }>;

    const tiedShares = allocate(0.02, [
      { id: "first", quantity: 1, total: 1 },
      { id: "second", quantity: 1, total: 1 },
      { id: "third", quantity: 1, total: 1 },
    ]);
    const quantityShares = allocate(0.05, [
      { id: "one", quantity: 1, total: 0 },
      { id: "two", quantity: 2, total: 0 },
      { id: "three", quantity: 3, total: 0 },
    ]);
    const largeShares = allocate(922707636016, [
      { id: "large-first", quantity: 1, total: 968675763645.37 },
      { id: "large-second", quantity: 1, total: 901367655565.94 },
      { id: "large-third", quantity: 1, total: 971197777787.26 },
    ]);

    expect(tiedShares.map(({ id, total }) => [id, total])).toEqual([
      ["first", 0.01], ["second", 0.01], ["third", 0],
    ]);
    expect(quantityShares.map(({ id, total }) => [id, total])).toEqual([
      ["one", 0.01], ["two", 0.02], ["three", 0.02],
    ]);
    expect(largeShares.map(({ id, total }) => [id, total])).toEqual([
      ["large-first", 314582417319.38],
      ["large-second", 292723764362.96],
      ["large-third", 315401454333.66],
    ]);
    expect(tiedShares.reduce((sum, row) => sum + Math.round(row.total * 100), 0)).toBe(2);
    expect(quantityShares.reduce((sum, row) => sum + Math.round(row.total * 100), 0)).toBe(5);
  });

  it("previews the exact posted-allocation release in the order currency without writing ledger rows", async () => {
    const dependencies = buildUsecase();
    dependencies.saleOrderRepo.findByIdForUpdate.mockResolvedValue({ ...buildOrder(), total: 100, currency: "USD" });
    const query = jest.fn().mockResolvedValue([{ id: "payment-usd", currency: "USD", applied: "100.00" }]);
    (tx as any).manager.query = query;

    const preview = await dependencies.usecase.preview({ saleOrderId: "order-1", total: 70 });

    expect(preview).toEqual(expect.objectContaining({
      currency: "USD", currentTotal: 100, correctedTotal: 70,
      appliedAmount: 100, pendingAmount: 0, customerCreditCreated: 30,
      releasedByIncome: [{ paymentId: "payment-usd", currency: "USD", amount: 30 }],
    }));
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).not.toContain("FOR UPDATE");
    expect(dependencies.itemRepo.updateAmounts).not.toHaveBeenCalled();
    expect(dependencies.componentRepo.updateAmounts).not.toHaveBeenCalled();
  });

  it("blocks preview and correction when a legacy posted income has a different currency", async () => {
    const dependencies = buildUsecase();
    dependencies.saleOrderRepo.findByIdForUpdate.mockResolvedValue({ ...buildOrder(), total: 100, currency: "PEN" });
    (tx as any).manager.query = jest.fn().mockResolvedValue([{ id: "payment-usd", currency: "USD", applied: "100.00" }]);

    await expect(dependencies.usecase.preview({ saleOrderId: "order-1", total: 70 })).rejects.toThrow(
      "hay ingresos contabilizados en una moneda distinta",
    );
  });

  it("rejects correction when posted allocations changed after preview", async () => {
    const dependencies = buildUsecase();
    dependencies.saleOrderRepo.findByIdForUpdate.mockResolvedValue({ ...buildOrder(), total: 100, currency: "PEN" });
    const query = jest.fn()
      .mockResolvedValueOnce([{ id: "payment-1", currency: "PEN", applied: "100.00" }])
      .mockResolvedValueOnce([{ id: "payment-1", currency: "PEN", applied: "90.00" }]);
    (tx as any).manager.query = query;
    const preview = await dependencies.usecase.preview({ saleOrderId: "order-1", total: 70 });

    await expect(dependencies.usecase.execute({
      saleOrderId: "order-1", total: 70, executedBy: "user-2", previewToken: preview.previewToken,
    })).rejects.toThrow("cambiaron desde la previsualización");
    expect(dependencies.itemRepo.updateAmounts).not.toHaveBeenCalled();
    expect(dependencies.saleOrderRepo.updateAmounts).not.toHaveBeenCalled();
  });

  it("applies the same analysis to any workflow name", async () => {
    const { usecase } = buildUsecase({ workflowName: "VENTA REGULAR" });

    const result = await executeWithPreview(usecase, 100);

    expect(result.stateChanged).toBe(true);
    expect(result.currentState.code).toBe("IN_PROGRESS");
  });

  it("returns an Envíos order through downstream states to its payment gate", async () => {
    const { usecase, saleOrderRepo } = buildUsecase({
      workflowName: "ABONADO ENVIO",
      downstreamState: true,
    });

    const result = await executeWithPreview(usecase, 100);

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

    const result = await executeWithPreview(usecase, 100);

    expect(result.stateChanged).toBe(true);
    expect(result.currentState.code).toBe("WAITING_PAYMENT");
  });

  it("restores and releases stock when payment rollback returns before reservation", async () => {
    const dependencies = buildUsecase({ reservationBeforePayment: false });

    const result = await executeWithPreview(dependencies.usecase, 100);

    expect(result.stockRestored).toBe(true);
    expect(result.stockRestoredAndReserved).toBe(false);
    expect(dependencies.stockReversal.restoreAndRelease).toHaveBeenCalled();
    expect(dependencies.stockCorrection.releaseCurrentReservation).toHaveBeenCalled();
    expect(dependencies.historyRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ stockStatus: "NONE" }),
      }),
      tx,
    );
  });
});
