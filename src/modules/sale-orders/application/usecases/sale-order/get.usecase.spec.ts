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
    const usecase = new GetSaleOrderUsecase(
      repository as any,
      policy as any,
    );

    const result = await usecase.execute({ saleOrderId: 'order-1' });

    expect(policy.resolve).toHaveBeenCalledWith({
      id: 'order-1',
      workflowId: 'workflow-1',
      currentStateId: 'state-1',
    });
    expect(result.editPolicy.stockStatus).toBe('RESERVED');
    expect(result.client?.telephones).toHaveLength(1);
  });
});
