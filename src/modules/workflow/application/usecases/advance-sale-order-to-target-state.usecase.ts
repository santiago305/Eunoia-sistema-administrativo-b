import { HttpException, Inject, Injectable, Logger } from "@nestjs/common";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import {
  WORKFLOW_REPOSITORY,
  WorkflowAggregate,
  WorkflowRepository,
} from "../../domain/ports/workflow.repository";
import {
  WorkflowRouteFailureCode,
  WorkflowRoutePlanner,
  WorkflowRouteResolution,
} from "../../domain/services/workflow-route-planner";
import { WorkflowState } from "../../domain/entities/workflow-state";
import { WorkflowTransition } from "../../domain/entities/workflow-transition";
import {
  CompletedWorkflowTransition,
  SaleOrderWorkflowRouteFailure,
  SaleOrderWorkflowRouteResult,
  WorkflowStateReference,
} from "../dtos/sale-order-workflow-route.output";
import { AdvanceSaleOrderStateUseCase } from "./advance-sale-order-state.usecase";

type PlanResult =
  | {
      status: "planned";
      aggregate: WorkflowAggregate;
      initialState: WorkflowStateReference;
      finalState: WorkflowStateReference;
      transitions: WorkflowTransition[];
    }
  | {
      status: "done";
      result: SaleOrderWorkflowRouteResult;
    };

const routeFailureMessages: Record<WorkflowRouteFailureCode, string> = {
  CURRENT_STATE_INVALID: "El estado actual no pertenece al flujo del pedido",
  CURRENT_STATE_INACTIVE: "El estado actual del pedido esta inactivo",
  TARGET_STATE_NOT_IN_WORKFLOW: "El estado destino no existe en el flujo del pedido",
  TARGET_STATE_INACTIVE: "El estado destino esta inactivo en el flujo del pedido",
  ROUTE_NOT_FOUND: "No existe una ruta al estado destino en el flujo del pedido",
  AMBIGUOUS_ROUTE: "Existe mas de una ruta equivalente al estado destino",
};

const toStateReference = (state: WorkflowState): WorkflowStateReference => ({
  workflowStateId: state.id,
  saleOrderStateId: state.saleOrderStateId,
  code: state.code,
  name: state.name,
});

