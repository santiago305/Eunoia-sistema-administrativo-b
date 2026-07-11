import { TRANSITION_EFFECTS } from "../constants/workflow-transition-effect.constants";
import { Workflow } from "../entities/workflow";
import { WorkflowState } from "../entities/workflow-state";
import { WorkflowTransition } from "../entities/workflow-transition";
import { WorkflowRoutePlanner } from "./workflow-route-planner";

describe("WorkflowRoutePlanner", () => {
  const planner = new WorkflowRoutePlanner();

  function state(id: string, options: Partial<ConstructorParameters<typeof WorkflowState>[0]> = {}) {
    return new WorkflowState({
      id,
      workflowId: "workflow-1",
      saleOrderStateId: options.saleOrderStateId ?? `global-${id}`,
      code: id.toUpperCase(),
      name: id,
      color: "#64748b",
      position: 0,
      isInitial: false,
      isFinal: false,
      isActive: true,
      ...options,
    });
  }

  function transition(
    id: string,
    fromStateId: string | null,
    toStateId: string | null,
    options: Partial<ConstructorParameters<typeof WorkflowTransition>[0]> = {},
  ) {
    return new WorkflowTransition({
      id,
      workflowId: "workflow-1",
      code: id.toUpperCase(),
      name: id,
      effect: TRANSITION_EFFECTS.MOVE_STATE,
      fromStateId,
      toStateId,
      isActive: true,
      ...options,
    });
  }

  function aggregate(states: WorkflowState[], transitions: WorkflowTransition[] = []) {
    return {
      workflow: new Workflow({
        id: "workflow-1",
        name: "Pedidos",
        normalizedName: "PEDIDOS",
        description: null,
        isActive: true,
        createdAt: new Date("2026-06-08T00:00:00.000Z"),
        updatedAt: null,
      }),
      states,
      transitions,
      conditions: [],
      actions: [],
    };
  }

  it("returns a direct MOVE_STATE route", () => {
    const created = state("created");
    const delivered = state("delivered", { saleOrderStateId: "global-delivered" });
    const direct = transition("direct", "created", "delivered");

    const result = planner.resolve({
      aggregate: aggregate([created, delivered], [direct]),
      currentStateId: "created",
      targetSaleOrderStateId: "global-delivered",
    });

    expect(result).toMatchObject({ status: "ready", currentState: created, targetState: delivered });
    if (result.status !== "ready") throw new Error("Expected ready route");
    expect(result.transitions).toEqual([direct]);
  });

  it("returns the unique shortest multi-step route", () => {
    const created = state("created");
    const packed = state("packed");
    const shipped = state("shipped");
    const delivered = state("delivered", { saleOrderStateId: "global-delivered" });
    const toPacked = transition("to-packed", "created", "packed");
    const toShipped = transition("to-shipped", "packed", "shipped");
    const toDelivered = transition("to-delivered", "shipped", "delivered");
    const longHop = transition("long-hop", "created", "shipped", { isActive: false });

    const result = planner.resolve({
      aggregate: aggregate([created, packed, shipped, delivered], [toPacked, toShipped, toDelivered, longHop]),
      currentStateId: "created",
      targetSaleOrderStateId: "global-delivered",
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected ready route");
    expect(result.transitions).toEqual([toPacked, toShipped, toDelivered]);
  });

  it("includes active autoTrigger transitions on their primary toStateId", () => {
    const created = state("created");
    const paid = state("paid", { saleOrderStateId: "global-paid" });
    const auto = transition("auto-paid", "created", "paid", { autoTrigger: true });

    const result = planner.resolve({
      aggregate: aggregate([created, paid], [auto]),
      currentStateId: "created",
      targetSaleOrderStateId: "global-paid",
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected ready route");
    expect(result.transitions).toEqual([auto]);
  });

  it("expands a global transition from states not excluded", () => {
    const created = state("created");
    const cancelled = state("cancelled", { saleOrderStateId: "global-cancelled" });
    const cancel = transition("cancel", null, "cancelled", { isGlobal: true, excludedStateIds: ["delivered"] });

    const result = planner.resolve({
      aggregate: aggregate([created, cancelled], [cancel]),
      currentStateId: "created",
      targetSaleOrderStateId: "global-cancelled",
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected ready route");
    expect(result.transitions).toEqual([cancel]);
  });

  it("does not expand a global transition from an excluded state", () => {
    const created = state("created");
    const cancelled = state("cancelled", { saleOrderStateId: "global-cancelled" });
    const cancel = transition("cancel", null, "cancelled", { isGlobal: true, excludedStateIds: ["created"] });

    const result = planner.resolve({
      aggregate: aggregate([created, cancelled], [cancel]),
      currentStateId: "created",
      targetSaleOrderStateId: "global-cancelled",
    });

    expect(result).toMatchObject({ status: "failed", code: "ROUTE_NOT_FOUND" });
  });

  it("ignores RUN_ACTIONS, inactive states, inactive transitions, and elseToStateId", () => {
    const created = state("created");
    const inactive = state("inactive", { saleOrderStateId: "global-inactive", isActive: false });
    const delivered = state("delivered", { saleOrderStateId: "global-delivered" });
    const actionOnly = transition("action-only", "created", "delivered", { effect: TRANSITION_EFFECTS.RUN_ACTIONS });
    const inactiveTransition = transition("inactive-transition", "created", "delivered", { isActive: false });
    const elseOnly = transition("else-only", "created", null, { elseToStateId: "delivered" });
    const toInactive = transition("to-inactive", "created", "inactive");

    const result = planner.resolve({
      aggregate: aggregate([created, inactive, delivered], [actionOnly, inactiveTransition, elseOnly, toInactive]),
      currentStateId: "created",
      targetSaleOrderStateId: "global-delivered",
    });

    expect(result).toMatchObject({ status: "failed", code: "ROUTE_NOT_FOUND" });
  });

  it("terminates cycles with ROUTE_NOT_FOUND", () => {
    const created = state("created");
    const review = state("review");
    const delivered = state("delivered", { saleOrderStateId: "global-delivered" });

    const result = planner.resolve({
      aggregate: aggregate([created, review, delivered], [
        transition("to-review", "created", "review"),
        transition("to-created", "review", "created"),
      ]),
      currentStateId: "created",
      targetSaleOrderStateId: "global-delivered",
    });

    expect(result).toMatchObject({ status: "failed", code: "ROUTE_NOT_FOUND" });
  });

  it("returns already-at-target without transitions", () => {
    const delivered = state("delivered", { saleOrderStateId: "global-delivered" });

    const result = planner.resolve({
      aggregate: aggregate([delivered]),
      currentStateId: "delivered",
      targetSaleOrderStateId: "global-delivered",
    });

    expect(result).toEqual({
      status: "already-at-target",
      currentState: delivered,
      targetState: delivered,
      transitions: [],
    });
  });

  it("returns TARGET_STATE_NOT_IN_WORKFLOW for a missing global state", () => {
    const created = state("created");

    const result = planner.resolve({
      aggregate: aggregate([created]),
      currentStateId: "created",
      targetSaleOrderStateId: "global-missing",
    });

    expect(result).toMatchObject({ status: "failed", code: "TARGET_STATE_NOT_IN_WORKFLOW" });
  });

  it("returns TARGET_STATE_INACTIVE for an inactive destination", () => {
    const created = state("created");
    const delivered = state("delivered", { saleOrderStateId: "global-delivered", isActive: false });

    const result = planner.resolve({
      aggregate: aggregate([created, delivered]),
      currentStateId: "created",
      targetSaleOrderStateId: "global-delivered",
    });

    expect(result).toMatchObject({ status: "failed", code: "TARGET_STATE_INACTIVE", targetState: delivered });
  });

  it("returns AMBIGUOUS_ROUTE for two equal shortest paths", () => {
    const created = state("created");
    const a = state("a");
    const b = state("b");
    const delivered = state("delivered", { saleOrderStateId: "global-delivered" });

    const result = planner.resolve({
      aggregate: aggregate([created, a, b, delivered], [
        transition("to-a", "created", "a"),
        transition("a-delivered", "a", "delivered"),
        transition("to-b", "created", "b"),
        transition("b-delivered", "b", "delivered"),
      ]),
      currentStateId: "created",
      targetSaleOrderStateId: "global-delivered",
    });

    expect(result).toMatchObject({ status: "failed", code: "AMBIGUOUS_ROUTE" });
    expect("transitions" in result).toBe(false);
  });
});
