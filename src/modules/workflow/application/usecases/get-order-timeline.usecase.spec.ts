import { GetOrderTimelineUseCase } from "./get-order-timeline.usecase";

describe("GetOrderTimelineUseCase", () => {
  it("returns the executor email and resolves repeated users once", async () => {
    const saleOrderRepo = {
      findById: jest.fn().mockResolvedValue({ id: "order-1" }),
    };
    const workflowRepo = {
      findDetailedById: jest.fn().mockResolvedValue({
        states: [{ id: "state-1" }, { id: "state-2" }],
        transitions: [{ id: "transition-1" }],
      }),
    };
    const historyRepo = {
      listBySaleOrderId: jest.fn().mockResolvedValue([
        {
          id: "history-1",
          workflowId: "workflow-1",
          transitionId: "transition-1",
          fromStateId: "state-1",
          toStateId: "state-2",
          executedBy: "user-1",
          executedAt: new Date("2026-06-11T12:00:00.000Z"),
          metadata: null,
        },
        {
          id: "history-2",
          workflowId: "workflow-1",
          transitionId: null,
          fromStateId: null,
          toStateId: "state-1",
          executedBy: "user-1",
          executedAt: new Date("2026-06-11T13:00:00.000Z"),
          metadata: null,
        },
      ]),
    };
    const userRepo = {
      findById: jest.fn().mockResolvedValue({
        id: "user-1",
        email: { value: "operador@eunoia.pe" },
      }),
    };
    const useCase = new GetOrderTimelineUseCase(
      saleOrderRepo as any,
      workflowRepo as any,
      historyRepo as any,
      userRepo as any,
    );

    const result = await useCase.execute({ saleOrderId: "order-1" });

    expect(result).toHaveLength(2);
    expect(result[0].executedByUser).toEqual({
      id: "user-1",
      email: "operador@eunoia.pe",
    });
    expect(userRepo.findById).toHaveBeenCalledTimes(1);
  });
});
