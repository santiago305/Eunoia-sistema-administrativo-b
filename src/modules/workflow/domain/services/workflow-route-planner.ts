import { TRANSITION_EFFECTS } from "../constants/workflow-transition-effect.constants";
import { WorkflowState } from "../entities/workflow-state";
import { WorkflowTransition } from "../entities/workflow-transition";
import { WorkflowAggregate } from "../ports/workflow.repository";

export type WorkflowRouteFailureCode =
  | "CURRENT_STATE_INVALID"
  | "CURRENT_STATE_INACTIVE"
  | "TARGET_STATE_NOT_IN_WORKFLOW"
  | "TARGET_STATE_INACTIVE"
  | "ROUTE_NOT_FOUND"
  | "AMBIGUOUS_ROUTE";

export type WorkflowRouteResolution =
  | {
      status: "ready";
      currentState: WorkflowState;
      targetState: WorkflowState;
      transitions: WorkflowTransition[];
    }
  | {
      status: "already-at-target";
      currentState: WorkflowState;
      targetState: WorkflowState;
      transitions: [];
    }
  | {
      status: "failed";
      code: WorkflowRouteFailureCode;
      message: string;
      currentState: WorkflowState | null;
      targetState: WorkflowState | null;
    };

type QueueItem = {
  stateId: string;
  transitions: WorkflowTransition[];
};

export class WorkflowRoutePlanner {
  resolve(input: {
    aggregate: WorkflowAggregate;
    currentStateId: string;
    targetSaleOrderStateId: string;
  }): WorkflowRouteResolution {
    const stateById = new Map(input.aggregate.states.map((state) => [state.id, state]));
    const currentState = stateById.get(input.currentStateId) ?? null;
    if (!currentState) {
      return {
        status: "failed",
        code: "CURRENT_STATE_INVALID",
        message: "El estado actual no pertenece al flujo del pedido",
        currentState: null,
        targetState: null,
      };
    }
    if (!currentState.isActive) {
      return {
        status: "failed",
        code: "CURRENT_STATE_INACTIVE",
        message: "El estado actual del pedido esta inactivo",
        currentState,
        targetState: null,
      };
    }

    const targetState =
      input.aggregate.states.find((state) => state.saleOrderStateId === input.targetSaleOrderStateId) ?? null;
    if (!targetState) {
      return {
        status: "failed",
        code: "TARGET_STATE_NOT_IN_WORKFLOW",
        message: "El estado destino no existe en el flujo del pedido",
        currentState,
        targetState: null,
      };
    }
    if (!targetState.isActive) {
      return {
        status: "failed",
        code: "TARGET_STATE_INACTIVE",
        message: "El estado destino esta inactivo en el flujo del pedido",
        currentState,
        targetState,
      };
    }
    if (currentState.id === targetState.id) {
      return {
        status: "already-at-target",
        currentState,
        targetState,
        transitions: [],
      };
    }

    const transitions = input.aggregate.transitions
      .filter(
        (transition) =>
          transition.isActive &&
          transition.effect === TRANSITION_EFFECTS.MOVE_STATE &&
          Boolean(transition.toStateId),
      )
      .sort(
        (left, right) =>
          left.code.localeCompare(right.code) ||
          left.id.localeCompare(right.id),
      );

    const outgoing = (stateId: string) =>
      transitions.filter((transition) =>
        transition.isGlobal
          ? !transition.excludedStateIds.includes(stateId)
          : transition.fromStateId === stateId,
      );

    const queue: QueueItem[] = [{ stateId: currentState.id, transitions: [] }];
    const bestDistance = new Map<string, number>([[currentState.id, 0]]);
    const candidates: WorkflowTransition[][] = [];
    let shortestDistance: number | null = null;

    while (queue.length > 0) {
      const item = queue.shift() as QueueItem;
      const distance = item.transitions.length;
      if (shortestDistance !== null && distance > shortestDistance) break;

      if (item.stateId === targetState.id) {
        shortestDistance = distance;
        candidates.push(item.transitions);
        if (candidates.length > 1) {
          return {
            status: "failed",
            code: "AMBIGUOUS_ROUTE",
            message: "Existe mas de una ruta equivalente al estado destino",
            currentState,
            targetState,
          };
        }
        continue;
      }

      for (const transition of outgoing(item.stateId)) {
        const nextStateId = transition.toStateId as string;
        const nextState = stateById.get(nextStateId);
        if (!nextState?.isActive) continue;

        const nextDistance = distance + 1;
        const knownDistance = bestDistance.get(nextStateId);
        if (knownDistance !== undefined && nextDistance > knownDistance) {
          continue;
        }
        bestDistance.set(nextStateId, nextDistance);
        queue.push({
          stateId: nextStateId,
          transitions: [...item.transitions, transition],
        });
      }
    }

    if (candidates.length === 0) {
      return {
        status: "failed",
        code: "ROUTE_NOT_FOUND",
        message: "No existe una ruta al estado destino en el flujo del pedido",
        currentState,
        targetState,
      };
    }

    return {
      status: "ready",
      currentState,
      targetState,
      transitions: candidates[0],
    };
  }
}
