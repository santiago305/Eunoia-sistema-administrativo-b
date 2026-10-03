import { RepairSaleOrderWorkflowUsecase } from './repair-workflow.usecase';

describe('RepairSaleOrderWorkflowUsecase', () => {
  it('delegates the order repair with the authenticated user', async () => {
    const workflowLifecycle = {
      repairSaleOrder: jest.fn().mockResolvedValue({ repaired: false }),
    };
    const usecase = new RepairSaleOrderWorkflowUsecase(workflowLifecycle as any);

    await expect(
      usecase.execute({ saleOrderId: 'order-1', executedBy: 'user-1' }),
    ).resolves.toEqual({ repaired: false });
    expect(workflowLifecycle.repairSaleOrder).toHaveBeenCalledWith({
      saleOrderId: 'order-1',
      executedBy: 'user-1',
    });
  });
});
