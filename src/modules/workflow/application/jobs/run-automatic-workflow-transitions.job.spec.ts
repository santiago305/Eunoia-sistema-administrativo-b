import { RunAutomaticWorkflowTransitionsJob } from "./run-automatic-workflow-transitions.job";

describe("RunAutomaticWorkflowTransitionsJob", () => {
  it("continues processing when one sale order fails", async () => {
    const saleOrderRepo = {
      listIdsForAutomaticWorkflow: jest.fn().mockResolvedValue(["order-1", "order-2"]),
    };
    const transitionService = {
      advanceAutomatic: jest
        .fn()
        .mockRejectedValueOnce(new Error("failed"))
        .mockResolvedValueOnce({ id: "order-2" }),
    };
    const uow = {
      runInTransaction: jest.fn((handler) => handler({})),
    };
    const job = new RunAutomaticWorkflowTransitionsJob(
      saleOrderRepo as any,
      uow as any,
      transitionService as any,
    );

    await expect(job.run({ limit: 10 })).resolves.toEqual({
      found: 2,
      updated: 1,
      failed: 1,
      saleOrderIds: ["order-2"],
    });
    expect(transitionService.advanceAutomatic).toHaveBeenCalledTimes(2);
  });
});
