import { ACTIONS } from '../../domain/constants/workflow-action.constants';
import { CONDITIONS } from '../../domain/constants/workflow-condition.constants';
import { WORKFLOW_LIFECYCLE } from '../../domain/constants/workflow-lifecycle.constants';
import { Workflow } from '../../domain/entities/workflow';
import { WorkflowAction } from '../../domain/entities/workflow-action';
import { WorkflowCondition } from '../../domain/entities/workflow-condition';
import { WorkflowState } from '../../domain/entities/workflow-state';
import { WorkflowTransition } from '../../domain/entities/workflow-transition';
import { CreateWorkflowDraftUseCase } from './create-workflow-draft.usecase';

describe('CreateWorkflowDraftUseCase', () => {
  const now = new Date('2026-08-27T12:00:00.000Z');

  const source = {
    workflow: new Workflow({
      id: 'workflow-v1',
      name: 'Abonado envio',
      normalizedName: 'abonado envio',
      description: 'Flujo publicado',
      isActive: true,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: null,
      familyId: 'workflow-family',
      revision: 1,
      lifecycleStatus: WORKFLOW_LIFECYCLE.PUBLISHED,
      isCurrent: true,
    }),
    states: [
      new WorkflowState({
        id: 'state-start',
        workflowId: 'workflow-v1',
        saleOrderStateId: 'global-start',
        code: 'START',
        name: 'Inicio',
        color: '#111111',
        position: 0,
        isInitial: true,
        isFinal: false,
        isActive: true,
      }),
      new WorkflowState({
        id: 'state-end',
        workflowId: 'workflow-v1',
        saleOrderStateId: 'global-end',
        code: 'END',
        name: 'Fin',
        color: '#222222',
        position: 1,
        isInitial: false,
        isFinal: true,
        isActive: true,
      }),
    ],
    transitions: [
      new WorkflowTransition({
        id: 'transition-finish',
        workflowId: 'workflow-v1',
        code: 'FINISH',
        name: 'Finalizar',
        fromStateId: 'state-start',
        toStateId: 'state-end',
        elseToStateId: 'state-start',
        excludedStateIds: ['state-end'],
        isActive: true,
      }),
    ],
    conditions: [
      new WorkflowCondition({
        id: 'condition-paid',
        transitionId: 'transition-finish',
        type: CONDITIONS.IS_PAID,
        config: {},
        position: 0,
      }),
    ],
    actions: [
      new WorkflowAction({
        id: 'action-consume',
        transitionId: 'transition-finish',
        type: ACTIONS.CONSUME_STOCK,
        config: {},
        position: 0,
      }),
      new WorkflowAction({
        id: 'action-warehouse',
        transitionId: 'transition-finish',
        type: ACTIONS.ASSIGN_WAREHOUSE_BY_WORKFLOW,
        config: { workflowId: 'workflow-v1', warehouseId: 'warehouse-1' },
        position: 1,
      }),
    ],
  };

  function setup(family = [source.workflow]) {
    const repository = {
      findDetailedById: jest.fn(async (id: string) =>
        id === source.workflow.id ? source : null,
      ),
      listByFamilyId: jest.fn(async () => family),
      saveFull: jest.fn(async (aggregate) => aggregate),
      cloneSupplyRecipe: jest.fn(async () => undefined),
    };
    const useCase = new CreateWorkflowDraftUseCase(
      { runInTransaction: (callback: any) => callback({ manager: {} }) } as any,
      repository as any,
      { now: () => now } as any,
    );
    return { useCase, repository };
  }

  it('clones a published revision with new ids and remapped references', async () => {
    const { useCase, repository } = setup();

    const result = await useCase.execute({ workflowId: source.workflow.id });

    expect(result.workflow).toEqual(
      expect.objectContaining({
        familyId: 'workflow-family',
        revision: 2,
        lifecycleStatus: WORKFLOW_LIFECYCLE.DRAFT,
        isCurrent: false,
        basedOnWorkflowId: 'workflow-v1',
        createdAt: now,
      }),
    );
    expect(result.workflow.id).not.toBe(source.workflow.id);

    const [draftStart, draftEnd] = result.states;
    const [draftTransition] = result.transitions;
    expect(draftStart.id).not.toBe('state-start');
    expect(draftEnd.id).not.toBe('state-end');
    expect(draftTransition.id).not.toBe('transition-finish');
    expect(draftTransition).toEqual(
      expect.objectContaining({
        workflowId: result.workflow.id,
        fromStateId: draftStart.id,
        toStateId: draftEnd.id,
        elseToStateId: draftStart.id,
        excludedStateIds: [draftEnd.id],
      }),
    );
    expect(result.conditions[0]).toEqual(
      expect.objectContaining({ transitionId: draftTransition.id }),
    );
    expect(result.actions[0]).toEqual(
      expect.objectContaining({ transitionId: draftTransition.id }),
    );
    expect(result.actions[1]).toEqual(
      expect.objectContaining({
        transitionId: draftTransition.id,
        config: {
          workflowId: result.workflow.id,
          warehouseId: 'warehouse-1',
        },
      }),
    );
    expect(repository.saveFull).toHaveBeenCalledWith(
      expect.any(Object),
      { synchronize: false },
      expect.any(Object),
    );
    expect(repository.cloneSupplyRecipe).toHaveBeenCalledWith(
      source.workflow.id,
      result.workflow.id,
      expect.any(Object),
    );
  });

  it('returns the existing family draft instead of creating another revision', async () => {
    const existingDraft = {
      ...source,
      workflow: new Workflow({
        ...source.workflow,
        id: 'workflow-v2-draft',
        revision: 2,
        lifecycleStatus: WORKFLOW_LIFECYCLE.DRAFT,
        isCurrent: false,
      }),
    };
    const { useCase, repository } = setup([source.workflow, existingDraft.workflow]);
    repository.findDetailedById.mockImplementation(async (id: string) =>
      id === source.workflow.id ? source : id === existingDraft.workflow.id ? existingDraft : null,
    );

    const result = await useCase.execute({ workflowId: source.workflow.id });

    expect(result.workflow.id).toBe(existingDraft.workflow.id);
    expect(repository.saveFull).not.toHaveBeenCalled();
    expect(repository.cloneSupplyRecipe).not.toHaveBeenCalled();
  });
});
