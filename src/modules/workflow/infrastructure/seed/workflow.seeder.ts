import { DataSource, EntityManager, In } from 'typeorm';
import { v5 as uuidv5 } from 'uuid';
import { WorkflowEntity } from '../../adapters/out/persistence/typeorm/entities/workflow.entity';
import { WorkflowStateEntity } from '../../adapters/out/persistence/typeorm/entities/workflow-state.entity';
import { WorkflowTransitionEntity } from '../../adapters/out/persistence/typeorm/entities/workflow-transition.entity';
import { WorkflowConditionEntity } from '../../adapters/out/persistence/typeorm/entities/workflow-condition.entity';
import { WorkflowActionEntity } from '../../adapters/out/persistence/typeorm/entities/workflow-action.entity';
import { SaleOrderStatesEntity } from '../../adapters/out/persistence/typeorm/entities/sale-order-states.entity';
import { ABONADO_WORKFLOW_SEEDS, WorkflowSeed } from './abonado-workflows.seed-data';

const SEED_NAMESPACE = '41bcb30f-20bd-4ea0-9176-506b913421a7';
const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-PE');
const seededId = (...parts: string[]) => uuidv5(parts.join(':'), SEED_NAMESPACE);

export function materializeWorkflowSeed(seed: WorkflowSeed) {
  const workflowId = seededId('workflow', normalizeName(seed.name));
  const stateIds = new Map(seed.states.map((state) => [state.clientId, seededId(workflowId, 'state', state.clientId)]));
  const resolve = (reference?: string | null) => {
    if (!reference) return null;
    const id = stateIds.get(reference);
    if (!id) throw new Error(`Referencia de estado inexistente en ${seed.name}: ${reference}`);
    return id;
  };

  return {
    workflow: { id: workflowId, name: seed.name, normalizedName: normalizeName(seed.name), description: seed.description, isActive: seed.isActive },
    states: seed.states.map((state) => ({ ...state, id: resolve(state.clientId)!, workflowId, clientId: undefined })),
    transitions: seed.transitions.map((transition) => ({
      ...transition,
      id: seededId(workflowId, 'transition', transition.clientId), workflowId,
      fromStateId: resolve(transition.fromStateRef), toStateId: resolve(transition.toStateRef),
      excludedStateIds: transition.excludedStateRefs.map((reference) => resolve(reference)!),
      elseToStateId: resolve(transition.elseToStateRef),
    })),
  };
}

async function synchronizeWorkflow(manager: EntityManager, seed: WorkflowSeed): Promise<void> {
  const materialized = materializeWorkflowSeed(seed);
  const workflowRepository = manager.getRepository(WorkflowEntity);
  const existing = await workflowRepository.findOne({ where: { normalizedName: materialized.workflow.normalizedName } });
  const workflowId = existing?.id ?? materialized.workflow.id;
  await workflowRepository.save({ ...materialized.workflow, id: workflowId });

  const stateRepository = manager.getRepository(WorkflowStateEntity);
  const existingStates = await stateRepository.find({ where: { workflowId } });
  const existingByCatalogId = new Map(existingStates.map((state) => [state.saleOrderStateId, state.id]));
  const stateIdByRef = new Map<string, string>();
  const states = seed.states.map((state) => {
    const id = existingByCatalogId.get(state.saleOrderStateId) ?? seededId(workflowId, 'state', state.clientId);
    stateIdByRef.set(state.clientId, id);
    const { clientId: _clientId, ...values } = state;
    return { ...values, id, workflowId };
  });
  await stateRepository.upsert(states, { conflictPaths: ['id'], skipUpdateIfNoValuesChanged: true });

  const resolve = (reference?: string | null) => reference ? stateIdByRef.get(reference) ?? (() => { throw new Error(`Referencia de estado inexistente en ${seed.name}: ${reference}`); })() : null;
  const transitionRepository = manager.getRepository(WorkflowTransitionEntity);
  const existingTransitions = await transitionRepository.find({ where: { workflowId } });
  const existingByCode = new Map(existingTransitions.map((transition) => [transition.code, transition.id]));

  for (const transition of seed.transitions) {
    const transitionId = existingByCode.get(transition.code) ?? seededId(workflowId, 'transition', transition.clientId);
    await transitionRepository.upsert({
      id: transitionId, workflowId, code: transition.code, name: transition.name, effect: transition.effect,
      purpose: transition.purpose, fromStateId: resolve(transition.fromStateRef), toStateId: resolve(transition.toStateRef),
      isGlobal: transition.isGlobal, excludedStateIds: transition.excludedStateRefs.map((reference) => resolve(reference)!),
      sourceHandle: transition.sourceHandle, targetHandle: transition.targetHandle, isActive: transition.isActive,
      autoTrigger: transition.autoTrigger, priority: transition.priority, elseEffect: transition.elseEffect,
      elseToStateId: resolve(transition.elseToStateRef),
    }, { conflictPaths: ['id'], skipUpdateIfNoValuesChanged: true });

    await manager.getRepository(WorkflowConditionEntity).delete({ transitionId });
    await manager.getRepository(WorkflowActionEntity).delete({ transitionId });
    if (transition.conditions.length) await manager.getRepository(WorkflowConditionEntity).insert(transition.conditions.map((condition) => ({ ...condition, transitionId })));
    const actions = [
      ...transition.actions.map((action) => ({ ...action, transitionId, branch: 'THEN' as const })),
      ...transition.elseActions.map((action) => ({ ...action, transitionId, branch: 'ELSE' as const })),
    ];
    if (actions.length) await manager.getRepository(WorkflowActionEntity).insert(actions);
  }
}

export async function seedWorkflows(dataSource: DataSource): Promise<void> {
  await dataSource.transaction(async (manager) => {
    const requiredStateIds = [...new Set(ABONADO_WORKFLOW_SEEDS.flatMap((workflow) => workflow.states.map((state) => state.saleOrderStateId)))];
    const available = await manager.getRepository(SaleOrderStatesEntity).find({ where: { id: In(requiredStateIds) }, select: { id: true } });
    const availableIds = new Set(available.map(({ id }) => id));
    const missing = requiredStateIds.filter((id) => !availableIds.has(id));
    if (missing.length) throw new Error(`No se pueden sembrar workflows: faltan sale_order_states ${missing.join(', ')}`);
    for (const workflow of ABONADO_WORKFLOW_SEEDS) await synchronizeWorkflow(manager, workflow);
  });
  console.log('Workflows ABONADO sembrados correctamente');
}
