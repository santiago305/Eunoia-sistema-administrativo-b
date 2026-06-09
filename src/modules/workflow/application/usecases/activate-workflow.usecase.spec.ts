import { ActivateWorkflowUseCase } from "./activate-workflow.usecase";

describe("ActivateWorkflowUseCase", () => {
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
