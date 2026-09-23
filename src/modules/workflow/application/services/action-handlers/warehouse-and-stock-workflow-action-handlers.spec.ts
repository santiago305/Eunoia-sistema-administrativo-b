import { ACTIONS } from '../../../domain/constants/workflow-action.constants';
import { WarehouseWorkflowActionHandler } from './warehouse-workflow-action-handler';
import { StockWorkflowActionHandler } from './stock-workflow-action-handler';

describe('WarehouseWorkflowActionHandler', () => {
  it('asigna un almacén cuando la acción está pendiente', async () => {
    const assignment = {
      assign: jest.fn().mockResolvedValue({
        order: { id: 'order-1', warehouseId: 'warehouse-2' },
        outcome: { actionType: ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE, status: 'APPLIED' },
      }),
    };
    const handler = new WarehouseWorkflowActionHandler(assignment as any);
    const context = {
      order: { id: 'order-1', warehouseId: null },
      action: { type: ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE, config: {} },
      tx: {},
      currentConditions: [],
      state: { invoiceSent: false, preguide: false, prepared: false },
    } as any;

    await expect(handler.inspect(context)).resolves.toEqual({ status: 'PENDING' });
    await expect(handler.execute(context)).resolves.toEqual({
      order: { id: 'order-1', warehouseId: 'warehouse-2' },
      outcome: { actionType: ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE, status: 'APPLIED' },
    });
    expect(assignment.assign).toHaveBeenCalled();
  });

  it('omite la asignación cuando el pedido ya tiene almacén', async () => {
    const handler = new WarehouseWorkflowActionHandler({} as any);
    const context = {
      order: { id: 'order-1', warehouseId: 'warehouse-1' },
      action: { type: ACTIONS.ASSIGN_WAREHOUSE_BY_WORKFLOW },
      tx: {},
      currentConditions: [],
      state: { invoiceSent: false, preguide: false, prepared: false },
    } as any;

    await expect(handler.inspect(context)).resolves.toEqual({
      status: 'ALREADY_SATISFIED',
      evidence: { field: 'warehouseId', value: 'warehouse-1' },
    });
  });
});

describe('StockWorkflowActionHandler', () => {
  function context(type: string, status: string, reserveBool = false) {
    return {
      order: { id: 'order-1', reserveBool },
      action: { type },
      tx: {},
      currentConditions: [],
      state: { invoiceSent: false, preguide: false, prepared: false },
      status,
    } as any;
  }

  it('reconoce un consumo vigente sin repetirlo', async () => {
    const handler = new StockWorkflowActionHandler({
      inspectConsumption: jest.fn().mockResolvedValue({
        status: 'CONSUMED', activeDocumentIds: ['out-1'], postedDocumentIds: ['out-1'],
      }),
    } as any);

    await expect(handler.inspect(context(ACTIONS.CONSUME_STOCK, 'CONSUMED'))).resolves.toEqual({
      status: 'ALREADY_SATISFIED',
      evidence: { status: 'CONSUMED', documentIds: ['out-1'] },
    });
  });

  it('devuelve PENDING cuando aún no existe consumo', async () => {
    const handler = new StockWorkflowActionHandler({
      inspectConsumption: jest.fn().mockResolvedValue({
        status: 'NONE', activeDocumentIds: [], postedDocumentIds: [],
      }),
    } as any);

    await expect(handler.inspect(context(ACTIONS.CONSUME_STOCK, 'NONE'))).resolves.toEqual({ status: 'PENDING' });
  });

  it('bloquea consumos documentales inconsistentes', async () => {
    const handler = new StockWorkflowActionHandler({
      inspectConsumption: jest.fn().mockResolvedValue({
        status: 'INCONSISTENT', activeDocumentIds: ['out-1', 'out-2'], postedDocumentIds: ['out-1', 'out-2'],
      }),
    } as any);

    await expect(handler.inspect(context(ACTIONS.CONSUME_STOCK, 'INCONSISTENT'))).resolves.toEqual({
      status: 'CONFLICT',
      reason: 'El pedido tiene multiples consumos de stock vigentes y requiere conciliacion',
    });
  });
});
