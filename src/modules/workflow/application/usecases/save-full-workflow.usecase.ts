import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { Workflow } from "../../domain/entities/workflow";
import { WorkflowCondition } from "../../domain/entities/workflow-condition";
import { WorkflowState } from "../../domain/entities/workflow-state";
import { WorkflowTransition } from "../../domain/entities/workflow-transition";
import { ConditionFactory } from "../../domain/factories/condition.factory";
import { WorkflowAction } from "../../domain/entities/workflow-action";
import { ActionFactory } from "../../domain/factories/action.factory";
import { WORKFLOW_REPOSITORY, WorkflowAggregate, WorkflowRepository } from "../../domain/ports/workflow.repository";
import { SaveFullWorkflowInput } from "../dtos/save-full-workflow.input";
import { TRANSITION_PURPOSES } from "../../domain/constants/workflow-transition-purpose.constants";
import { TRANSITION_EFFECTS } from "../../domain/constants/workflow-transition-effect.constants";
import { SALE_ORDER_STATES_REPOSITORY, SaleOrderStatesRepository } from "../../domain/ports/sale-order-states.repository";

export class SaveFullWorkflowUseCase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    @Inject(SALE_ORDER_STATES_REPOSITORY)
    private readonly saleOrderStatesRepo: SaleOrderStatesRepository = {
      findById: async () => null,
    } as unknown as SaleOrderStatesRepository,
  ) {}

  async execute(input: SaveFullWorkflowInput) {
    return this.uow.runInTransaction(async (tx) => {
      const current = input.workflowId ? await this.workflowRepo.findDetailedById(input.workflowId, tx) : null;
      if (input.workflowId && !current) {
        throw new NotFoundException("Workflow no encontrado");
      }

      const aggregate = await this.buildAggregate(input, current, tx);
      return this.workflowRepo.saveFull(aggregate, { synchronize: Boolean(current) }, tx);
    });
  }

  private async buildAggregate(input: SaveFullWorkflowInput, current: WorkflowAggregate | null, tx: any): Promise<WorkflowAggregate> {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException("Nombre de workflow es obligatorio");
    }
    if (!input.states.length) {
      throw new BadRequestException("El workflow requiere estados");
    }

    this.assertUnique(input.states.map((state) => state.clientId), "clientId de estado");
    this.assertUnique(input.states.map((state) => state.saleOrderStateId ?? state.code ?? ""), "estado global");
    this.assertUnique(input.transitions.map((transition) => transition.clientId), "clientId de transicion");
    this.assertUnique(input.transitions.map((transition) => transition.code.trim()), "code de transicion");
    if (
      input.transitions.filter(
        (transition) => (transition.purpose ?? TRANSITION_PURPOSES.STANDARD) === TRANSITION_PURPOSES.CANCEL,
      ).length > 1
    ) {
      throw new BadRequestException("El workflow solo puede tener una transicion de cancelacion");
    }

    const existingStateIds = new Set(current?.states.map((state) => state.id) ?? []);
    const existingTransitionIds = new Set(current?.transitions.map((transition) => transition.id) ?? []);
    for (const state of input.states) {
      if (state.id && !existingStateIds.has(state.id)) {
        throw new BadRequestException(`El estado ${state.id} no pertenece al workflow`);
      }
    }
    for (const transition of input.transitions) {
      if (transition.id && !existingTransitionIds.has(transition.id)) {
        throw new BadRequestException(`La transicion ${transition.id} no pertenece al workflow`);
      }
    }

    const now = this.clock.now();
    const workflowId = current?.workflow.id ?? crypto.randomUUID();
    const requestedGlobalIds = input.states.map((state) => state.saleOrderStateId).filter(Boolean) as string[];
    const globalStates = new Map(
      (await Promise.all(requestedGlobalIds.map((id) => this.saleOrderStatesRepo.findById(id, tx))))
        .filter(Boolean)
        .map((state) => [state!.id as string, state!]),
    );
    if (globalStates.size !== requestedGlobalIds.length) {
      throw new BadRequestException("Uno o mas estados globales no existen");
    }
    const states = input.states.map(
      (state, index) => {
        const globalState = state.saleOrderStateId
          ? globalStates.get(state.saleOrderStateId)!
          : {
              id: state.code as string,
              code: state.code as string,
              name: state.name as string,
              color: state.color as string,
            };
        return (
        new WorkflowState({
          id: state.id ?? crypto.randomUUID(),
          workflowId,
          saleOrderStateId: globalState.id as string,
          code: globalState.code,
          name: globalState.name,
          color: globalState.color,
          position: state.position ?? index,
          positionX: state.positionX ?? null,
          positionY: state.positionY ?? null,
          isInitial: state.isInitial ?? false,
          isFinal: state.isFinal ?? false,
          isActive: state.isActive ?? true,
        })
        );
      },
    );
    if (states.filter((state) => state.isInitial && state.isActive).length !== 1) {
      throw new BadRequestException("El workflow requiere exactamente un estado inicial activo");
    }
    if (!states.some((state) => state.isFinal && state.isActive)) {
      throw new BadRequestException("El workflow requiere al menos un estado final activo");
    }

    const stateReferences = new Map<string, WorkflowState>();
    input.states.forEach((state, index) => {
      stateReferences.set(state.clientId, states[index]);
      stateReferences.set(states[index].id, states[index]);
    });

    const conditions: WorkflowCondition[] = [];
    const actions: WorkflowAction[] = [];
    const transitions = input.transitions.map((transition) => {
      const isGlobal = transition.isGlobal ?? false;
      const effect = transition.effect ?? TRANSITION_EFFECTS.MOVE_STATE;
      const purpose = transition.purpose ?? TRANSITION_PURPOSES.STANDARD;
      if (purpose === TRANSITION_PURPOSES.CANCEL && !isGlobal) {
        throw new BadRequestException("La transicion de cancelacion debe ser global");
      }

      const fromState = transition.fromStateRef ? stateReferences.get(transition.fromStateRef) : null;
      const toState = transition.toStateRef ? stateReferences.get(transition.toStateRef) : null;
      if (!isGlobal && !fromState) {
        throw new BadRequestException(`Transicion ${transition.code} referencia estados inexistentes`);
      }
      if (effect === TRANSITION_EFFECTS.MOVE_STATE) {
        if (!toState) {
          throw new BadRequestException(`Transicion ${transition.code} referencia estados inexistentes`);
        }
        if (purpose === TRANSITION_PURPOSES.CANCEL && toState.isFinal) {
          throw new BadRequestException("El estado destino de cancelacion no puede ser final");
        }
      }
      if (effect === TRANSITION_EFFECTS.RUN_ACTIONS && transition.toStateRef) {
        throw new BadRequestException(`Transicion de acciones ${transition.code} no debe tener estado destino`);
      }
      if (isGlobal && transition.fromStateRef) {
        throw new BadRequestException(`Transicion global ${transition.code} no debe tener estado origen`);
      }

      const excludedStateIds = (transition.excludedStateRefs ?? []).map((reference) => {
        const state = stateReferences.get(reference);
        if (!state) {
          throw new BadRequestException(`Transicion ${transition.code} excluye un estado inexistente`);
        }
        return state.id;
      });

      const transitionId = transition.id ?? crypto.randomUUID();
      (transition.conditions ?? []).forEach((condition, index) => {
        ConditionFactory.create({ type: condition.type, config: condition.config ?? {} });
        conditions.push(
          new WorkflowCondition({
            id: crypto.randomUUID(),
            transitionId,
            type: condition.type,
            config: condition.config ?? {},
            position: condition.position ?? index,
          }),
        );
      });
      (transition.actions ?? []).forEach((action, index) => {
        ActionFactory.validate({ type: action.type, config: action.config ?? {} } as WorkflowAction);
        actions.push(
          new WorkflowAction({
            id: crypto.randomUUID(),
            transitionId,
            type: action.type,
            config: action.config ?? {},
            position: action.position ?? index,
          }),
        );
      });
      if (effect === TRANSITION_EFFECTS.RUN_ACTIONS && !transition.actions?.length) {
        throw new BadRequestException("Una transicion de acciones requiere al menos una accion");
      }

      return new WorkflowTransition({
        id: transitionId,
        workflowId,
        code: transition.code,
        name: transition.name,
        effect,
        purpose,
        fromStateId: fromState?.id ?? null,
        toStateId: effect === TRANSITION_EFFECTS.MOVE_STATE ? toState?.id ?? null : null,
        isGlobal,
        excludedStateIds,
        sourceHandle: transition.sourceHandle ?? null,
        targetHandle: transition.targetHandle ?? null,
        isActive: transition.isActive ?? true,
      });
    });

    return {
      workflow: new Workflow({
        id: workflowId,
        name,
        normalizedName: name.replace(/\s+/g, " ").toLocaleUpperCase("es-PE"),
        description: input.description === undefined ? current?.workflow.description ?? null : input.description,
        isActive: input.isActive ?? current?.workflow.isActive ?? false,
        createdAt: current?.workflow.createdAt ?? now,
        updatedAt: current ? now : null,
      }),
      states,
      transitions,
      conditions,
      actions,
    };
  }

  private assertUnique(values: string[], field: string) {
    const normalized = values.map((value) => value.trim());
    if (normalized.some((value) => !value) || new Set(normalized).size !== normalized.length) {
      throw new BadRequestException(`${field} debe ser obligatorio y unico`);
    }
  }
}
