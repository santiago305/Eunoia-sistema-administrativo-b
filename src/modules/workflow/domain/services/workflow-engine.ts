import { Condition, ConditionEvaluation, WorkflowContext } from "../conditions/condition";
import { Workflow } from "../entities/workflow";
import { WorkflowState } from "../entities/workflow-state";
import { WorkflowTransition } from "../entities/workflow-transition";

export type TransitionEvaluation = {
  workflow: Workflow;
  currentState: WorkflowState;
  transition: WorkflowTransition;
  conditions: Condition[];
  context: WorkflowContext;
  toState?: WorkflowState | null;
};

export type TransitionDecision = {
  allowed: boolean;
  failures: Array<ConditionEvaluation | { type: string; reason: string; passed: false }>;
};

export class WorkflowEngine {
  canTransition(input: TransitionEvaluation): TransitionDecision {
    if (!input.workflow.isActive) {
      return { allowed: false, failures: [{ type: "WORKFLOW_INACTIVE", reason: "Workflow inactivo", passed: false }] };
    }

    if (!input.currentState.isActive) {
      return { allowed: false, failures: [{ type: "CURRENT_STATE_INACTIVE", reason: "Estado actual inactivo", passed: false }] };
    }

    if (!input.transition.isActive) {
      return { allowed: false, failures: [{ type: "TRANSITION_INACTIVE", reason: "Transicion inactiva", passed: false }] };
    }

    if (input.currentState.workflowId !== input.workflow.id || input.transition.workflowId !== input.workflow.id) {
      return { allowed: false, failures: [{ type: "WORKFLOW_MISMATCH", reason: "La transicion no pertenece al workflow", passed: false }] };
    }

    if (input.transition.isGlobal && input.transition.excludedStateIds.includes(input.currentState.id)) {
      return { allowed: false, failures: [{ type: "STATE_EXCLUDED", reason: "Transicion no disponible desde el estado actual", passed: false }] };
    }

    if (!input.transition.isGlobal && input.transition.fromStateId !== input.currentState.id) {
      return { allowed: false, failures: [{ type: "STATE_MISMATCH", reason: "La transicion no sale del estado actual", passed: false }] };
    }

    if (input.toState && !input.toState.isActive) {
      return { allowed: false, failures: [{ type: "TARGET_STATE_INACTIVE", reason: "El estado destino esta inactivo", passed: false }] };
    }

    const failures = this.evaluateConditions(input.conditions, input.context).filter((item) => !item.passed);
    return { allowed: failures.length === 0, failures };
  }

  getAvailableTransitions(
    transitions: WorkflowTransition[],
    evaluations: ReadonlyMap<string, TransitionDecision>,
  ): WorkflowTransition[] {
    return transitions.filter((transition) => evaluations.get(transition.id)?.allowed);
  }

  evaluateConditions(conditions: Condition[], context: WorkflowContext): ConditionEvaluation[] {
    return conditions.map((condition) => condition.evaluate(context));
  }
}
