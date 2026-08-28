import 'reflect-metadata';
import { ACTIONS } from 'src/modules/workflow/domain/constants/workflow-action.constants';
import { SaleOrderEditPolicyService } from '../../services/sale-order-edit-policy.service';
import { UpdateSaleOrderUsecase } from './update.usecase';

describe('UpdateSaleOrderUsecase', () => {
  const input = {
    saleOrderId: 'order-1',
    warehouseId: 'warehouse-1',
    clientId: 'client-1',
    items: [
      {
        quantity: 1,
        unitPrice: 10,
        total: 10,
        components: [{ skuId: 'sku-1', quantity: 1, unitPrice: 10, total: 10 }],
      },
    ],
  };

  const createFixture = (
    stockActions: Array<
      | string
      | {
          type: string;
          actionBranch?: 'THEN' | 'ELSE';
          executedBranch?: 'THEN' | 'ELSE';
        }
    > = [],
    currentStateIsFinal = false,
    packRepo = { findByIdWithItems: jest.fn() },
    commandAuthorization?: {
      authorizeUpdate: jest.Mock;
      authorizeAdvancedOrder: jest.Mock;
    },
  ) => {
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({
        id: 'order-1',
        warehouseId: 'warehouse-1',
        workflowId: 'workflow-1',
        currentStateId: 'state-1',
        createdBy: 'user-1',
        subTotal: 10,
        deliveryCost: 0,
        discount: 0,
        total: 10,
      }),
      update: jest.fn().mockImplementation((updateInput: any) =>
        Promise.resolve({
          id: 'order-1',
          serie: 'PED',
          correlative: 1,
          warehouseId: updateInput.warehouseId,
          workflowId: updateInput.workflowId,
          currentStateId: updateInput.currentStateId,
        }),
      ),
    };
    const saleOrderItemRepo = {
      listBySaleOrderId: jest.fn().mockResolvedValue([
        {
          id: 'old-item',
          referencePackId: null,
          quantity: 1,
          unitPrice: 10,
          total: 10,
        },
      ]),
      deleteBySaleOrderId: jest.fn(),
      bulkCreate: jest.fn().mockResolvedValue([{ id: 'new-item' }]),
    };
    const componentRepo = {
      listBySaleOrderItemIds: jest.fn().mockResolvedValue([
        {
          saleOrderItemId: 'old-item',
          skuId: 'sku-1',
          referencePackItemId: null,
          quantity: 1,
          unitPrice: 10,
          total: 10,
        },
      ]),
      deleteBySaleOrderItemIds: jest.fn(),
      bulkCreate: jest.fn(),
    };
    const paymentRepo = {
      deleteBySaleOrderId: jest.fn(),
      bulkCreate: jest.fn(),
    };
    const historyRepo = {
      append: jest.fn(),
      listBySaleOrderId: jest.fn().mockResolvedValue(
        stockActions.map((action, index) => ({
          transitionId: `transition-${index}`,
          metadata:
            typeof action === 'string' || !action.executedBranch
              ? null
              : { branch: action.executedBranch },
        })),
      ),
    };
    const transitionRepo = {
      findDetailedById: jest.fn().mockImplementation((transitionId: string) => {
        const index = Number(transitionId.split('-')[1]);
        const action = stockActions[index];
        return Promise.resolve({
          actions: [
            {
              type: typeof action === 'string' ? action : action.type,
              branch:
                typeof action === 'string'
                  ? 'THEN'
                  : (action.actionBranch ?? 'THEN'),
              position: 0,
            },
          ],
        });
      }),
    };
    const workflowRepo = {
      findDetailedById: jest.fn().mockImplementation((workflowId: string) =>
        Promise.resolve(
          workflowId === 'workflow-2'
            ? {
                workflow: { id: 'workflow-2', isActive: true },
                states: [
                  {
                    id: 'state-2',
                    isActive: true,
                    isInitial: true,
                    isFinal: false,
                  },
                ],
              }
            : {
                workflow: { id: 'workflow-1', isActive: true },
                states: [
                  {
                    id: 'state-1',
                    isActive: true,
                    isInitial: false,
                    isFinal: currentStateIsFinal,
                  },
                ],
              },
        ),
      ),
    };
    const suppliesService = {
      listBySaleOrderId: jest.fn().mockResolvedValue([]),
      replace: jest.fn(),
      copyFromWorkflowRecipe: jest.fn(),
    };
    const paymentWorkflowReconciliation = {
      reconcile: jest.fn().mockResolvedValue({ stateChanged: true }),
    };
    const stockCorrection = {
      releasePreviousComposition: jest.fn().mockResolvedValue(true),
      reserveCorrectedComposition: jest.fn().mockResolvedValue(undefined),
      consumeCorrectedComposition: jest.fn().mockResolvedValue(undefined),
    };
    const editPolicy = new SaleOrderEditPolicyService(
      historyRepo as any,
      transitionRepo as any,
      workflowRepo as any,
    );
    const usecase = new UpdateSaleOrderUsecase(
      { runInTransaction: (work: any) => work({}) } as any,
      packRepo as any,
      saleOrderRepo as any,
      saleOrderItemRepo as any,
      componentRepo as any,
      paymentRepo as any,
      workflowRepo as any,
      editPolicy,
      undefined,
      undefined,
      commandAuthorization as any,
      suppliesService as any,
      paymentWorkflowReconciliation as any,
      stockCorrection as any,
      historyRepo as any,
      { now: () => new Date('2026-08-28T12:00:00.000Z') } as any,
    );

    return {
      usecase,
      saleOrderRepo,
      saleOrderItemRepo,
      componentRepo,
      paymentRepo,
      packRepo,
      suppliesService,
      paymentWorkflowReconciliation,
      stockCorrection,
      historyRepo,
      commandAuthorization,
    };
  };

  it('replaces order lines without mutating inventory', async () => {
    const { usecase, componentRepo, paymentRepo } = createFixture();

    await usecase.execute(input);

    expect(componentRepo.bulkCreate).toHaveBeenCalled();
    expect(paymentRepo.deleteBySaleOrderId).not.toHaveBeenCalled();
  });

  it('reconciles the payment state when a standard save changes the total', async () => {
    const { usecase, paymentWorkflowReconciliation } = createFixture();

    await usecase.execute({
      ...input,
      userId: 'user-2',
      items: [
        {
          ...input.items[0],
          unitPrice: 20,
          total: 20,
          components: [
            { skuId: 'sku-1', quantity: 1, unitPrice: 20, total: 20 },
          ],
        },
      ],
    });

    expect(paymentWorkflowReconciliation.reconcile).toHaveBeenCalledWith(
      {
        saleOrderId: 'order-1',
        executedBy: 'user-2',
        source: 'sale-order-standard-save',
        previousTotal: 10,
        currentTotal: 20,
      },
      expect.anything(),
    );
  });

  it('reconciles the complete workflow when only the delivery date changes', async () => {
    const { usecase, paymentWorkflowReconciliation } = createFixture();

    await usecase.execute({
      ...input,
      userId: 'user-2',
      deliveryDate: '2026-08-25',
    });

    expect(paymentWorkflowReconciliation.reconcile).toHaveBeenCalledWith(
      {
        saleOrderId: 'order-1',
        executedBy: 'user-2',
        source: 'sale-order-standard-save',
        previousTotal: 10,
        currentTotal: 10,
        previousDeliveryDate: null,
        currentDeliveryDate: '2026-08-25',
      },
      expect.anything(),
    );
  });

  it('requires Pedidos avanzados to change the date after stock was reserved', async () => {
    const commandAuthorization = {
      authorizeUpdate: jest.fn().mockResolvedValue(undefined),
      authorizeAdvancedOrder: jest
        .fn()
        .mockRejectedValue(new Error('sale_orders.advanced_orders')),
    };
    const fixture = createFixture(
      [ACTIONS.RESERVE_STOCK],
      false,
      { findByIdWithItems: jest.fn() },
      commandAuthorization,
    );

    await expect(
      fixture.usecase.execute({
        ...input,
        userId: 'user-2',
        deliveryDate: '2026-08-25',
      }),
    ).rejects.toThrow('sale_orders.advanced_orders');

    expect(commandAuthorization.authorizeAdvancedOrder).toHaveBeenCalledWith(
      'user-2',
    );
    expect(fixture.saleOrderRepo.update).not.toHaveBeenCalled();
  });

  it('requires Pedidos avanzados to change the delivery date of a final order', async () => {
    const commandAuthorization = {
      authorizeUpdate: jest.fn().mockResolvedValue(undefined),
      authorizeAdvancedOrder: jest
        .fn()
        .mockRejectedValue(new Error('sale_orders.advanced_orders')),
    };
    const fixture = createFixture(
      [],
      true,
      { findByIdWithItems: jest.fn() },
      commandAuthorization,
    );

    await expect(
      fixture.usecase.execute({
        ...input,
        userId: 'user-2',
        deliveryDate: '2026-08-25',
      }),
    ).rejects.toThrow('sale_orders.advanced_orders');

    expect(commandAuthorization.authorizeAdvancedOrder).toHaveBeenCalledWith(
      'user-2',
    );
    expect(fixture.saleOrderRepo.update).not.toHaveBeenCalled();
  });

  it('computes subtotal and total from item totals, delivery and discount', async () => {
    const { usecase, saleOrderRepo } = createFixture();

    await usecase.execute({
      ...input,
      deliveryCost: 5,
      discount: 3,
      subTotal: 999,
      total: 999,
    });

    expect(saleOrderRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        subTotal: 10,
        deliveryCost: 5,
        discount: 3,
        total: 12,
      }),
      expect.anything(),
    );
  });

  it('allows metadata edits when the current workflow state is final', async () => {
    const fixture = createFixture([], true);

    await expect(
      fixture.usecase.execute({
        ...input,
        note: 'Nueva observacion interna',
      }),
    ).resolves.toEqual(expect.objectContaining({ orderId: 'order-1' }));
  });

  it('allows quantity and price corrections when the current workflow state is final', async () => {
    const fixture = createFixture([], true);

    await expect(
      fixture.usecase.execute({
        ...input,
        items: [
          {
            ...input.items[0],
            quantity: 2,
          },
        ],
      }),
    ).resolves.toEqual(expect.objectContaining({ orderId: 'order-1' }));

    expect(fixture.saleOrderItemRepo.bulkCreate).toHaveBeenCalled();
  });

  it('rejects advanced commercial corrections without Pedidos avanzados before mutating data', async () => {
    const commandAuthorization = {
      authorizeUpdate: jest.fn().mockResolvedValue(undefined),
      authorizeAdvancedOrder: jest
        .fn()
        .mockRejectedValue(new Error('sale_orders.advanced_orders')),
    };
    const fixture = createFixture(
      [],
      true,
      { findByIdWithItems: jest.fn() },
      commandAuthorization,
    );

    await expect(
      fixture.usecase.execute({
        ...input,
        userId: 'user-2',
        items: [{ ...input.items[0], quantity: 2 }],
      }),
    ).rejects.toThrow('sale_orders.advanced_orders');

    expect(commandAuthorization.authorizeAdvancedOrder).toHaveBeenCalledWith(
      'user-2',
    );
    expect(
      fixture.saleOrderItemRepo.deleteBySaleOrderId,
    ).not.toHaveBeenCalled();
    expect(
      fixture.componentRepo.deleteBySaleOrderItemIds,
    ).not.toHaveBeenCalled();
  });

  it('keeps advanced corrections enabled with Pedidos avanzados', async () => {
    const commandAuthorization = {
      authorizeUpdate: jest.fn().mockResolvedValue(undefined),
      authorizeAdvancedOrder: jest.fn().mockResolvedValue(undefined),
    };
    const fixture = createFixture(
      [],
      true,
      { findByIdWithItems: jest.fn() },
      commandAuthorization,
    );

    await expect(
      fixture.usecase.execute({
        ...input,
        userId: 'user-2',
        items: [{ ...input.items[0], quantity: 2 }],
      }),
    ).resolves.toEqual(expect.objectContaining({ orderId: 'order-1' }));

    expect(commandAuthorization.authorizeAdvancedOrder).toHaveBeenCalledWith(
      'user-2',
    );
    expect(fixture.saleOrderItemRepo.bulkCreate).toHaveBeenCalled();
  });

  it('keeps metadata edits available without Pedidos avanzados', async () => {
    const commandAuthorization = {
      authorizeUpdate: jest.fn().mockResolvedValue(undefined),
      authorizeAdvancedOrder: jest.fn().mockRejectedValue(new Error()),
    };
    const fixture = createFixture(
      [],
      true,
      { findByIdWithItems: jest.fn() },
      commandAuthorization,
    );

    await expect(
      fixture.usecase.execute({
        ...input,
        userId: 'user-2',
        note: 'Nota permitida',
      }),
    ).resolves.toEqual(expect.objectContaining({ orderId: 'order-1' }));
    expect(commandAuthorization.authorizeAdvancedOrder).not.toHaveBeenCalled();
  });

  it('allows an advanced warehouse correction when the current state is final', async () => {
    const fixture = createFixture([], true);

    await expect(
      fixture.usecase.execute({
        ...input,
        warehouseId: 'warehouse-2',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        orderId: 'order-1',
        warehouseChanged: true,
      }),
    );
    expect(fixture.saleOrderRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: 'warehouse-2' }),
      expect.anything(),
    );
  });

  it('changes workflow, resets its state and copies the new recipe when supplies are omitted', async () => {
    const fixture = createFixture();

    await expect(
      fixture.usecase.execute({
        ...input,
        workflowId: 'workflow-2',
      }),
    ).resolves.toEqual(expect.objectContaining({ orderId: 'order-1' }));

    expect(fixture.saleOrderRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'workflow-2',
        currentStateId: 'state-2',
      }),
      expect.anything(),
    );
    expect(fixture.suppliesService.copyFromWorkflowRecipe).toHaveBeenCalledWith(
      'order-1',
      'workflow-2',
      expect.anything(),
    );
  });

  it('fully releases reserved stock before starting a new workflow', async () => {
    const commandAuthorization = {
      authorizeUpdate: jest.fn().mockResolvedValue(undefined),
      authorizeAdvancedOrder: jest.fn().mockResolvedValue(undefined),
    };
    const fixture = createFixture(
      [ACTIONS.RESERVE_STOCK],
      false,
      { findByIdWithItems: jest.fn() },
      commandAuthorization,
    );

    await expect(
      fixture.usecase.execute({
        ...input,
        userId: 'user-2',
        workflowId: 'workflow-2',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        workflowChanged: true,
        workflowId: 'workflow-2',
        currentStateId: 'state-2',
      }),
    );

    expect(commandAuthorization.authorizeAdvancedOrder).toHaveBeenCalledWith(
      'user-2',
    );
    expect(
      fixture.stockCorrection.releasePreviousComposition,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ workflowId: 'workflow-1' }),
      'RESERVED',
      'user-2',
      expect.anything(),
    );
    expect(
      fixture.stockCorrection.reserveCorrectedComposition,
    ).not.toHaveBeenCalled();
    expect(
      fixture.stockCorrection.consumeCorrectedComposition,
    ).not.toHaveBeenCalled();
    expect(fixture.historyRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'workflow-2',
        fromStateId: 'state-1',
        toStateId: 'state-2',
        metadata: expect.objectContaining({
          source: 'advanced-order-reassignment',
          previousWorkflowId: 'workflow-1',
          workflowId: 'workflow-2',
          stockStatus: 'NONE',
        }),
      }),
      expect.anything(),
    );
  });

  it('reverts the old warehouse and workflow together before assigning both targets', async () => {
    const commandAuthorization = {
      authorizeUpdate: jest.fn().mockResolvedValue(undefined),
      authorizeAdvancedOrder: jest.fn().mockResolvedValue(undefined),
    };
    const fixture = createFixture(
      [ACTIONS.RESERVE_STOCK, ACTIONS.CONSUME_STOCK],
      true,
      { findByIdWithItems: jest.fn() },
      commandAuthorization,
    );

    await fixture.usecase.execute({
      ...input,
      userId: 'user-2',
      workflowId: 'workflow-2',
      warehouseId: 'warehouse-2',
    });

    expect(
      fixture.stockCorrection.releasePreviousComposition,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'workflow-1',
        warehouseId: 'warehouse-1',
      }),
      'CONSUMED',
      'user-2',
      expect.anything(),
    );
    expect(fixture.saleOrderRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'workflow-2',
        currentStateId: 'state-2',
        warehouseId: 'warehouse-2',
      }),
      expect.anything(),
    );
    expect(
      fixture.stockCorrection.reserveCorrectedComposition,
    ).not.toHaveBeenCalled();
    expect(
      fixture.stockCorrection.consumeCorrectedComposition,
    ).not.toHaveBeenCalled();
    expect(fixture.historyRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          workflowChanged: true,
          warehouseChanged: true,
          previousWarehouseId: 'warehouse-1',
          warehouseId: 'warehouse-2',
        }),
      }),
      expect.anything(),
    );
  });

  it('rejects an advanced warehouse change before touching inventory when permission is missing', async () => {
    const commandAuthorization = {
      authorizeUpdate: jest.fn().mockResolvedValue(undefined),
      authorizeAdvancedOrder: jest
        .fn()
        .mockRejectedValue(new Error('sale_orders.advanced_orders')),
    };
    const fixture = createFixture(
      [ACTIONS.RESERVE_STOCK],
      false,
      { findByIdWithItems: jest.fn() },
      commandAuthorization,
    );

    await expect(
      fixture.usecase.execute({
        ...input,
        userId: 'user-2',
        warehouseId: 'warehouse-2',
      }),
    ).rejects.toThrow('sale_orders.advanced_orders');

    expect(
      fixture.stockCorrection.releasePreviousComposition,
    ).not.toHaveBeenCalled();
    expect(fixture.saleOrderRepo.update).not.toHaveBeenCalled();
  });

  it('keeps existing supplies when neither supplies nor workflow change', async () => {
    const fixture = createFixture();
    await fixture.usecase.execute(input);
    expect(fixture.suppliesService.replace).not.toHaveBeenCalled();
    expect(
      fixture.suppliesService.copyFromWorkflowRecipe,
    ).not.toHaveBeenCalled();
  });

  it('replaces supplies when an explicit list is provided', async () => {
    const fixture = createFixture();
    const supplies = [
      { supplySkuId: 'supply-1', quantity: 1.25, unitId: 'unit-1' },
    ];
    await fixture.usecase.execute({ ...input, supplies });
    expect(fixture.suppliesService.replace).toHaveBeenCalledWith(
      'order-1',
      supplies,
      expect.anything(),
    );
  });

  it('replaces the active reservation when supplies change', async () => {
    const fixture = createFixture([ACTIONS.RESERVE_STOCK]);
    fixture.suppliesService.listBySaleOrderId.mockResolvedValue([
      { supplySkuId: 'supply-1', quantity: 1, unitId: 'unit-1' },
    ]);

    await expect(
      fixture.usecase.execute({
        ...input,
        supplies: [{ supplySkuId: 'supply-1', quantity: 2, unitId: 'unit-1' }],
      }),
    ).resolves.toEqual(expect.objectContaining({ orderId: 'order-1' }));

    expect(
      fixture.stockCorrection.releasePreviousComposition,
    ).toHaveBeenCalled();
    expect(
      fixture.stockCorrection.reserveCorrectedComposition,
    ).toHaveBeenCalled();
    expect(fixture.suppliesService.replace).toHaveBeenCalled();
  });

  it('replaces consumed stock when products change', async () => {
    const fixture = createFixture([
      ACTIONS.RESERVE_STOCK,
      ACTIONS.CONSUME_STOCK,
    ]);

    await expect(
      fixture.usecase.execute({
        ...input,
        items: [
          {
            ...input.items[0],
            components: [
              { skuId: 'sku-1', quantity: 2, unitPrice: 10, total: 20 },
            ],
          },
        ],
      }),
    ).resolves.toEqual(expect.objectContaining({ orderId: 'order-1' }));

    expect(
      fixture.stockCorrection.releasePreviousComposition,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1' }),
      'CONSUMED',
      'user-1',
      expect.anything(),
    );
    expect(
      fixture.stockCorrection.reserveCorrectedComposition,
    ).toHaveBeenCalled();
  });

  it('moves an active reservation to the new warehouse', async () => {
    const fixture = createFixture([ACTIONS.RESERVE_STOCK]);

    await expect(
      fixture.usecase.execute({
        ...input,
        warehouseId: 'warehouse-2',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        orderId: 'order-1',
        warehouseChanged: true,
      }),
    );

    expect(
      fixture.stockCorrection.releasePreviousComposition,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: 'warehouse-1' }),
      'RESERVED',
      'user-1',
      expect.anything(),
    );
    expect(
      fixture.stockCorrection.reserveCorrectedComposition,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: 'warehouse-2' }),
      expect.anything(),
    );
    expect(
      fixture.stockCorrection.consumeCorrectedComposition,
    ).not.toHaveBeenCalled();
    expect(fixture.historyRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          source: 'advanced-order-reassignment',
          previousWarehouseId: 'warehouse-1',
          warehouseId: 'warehouse-2',
          warehouseChanged: true,
        }),
      }),
      expect.anything(),
    );
  });

  it('restores consumed stock in the old warehouse and consumes it in the new warehouse', async () => {
    const fixture = createFixture([
      ACTIONS.RESERVE_STOCK,
      ACTIONS.CONSUME_STOCK,
    ]);

    await expect(
      fixture.usecase.execute({
        ...input,
        warehouseId: 'warehouse-2',
      }),
    ).resolves.toEqual(expect.objectContaining({ warehouseChanged: true }));

    expect(
      fixture.stockCorrection.releasePreviousComposition,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: 'warehouse-1' }),
      'CONSUMED',
      'user-1',
      expect.anything(),
    );
    expect(
      fixture.stockCorrection.reserveCorrectedComposition,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: 'warehouse-2' }),
      expect.anything(),
    );
    expect(
      fixture.stockCorrection.consumeCorrectedComposition,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: 'warehouse-2' }),
      expect.anything(),
    );
  });

  it('allows changing warehouse after reserved stock was reverted', async () => {
    const { usecase, saleOrderRepo } = createFixture([
      ACTIONS.RESERVE_STOCK,
      ACTIONS.REVERT_STOCK,
    ]);

    await usecase.execute({ ...input, warehouseId: 'warehouse-2' });

    expect(saleOrderRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: 'warehouse-2' }),
      expect.anything(),
    );
  });

  it('ignores THEN stock actions when the automatic transition executed ELSE', async () => {
    const { usecase, saleOrderRepo } = createFixture([
      {
        type: ACTIONS.RESERVE_STOCK,
        actionBranch: 'THEN',
        executedBranch: 'ELSE',
      },
    ]);

    await usecase.execute({ ...input, warehouseId: 'warehouse-2' });

    expect(saleOrderRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: 'warehouse-2' }),
      expect.anything(),
    );
  });

  it('allows changing warehouse when the order has no stock history', async () => {
    const { usecase, saleOrderRepo } = createFixture();

    await usecase.execute({ ...input, warehouseId: 'warehouse-2' });

    expect(saleOrderRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: 'warehouse-2' }),
      expect.anything(),
    );
  });

  it('allows keeping the same warehouse while stock is reserved', async () => {
    const { usecase, saleOrderRepo } = createFixture([ACTIONS.RESERVE_STOCK]);

    await usecase.execute(input);

    expect(saleOrderRepo.update).toHaveBeenCalled();
  });

  it('preserves the exact historical pack composition when the catalog changed', async () => {
    const packRepo = {
      findByIdWithItems: jest.fn().mockResolvedValue({
        id: 'pack-1',
        items: [
          {
            id: 'pack-item-1',
            skuId: 'sku-pack',
            quantity: 1,
            price: 10,
            lineTotal: 10,
          },
        ],
      }),
    };
    const fixture = createFixture([], false, packRepo);

    await expect(
      fixture.usecase.execute({
        ...input,
        items: [
          {
            quantity: 1,
            unitPrice: 30,
            total: 30,
            referencePackId: 'pack-1',
            packNameSnapshot: 'Pack historico',
            components: [
              {
                skuId: 'sku-pack',
                quantity: 1,
                unitPrice: 10,
                total: 10,
                referencePackItemId: 'pack-item-1',
              },
              { skuId: 'sku-extra', quantity: 1, unitPrice: 20, total: 20 },
            ],
          },
        ],
      }),
    ).resolves.toEqual(expect.objectContaining({ orderId: 'order-1' }));

    expect(fixture.componentRepo.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          skuId: 'sku-pack',
          referencePackItemId: 'pack-item-1',
        }),
        expect.objectContaining({
          skuId: 'sku-extra',
          referencePackItemId: null,
          quantity: 1,
          unitPrice: 20,
          total: 20,
        }),
      ]),
      expect.anything(),
    );
    expect(fixture.saleOrderItemRepo.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ packNameSnapshot: 'Pack historico' })],
      expect.anything(),
    );
    expect(packRepo.findByIdWithItems).not.toHaveBeenCalled();
  });
});
