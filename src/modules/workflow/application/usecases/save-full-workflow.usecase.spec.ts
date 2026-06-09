import { SaveFullWorkflowUseCase } from "./save-full-workflow.usecase";
import { ACTIONS } from "../../domain/constants/workflow-action.constants";
import { CONDITIONS } from "../../domain/constants/workflow-condition.constants";
import { TRANSITION_EFFECTS } from "../../domain/constants/workflow-transition-effect.constants";

describe("SaveFullWorkflowUseCase", () => {
  function createUseCase() {
    return new SaveFullWorkflowUseCase(
      { runInTransaction: (callback: any) => callback({}) } as any,
      { findDetailedById: jest.fn(), saveFull: jest.fn(async (aggregate) => aggregate) } as any,
      { now: () => new Date("2026-06-06T00:00:00.000Z") } as any,
    );
  }

  it("resolves workflow node display data from the global sale-order state", async () => {
    const useCase = new SaveFullWorkflowUseCase(
      { runInTransaction: (callback: any) => callback({}) } as any,
      { findDetailedById: jest.fn(), saveFull: jest.fn(async (aggregate) => aggregate) } as any,
      { now: () => new Date("2026-06-06T00:00:00.000Z") } as any,
      {
        findById: jest.fn(async (id) =>
          id === "global-created"
            ? { id, code: "CREATED", name: "Creado", color: "#123456" }
            : { id, code: "DELIVERED", name: "Entregado", color: "#00ff00" },
        ),
      } as any,
    );

    const result = await useCase.execute({
      name: "Pedidos",
      states: [
        { clientId: "created", saleOrderStateId: "global-created", isInitial: true },
        { clientId: "delivered", saleOrderStateId: "global-delivered", isFinal: true },
      ],
      transitions: [],
    });

    expect(result.states[0]).toEqual(
      expect.objectContaining({
        saleOrderStateId: "global-created",
        code: "CREATED",
        name: "Creado",
        color: "#123456",
      }),
    );
  });

  it("rejects a workflow without an active final state", async () => {
    await expect(
      createUseCase().execute({
        name: "Pedidos",
        states: [
          {
            clientId: "created",
            code: "CREATED",
            name: "Creado",
            color: "#000000",
            isInitial: true,
          },
        ],
        transitions: [],
      }),
    ).rejects.toThrow("El workflow requiere al menos un estado final activo");
  });

  it("resolves global transition exclusions and persists no source state", async () => {
    const useCase = createUseCase();

    const result = await useCase.execute({
      name: "Pedidos",
      states: [
        {
          clientId: "created",
          code: "CREATED",
          name: "Creado",
          color: "#000000",
          isInitial: true,
        },
        {
          clientId: "delivered",
          code: "DELIVERED",
          name: "Entregado",
          color: "#00ff00",
          isFinal: true,
        },
        {
          clientId: "cancelled",
          code: "CANCELLED",
          name: "Cancelado",
          color: "#ff0000",
          isFinal: true,
        },
      ],
      transitions: [
        {
          clientId: "cancel",
          code: "CANCEL",
          name: "Cancelar",
          isGlobal: true,
          toStateRef: "cancelled",
          excludedStateRefs: ["delivered"],
        },
      ],
    });

    const deliveredState = result.states.find((state) => state.code === "DELIVERED");
    const cancelledState = result.states.find((state) => state.code === "CANCELLED");
    expect(result.transitions[0]).toEqual(
      expect.objectContaining({
        isGlobal: true,
        fromStateId: null,
        toStateId: cancelledState?.id,
        excludedStateIds: [deliveredState?.id],
      }),
    );
  });

  it("persists a global run-actions transition without a target state", async () => {
    const useCase = createUseCase();

    const result = await useCase.execute({
      name: "Pedidos",
      states: [
        {
          clientId: "created",
          code: "CREATED",
          name: "Creado",
          color: "#000000",
          isInitial: true,
        },
        {
          clientId: "delivered",
          code: "DELIVERED",
          name: "Entregado",
          color: "#00ff00",
          isFinal: true,
        },
      ],
      transitions: [
        {
          clientId: "notify",
          code: "NOTIFY_CLIENT",
          name: "Notificar cliente",
          effect: TRANSITION_EFFECTS.RUN_ACTIONS,
          isGlobal: true,
          conditions: [{ type: CONDITIONS.NOT_CANCELLED }],
          actions: [{ type: ACTIONS.MARK_INVOICE_SENT }],
        },
      ],
    });

    expect(result.transitions[0]).toEqual(
      expect.objectContaining({
        effect: TRANSITION_EFFECTS.RUN_ACTIONS,
        isGlobal: true,
        fromStateId: null,
        toStateId: null,
      }),
    );
    expect(result.conditions[0]).toEqual(expect.objectContaining({ type: CONDITIONS.NOT_CANCELLED }));
    expect(result.actions[0]).toEqual(expect.objectContaining({ type: ACTIONS.MARK_INVOICE_SENT }));
  });

  it("rejects a non-global cancellation transition", async () => {
    await expect(
      createUseCase().execute({
        name: "Pedidos",
        states: [
          { clientId: "created", code: "CREATED", name: "Creado", color: "#000", isInitial: true },
          { clientId: "done", code: "DONE", name: "Final", color: "#0f0", isFinal: true },
        ],
        transitions: [
          {
            clientId: "cancel",
            code: "VOID",
            name: "Anular",
            purpose: "CANCEL" as any,
            isGlobal: false,
            fromStateRef: "created",
            toStateRef: "done",
          },
        ],
      }),
    ).rejects.toThrow("La transicion de cancelacion debe ser global");
  });

  it("rejects more than one cancellation transition", async () => {
    await expect(
      createUseCase().execute({
        name: "Pedidos",
        states: [
          { clientId: "created", code: "CREATED", name: "Creado", color: "#000", isInitial: true },
          { clientId: "done", code: "DONE", name: "Final", color: "#0f0", isFinal: true },
          { clientId: "cancelled", code: "CANCELLED", name: "Cancelado", color: "#f00" },
        ],
        transitions: ["VOID", "ABORT"].map((code) => ({
          clientId: code,
          code,
          name: code,
          purpose: "CANCEL" as any,
          isGlobal: true,
          toStateRef: "cancelled",
        })),
      }),
    ).rejects.toThrow("El workflow solo puede tener una transicion de cancelacion");
  });

  it("rejects a cancellation transition targeting a final state", async () => {
    await expect(
      createUseCase().execute({
        name: "Pedidos",
        states: [
          { clientId: "created", code: "CREATED", name: "Creado", color: "#000", isInitial: true },
          { clientId: "cancelled", code: "CANCELLED", name: "Cancelado", color: "#f00", isFinal: true },
        ],
        transitions: [
          {
            clientId: "cancel",
            code: "VOID",
            name: "Anular",
            purpose: "CANCEL",
            isGlobal: true,
            toStateRef: "cancelled",
          },
        ],
      }),
    ).rejects.toThrow("El estado destino de cancelacion no puede ser final");
  });
});