@Injectable()
export class AdvanceSaleOrderToTargetStateUseCase {
  private readonly logger = new Logger(AdvanceSaleOrderToTargetStateUseCase.name);
  private readonly planner = new WorkflowRoutePlanner();

  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    private readonly advanceSaleOrderState: AdvanceSaleOrderStateUseCase,
  ) {}

  async execute(input: {
    saleOrderId: string;
    targetStateId: string;
    executedBy: string;
  }): Promise<SaleOrderWorkflowRouteResult> {
    const plan = await this.uow.runInTransaction((tx) => this.plan(input, tx));
    if (plan.status === "done") return plan.result;

    const stateById = new Map(plan.aggregate.states.map((state) => [state.id, state]));
    const completedTransitions: CompletedWorkflowTransition[] = [];
    const warningSet = new Set<string>();
    let finalState = plan.initialState;

    for (const [index, transition] of plan.transitions.entries()) {
      try {
        const result = await this.advanceSaleOrderState.execute({
          saleOrderId: input.saleOrderId,
          transitionId: transition.id,
          executedBy: input.executedBy,
          metadata: {
            source: "sale-orders-bulk-target-state",
            targetStateId: input.targetStateId,
            routeStep: index + 1,
            routeLength: plan.transitions.length,
          },
        });

        const fromState = stateById.get(transition.fromStateId as string);
        const toState = stateById.get(transition.toStateId as string);
        if (!fromState || !toState || result.order.currentStateId !== transition.toStateId) {
          return this.failed(input, plan.initialState, finalState, completedTransitions, warningSet, {
            code: "ROUTE_INVALIDATED",
            message: "La ruta planificada ya no coincide con el estado actual del pedido",
          });
        }

        const warnings = result.warnings ?? [];
        for (const warning of warnings) warningSet.add(warning);
        finalState = toStateReference(toState);
        completedTransitions.push({
          transitionId: transition.id,
          code: transition.code,
          name: transition.name,
          fromState: toStateReference(fromState),
          toState: finalState,
          warnings,
          actionOutcomes: result.actionOutcomes ?? [],
        });
      } catch (error) {
        return this.failed(
          input,
          plan.initialState,
          finalState,
          completedTransitions,
          warningSet,
          this.mapStepError(error),
        );
      }
    }

    return {
      status: "success",
      saleOrderId: input.saleOrderId,
      targetStateId: input.targetStateId,
      initialState: plan.initialState,
      finalState,
      completedTransitions,
      warnings: Array.from(warningSet),
    };
  }

  private async plan(
    input: { saleOrderId: string; targetStateId: string; executedBy: string },
    tx: Parameters<UnitOfWork["runInTransaction"]>[0] extends (tx: infer T) => Promise<unknown> ? T : never,
  ): Promise<PlanResult> {
    const order = await this.saleOrderRepo.findByIdForUpdate(input.saleOrderId, tx);
    if (!order) {
      return {
        status: "done",
        result: this.failed(input, null, null, [], new Set(), {
          code: "SALE_ORDER_NOT_FOUND",
          message: "Pedido no encontrado",
        }),
      };
    }
    if (!order.workflowId || !order.currentStateId) {
      return {
        status: "done",
        result: this.failed(input, null, null, [], new Set(), {
          code: "WORKFLOW_NOT_ASSIGNED",
          message: "El pedido no tiene flujo asignado",
        }),
      };
    }

    const aggregate = await this.workflowRepo.findDetailedById(order.workflowId, tx);
    const currentState = aggregate?.states.find((state) => state.id === order.currentStateId) ?? null;
    const initialState = currentState ? toStateReference(currentState) : null;

    if (!aggregate) {
      return {
        status: "done",
        result: this.failed(input, initialState, initialState, [], new Set(), {
          code: "WORKFLOW_NOT_FOUND",
          message: "Flujo no encontrado",
        }),
      };
    }
    if (!aggregate.workflow.isActive) {
      return {
        status: "done",
        result: this.failed(input, initialState, initialState, [], new Set(), {
          code: "WORKFLOW_INACTIVE",
          message: "El flujo del pedido esta inactivo",
        }),
      };
    }

    const resolution = this.planner.resolve({
      aggregate,
      currentStateId: order.currentStateId,
      targetSaleOrderStateId: input.targetStateId,
    });

    if (resolution.status === "failed") {
      return {
        status: "done",
        result: this.failed(input, this.initialFromResolution(resolution), this.initialFromResolution(resolution), [], new Set(), {
          code: resolution.code,
          message: routeFailureMessages[resolution.code],
        }),
      };
    }

    const resolvedInitial = toStateReference(resolution.currentState);
    const targetState = toStateReference(resolution.targetState);
    if (resolution.status === "already-at-target") {
      return {
        status: "done",
        result: {
          status: "success",
          saleOrderId: input.saleOrderId,
          targetStateId: input.targetStateId,
          initialState: resolvedInitial,
          finalState: targetState,
          completedTransitions: [],
          warnings: [],
        },
      };
    }

    return {
      status: "planned",
      aggregate,
      initialState: resolvedInitial,
      finalState: targetState,
      transitions: resolution.transitions,
    };
  }

  private initialFromResolution(resolution: WorkflowRouteResolution): WorkflowStateReference | null {
    return resolution.currentState ? toStateReference(resolution.currentState) : null;
  }

  private mapStepError(error: unknown): SaleOrderWorkflowRouteFailure {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === "object" && response !== null) {
        const body = response as Record<string, unknown>;
        const details = typeof body.details === "object" && body.details !== null
          ? (body.details as Record<string, unknown>)
          : undefined;
        const code = details?.code;
        if (code === "CONDITION_FAILED" || code === "ACTION_FAILED") {
          return {
            code,
            message: typeof body.message === "string" ? body.message : error.message,
            ...(details ? { details } : {}),
          };
        }
      }
      return {
        code: "ROUTE_INVALIDATED",
        message: error.message,
      };
    }

    this.logger.error("Unexpected sale order route failure", error instanceof Error ? error.stack : String(error));
    return {
      code: "UNEXPECTED_ERROR",
      message: "No se pudo completar el cambio de estado",
    };
  }

  private failed(
    input: { saleOrderId: string; targetStateId: string },
    initialState: WorkflowStateReference | null,
    finalState: WorkflowStateReference | null,
    completedTransitions: CompletedWorkflowTransition[],
    warnings: Set<string>,
    failure: SaleOrderWorkflowRouteFailure,
  ): SaleOrderWorkflowRouteResult {
    return {
      status: "failed",
      saleOrderId: input.saleOrderId,
      targetStateId: input.targetStateId,
      initialState,
      finalState,
      completedTransitions,
      warnings: Array.from(warnings),
      message: failure.message,
      failure,
    };
  }
}
