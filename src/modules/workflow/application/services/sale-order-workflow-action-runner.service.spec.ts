import { BadRequestException } from '@nestjs/common';
import { SaleOrderWorkflowActionRunnerService } from './sale-order-workflow-action-runner.service';
import { MarkerWorkflowActionHandler } from './action-handlers/marker-workflow-action-handler';
import { WorkflowActionHandlerRegistry } from './action-handlers/workflow-action-handler-registry';
import { WarehouseWorkflowActionHandler } from './action-handlers/warehouse-workflow-action-handler';
import { StockWorkflowActionHandler } from './action-handlers/stock-workflow-action-handler';

describe('SaleOrderWorkflowActionRunnerService', () => {
  const order = { id: 'order-1', warehouseId: 'warehouse-1' } as any;
  const tx = {} as any;

  function setup(
    snapshot = { available: 10, reserved: 10, onHand: 10 },
    options: {
      hasActiveReservation?: boolean;
      consumptionStatus?: 'NONE' | 'CONSUMED' | 'RESTORED' | 'INCONSISTENT';
    } = {},
  ) {
    const requirements = {
      resolve: jest
        .fn()
        .mockResolvedValue([{ stockItemId: 'stock-1', quantity: 3 }]),
    };
    const inventory = {
      getSnapshot: jest.fn().mockResolvedValue(snapshot),
      incrementReserved: jest.fn().mockResolvedValue(undefined),
      incrementOnHand: jest.fn().mockResolvedValue(undefined),
    };
    const lock = { lockSnapshots: jest.fn().mockResolvedValue(undefined) };
    const saleOrders = {
      markInvoiceSent: jest.fn().mockResolvedValue(undefined),
      markPreguide: jest.fn().mockResolvedValue(undefined),
      markPrepared: jest.fn().mockResolvedValue(undefined),
      unmarkPreguide: jest.fn().mockResolvedValue(undefined),
      unmarkPrepared: jest.fn().mockResolvedValue(undefined),
      setTrackingByIds: jest.fn().mockResolvedValue(undefined),
      setReserveBool: jest.fn().mockResolvedValue(undefined),
      markStockReverted: jest.fn().mockResolvedValue(undefined),
    };
    const history = {
      listBySaleOrderId: jest
        .fn()
        .mockResolvedValue(
          options.hasActiveReservation === false
            ? []
            : [{ transitionId: 'reserve-transition' }],
        ),
    };
    const transitions = {
      findDetailedById: jest.fn().mockResolvedValue({
        actions: [{ type: 'RESERVE_STOCK', position: 0 }],
      }),
    };
    const consumption = { consume: jest.fn().mockResolvedValue(undefined) };
    const consumptionReversal = {
      restoreAndRelease: jest.fn().mockResolvedValue(false),
      inspectConsumption: jest.fn().mockResolvedValue({
        status: options.consumptionStatus ?? 'NONE',
        activeDocumentIds:
          options.consumptionStatus === 'CONSUMED' ? ['out-1'] : [],
        postedDocumentIds:
          options.consumptionStatus === 'NONE' ? [] : ['out-1'],
      }),
    };
    const warehouseAssignment = {
      assign: jest.fn().mockImplementation(async (_order, _config) => ({
        order: { ..._order, warehouseId: _config.warehouseId },
        outcome: {
          actionType: 'ASSIGN_WAREHOUSE_BY_PROVINCE',
          status: 'APPLIED',
        },
      })),
      assignByWorkflow: jest
        .fn()
        .mockImplementation(async (_order, _config) => ({
          order: { ..._order, warehouseId: _config.warehouseId },
          outcome: {
            actionType: 'ASSIGN_WAREHOUSE_BY_WORKFLOW',
            status: 'APPLIED',
          },
        })),
    };
    const reservationReconciliation = {
      inspect: jest.fn().mockResolvedValue({
        checked: true,
        status: 'COMPLETE',
        warehouseId: 'warehouse-1',
        items: [],
      }),
      reconcile: jest.fn().mockResolvedValue({
        checked: true,
        adjusted: false,
        warehouseId: 'warehouse-1',
        items: [],
      }),
    };
    const actionHandlerRegistry = new WorkflowActionHandlerRegistry(
      new MarkerWorkflowActionHandler(saleOrders as any),
      new WarehouseWorkflowActionHandler(warehouseAssignment as any),
      new StockWorkflowActionHandler(consumptionReversal as any),
    );
    return {
      runner: new SaleOrderWorkflowActionRunnerService(
        requirements as any,
        inventory as any,
        lock as any,
        saleOrders as any,
        history as any,
        transitions as any,
        consumption as any,
        consumptionReversal as any,
        warehouseAssignment as any,
        reservationReconciliation as any,
        actionHandlerRegistry,
      ),
      requirements,
      inventory,
      lock,
      saleOrders,
      history,
      transitions,
      consumption,
      consumptionReversal,
      warehouseAssignment,
      reservationReconciliation,
    };
  }

  it.each([
    ['RESERVE_STOCK', 3, 0],
    ['REVERT_STOCK', -3, 0],
  ] as const)(
    'executes %s with the expected inventory deltas',
    async (type, reservedDelta, onHandDelta) => {
      const { runner, inventory, reservationReconciliation } = setup();

      await runner.run(
        order,
        [
          {
            id: 'a1',
            transitionId: 't1',
            type,
            config: {},
            position: 0,
          } as any,
        ],
        tx,
      );

      expect(inventory.incrementReserved).toHaveBeenCalledWith(
        {
          warehouseId: 'warehouse-1',
          stockItemId: 'stock-1',
          locationId: null,
          delta: reservedDelta,
        },
        tx,
      );
      expect(reservationReconciliation.reconcile).toHaveBeenCalledWith(
        order,
        [{ stockItemId: 'stock-1', quantity: 3 }],
        tx,
      );
      if (onHandDelta) {
        expect(inventory.incrementOnHand).toHaveBeenCalledWith(
          {
            warehouseId: 'warehouse-1',
            stockItemId: 'stock-1',
            locationId: null,
            delta: onHandDelta,
          },
          tx,
        );
      } else {
        expect(inventory.incrementOnHand).not.toHaveBeenCalled();
      }
    },
  );

  it('uses an assigned warehouse for a later stock action', async () => {
    const { runner, inventory, warehouseAssignment } = setup();
    const orderWithoutWarehouse = { id: 'order-1', warehouseId: null } as any;

    const result = await runner.run(
      orderWithoutWarehouse,
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'ASSIGN_WAREHOUSE_BY_PROVINCE',
          config: {
            mode: 'INCLUDE',
            provinceIds: ['1501'],
            warehouseId: '22222222-2222-4222-8222-222222222222',
          },
          position: 0,
        } as any,
        {
          id: 'a2',
          transitionId: 't1',
          type: 'RESERVE_STOCK',
          config: {},
          position: 1,
        } as any,
      ],
      tx,
    );

    expect(warehouseAssignment.assign).toHaveBeenCalled();
    expect(inventory.incrementReserved).toHaveBeenCalledWith(
      {
        warehouseId: '22222222-2222-4222-8222-222222222222',
        stockItemId: 'stock-1',
        locationId: null,
        delta: 3,
      },
      tx,
    );
    expect(result.order.warehouseId).toBe(
      '22222222-2222-4222-8222-222222222222',
    );
    expect(result.outcomes).toEqual([
      { actionType: 'ASSIGN_WAREHOUSE_BY_PROVINCE', status: 'APPLIED' },
      { actionType: 'RESERVE_STOCK', status: 'APPLIED' },
    ]);
  });

  it('uses a workflow-assigned warehouse for a subsequent stock action', async () => {
    const { runner, inventory, warehouseAssignment } = setup();
    warehouseAssignment.assignByWorkflow = jest
      .fn()
      .mockImplementation(async (_order, _config) => ({
        order: { ..._order, warehouseId: _config.warehouseId },
        outcome: {
          actionType: 'ASSIGN_WAREHOUSE_BY_WORKFLOW',
          status: 'APPLIED',
        },
      }));
    const orderWithoutWarehouse = {
      id: 'order-1',
      workflowId: '11111111-1111-4111-8111-111111111111',
      warehouseId: null,
    } as any;

    const result = await runner.run(
      orderWithoutWarehouse,
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'ASSIGN_WAREHOUSE_BY_WORKFLOW',
          config: {
            workflowId: '11111111-1111-4111-8111-111111111111',
            warehouseId: '22222222-2222-4222-8222-222222222222',
          },
          position: 0,
        } as any,
        {
          id: 'a2',
          transitionId: 't1',
          type: 'RESERVE_STOCK',
          config: {},
          position: 1,
        } as any,
      ],
      tx,
    );

    expect(warehouseAssignment.assignByWorkflow).toHaveBeenCalled();
    expect(inventory.incrementReserved).toHaveBeenCalledWith(
      {
        warehouseId: '22222222-2222-4222-8222-222222222222',
        stockItemId: 'stock-1',
        locationId: null,
        delta: 3,
      },
      tx,
    );
    expect(result.order.warehouseId).toBe(
      '22222222-2222-4222-8222-222222222222',
    );
    expect(result.outcomes).toEqual([
      { actionType: 'ASSIGN_WAREHOUSE_BY_WORKFLOW', status: 'APPLIED' },
      { actionType: 'RESERVE_STOCK', status: 'APPLIED' },
    ]);
  });

  it('rejects invalid persisted warehouse assignment config at runtime', async () => {
    const { runner, warehouseAssignment } = setup();

    await expect(
      runner.run(
        { id: 'order-1', warehouseId: null } as any,
        [
          {
            id: 'a1',
            transitionId: 't1',
            type: 'ASSIGN_WAREHOUSE_BY_PROVINCE',
            config: {
              mode: 'INCLUDE',
              provinceIds: [],
              warehouseId: 'invalid',
            },
            position: 0,
          } as any,
        ],
        tx,
      ),
    ).rejects.toThrow('Configuracion de asignacion de almacen invalida');
    expect(warehouseAssignment.assign).not.toHaveBeenCalled();
  });

  it('skips marking an invoice that was already sent', async () => {
    const { runner, saleOrders, requirements } = setup();
    const orderWithoutWarehouse = {
      id: 'order-1',
      warehouseId: null,
      invoiceSend: true,
    } as any;

    const result = await runner.run(
      orderWithoutWarehouse,
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'MARK_INVOICE_SENT',
          config: {},
          position: 0,
        } as any,
      ],
      tx,
    );

    expect(saleOrders.markInvoiceSent).not.toHaveBeenCalled();
    expect(result.outcomes).toEqual([
      expect.objectContaining({
        actionType: 'MARK_INVOICE_SENT',
        status: 'SKIPPED',
      }),
    ]);
    expect(requirements.resolve).not.toHaveBeenCalled();
  });

  it('marks preguide without requiring a warehouse', async () => {
    const { runner, saleOrders, requirements } = setup();
    const orderWithoutWarehouse = { id: 'order-1', warehouseId: null } as any;

    await runner.run(
      orderWithoutWarehouse,
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'MARK_PREGUIDE',
          config: {},
          position: 0,
        } as any,
      ],
      tx,
    );

    expect(saleOrders.markPreguide).toHaveBeenCalledWith('order-1', tx);
    expect(saleOrders.setTrackingByIds).not.toHaveBeenCalled();
    expect(requirements.resolve).not.toHaveBeenCalled();
  });

  it('marks prepared without requiring a warehouse', async () => {
    const { runner, saleOrders, requirements } = setup();
    const orderWithoutWarehouse = { id: 'order-1', warehouseId: null } as any;

    await runner.run(
      orderWithoutWarehouse,
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'MARK_PREPARED',
          config: {},
          position: 0,
        } as any,
      ],
      tx,
    );

    expect(saleOrders.markPrepared).toHaveBeenCalledWith('order-1', tx);
    expect(saleOrders.setTrackingByIds).not.toHaveBeenCalled();
    expect(requirements.resolve).not.toHaveBeenCalled();
  });

  it('unmarks preguide without requiring a warehouse', async () => {
    const { runner, saleOrders, requirements } = setup();
    const orderWithoutWarehouse = {
      id: 'order-1',
      warehouseId: null,
      preguide: true,
    } as any;

    await runner.run(
      orderWithoutWarehouse,
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'UNMARK_PREGUIDE',
          config: {},
          position: 0,
        } as any,
      ],
      tx,
    );

    expect(saleOrders.unmarkPreguide).toHaveBeenCalledWith('order-1', tx);
    expect(requirements.resolve).not.toHaveBeenCalled();
  });

  it('unmarks prepared without requiring a warehouse', async () => {
    const { runner, saleOrders, requirements } = setup();
    const orderWithoutWarehouse = {
      id: 'order-1',
      warehouseId: null,
      prepared: true,
    } as any;

    await runner.run(
      orderWithoutWarehouse,
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'UNMARK_PREPARED',
          config: {},
          position: 0,
        } as any,
      ],
      tx,
    );

    expect(saleOrders.unmarkPrepared).toHaveBeenCalledWith('order-1', tx);
    expect(requirements.resolve).not.toHaveBeenCalled();
  });

  it('unmarks prepared when the transition also reserves stock', async () => {
    const { runner, saleOrders, inventory } = setup();

    await runner.run(
      { ...order, prepared: true },
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'RESERVE_STOCK',
          config: {},
          position: 0,
        } as any,
        {
          id: 'a2',
          transitionId: 't1',
          type: 'UNMARK_PREPARED',
          config: {},
          position: 1,
        } as any,
      ],
      tx,
    );

    expect(inventory.incrementReserved).toHaveBeenCalled();
    expect(saleOrders.unmarkPrepared).toHaveBeenCalledWith('order-1', tx);
  });

  it('validates every snapshot before applying mutations', async () => {
    const { runner, inventory } = setup({
      available: 2,
      reserved: 2,
      onHand: 2,
    });

    await expect(
      runner.run(
        order,
        [
          {
            id: 'a1',
            transitionId: 't1',
            type: 'RESERVE_STOCK',
            config: {},
            position: 0,
          } as any,
        ],
        tx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(inventory.incrementReserved).not.toHaveBeenCalled();
  });

  it('continues reverting stock when the order has no warehouse', async () => {
    const { runner, requirements, inventory } = setup();
    const orderWithoutWarehouse = { id: 'order-1', warehouseId: null } as any;

    await runner.run(
      orderWithoutWarehouse,
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'REVERT_STOCK',
          config: {},
          position: 0,
        } as any,
      ],
      tx,
    );

    expect(requirements.resolve).not.toHaveBeenCalled();
    expect(inventory.incrementReserved).not.toHaveBeenCalled();
  });

  it.each([
    [0, 0],
    [2, -2],
  ])(
    'reverts only the existing reserved stock when reserved is %s',
    async (reserved, expectedDelta) => {
      const { runner, inventory } = setup({
        available: 10 - reserved,
        reserved,
        onHand: 10,
      });

      await runner.run(
        order,
        [
          {
            id: 'a1',
            transitionId: 't1',
            type: 'REVERT_STOCK',
            config: {},
            position: 0,
          } as any,
        ],
        tx,
      );

      if (expectedDelta === 0) {
        expect(inventory.incrementReserved).not.toHaveBeenCalled();
      } else {
        expect(inventory.incrementReserved).toHaveBeenCalledWith(
          {
            warehouseId: 'warehouse-1',
            stockItemId: 'stock-1',
            locationId: null,
            delta: expectedDelta,
          },
          tx,
        );
      }
    },
  );

  it('continues reverting stock when the inventory snapshot does not exist', async () => {
    const { runner, inventory } = setup(null as any);

    await runner.run(
      order,
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'REVERT_STOCK',
          config: {},
          position: 0,
        } as any,
      ],
      tx,
    );

    expect(inventory.incrementReserved).not.toHaveBeenCalled();
  });

  it('delegates stock consumption to one inventory document operation', async () => {
    const { runner, consumption, inventory } = setup();

    await runner.run(
      order,
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'CONSUME_STOCK',
          config: {},
          position: 0,
        } as any,
      ],
      tx,
    );

    expect(consumption.consume).toHaveBeenCalledWith(
      order,
      [{ stockItemId: 'stock-1', quantity: 3 }],
      tx,
      null,
    );
    expect(inventory.incrementReserved).not.toHaveBeenCalled();
    expect(inventory.incrementOnHand).not.toHaveBeenCalled();
  });

  it('allows a legacy order to continue when its stock was already consumed', async () => {
    const { runner, consumption, inventory, saleOrders, requirements } = setup(
      { available: 0, reserved: 0, onHand: 0 },
      { consumptionStatus: 'CONSUMED' },
    );

    const result = await runner.run(
      order,
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'CONSUME_STOCK',
          config: {},
          position: 0,
        } as any,
      ],
      tx,
    );

    expect(requirements.resolve).not.toHaveBeenCalled();
    expect(inventory.getSnapshot).not.toHaveBeenCalled();
    expect(consumption.consume).not.toHaveBeenCalled();
    expect(saleOrders.setReserveBool).toHaveBeenCalledWith(
      { saleOrderId: 'order-1', reserveBool: false },
      tx,
    );
    expect(result.stockStatus).toBe('CONSUMED');
    expect(result.outcomes).toEqual([
      expect.objectContaining({
        actionType: 'CONSUME_STOCK',
        status: 'SKIPPED',
      }),
    ]);
  });

  it('rejects a new reservation when the order already has an active consumption', async () => {
    const { runner, inventory, requirements } = setup(
      { available: 10, reserved: 0, onHand: 10 },
      { consumptionStatus: 'CONSUMED' },
    );

    await expect(
      runner.run(
        order,
        [
          {
            id: 'a1',
            transitionId: 't1',
            type: 'RESERVE_STOCK',
            config: {},
            position: 0,
          } as any,
        ],
        tx,
      ),
    ).rejects.toThrow(
      'El stock del pedido ya fue consumido y no puede reservarse nuevamente',
    );

    expect(requirements.resolve).not.toHaveBeenCalled();
    expect(inventory.incrementReserved).not.toHaveBeenCalled();
  });

  it('skips reserving stock when the order already has an active reservation', async () => {
    const { runner, inventory, requirements, reservationReconciliation } = setup();

    const result = await runner.run(
      { ...order, reserveBool: true },
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'RESERVE_STOCK',
          config: {},
          position: 0,
        } as any,
      ],
      tx,
    );

    expect(requirements.resolve).toHaveBeenCalledTimes(1);
    expect(reservationReconciliation.inspect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1', reserveBool: true }),
      [{ stockItemId: 'stock-1', quantity: 3 }],
      tx,
    );
    expect(inventory.incrementReserved).not.toHaveBeenCalled();
    expect(result.stockStatus).toBe('RESERVED');
    expect(result.outcomes).toEqual([
      expect.objectContaining({
        actionType: 'RESERVE_STOCK',
        status: 'SKIPPED',
      }),
    ]);
  });

  it('rejects an active reservation when inventory evidence is inconsistent', async () => {
    const { runner, inventory, requirements, reservationReconciliation } = setup();
    reservationReconciliation.inspect.mockResolvedValue({
      checked: true,
      status: 'INCONSISTENT',
      warehouseId: 'warehouse-1',
      items: [],
    });

    await expect(
      runner.run(
        { ...order, reserveBool: true },
        [
          {
            id: 'a1',
            transitionId: 't1',
            type: 'RESERVE_STOCK',
            config: {},
            position: 0,
          } as any,
        ],
        tx,
      ),
    ).rejects.toThrow(
      'La reserva activa del pedido no coincide con las existencias reservadas',
    );

    expect(requirements.resolve).toHaveBeenCalledTimes(1);
    expect(inventory.incrementReserved).not.toHaveBeenCalled();
  });

  it('uses the delivery window to date a delayed order movement', async () => {
    const { runner, consumption, history, transitions } = setup();
    const delayedOrder = {
      ...order,
      deliveryDate: '2026-08-18',
      currentStateId: 'waiting-payment',
    } as any;
    history.listBySaleOrderId.mockResolvedValue([
      {
        transitionId: 'delivery-window-transition',
        toStateId: 'waiting-payment',
      },
    ]);
    transitions.findDetailedById.mockResolvedValue({
      conditions: [
        {
          type: 'SCHEDULE_DELIVERY_WINDOW',
          config: { minDaysBefore: 0, maxDaysBefore: 1 },
        },
      ],
      actions: [],
    });

    await runner.run(
      delayedOrder,
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'CONSUME_STOCK',
          config: {},
          position: 0,
        } as any,
      ],
      tx,
    );

    expect(consumption.consume).toHaveBeenCalledWith(
      delayedOrder,
      [{ stockItemId: 'stock-1', quantity: 3 }],
      tx,
      '2026-08-17',
    );
  });

  it.each([
    ['RESERVE_STOCK', true],
    ['REVERT_STOCK', false],
    ['CONSUME_STOCK', false],
  ] as const)('marks reserveBool as %s after %s', async (type, reserveBool) => {
    const { runner, saleOrders } = setup();

    await runner.run(
      order,
      [{ id: 'a1', transitionId: 't1', type, config: {}, position: 0 } as any],
      tx,
    );

    expect(saleOrders.setReserveBool).toHaveBeenCalledWith(
      { saleOrderId: 'order-1', reserveBool },
      tx,
    );
  });

  it.each(['RESERVE_STOCK', 'CONSUME_STOCK'] as const)(
    'rejects %s when the order has no effective stock requirements',
    async (type) => {
      const { runner, requirements, saleOrders, inventory, consumption } =
        setup();
      requirements.resolve.mockResolvedValue([]);

      await expect(
        runner.run(
          order,
          [
            {
              id: 'a1',
              transitionId: 't1',
              type,
              config: {},
              position: 0,
            } as any,
          ],
          tx,
        ),
      ).rejects.toThrow(
        'El pedido no tiene requisitos de stock validos y positivos',
      );

      expect(saleOrders.setReserveBool).not.toHaveBeenCalled();
      expect(inventory.incrementReserved).not.toHaveBeenCalled();
      expect(consumption.consume).not.toHaveBeenCalled();
    },
  );

  it('does not revert reservations owned by other orders when this order never reserved stock', async () => {
    const { runner, inventory, requirements } = setup(
      { available: 0, reserved: 10, onHand: 10 },
      { hasActiveReservation: false },
    );

    await runner.run(
      order,
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'REVERT_STOCK',
          config: {},
          position: 0,
        } as any,
      ],
      tx,
    );

    expect(requirements.resolve).not.toHaveBeenCalled();
    expect(inventory.incrementReserved).not.toHaveBeenCalled();
  });

  it('restores consumed stock before finishing a stock reversal', async () => {
    const { runner, consumptionReversal, requirements, inventory } = setup(
      { available: 10, reserved: 0, onHand: 7 },
      { hasActiveReservation: false, consumptionStatus: 'CONSUMED' },
    );
    consumptionReversal.restoreAndRelease.mockResolvedValue(true);

    await runner.run(
      { ...order, createdBy: 'creator-1' },
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'REVERT_STOCK',
          config: {},
          position: 0,
        } as any,
      ],
      tx,
      'user-2',
    );

    expect(consumptionReversal.restoreAndRelease).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1' }),
      'user-2',
      tx,
    );
    expect(requirements.resolve).not.toHaveBeenCalled();
    expect(inventory.incrementReserved).not.toHaveBeenCalled();
  });

  it('restores consumed stock through the explicit restore action', async () => {
    const { runner, consumptionReversal, requirements, inventory } = setup(
      { available: 10, reserved: 0, onHand: 7 },
      { hasActiveReservation: false, consumptionStatus: 'CONSUMED' },
    );
    consumptionReversal.restoreAndRelease.mockResolvedValue(true);

    await runner.run(
      { ...order, createdBy: 'creator-1' },
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'RESTORE_STOCK',
          config: {},
          position: 0,
        } as any,
      ],
      tx,
      'user-2',
    );

    expect(consumptionReversal.restoreAndRelease).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1' }),
      'user-2',
      tx,
    );
    expect(requirements.resolve).not.toHaveBeenCalled();
    expect(inventory.incrementReserved).not.toHaveBeenCalled();
  });

  it('rejects restoring stock when the order has no pending consumption', async () => {
    const { runner, consumptionReversal } = setup(
      { available: 10, reserved: 0, onHand: 10 },
      { hasActiveReservation: false },
    );
    consumptionReversal.restoreAndRelease.mockResolvedValue(false);

    await expect(
      runner.run(
        order,
        [
          {
            id: 'a1',
            transitionId: 't1',
            type: 'RESTORE_STOCK',
            config: {},
            position: 0,
          } as any,
        ],
        tx,
      ),
    ).rejects.toThrow(
      'El pedido no tiene consumo de stock pendiente de reponer',
    );
  });

  it('replays only the recorded transition branch when checking active reservations', async () => {
    const { runner, inventory, requirements, history, transitions } = setup(
      { available: 0, reserved: 10, onHand: 10 },
      { hasActiveReservation: false },
    );
    history.listBySaleOrderId.mockResolvedValue([
      {
        transitionId: 'reserve-transition',
        metadata: { branch: 'THEN' },
      },
    ]);
    transitions.findDetailedById.mockResolvedValue({
      actions: [
        { type: 'RESERVE_STOCK', position: 0, branch: 'ELSE' },
        { type: 'MARK_INVOICE_SENT', position: 1, branch: 'THEN' },
      ],
    });

    await runner.run(
      order,
      [
        {
          id: 'a1',
          transitionId: 't1',
          type: 'REVERT_STOCK',
          config: {},
          position: 0,
        } as any,
      ],
      tx,
    );

    expect(requirements.resolve).not.toHaveBeenCalled();
    expect(inventory.incrementReserved).not.toHaveBeenCalled();
  });
});
