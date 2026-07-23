import { ActivateWorkflowUseCase } from "./activate-workflow.usecase";

describe("ActivateWorkflowUseCase", () => {
  it("permits active RUN_ACTIONS transitions without a destination state", async () => {
    const update = jest.fn().mockResolvedValue({ id: "workflow-1", isActive: true });
    const useCase = new ActivateWorkflowUseCase(
      { runInTransaction: (callback: any) => callback({}) } as any,
      {
        findDetailedById: jest.fn().mockResolvedValue({
          workflow: {
            id: "workflow-1",
            name: "Pedidos",
            normalizedName: "PEDIDOS",
            description: null,
            isActive: false,
            createdAt: new Date("2026-06-06T00:00:00.000Z"),
          },
          states: [
            { id: "state-1", workflowId: "workflow-1", isInitial: true, isFinal: false, isActive: true },
            { id: "state-2", workflowId: "workflow-1", isInitial: false, isFinal: true, isActive: true },
          ],
          transitions: [
            {
              id: "transition-1",
              workflowId: "workflow-1",
              effect: "RUN_ACTIONS",
              purpose: "STANDARD",
              fromStateId: null,
              toStateId: null,
              isGlobal: true,
              isActive: true,
            },
          ],
        }),
        update,
      } as any,
      { now: () => new Date("2026-06-06T00:00:00.000Z") } as any,
    );

    await useCase.execute({ workflowId: "workflow-1" });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ id: "workflow-1", isActive: true }), {});
  });

  it("rejects activation without an active final state", async () => {
    const useCase = new ActivateWorkflowUseCase(
      { runInTransaction: (callback: any) => callback({}) } as any,
      {
        findDetailedById: jest.fn().mockResolvedValue({
          workflow: {
            id: "workflow-1",
            name: "Pedidos",
            normalizedName: "PEDIDOS",
            description: null,
            isActive: false,
            createdAt: new Date("2026-06-06T00:00:00.000Z"),
          },
          states: [
            {
              id: "state-1",
              workflowId: "workflow-1",
              isInitial: true,
              isFinal: false,
              isActive: true,
            },
          ],
          transitions: [],
        }),
        update: jest.fn(),
      } as any,
      { now: () => new Date("2026-06-06T00:00:00.000Z") } as any,
    );

    await expect(useCase.execute({ workflowId: "workflow-1" })).rejects.toThrow(
      "El workflow debe tener al menos un estado final activo",
    );
  });
});
