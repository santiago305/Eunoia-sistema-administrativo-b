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
  ) => {
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({
        id: 'order-1',
        warehouseId: 'warehouse-1',
        workflowId: 'workflow-1',
        currentStateId: 'state-1',
      }),
      update: jest.fn().mockResolvedValue({
        id: 'order-1',
        serie: 'PED',
        correlative: 1,
        workflowId: 'workflow-1',
        currentStateId: 'state-1',
      }),
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
      undefined,
      suppliesService as any,
    );

    return {
      usecase,
      saleOrderRepo,
      saleOrderItemRepo,
      componentRepo,
      paymentRepo,
      packRepo,
      suppliesService,
    };
  };

  it('replaces order lines without mutating inventory', async () => {
    const { usecase, componentRepo, paymentRepo } = createFixture();

    await usecase.execute(input);

    expect(componentRepo.bulkCreate).toHaveBeenCalled();
    expect(paymentRepo.deleteBySaleOrderId).not.toHaveBeenCalled();
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

  it('rejects quantity edits when the current workflow state is final', async () => {
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
    ).rejects.toThrow(
      'No se pueden cambiar productos, packs, cantidades, precios ni almacén de un pedido finalizado.',
    );

    expect(
      fixture.componentRepo.deleteBySaleOrderItemIds,
    ).not.toHaveBeenCalled();
    expect(
      fixture.saleOrderItemRepo.deleteBySaleOrderId,
    ).not.toHaveBeenCalled();
    expect(fixture.paymentRepo.deleteBySaleOrderId).not.toHaveBeenCalled();
  });

  it('rejects warehouse edits when the current workflow state is final', async () => {
    const fixture = createFixture([], true);

    await expect(
      fixture.usecase.execute({
        ...input,
        warehouseId: 'warehouse-2',
      }),
    ).rejects.toThrow(
      'No se pueden cambiar productos, packs, cantidades, precios ni almacén de un pedido finalizado.',
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

  it('rejects supply changes while stock is reserved', async () => {
    const fixture = createFixture([ACTIONS.RESERVE_STOCK]);
    fixture.suppliesService.listBySaleOrderId.mockResolvedValue([
      { supplySkuId: 'supply-1', quantity: 1, unitId: 'unit-1' },
    ]);

    await expect(
      fixture.usecase.execute({
        ...input,
        supplies: [{ supplySkuId: 'supply-1', quantity: 2, unitId: 'unit-1' }],
      }),
    ).rejects.toThrow('Este pedido ya tiene stock reservado');

    expect(fixture.suppliesService.replace).not.toHaveBeenCalled();
  });

  it('rejects product and supply changes after stock was consumed', async () => {
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
    ).rejects.toThrow('Este pedido ya consumió stock');

    fixture.suppliesService.listBySaleOrderId.mockResolvedValue([
      { supplySkuId: 'supply-1', quantity: 1, unitId: 'unit-1' },
    ]);
    await expect(
      fixture.usecase.execute({
        ...input,
        supplies: [{ supplySkuId: 'supply-1', quantity: 2, unitId: 'unit-1' }],
      }),
    ).rejects.toThrow('No se pueden cambiar insumos');
  });

  it('rejects changing warehouse while stock is reserved before deleting related data', async () => {
    const fixture = createFixture([ACTIONS.RESERVE_STOCK]);

    await expect(
      fixture.usecase.execute({
        ...input,
        warehouseId: 'warehouse-2',
      }),
    ).rejects.toThrow(
      'No se puede cambiar el almacén porque el pedido tiene stock reservado.',
    );

    expect(
      fixture.componentRepo.deleteBySaleOrderItemIds,
    ).not.toHaveBeenCalled();
    expect(
      fixture.saleOrderItemRepo.deleteBySaleOrderId,
    ).not.toHaveBeenCalled();
    expect(fixture.paymentRepo.deleteBySaleOrderId).not.toHaveBeenCalled();
  });

  it('rejects changing warehouse after stock was consumed before deleting related data', async () => {
    const fixture = createFixture([
      ACTIONS.RESERVE_STOCK,
      ACTIONS.CONSUME_STOCK,
    ]);

    await expect(
      fixture.usecase.execute({
        ...input,
        warehouseId: 'warehouse-2',
      }),
    ).rejects.toThrow(
      'No se puede cambiar el almacén porque el pedido ya consumió stock.',
    );

    expect(
      fixture.componentRepo.deleteBySaleOrderItemIds,
    ).not.toHaveBeenCalled();
    expect(
      fixture.saleOrderItemRepo.deleteBySaleOrderId,
    ).not.toHaveBeenCalled();
    expect(fixture.paymentRepo.deleteBySaleOrderId).not.toHaveBeenCalled();
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
