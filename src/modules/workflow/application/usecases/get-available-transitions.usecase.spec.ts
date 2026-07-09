import { ACTIONS } from "../../domain/constants/workflow-action.constants";
import { TRANSITION_EFFECTS } from "../../domain/constants/workflow-transition-effect.constants";
import { Workflow } from "../../domain/entities/workflow";
import { WorkflowAction } from "../../domain/entities/workflow-action";
import { WorkflowState } from "../../domain/entities/workflow-state";
import { WorkflowTransition } from "../../domain/entities/workflow-transition";
import { GetAvailableTransitionsUseCase } from "./get-available-transitions.usecase";

describe("GetAvailableTransitionsUseCase", () => {
  it("hides the mark-invoice-sent transition when the invoice is already sent", async () => {
    const state = new WorkflowState({
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
    const invoiceTransition = new WorkflowTransition({
      id: "transition-invoice",
      workflowId: "workflow-1",
      code: "SEND_INVOICE",
      name: "Enviar comprobante",
      effect: TRANSITION_EFFECTS.RUN_ACTIONS,
      fromStateId: null,
      toStateId: null,
      isGlobal: true,
      isActive: true,
    });
    const otherTransition = new WorkflowTransition({
      id: "transition-other",
      workflowId: "workflow-1",
      code: "OTHER_ACTION",
      name: "Otra accion",
      effect: TRANSITION_EFFECTS.RUN_ACTIONS,
      fromStateId: null,
      toStateId: null,
      isGlobal: true,
      isActive: true,
    });
    const usecase = new GetAvailableTransitionsUseCase(
      { runInTransaction: jest.fn((work) => work({ tx: true })) } as any,
      {
        findByIdForUpdate: jest.fn().mockResolvedValue({
          id: "order-1",
          workflowId: "workflow-1",
          currentStateId: "state-created",
          invoiceSend: true,
        }),
      } as any,
      {
        findDetailedById: jest.fn().mockResolvedValue({
          workflow: new Workflow({
            id: "workflow-1",
            name: "Pedidos",
            normalizedName: "PEDIDOS",
            description: null,
            isActive: true,
            createdAt: new Date("2026-07-08T00:00:00.000Z"),
            updatedAt: null,
          }),
          states: [state],
        }),
      } as any,
      {
        listFromState: jest.fn().mockResolvedValue([
          {
            transition: invoiceTransition,
            conditions: [],
            actions: [
              new WorkflowAction({
                id: "action-invoice",
                transitionId: "transition-invoice",
                type: ACTIONS.MARK_INVOICE_SENT,
                config: {},
                position: 0,
              }),
            ],
          },
          {
            transition: otherTransition,
            conditions: [],
            actions: [
              new WorkflowAction({
                id: "action-other",
                transitionId: "transition-other",
                type: ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE,
                config: {},
                position: 0,
              }),
            ],
          },
        ]),
      } as any,
      { build: jest.fn().mockResolvedValue({ invoiceSent: true }) } as any,
    );

    const result = await usecase.execute({ saleOrderId: "order-1" });

    expect(result.map((transition) => transition.id)).toEqual(["transition-other"]);
  });
});
