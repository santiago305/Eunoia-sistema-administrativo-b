import { WorkflowRevisionLifecycleService } from './workflow-revision-lifecycle.service';

describe('WorkflowRevisionLifecycleService.repairSaleOrder', () => {
  it('is idempotent when the order already matches the current workflow projection', async () => {
    const state = { id: 'state-1', name: 'Coordinado', isFinal: false };
    const workflow = {
      id: 'workflow-1',
      familyId: 'family-1',
      revision: 2,
      isCurrent: true,
      isActive: true,
      lifecycleStatus: 'PUBLISHED',
    };
    const order = {
      id: 'order-1',
      workflowId: workflow.id,
      currentStateId: state.id,
      isActive: true,
      warehouseId: null,
      invoiceSend: false,
      prepared: false,
      preguide: false,
      reserveBool: false,
    };
    const aggregate = { workflow, states: [state] };
    const manager = { getRepository: jest.fn() };
    const service = Object.create(WorkflowRevisionLifecycleService.prototype) as any;
    service.uow = { runInTransaction: (callback: (tx: unknown) => unknown) => callback({}) };
    service.getManager = () => manager;
    service.saleOrderRepo = { findByIdForUpdate: jest.fn().mockResolvedValue(order) };
    service.workflowRepo = {
      findDetailedById: jest.fn().mockResolvedValue(aggregate),
      listByFamilyId: jest.fn().mockResolvedValue([workflow]),
    };
    service.editPolicy = { resolve: jest.fn().mockResolvedValue({ stockStatus: 'NONE', isFinal: false }) };
    service.analyzeTarget = jest.fn().mockResolvedValue({
      targetState: state,
      desiredStockStatus: 'NONE',
      warehouseId: null,
      transitionIds: [],
      transitionNames: [],
      tracking: { invoiceSend: false, prepared: false, preguide: false },
    });

    const result = await service.repairSaleOrder({ saleOrderId: order.id, executedBy: 'user-1' });

    expect(result.repaired).toBe(false);
    expect(result.reason).toBe('already-consistent');
    expect(manager.getRepository).not.toHaveBeenCalled();
    expect(service.analyzeTarget).toHaveBeenCalledWith(order, aggregate, expect.anything());
  });

  it('reconciles the current revision, stock and repair history when drift exists', async () => {
    const oldState = { id: 'state-programmed', name: 'Programado', isFinal: false };
    const newState = { id: 'state-coordinated', name: 'Coordinado', isFinal: false };
    const assignedWorkflow = {
      id: 'workflow-old',
      familyId: 'family-1',
      revision: 1,
      isCurrent: false,
      isActive: true,
      lifecycleStatus: 'ARCHIVED',
    };
    const currentWorkflow = {
      id: 'workflow-current',
      familyId: 'family-1',
      revision: 2,
      isCurrent: true,
      isActive: true,
      lifecycleStatus: 'PUBLISHED',
    };
    const order = {
      id: 'order-1',
      workflowId: assignedWorkflow.id,
      currentStateId: oldState.id,
      isActive: true,
      warehouseId: 'warehouse-1',
      invoiceSend: false,
      prepared: false,
      preguide: false,
      reserveBool: true,
    };
    const currentAggregate = { workflow: currentWorkflow, states: [newState] };
    const repository = { update: jest.fn() };
    const manager = { getRepository: jest.fn().mockReturnValue(repository) };
    const service = Object.create(WorkflowRevisionLifecycleService.prototype) as any;
    service.uow = { runInTransaction: (callback: (tx: unknown) => unknown) => callback({}) };
    service.getManager = () => manager;
    service.saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue(order),
    };
    service.workflowRepo = {
      findDetailedById: jest.fn()
        .mockResolvedValueOnce({ workflow: assignedWorkflow, states: [oldState] })
        .mockResolvedValueOnce(currentAggregate),
      listByFamilyId: jest.fn().mockResolvedValue([assignedWorkflow, currentWorkflow]),
    };
    service.editPolicy = { resolve: jest.fn().mockResolvedValue({ stockStatus: 'CONSUMED' }) };
    service.analyzeTarget = jest.fn().mockResolvedValue({
      targetState: newState,
      desiredStockStatus: 'NONE',
      warehouseId: 'warehouse-1',
      transitionIds: ['transition-1'],
      transitionNames: ['Quitar fecha de entrega'],
      tracking: { invoiceSend: false, prepared: false, preguide: false },
    });
    service.planMigrationStockActions = jest.fn().mockReturnValue(['RESTORE_STOCK']);
    service.reconcileStock = jest.fn().mockResolvedValue(undefined);
    service.appendHistory = jest.fn().mockResolvedValue(undefined);

    const result = await service.repairSaleOrder({ saleOrderId: order.id, executedBy: 'user-1' });

    expect(result.repaired).toBe(true);
    expect(result.state.toName).toBe('Coordinado');
    expect(result.stock).toEqual({ from: 'CONSUMED', to: 'NONE', actions: ['RESTORE_STOCK'] });
    expect(service.reconcileStock).toHaveBeenCalledWith(order, 'CONSUMED', 'NONE', 'user-1', expect.anything());
    expect(service.appendHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          source: 'sale-order-workflow-repair',
          fromRevision: 1,
          toRevision: 2,
        }),
      }),
      expect.anything(),
    );
    expect(repository.update).toHaveBeenCalledTimes(1);
  });
});
