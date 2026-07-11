import { SaleOrderWorkflowTransitionService } from "./sale-order-workflow-transition.service";
import { ACTIONS } from "../../domain/constants/workflow-action.constants";
import { TRANSITION_EFFECTS } from "../../domain/constants/workflow-transition-effect.constants";
import { TRANSITION_PURPOSES } from "../../domain/constants/workflow-transition-purpose.constants";
import { CONDITIONS } from "../../domain/constants/workflow-condition.constants";
import { Workflow } from "../../domain/entities/workflow";
import { WorkflowAction } from "../../domain/entities/workflow-action";
import { WorkflowCondition } from "../../domain/entities/workflow-condition";
import { WorkflowState } from "../../domain/entities/workflow-state";
import { WorkflowTransition } from "../../domain/entities/workflow-transition";

describe("SaleOrderWorkflowTransitionService", () => {
  it("runs a global action-only transition without changing the current state", async () => {
    const tx = {};
    const order = {
      id: "order-1",
      workflowId: "workflow-1",
      currentStateId: "state-created",
    };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue(order),
      updateWorkflowState: jest.fn(),
    };
    const currentState = new WorkflowState({
      id: "state-created",
      workflowId: "workflow-1",
      code: "CREATED",
      name: "Creado",
      color: "#64748b",
      position: 0,
      isInitial: true,
      isFinal: false,
      isActive: true,
    });
    const workflowRepo = {
      findDetailedById: jest.fn().mockResolvedValue({
        workflow: new Workflow({
          id: "workflow-1",
          name: "Pedidos",
          normalizedName: "PEDIDOS",
          description: null,
          isActive: true,
          createdAt: new Date("2026-06-08T00:00:00.000Z"),
          updatedAt: null,
        }),
        states: [currentState],
        transitions: [],
        conditions: [],
        actions: [],
      }),
    };
    const transition = new WorkflowTransition({
      id: "transition-1",
      workflowId: "workflow-1",
      code: "NOTIFY_CLIENT",
      name: "Notificar cliente",
      effect: TRANSITION_EFFECTS.RUN_ACTIONS,
      purpose: TRANSITION_PURPOSES.STANDARD,
      fromStateId: null,
      toStateId: null,
      isGlobal: true,
      excludedStateIds: [],
      isActive: true,
    });
    const action = new WorkflowAction({
      id: "action-1",
      transitionId: "transition-1",
      type: ACTIONS.MARK_INVOICE_SENT,
      config: {},
      position: 0,
    });
    const workflowTransitionRepo = {
      listFromState: jest.fn().mockResolvedValue([{ transition, conditions: [], actions: [action] }]),
      findDetailedById: jest.fn(),
    };
    const historyRepo = { append: jest.fn() };
    const clock = { now: jest.fn(() => new Date("2026-06-08T10:00:00.000Z")) };
    const contextService = { build: jest.fn().mockResolvedValue({ saleOrder: order }) };
    const actionRunner = {
      run: jest.fn().mockResolvedValue({
        order,
        outcomes: [
          {
            actionType: ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE,
            status: "SKIPPED",
            message: "Ya hay un almacén seleccionado",
          },
        ],
      }),
    };
    const service = new SaleOrderWorkflowTransitionService(
      saleOrderRepo as any,
      workflowRepo as any,
      workflowTransitionRepo as any,
      historyRepo as any,
      clock,
      contextService as any,
      actionRunner as any,
    );

    const result = await service.advance(
      {
        saleOrderId: "order-1",
        executedBy: "user-1",
        transitionCode: "NOTIFY_CLIENT",
      },
      tx as any,
    );

    expect(actionRunner.run).toHaveBeenCalledWith(order, [action], tx);
    expect(saleOrderRepo.updateWorkflowState).not.toHaveBeenCalled();
    expect(historyRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        saleOrderId: "order-1",
        transitionId: "transition-1",
        fromStateId: "state-created",
        toStateId: "state-created",
        executedBy: "user-1",
        metadata: {
          branch: "THEN",
          actionOutcomes: [
            {
              actionType: ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE,
              status: "SKIPPED",
              message: "Ya hay un almacén seleccionado",
            },
          ],
        },
      }),
      tx,
    );
    expect(result).toEqual({
      order,
      warnings: ["Ya hay un almacén seleccionado"],
      actionOutcomes: [
        {
          actionType: ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE,
          status: "SKIPPED",
          message: "Ya hay un almacén seleccionado",
        },
      ],
    });
  });

  it("runs only THEN actions and records the manual branch in history metadata", async () => {
    const tx = {};
    const order = {
      id: "order-1",
      workflowId: "workflow-1",
      currentStateId: "state-created",
    };
    const updatedOrder = { ...order, currentStateId: "state-paid" };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue(order),
      updateWorkflowState: jest.fn().mockResolvedValue(updatedOrder),
    };
    const currentState = new WorkflowState({
      id: "state-created",
      workflowId: "workflow-1",
      code: "CREATED",
      name: "Creado",
      color: "#64748b",
      position: 0,
      isInitial: true,
      isFinal: false,
      isActive: true,
    });
    const targetState = new WorkflowState({
      id: "state-paid",
      workflowId: "workflow-1",
      code: "PAID",
      name: "Pagado",
      color: "#16a34a",
      position: 1,
      isInitial: false,
      isFinal: false,
      isActive: true,
    });
    const workflowRepo = {
      findDetailedById: jest.fn().mockResolvedValue({
        workflow: new Workflow({
          id: "workflow-1",
          name: "Pedidos",
          normalizedName: "PEDIDOS",
          description: null,
          isActive: true,
          createdAt: new Date("2026-06-08T00:00:00.000Z"),
          updatedAt: null,
        }),
        states: [currentState, targetState],
        transitions: [],
        conditions: [],
        actions: [],
      }),
    };
    const transition = new WorkflowTransition({
      id: "transition-1",
      workflowId: "workflow-1",
      code: "PAY",
      name: "Pagar",
      effect: TRANSITION_EFFECTS.MOVE_STATE,
      purpose: TRANSITION_PURPOSES.STANDARD,
      fromStateId: "state-created",
      toStateId: "state-paid",
      isActive: true,
    });
    const thenAction = new WorkflowAction({
      id: "action-then",
      transitionId: "transition-1",
      type: ACTIONS.RESERVE_STOCK,
      config: {},
      position: 0,
      branch: "THEN",
    });
    const elseAction = new WorkflowAction({
      id: "action-else",
      transitionId: "transition-1",
      type: ACTIONS.REVERT_STOCK,
      config: {},
      position: 1,
      branch: "ELSE",
    });
    const workflowTransitionRepo = {
      listFromState: jest.fn().mockResolvedValue([{ transition, conditions: [], actions: [thenAction, elseAction] }]),
      findDetailedById: jest.fn(),
    };
    const historyRepo = { append: jest.fn() };
    const clock = { now: jest.fn(() => new Date("2026-06-08T10:00:00.000Z")) };
    const contextService = { build: jest.fn().mockResolvedValue({ saleOrder: order }) };
    const actionRunner = {
      run: jest.fn().mockResolvedValue({
        order,
        outcomes: [],
      }),
    };
    const service = new SaleOrderWorkflowTransitionService(
      saleOrderRepo as any,
      workflowRepo as any,
      workflowTransitionRepo as any,
      historyRepo as any,
      clock,
      contextService as any,
      actionRunner as any,
    );

    await service.advance(
      {
        saleOrderId: "order-1",
        executedBy: "user-1",
        transitionCode: "PAY",
      },
      tx as any,
    );

    expect(actionRunner.run).toHaveBeenCalledWith(order, [thenAction], tx);
    expect(historyRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          branch: "THEN",
          actionOutcomes: [],
        },
      }),
      tx,
    );
  });

  it("throws a structured condition failure when a manual transition is not allowed", async () => {
    const tx = {};
    const order = {
      id: "order-1",
      workflowId: "workflow-1",
      currentStateId: "state-created",
    };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue(order),
      updateWorkflowState: jest.fn(),
    };
    const currentState = new WorkflowState({
      id: "state-created",
      workflowId: "workflow-1",
      code: "CREATED",
      name: "Creado",
      color: "#64748b",
      position: 0,
      isInitial: true,
      isFinal: false,
      isActive: true,
    });
    const targetState = new WorkflowState({
      id: "state-paid",
      workflowId: "workflow-1",
      code: "PAID",
      name: "Pagado",
      color: "#16a34a",
      position: 1,
      isInitial: false,
      isFinal: false,
      isActive: true,
    });
    const workflowRepo = {
      findDetailedById: jest.fn().mockResolvedValue({
        workflow: new Workflow({
          id: "workflow-1",
          name: "Pedidos",
          normalizedName: "PEDIDOS",
          description: null,
          isActive: true,
          createdAt: new Date("2026-06-08T00:00:00.000Z"),
          updatedAt: null,
        }),
        states: [currentState, targetState],
        transitions: [],
        conditions: [],
        actions: [],
      }),
    };
    const transition = new WorkflowTransition({
      id: "transition-1",
      workflowId: "workflow-1",
      code: "PAY",
      name: "Pagar",
      effect: TRANSITION_EFFECTS.MOVE_STATE,
      purpose: TRANSITION_PURPOSES.STANDARD,
      fromStateId: "state-created",
      toStateId: "state-paid",
      isActive: true,
    });
    const condition = new WorkflowCondition({
      id: "condition-1",
      transitionId: "transition-1",
      type: CONDITIONS.IS_PAID,
      config: {},
      position: 0,
    });
    const workflowTransitionRepo = {
      listFromState: jest.fn().mockResolvedValue([{ transition, conditions: [condition], actions: [] }]),
      findDetailedById: jest.fn(),
    };
    const historyRepo = { append: jest.fn() };
    const clock = { now: jest.fn(() => new Date("2026-06-08T10:00:00.000Z")) };
    const contextService = {
      build: jest.fn().mockResolvedValue({
        orderId: "order-1",
        isPaid: false,
        hasStock: true,
        isCancelled: false,
        invoiceSent: false,
        currentDate: new Date("2026-06-08T10:00:00.000Z"),
        variables: {},
      }),
    };
    const actionRunner = { run: jest.fn() };
    const service = new SaleOrderWorkflowTransitionService(
      saleOrderRepo as any,
      workflowRepo as any,
      workflowTransitionRepo as any,
      historyRepo as any,
      clock,
      contextService as any,
      actionRunner as any,
    );

    await expect(
      service.advance(
        {
          saleOrderId: "order-1",
          executedBy: "user-1",
          transitionCode: "PAY",
        },
        tx as any,
      ),
    ).rejects.toMatchObject({
      response: {
        type: "workflow_transition_condition_failed",
        message: "La transicion no cumple sus condiciones",
        details: {
          code: "CONDITION_FAILED",
          transitionId: "transition-1",
          failures: [{ passed: false, type: "IS_PAID", reason: "El pedido no esta pagado" }],
        },
      },
    });
  });

  it("wraps manual transition action errors with structured details", async () => {
    const tx = {};
    const order = {
      id: "order-1",
      workflowId: "workflow-1",
      currentStateId: "state-created",
    };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue(order),
      updateWorkflowState: jest.fn(),
    };
    const currentState = new WorkflowState({
      id: "state-created",
      workflowId: "workflow-1",
      code: "CREATED",
      name: "Creado",
      color: "#64748b",
      position: 0,
      isInitial: true,
      isFinal: false,
      isActive: true,
    });
    const targetState = new WorkflowState({
      id: "state-paid",
      workflowId: "workflow-1",
      code: "PAID",
      name: "Pagado",
      color: "#16a34a",
      position: 1,
      isInitial: false,
      isFinal: false,
      isActive: true,
    });
    const workflowRepo = {
      findDetailedById: jest.fn().mockResolvedValue({
        workflow: new Workflow({
          id: "workflow-1",
          name: "Pedidos",
          normalizedName: "PEDIDOS",
          description: null,
          isActive: true,
          createdAt: new Date("2026-06-08T00:00:00.000Z"),
          updatedAt: null,
        }),
        states: [currentState, targetState],
        transitions: [],
        conditions: [],
        actions: [],
      }),
    };
    const transition = new WorkflowTransition({
      id: "transition-1",
      workflowId: "workflow-1",
      code: "PAY",
      name: "Pagar",
      effect: TRANSITION_EFFECTS.MOVE_STATE,
      purpose: TRANSITION_PURPOSES.STANDARD,
      fromStateId: "state-created",
      toStateId: "state-paid",
      isActive: true,
    });
    const action = new WorkflowAction({
      id: "action-1",
      transitionId: "transition-1",
      type: ACTIONS.RESERVE_STOCK,
      config: {},
      position: 0,
      branch: "THEN",
    });
    const workflowTransitionRepo = {
      listFromState: jest.fn().mockResolvedValue([{ transition, conditions: [], actions: [action] }]),
      findDetailedById: jest.fn(),
    };
    const historyRepo = { append: jest.fn() };
    const clock = { now: jest.fn(() => new Date("2026-06-08T10:00:00.000Z")) };
    const contextService = { build: jest.fn().mockResolvedValue({ saleOrder: order }) };
    const actionRunner = {
      run: jest.fn().mockRejectedValue(new Error("Stock disponible insuficiente")),
    };
    const service = new SaleOrderWorkflowTransitionService(
      saleOrderRepo as any,
      workflowRepo as any,
      workflowTransitionRepo as any,
      historyRepo as any,
      clock,
      contextService as any,
      actionRunner as any,
    );

    await expect(
      service.advance(
        {
          saleOrderId: "order-1",
          executedBy: "user-1",
          transitionCode: "PAY",
        },
        tx as any,
      ),
    ).rejects.toMatchObject({
      response: {
        type: "workflow_transition_action_failed",
        message: "Stock disponible insuficiente",
        details: {
          code: "ACTION_FAILED",
          transitionId: "transition-1",
          actionTypes: [ACTIONS.RESERVE_STOCK],
        },
      },
    });
    expect(saleOrderRepo.updateWorkflowState).not.toHaveBeenCalled();
    expect(historyRepo.append).not.toHaveBeenCalled();
  });
});
