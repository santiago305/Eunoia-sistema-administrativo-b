import { IsPaidCondition } from "../conditions/is-paid.condition";
import { HasStockCondition } from "../conditions/has-stock.condition";
import { Workflow } from "../entities/workflow";
import { WorkflowState } from "../entities/workflow-state";
import { WorkflowTransition } from "../entities/workflow-transition";
import { WorkflowEngine } from "./workflow-engine";

describe("WorkflowEngine", () => {
  const workflow = new Workflow({
    id: "workflow-1",
    name: "Workflow 1",
    normalizedName: "WORKFLOW 1",
    description: null,
    isActive: true,
    createdAt: new Date("2026-06-06T00:00:00.000Z"),
    updatedAt: null,
  });

  const currentState = new WorkflowState({
    id: "state-1",
    workflowId: "workflow-1",
    code: "CREATED",
    name: "Created",
    color: "#000000",
    position: 1,
    isInitial: true,
    isFinal: false,
    isActive: true,
  });

  const nextState = new WorkflowState({
    id: "state-2",
    workflowId: "workflow-1",
    code: "PAID",
    name: "Paid",
    color: "#00ff00",
    position: 2,
    isInitial: false,
    isFinal: false,
    isActive: true,
  });

  const transition = new WorkflowTransition({
    id: "transition-1",
    workflowId: "workflow-1",
    code: "MARK_PAID",
    name: "Mark paid",
    fromStateId: "state-1",
    toStateId: "state-2",
    isActive: true,
  });

  it("allows a global transition from a different current state", () => {
    const engine = new WorkflowEngine();
    const globalTransition = new WorkflowTransition({
      ...transition,
      id: "transition-global",
      fromStateId: null,
      isGlobal: true,
      excludedStateIds: [],
    });

    expect(
      engine.canTransition({
        workflow,
        currentState,
        transition: globalTransition,
        conditions: [],
        context: {
          orderId: "order-1",
          isPaid: true,
          hasStock: true,
          isCancelled: false,
          invoiceSent: false,
          currentDate: new Date(),
          variables: {},
        },
        toState: nextState,
      }).allowed,
    ).toBe(true);
  });

  it("blocks a global transition from an excluded state", () => {
    const engine = new WorkflowEngine();
    const globalTransition = new WorkflowTransition({
      ...transition,
      id: "transition-global",
      fromStateId: null,
      isGlobal: true,
      excludedStateIds: [currentState.id],
    });

    const decision = engine.canTransition({
      workflow,
      currentState,
      transition: globalTransition,
      conditions: [],
      context: {
        orderId: "order-1",
        isPaid: true,
        hasStock: true,
        isCancelled: false,
        invoiceSent: false,
        currentDate: new Date(),
        variables: {},
      },
      toState: nextState,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.failures[0].type).toBe("STATE_EXCLUDED");
  });

  it("allows a valid transition when all conditions pass", () => {
    const engine = new WorkflowEngine();

    const result = engine.canTransition({
      workflow,
      currentState,
      transition,
      conditions: [new IsPaidCondition()],
      toState: nextState,
      context: {
        orderId: "order-1",
        isPaid: true,
        hasStock: true,
        isCancelled: false,
        invoiceSent: false,
        currentDate: new Date("2026-06-06T00:00:00.000Z"),
        variables: {},
      },
    });

    expect(result).toEqual({ allowed: true, failures: [] });
  });

  it("rejects a transition when one condition fails", () => {
    const engine = new WorkflowEngine();

    const result = engine.canTransition({
      workflow,
      currentState,
      transition,
      conditions: [new HasStockCondition()],
      toState: nextState,
      context: {
        orderId: "order-1",
        isPaid: true,
        hasStock: false,
        isCancelled: false,
        invoiceSent: false,
        currentDate: new Date("2026-06-06T00:00:00.000Z"),
        variables: {},
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.failures).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "HAS_STOCK", passed: false })]),
    );
  });
});
