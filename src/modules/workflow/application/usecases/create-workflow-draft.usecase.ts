import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CLOCK, ClockPort } from 'src/shared/application/ports/clock.port';
import { UNIT_OF_WORK, UnitOfWork } from 'src/shared/domain/ports/unit-of-work.port';
import { WORKFLOW_LIFECYCLE } from '../../domain/constants/workflow-lifecycle.constants';
import { Workflow } from '../../domain/entities/workflow';
import { WorkflowAction } from '../../domain/entities/workflow-action';
import { ACTIONS } from '../../domain/constants/workflow-action.constants';
import { WorkflowCondition } from '../../domain/entities/workflow-condition';
import { WorkflowState } from '../../domain/entities/workflow-state';
import { WorkflowTransition } from '../../domain/entities/workflow-transition';
import {
  WORKFLOW_REPOSITORY,
  WorkflowRepository,
} from '../../domain/ports/workflow.repository';

export class CreateWorkflowDraftUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(input: { workflowId: string }) {
    return this.uow.runInTransaction(async (tx) => {
      const source = await this.workflowRepo.findDetailedById(input.workflowId, tx);
      if (!source) throw new NotFoundException('Workflow no encontrado');
      if (source.workflow.lifecycleStatus === WORKFLOW_LIFECYCLE.DRAFT) return source;

      const family =
        (await this.workflowRepo.listByFamilyId?.(source.workflow.familyId, tx)) ?? [];
      const existingDraft = family.find(
        (workflow) => workflow.lifecycleStatus === WORKFLOW_LIFECYCLE.DRAFT,
      );
      if (existingDraft) {
        const aggregate = await this.workflowRepo.findDetailedById(existingDraft.id, tx);
        if (aggregate) return aggregate;
      }
      if (source.workflow.lifecycleStatus !== WORKFLOW_LIFECYCLE.PUBLISHED) {
        throw new BadRequestException(
          'Solo se puede crear un borrador desde una revision publicada',
        );
      }

      const now = this.clock.now();
      const workflowId = crypto.randomUUID();
      const stateIds = new Map(
        source.states.map((state) => [state.id, crypto.randomUUID()]),
      );
      const transitionIds = new Map(
        source.transitions.map((transition) => [transition.id, crypto.randomUUID()]),
      );
      const revision =
        Math.max(source.workflow.revision, ...family.map((item) => item.revision), 0) + 1;

      const aggregate = {
        workflow: new Workflow({
          id: workflowId,
          name: source.workflow.name,
          normalizedName: source.workflow.normalizedName,
          description: source.workflow.description,
          isActive: true,
          createdAt: now,
          updatedAt: null,
          familyId: source.workflow.familyId,
          revision,
          lifecycleStatus: WORKFLOW_LIFECYCLE.DRAFT,
          isCurrent: false,
          basedOnWorkflowId: source.workflow.id,
        }),
        states: source.states.map(
          (state) =>
            new WorkflowState({
              ...state,
              id: stateIds.get(state.id) as string,
              workflowId,
            }),
        ),
        transitions: source.transitions.map(
          (transition) =>
            new WorkflowTransition({
              ...transition,
              id: transitionIds.get(transition.id) as string,
              workflowId,
              fromStateId: transition.fromStateId
                ? stateIds.get(transition.fromStateId) ?? null
                : null,
              toStateId: transition.toStateId
                ? stateIds.get(transition.toStateId) ?? null
                : null,
              elseToStateId: transition.elseToStateId
                ? stateIds.get(transition.elseToStateId) ?? null
                : null,
              excludedStateIds: transition.excludedStateIds.map(
                (stateId) => stateIds.get(stateId) ?? stateId,
              ),
            }),
        ),
        conditions: source.conditions.map(
          (condition) =>
            new WorkflowCondition({
              ...condition,
              id: crypto.randomUUID(),
              transitionId: transitionIds.get(condition.transitionId) as string,
            }),
        ),
        actions: source.actions.map(
          (action) =>
            new WorkflowAction({
              ...action,
              id: crypto.randomUUID(),
              transitionId: transitionIds.get(action.transitionId) as string,
              config:
                action.type === ACTIONS.ASSIGN_WAREHOUSE_BY_WORKFLOW &&
                action.config.workflowId === source.workflow.id
                  ? { ...action.config, workflowId }
                  : action.config,
            }),
        ),
      };

      const saved = await this.workflowRepo.saveFull(
        aggregate,
        { synchronize: false },
        tx,
      );
      await this.workflowRepo.cloneSupplyRecipe?.(
        source.workflow.id,
        workflowId,
        tx,
      );
      return saved;
    });
  }
}
