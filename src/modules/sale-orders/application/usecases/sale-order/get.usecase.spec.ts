import { GetSaleOrderUsecase } from './get.usecase';

describe('GetSaleOrderUsecase', () => {
  it('adds the server-derived edit policy to the complete detail', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({
        id: 'order-1',
        workflow: { id: 'workflow-1' },
        currentState: { id: 'state-1' },
        client: {
          id: 'client-1',
          telephones: [{ id: 'phone-1', number: '999', isMain: true }],
        },
        SKUS: 'EVA01893(1)',
        detail: 'JABONAZUFRE1',
        attachments: [],
        payments: [],
      }),
    };
    const policy = {
      resolve: jest.fn().mockResolvedValue({
        stockStatus: 'RESERVED',
        productsEditable: false,
        warehouseEditable: false,
        isFinal: false,
        reason: 'Stock reservado',
      }),
    };
    const stockRequirements = {
      resolve: jest
        .fn()
        .mockResolvedValue([{ stockItemId: 'stock-1', quantity: 2 }]),
    };
    const reservationReconciliation = {
      inspect: jest.fn().mockResolvedValue({
        checked: true,
        status: 'COMPLETE',
        warehouseId: null,
        items: [],
      }),
    };
    const usecase = new GetSaleOrderUsecase(
      repository as any,
      policy as any,
      stockRequirements as any,
      reservationReconciliation as any,
    );

    const result = await usecase.execute({ saleOrderId: 'order-1' });

    expect(policy.resolve).toHaveBeenCalledWith({
      id: 'order-1',
      workflowId: 'workflow-1',
      currentStateId: 'state-1',
    });
    expect(result.editPolicy.stockStatus).toBe('RESERVED');
    expect(result.reservationHealth.status).toBe('COMPLETE');
    expect(reservationReconciliation.inspect).toHaveBeenCalledWith(
      {
        id: 'order-1',
        warehouseId: null,
        reserveBool: undefined,
      },
      [{ stockItemId: 'stock-1', quantity: 2 }],
    );
    expect(result.client?.telephones).toHaveLength(1);
    expect(result.SKUS).toBe('EVA01893(1)');
    expect(result.detail).toBe('JABONAZUFRE1');
  });
});
