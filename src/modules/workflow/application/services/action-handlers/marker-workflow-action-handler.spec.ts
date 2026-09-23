import { ACTIONS } from '../../../domain/constants/workflow-action.constants';
import { MarkerWorkflowActionHandler } from './marker-workflow-action-handler';
import { WorkflowActionHandlerRegistry } from './workflow-action-handler-registry';
import { WarehouseWorkflowActionHandler } from './warehouse-workflow-action-handler';
import { StockWorkflowActionHandler } from './stock-workflow-action-handler';

describe('MarkerWorkflowActionHandler', () => {
  function fixture() {
    const saleOrderRepo = {
      markInvoiceSent: jest.fn().mockResolvedValue(undefined),
      markPreguide: jest.fn().mockResolvedValue(undefined),
      markPrepared: jest.fn().mockResolvedValue(undefined),
      unmarkPreguide: jest.fn().mockResolvedValue(undefined),
      unmarkPrepared: jest.fn().mockResolvedValue(undefined),
    };
    const handler = new MarkerWorkflowActionHandler(saleOrderRepo as any);
    const context = {
      order: { id: 'order-1' },
      action: { id: 'action-1', type: ACTIONS.MARK_PREGUIDE },
      tx: {},
      currentConditions: [],
      state: { invoiceSent: false, preguide: false, prepared: false },
    } as any;
    return { handler, saleOrderRepo, context };
  }

  it('returns PENDING and executes a marker once', async () => {
    const { handler, saleOrderRepo, context } = fixture();

    await expect(handler.inspect(context)).resolves.toEqual({ status: 'PENDING' });
    await expect(handler.execute(context)).resolves.toEqual({
      outcome: { actionType: ACTIONS.MARK_PREGUIDE, status: 'APPLIED' },
    });
    expect(saleOrderRepo.markPreguide).toHaveBeenCalledWith('order-1', {});
    expect(context.state.preguide).toBe(true);
  });

  it('returns ALREADY_SATISFIED without executing again', async () => {
    const { handler, saleOrderRepo, context } = fixture();
    context.state.preguide = true;

    await expect(handler.inspect(context)).resolves.toEqual({
      status: 'ALREADY_SATISFIED',
      evidence: { field: 'preguide', value: true },
    });
    expect(saleOrderRepo.markPreguide).not.toHaveBeenCalled();
  });

  it('exposes marker handlers through the registry', () => {
    const { handler } = fixture();
    const registry = new WorkflowActionHandlerRegistry(
      handler,
      new WarehouseWorkflowActionHandler({} as any),
      new StockWorkflowActionHandler({} as any),
    );

    expect(registry.get(ACTIONS.MARK_PREPARED)).toBe(handler);
    expect(registry.get(ACTIONS.CONSUME_STOCK)).toBeDefined();
  });
});
