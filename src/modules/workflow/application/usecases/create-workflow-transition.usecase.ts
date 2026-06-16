import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { WorkflowCondition } from "../../domain/entities/workflow-condition";
import { WorkflowTransition } from "../../domain/entities/workflow-transition";
import { WORKFLOW_REPOSITORY, WorkflowRepository } from "../../domain/ports/workflow.repository";
import {
  WORKFLOW_TRANSITION_REPOSITORY,
  WorkflowTransitionRepository,
} from "../../domain/ports/workflow-transition.repository";
import { CreateWorkflowTransitionInput } from "../dtos/create-workflow-transition.input";
import { ConditionFactory } from "../../domain/factories/condition.factory";
import { WorkflowAction } from "../../domain/entities/workflow-action";
import { ActionFactory } from "../../domain/factories/action.factory";
import { TRANSITION_PURPOSES } from "../../domain/constants/workflow-transition-purpose.constants";
import { TRANSITION_EFFECTS } from "../../domain/constants/workflow-transition-effect.constants";

export class CreateWorkflowTransitionUseCase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(WORKFLOW_TRANSITION_REPOSITORY)
    private readonly workflowTransitionRepo: WorkflowTransitionRepository,
  ) {}

  async execute(input: CreateWorkflowTransitionInput) {
    return this.uow.runInTransaction(async (tx) => {
      const aggregate = await this.workflowRepo.findDetailedById(input.workflowId, tx);
      if (!aggregate) {
        throw new NotFoundException("Workflow no encontrado");
      }

      const code = input.code?.trim();
      const name = input.name?.trim();
      if (!code || !name) {
        throw new BadRequestException("Transicion requiere code y name");
      }

      const isGlobal = input.isGlobal ?? false;
      const effect = input.effect ?? TRANSITION_EFFECTS.MOVE_STATE;
      const purpose = input.purpose ?? TRANSITION_PURPOSES.STANDARD;
      if (purpose === TRANSITION_PURPOSES.CANCEL && !isGlobal) {
        throw new BadRequestException("La transicion de cancelacion debe ser global");
      }
      if (
        purpose === TRANSITION_PURPOSES.CANCEL &&
        aggregate.transitions.some((item) => item.purpose === TRANSITION_PURPOSES.CANCEL)
      ) {
        throw new BadRequestException("El workflow solo puede tener una transicion de cancelacion");
      }
      if (!isGlobal && !aggregate.states.some((item) => item.id === input.fromStateId)) {
        throw new BadRequestException("Estado origen no existe en el workflow");
      }
      if (isGlobal && input.fromStateId) {
        throw new BadRequestException("Una transicion global no debe tener estado origen");
      }
      const toState = input.toStateId ? aggregate.states.find((item) => item.id === input.toStateId) : null;
      if (effect === TRANSITION_EFFECTS.MOVE_STATE) {
        if (!input.toStateId || !toState) {
          throw new BadRequestException("Estado destino no existe en el workflow");
        }
        if (purpose === TRANSITION_PURPOSES.CANCEL && toState.isFinal) {
          throw new BadRequestException("El estado destino de cancelacion no puede ser final");
        }
        if (!isGlobal && input.fromStateId === input.toStateId) {
          throw new BadRequestException("La transicion no puede apuntar al mismo estado");
        }
      }
      if (effect === TRANSITION_EFFECTS.RUN_ACTIONS && input.toStateId) {
        throw new BadRequestException("Una transicion de acciones no debe tener estado destino");
      }
      if (aggregate.transitions.some((item) => item.code === code)) {
        throw new BadRequestException("El code de la transicion ya existe");
      }
      const excludedStateIds = input.excludedStateIds ?? [];
      if (excludedStateIds.some((id) => !aggregate.states.some((state) => state.id === id))) {
        throw new BadRequestException("La transicion excluye estados inexistentes");
      }
      if (input.autoTrigger && !input.conditions?.length) {
        throw new BadRequestException("Una transicion automatica requiere condiciones");
      }
      if (
        input.elseEffect === TRANSITION_EFFECTS.MOVE_STATE &&
        (!input.elseToStateId || !aggregate.states.some((state) => state.id === input.elseToStateId))
      ) {
        throw new BadRequestException("La rama else requiere un estado destino valido");
      }
      if (input.elseEffect === TRANSITION_EFFECTS.RUN_ACTIONS && !input.elseActions?.length) {
        throw new BadRequestException("La rama else de acciones requiere al menos una accion");
      }

      const transition = new WorkflowTransition({
        id: crypto.randomUUID(),
        workflowId: input.workflowId,
        code,
        name,
        effect,
        purpose,
        fromStateId: input.fromStateId ?? null,
        toStateId: effect === TRANSITION_EFFECTS.MOVE_STATE ? input.toStateId ?? null : null,
        isGlobal,
        excludedStateIds,
        sourceHandle: input.sourceHandle ?? null,
        targetHandle: input.targetHandle ?? null,
        isActive: input.isActive ?? true,
        autoTrigger: input.autoTrigger ?? false,
        priority: input.priority ?? 0,
        elseEffect: input.elseEffect ?? null,
        elseToStateId:
          input.elseEffect === TRANSITION_EFFECTS.MOVE_STATE ? input.elseToStateId ?? null : null,
      });

      const conditions = (input.conditions ?? []).map(
        (condition, index) =>
          new WorkflowCondition({
            id: crypto.randomUUID(),
            transitionId: transition.id,
            type: condition.type,
            config: condition.config ?? {},
            position: condition.position ?? index,
          }),
      );
      conditions.forEach((condition) => ConditionFactory.create(condition));

      const actions = (input.actions ?? []).map(
        (action, index) =>
          new WorkflowAction({
            id: crypto.randomUUID(),
            transitionId: transition.id,
            type: action.type,
            config: action.config ?? {},
            position: action.position ?? index,
            branch: "THEN",
          }),
      );
      const elseActions = (input.elseActions ?? []).map(
        (action, index) =>
          new WorkflowAction({
            id: crypto.randomUUID(),
            transitionId: transition.id,
            type: action.type,
            config: action.config ?? {},
            position: action.position ?? index,
            branch: "ELSE",
          }),
      );
      if (effect === TRANSITION_EFFECTS.RUN_ACTIONS && actions.length === 0) {
        throw new BadRequestException("Una transicion de acciones requiere al menos una accion");
      }
      actions.forEach((action) => ActionFactory.validate(action));
      elseActions.forEach((action) => ActionFactory.validate(action));

      await this.workflowTransitionRepo.create(transition, conditions, [...actions, ...elseActions], tx);
      return this.workflowTransitionRepo.findDetailedById(transition.id, tx);
    });
  }
}
