import { SaleOrderWorkflowTransitionService } from "./sale-order-workflow-transition.service";
import { ACTIONS } from "../../domain/constants/workflow-action.constants";
import { TRANSITION_EFFECTS } from "../../domain/constants/workflow-transition-effect.constants";
import { TRANSITION_PURPOSES } from "../../domain/constants/workflow-transition-purpose.constants";
import { Workflow } from "../../domain/entities/workflow";
import { WorkflowAction } from "../../domain/entities/workflow-action";
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
});
