import { SaleOrderPaymentWorkflowReconciliationService } from './sale-order-payment-workflow-reconciliation.service';

describe('SaleOrderPaymentWorkflowReconciliationService', () => {
  const tx = { manager: {} } as any;
  const states = [
    {
      id: 'state-draft',
      code: 'DRAFT',
      name: 'Borrador',
      isActive: true,
      isInitial: true,
    },
    {
      id: 'state-created',
      code: 'CREATED',
      name: 'Creado',
      isActive: true,
      isInitial: false,
    },
    {
      id: 'state-coordinated',
      code: 'COORDINATED',
      name: 'Coordinado',
      isActive: true,
      isInitial: false,
    },
    {
      id: 'state-programmed',
      code: 'PROGRAMADO',
      name: 'Programado',
      isActive: true,
      isInitial: false,
    },
    {
      id: 'state-waiting',
      code: 'WAITING',
      name: 'Esperando',
      isActive: true,
      isInitial: false,
    },
    {
      id: 'state-to-send',
      code: 'TO_SEND',
      name: 'Por enviar',
      isActive: true,
      isInitial: false,
    },
  ];
  const transitions = [
    {
      id: 'transition-created',
      fromStateId: 'state-draft',
      toStateId: 'state-created',
      elseToStateId: null,
      isActive: true,
    },
    {
      id: 'transition-created-programmed',
      fromStateId: 'state-created',
      toStateId: 'state-programmed',
      elseToStateId: 'state-coordinated',
      isActive: true,
    },
    {
      id: 'transition-programmed',
      fromStateId: 'state-coordinated',
      toStateId: 'state-programmed',
      elseToStateId: null,
      isActive: true,
    },
    {
      id: 'transition-waiting',
      fromStateId: 'state-programmed',
      toStateId: 'state-waiting',
      elseToStateId: null,
      isActive: true,
    },
    {
      id: 'transition-paid',
      fromStateId: 'state-waiting',
      toStateId: 'state-to-send',
      elseToStateId: null,
      isActive: true,
    },
  ];
  const conditions = [
    {
      id: 'condition-created-programmed-date',
      transitionId: 'transition-created-programmed',
      type: 'SCHEDULE_DELIVERY_WINDOW',
      config: { minDaysBefore: 0, maxDaysBefore: 1 },
      position: 0,
    },
    {
      id: 'condition-programmed-date',
      transitionId: 'transition-programmed',
      type: 'SCHEDULE_DELIVERY_WINDOW',
      config: { minDaysBefore: 0, maxDaysBefore: 1 },
      position: 0,
    },
    {
      id: 'condition-waiting-date',
      transitionId: 'transition-waiting',
      type: 'SCHEDULE_DELIVERY_WINDOW',
      config: { minDaysBefore: 0, maxDaysBefore: 0 },
      position: 0,
    },
    {
      id: 'condition-paid',
      transitionId: 'transition-paid',
      type: 'IS_PAID',
      config: {},
      position: 0,
    },
  ];
  const actions = [
    {
      id: 'action-created-reserve',
      transitionId: 'transition-created-programmed',
      type: 'RESERVE_STOCK',
      config: {},
      position: 0,
      branch: 'THEN',
    },
    {
      id: 'action-reserve',
      transitionId: 'transition-programmed',
      type: 'RESERVE_STOCK',
      config: {},
      position: 0,
      branch: 'THEN',
    },
  ];

  function buildFixture(input: {
    currentStateId?: string;
    deliveryDate: string;
    totalPaid?: number;
    withoutHistory?: boolean;
    historyOverride?: unknown[];
    reserveBool?: boolean;
    stockConsumptionRestored?: boolean;
  }) {
    const currentStateId = input.currentStateId ?? 'state-waiting';
    const order = {
      id: 'order-1',
      serie: 'PE',
      correlative: 10,
      warehouseId: 'warehouse-1',
      clientId: 'client-1',
      workflowId: 'workflow-1',
      currentStateId,
      total: 100,
      deliveryDate: input.deliveryDate,
      scheduleDate: null,
      invoiceSend: false,
      reserveBool: input.reserveBool ?? true,
      createdBy: 'user-1',
      isActive: true,
    };
    const fullHistory = [
      {
        transitionId: 'transition-created-programmed',
        fromStateId: 'state-created',
        toStateId: 'state-programmed',
        metadata: { branch: 'THEN' },
      },
      {
        transitionId: 'transition-waiting',
        fromStateId: 'state-programmed',
        toStateId: 'state-waiting',
        metadata: { branch: 'THEN' },
      },
      ...(currentStateId === 'state-to-send'
        ? [
            {
              transitionId: 'transition-paid',
              fromStateId: 'state-waiting',
              toStateId: 'state-to-send',
              metadata: { branch: 'THEN' },
            },
          ]
        : []),
    ];
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue(order),
      updateWorkflowState: jest.fn().mockResolvedValue(undefined),
    };
    const paymentRepo = {
      listBySaleOrderIds: jest
        .fn()
        .mockResolvedValue([{ amount: input.totalPaid ?? 100 }]),
    };
    const workflowRepo = {
      findDetailedById: jest.fn().mockResolvedValue({
        workflow: { id: 'workflow-1', name: 'ABONADO ENVIO' },
        states,
        transitions,
        conditions,
        actions,
      }),
    };
    const historyRepo = {
      listBySaleOrderId: jest
        .fn()
        .mockResolvedValue(
          input.historyOverride ?? (input.withoutHistory ? [] : fullHistory),
        ),
      append: jest.fn().mockResolvedValue(undefined),
    };
    const stockReversal = {
      restoreAndReserve: jest.fn().mockResolvedValue(false),
      restoreAndRelease: jest
        .fn()
        .mockResolvedValue(input.stockConsumptionRestored ?? false),
    };
    const stockCorrection = {
      releaseCurrentReservation: jest.fn().mockResolvedValue(undefined),
    };
    const service = new SaleOrderPaymentWorkflowReconciliationService(
      saleOrderRepo as any,
      paymentRepo as any,
      workflowRepo as any,
      historyRepo as any,
      { now: () => new Date('2026-08-21T12:00:00.000Z') } as any,
      stockReversal as any,
      stockCorrection as any,
    );

    return {
      service,
      saleOrderRepo,
      historyRepo,
      stockReversal,
      stockCorrection,
    };
  }

  it('returns an Esperando order to Coordinado when the new delivery date is outside the scheduling window', async () => {
    const fixture = buildFixture({ deliveryDate: '2026-08-25' });

    const result = await fixture.service.reconcile(
      {
        saleOrderId: 'order-1',
        executedBy: 'user-2',
        source: 'sale-order-with-client-save',
        previousDeliveryDate: '2026-08-21',
        currentDeliveryDate: '2026-08-25',
      },
      tx,
    );

    expect(result).toEqual(
      expect.objectContaining({
        paymentStatus: 'PAID',
        deliveryDateChanged: true,
        currentState: expect.objectContaining({ code: 'COORDINATED' }),
        invalidatedDeliveryDateTransitionIds: expect.arrayContaining([
          'transition-waiting',
          'transition-created-programmed',
        ]),
      }),
    );
    expect(fixture.saleOrderRepo.updateWorkflowState).toHaveBeenCalledWith(
      { saleOrderId: 'order-1', currentStateId: 'state-coordinated' },
      tx,
    );
    expect(
      fixture.stockCorrection.releaseCurrentReservation,
    ).toHaveBeenCalled();
    expect(fixture.historyRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        fromStateId: 'state-waiting',
        toStateId: 'state-coordinated',
        metadata: expect.objectContaining({
          rollbackReason: 'delivery-date-condition-invalidated',
          previousDeliveryDate: '2026-08-21',
          deliveryDate: '2026-08-25',
        }),
      }),
      tx,
    );
  });

  it('returns an Esperando order only to Programado when delivery is tomorrow', async () => {
    const fixture = buildFixture({ deliveryDate: '2026-08-22' });

    const result = await fixture.service.reconcile(
      {
        saleOrderId: 'order-1',
        executedBy: 'user-2',
        source: 'sale-order-with-client-save',
      },
      tx,
    );

    expect(result.currentState.code).toBe('PROGRAMADO');
    expect(result.invalidatedDeliveryDateTransitionIds).toEqual([
      'transition-waiting',
    ]);
    expect(fixture.stockReversal.restoreAndReserve).toHaveBeenCalled();
    expect(
      fixture.stockCorrection.releaseCurrentReservation,
    ).not.toHaveBeenCalled();
  });

  it('uses payment and delivery date together to find the earliest valid state', async () => {
    const fixture = buildFixture({
      currentStateId: 'state-to-send',
      deliveryDate: '2026-08-25',
      totalPaid: 20,
    });

    const result = await fixture.service.reconcile(
      {
        saleOrderId: 'order-1',
        executedBy: 'user-2',
        source: 'sale-order-total-correction',
        currentTotal: 100,
      },
      tx,
    );

    expect(result.currentState.code).toBe('COORDINATED');
    expect(result.invalidatedPaymentTransitionIds).toEqual(['transition-paid']);
    expect(result.invalidatedDeliveryDateTransitionIds).toEqual(
      expect.arrayContaining([
        'transition-waiting',
        'transition-created-programmed',
      ]),
    );
    expect(fixture.historyRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          rollbackReason: 'payment-and-delivery-date-conditions-invalidated',
        }),
      }),
      tx,
    );
  });

  it('uses the workflow graph for legacy orders without state history', async () => {
    const fixture = buildFixture({
      deliveryDate: '2026-08-25',
      withoutHistory: true,
    });

    const result = await fixture.service.reconcile(
      {
        saleOrderId: 'order-1',
        executedBy: 'user-2',
        source: 'sale-order-with-client-save',
      },
      tx,
    );

    expect(result.currentState.code).toBe('COORDINATED');
  });

  it('returns Por enviar to Coordinado and restores consumed stock even when a prior correction interrupts its history', async () => {
    const fixture = buildFixture({
      currentStateId: 'state-to-send',
      deliveryDate: '2026-08-25',
      totalPaid: 20,
      reserveBool: false,
      stockConsumptionRestored: true,
      historyOverride: [
        {
          transitionId: null,
          fromStateId: 'state-to-send',
          toStateId: 'state-waiting',
          metadata: { source: 'previous-correction' },
        },
        {
          transitionId: 'transition-paid',
          fromStateId: 'state-waiting',
          toStateId: 'state-to-send',
          metadata: { branch: 'THEN' },
        },
      ],
    });

    const result = await fixture.service.reconcile(
      {
        saleOrderId: 'order-1',
        executedBy: 'user-2',
        source: 'sale-order-with-client-save',
        previousDeliveryDate: '2026-08-21',
        currentDeliveryDate: '2026-08-25',
      },
      tx,
    );

    expect(result).toEqual(
      expect.objectContaining({
        currentState: expect.objectContaining({ code: 'COORDINATED' }),
        stockRestored: true,
        invalidatedPaymentTransitionIds: ['transition-paid'],
        invalidatedDeliveryDateTransitionIds: expect.arrayContaining([
          'transition-waiting',
          'transition-programmed',
        ]),
      }),
    );
    expect(fixture.stockReversal.restoreAndRelease).toHaveBeenCalled();
    expect(fixture.stockReversal.restoreAndReserve).not.toHaveBeenCalled();
    expect(
      fixture.stockCorrection.releaseCurrentReservation,
    ).toHaveBeenCalled();
  });
});
