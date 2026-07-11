import { BadRequestException, Logger, UnprocessableEntityException } from "@nestjs/common";
import { AdvanceSaleOrderToTargetStateUseCase } from "./advance-sale-order-to-target-state.usecase";
import { TRANSITION_EFFECTS } from "../../domain/constants/workflow-transition-effect.constants";
import { Workflow } from "../../domain/entities/workflow";
import { WorkflowState } from "../../domain/entities/workflow-state";
import { WorkflowTransition } from "../../domain/entities/workflow-transition";

describe("AdvanceSaleOrderToTargetStateUseCase", () => {
  const tx = {} as any;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  function transition(id: string, fromStateId: string, toStateId: string) {
    return new WorkflowTransition({
      id,
      workflowId: "workflow-1",
      code: id.toUpperCase(),
      name: id,
      effect: TRANSITION_EFFECTS.MOVE_STATE,
      fromStateId,
      toStateId,
      isActive: true,
    });
  }

  function aggregate(states: WorkflowState[], transitions: WorkflowTransition[], options: { active?: boolean } = {}) {
    return {
      workflow: new Workflow({
        id: "workflow-1",
        name: "Pedidos",
        normalizedName: "PEDIDOS",
        description: null,
        isActive: options.active ?? true,
        createdAt: new Date("2026-06-08T00:00:00.000Z"),
        updatedAt: null,
      }),
      states,
      transitions,
      conditions: [],
      actions: [],
    };
  }

  function setup(options: {
    order?: any;
    aggregate?: any;
    advance?: any;
  } = {}) {
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue(
        "order" in options ? options.order : { id: "order-1", workflowId: "workflow-1", currentStateId: "created" },
      ),
    };
    const workflowRepo = {
      findDetailedById: jest.fn().mockResolvedValue(options.aggregate),
    };
    const uow = {
      runInTransaction: jest.fn((work) => work(tx)),
    };
    const advance = options.advance ?? { execute: jest.fn() };
    const usecase = new AdvanceSaleOrderToTargetStateUseCase(
      uow as any,
      saleOrderRepo as any,
      workflowRepo as any,
      advance as any,
    );

    return { usecase, saleOrderRepo, workflowRepo, uow, advance };
  }

  it("maps the global target and executes every transition in order", async () => {
    const created = state("created");
    const packed = state("packed");
    const delivered = state("delivered", { saleOrderStateId: "global-delivered" });
    const first = transition("transition-1", "created", "packed");
    const second = transition("transition-2", "packed", "delivered");
    const advance = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({ order: { id: "order-1", currentStateId: "packed" }, warnings: [], actionOutcomes: [] })
        .mockResolvedValueOnce({ order: { id: "order-1", currentStateId: "delivered" }, warnings: [], actionOutcomes: [] }),
    };
    const { usecase } = setup({ aggregate: aggregate([created, packed, delivered], [first, second]), advance });

    const result = await usecase.execute({
      saleOrderId: "order-1",
      targetStateId: "global-delivered",
      executedBy: "user-1",
    });

    expect(advance.execute).toHaveBeenNthCalledWith(1, {
      saleOrderId: "order-1",
      transitionId: "transition-1",
      executedBy: "user-1",
      metadata: {
        source: "sale-orders-bulk-target-state",
        targetStateId: "global-delivered",
        routeStep: 1,
        routeLength: 2,
      },
    });
    expect(advance.execute).toHaveBeenNthCalledWith(2, {
      saleOrderId: "order-1",
      transitionId: "transition-2",
      executedBy: "user-1",
      metadata: {
        source: "sale-orders-bulk-target-state",
        targetStateId: "global-delivered",
        routeStep: 2,
        routeLength: 2,
      },
    });
    expect(result.status).toBe("success");
    expect(result.finalState).toMatchObject({ workflowStateId: "delivered", saleOrderStateId: "global-delivered" });
    expect(result.completedTransitions.map((item) => item.transitionId)).toEqual(["transition-1", "transition-2"]);
  });

  it("returns success with zero steps when already at target", async () => {
    const delivered = state("delivered", { saleOrderStateId: "global-delivered" });
    const { usecase, advance } = setup({
      order: { id: "order-1", workflowId: "workflow-1", currentStateId: "delivered" },
      aggregate: aggregate([delivered], []),
    });

    const result = await usecase.execute({
      saleOrderId: "order-1",
      targetStateId: "global-delivered",
      executedBy: "user-1",
    });

    expect(result.status).toBe("success");
    expect(result.completedTransitions).toEqual([]);
    expect(result.finalState).toMatchObject({ workflowStateId: "delivered" });
    expect(advance.execute).not.toHaveBeenCalled();
  });

  it("keeps the first committed step when the second condition fails", async () => {
    const created = state("created");
    const packed = state("packed");
    const validated = state("validated");
    const delivered = state("delivered", { saleOrderStateId: "global-delivered" });
    const first = transition("transition-1", "created", "packed");
    const second = transition("transition-2", "packed", "validated");
    const third = transition("transition-3", "validated", "delivered");
    const advance = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({
          order: { id: "order-1", currentStateId: "packed" },
          warnings: [],
          actionOutcomes: [],
        })
        .mockRejectedValueOnce(
          new UnprocessableEntityException({
            type: "workflow_transition_condition_failed",
            message: "El DNI del cliente es obligatorio",
            details: {
              code: "CONDITION_FAILED",
              transitionId: "transition-2",
              failures: [
                {
                  type: "SALE_ORDER_FIELD_REQUIRED",
                  passed: false,
                  reason: "El DNI del cliente es obligatorio",
                },
              ],
            },
          }),
        ),
    };
    const { usecase } = setup({ aggregate: aggregate([created, packed, validated, delivered], [first, second, third]), advance });

    const result = await usecase.execute({
      saleOrderId: "order-1",
      targetStateId: "global-delivered",
      executedBy: "user-1",
    });

    expect(result.status).toBe("failed");
    if (result.status !== "failed") throw new Error("Expected failed route");
    expect(result.finalState).toMatchObject({ workflowStateId: "packed" });
    expect(result.completedTransitions.map((item) => item.transitionId)).toEqual(["transition-1"]);
    expect(result.failure).toMatchObject({
      code: "CONDITION_FAILED",
      message: "El DNI del cliente es obligatorio",
      details: { transitionId: "transition-2" },
    });
    expect(advance.execute).toHaveBeenCalledTimes(2);
  });

  it("keeps action outcomes and unique warnings from committed steps", async () => {
    const created = state("created");
    const packed = state("packed", { saleOrderStateId: "global-packed" });
    const first = transition("transition-1", "created", "packed");
    const advance = {
      execute: jest.fn().mockResolvedValueOnce({
        order: { id: "order-1", currentStateId: "packed" },
        warnings: ["Ya hay almacen", "Ya hay almacen"],
        actionOutcomes: [{ actionType: "ASSIGN_WAREHOUSE_BY_PROVINCE", status: "SKIPPED", message: "Ya hay almacen" }],
      }),
    };
    const { usecase } = setup({ aggregate: aggregate([created, packed], [first]), advance });

    const result = await usecase.execute({
      saleOrderId: "order-1",
      targetStateId: "global-packed",
      executedBy: "user-1",
    });

    expect(result.warnings).toEqual(["Ya hay almacen"]);
    expect(result.completedTransitions[0].warnings).toEqual(["Ya hay almacen", "Ya hay almacen"]);
    expect(result.completedTransitions[0].actionOutcomes).toEqual([
      { actionType: "ASSIGN_WAREHOUSE_BY_PROVINCE", status: "SKIPPED", message: "Ya hay almacen" },
    ]);
  });

  it("does not execute steps after the first obstacle", async () => {
    const created = state("created");
    const packed = state("packed");
    const delivered = state("delivered", { saleOrderStateId: "global-delivered" });
    const first = transition("transition-1", "created", "packed");
    const second = transition("transition-2", "packed", "delivered");
    const advance = { execute: jest.fn().mockRejectedValueOnce(new BadRequestException("Transicion no disponible")) };
    const { usecase } = setup({ aggregate: aggregate([created, packed, delivered], [first, second]), advance });

    const result = await usecase.execute({
      saleOrderId: "order-1",
      targetStateId: "global-delivered",
      executedBy: "user-1",
    });

    expect(result.status).toBe("failed");
    if (result.status !== "failed") throw new Error("Expected failed route");
    expect(result.failure.code).toBe("ROUTE_INVALIDATED");
    expect(advance.execute).toHaveBeenCalledTimes(1);
  });

  it("returns missing order, workflow, current state, target, route, and ambiguity codes", async () => {
    const created = state("created");
    const delivered = state("delivered", { saleOrderStateId: "global-delivered" });
    const a = state("a");
    const b = state("b");

    const cases = [
      {
        expected: "SALE_ORDER_NOT_FOUND",
        setup: setup({ order: null, aggregate: aggregate([created], []) }),
      },
      {
        expected: "WORKFLOW_NOT_ASSIGNED",
        setup: setup({ order: { id: "order-1", workflowId: null, currentStateId: null } }),
      },
      {
        expected: "WORKFLOW_NOT_FOUND",
        setup: setup({ aggregate: null }),
      },
      {
        expected: "WORKFLOW_INACTIVE",
        setup: setup({ aggregate: aggregate([created], [], { active: false }) }),
      },
      {
        expected: "CURRENT_STATE_INVALID",
        setup: setup({ aggregate: aggregate([delivered], []) }),
      },
      {
        expected: "TARGET_STATE_NOT_IN_WORKFLOW",
        setup: setup({ aggregate: aggregate([created], []) }),
      },
      {
        expected: "ROUTE_NOT_FOUND",
        setup: setup({ aggregate: aggregate([created, delivered], []) }),
      },
      {
        expected: "AMBIGUOUS_ROUTE",
        setup: setup({
          aggregate: aggregate([created, a, b, delivered], [
            transition("to-a", "created", "a"),
            transition("a-delivered", "a", "delivered"),
            transition("to-b", "created", "b"),
            transition("b-delivered", "b", "delivered"),
          ]),
        }),
      },
    ];

    for (const item of cases) {
      const result = await item.setup.usecase.execute({
        saleOrderId: "order-1",
        targetStateId: "global-delivered",
        executedBy: "user-1",
      });
      expect(result.status).toBe("failed");
      if (result.status !== "failed") throw new Error("Expected failed route");
      expect(result.failure.code).toBe(item.expected);
    }
  });

  it("reports ROUTE_INVALIDATED when the live transition no longer starts at the planned state", async () => {
    const created = state("created");
    const packed = state("packed", { saleOrderStateId: "global-packed" });
    const first = transition("transition-1", "created", "packed");
    const advance = {
      execute: jest.fn().mockResolvedValueOnce({
        order: { id: "order-1", currentStateId: "other-state" },
        warnings: [],
        actionOutcomes: [],
      }),
    };
    const { usecase } = setup({ aggregate: aggregate([created, packed], [first]), advance });

    const result = await usecase.execute({
      saleOrderId: "order-1",
      targetStateId: "global-packed",
      executedBy: "user-1",
    });

    expect(result.status).toBe("failed");
    if (result.status !== "failed") throw new Error("Expected failed route");
    expect(result.failure.code).toBe("ROUTE_INVALIDATED");
  });

  it("sanitizes an unexpected internal error", async () => {
    const created = state("created");
    const packed = state("packed", { saleOrderStateId: "global-packed" });
    const first = transition("transition-1", "created", "packed");
    const advance = { execute: jest.fn().mockRejectedValueOnce(new Error("database password leaked")) };
    const { usecase } = setup({ aggregate: aggregate([created, packed], [first]), advance });

    const result = await usecase.execute({
      saleOrderId: "order-1",
      targetStateId: "global-packed",
      executedBy: "user-1",
    });

    expect(result.status).toBe("failed");
    if (result.status !== "failed") throw new Error("Expected failed route");
    expect(result.failure).toEqual({
      code: "UNEXPECTED_ERROR",
      message: "No se pudo completar el cambio de estado",
    });
  });
});
