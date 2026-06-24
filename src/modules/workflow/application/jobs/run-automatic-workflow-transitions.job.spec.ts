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
        .mockResolvedValueOnce({ id: "order-2" })
        .mockResolvedValueOnce(null),
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
    expect(transitionService.advanceAutomatic).toHaveBeenCalledTimes(3);
  });

  it("runs automatic workflow for a single sale order without scanning candidates", async () => {
    const saleOrderRepo = {
      listIdsForAutomaticWorkflow: jest.fn(),
    };
    const transitionService = {
      advanceAutomatic: jest.fn().mockResolvedValueOnce({ id: "order-1" }).mockResolvedValueOnce(null),
    };
    const uow = {
      runInTransaction: jest.fn((handler) => handler({ tx: true })),
    };
    const job = new RunAutomaticWorkflowTransitionsJob(
      saleOrderRepo as any,
      uow as any,
      transitionService as any,
    );

    await expect(job.runForSaleOrder({ saleOrderId: "order-1" })).resolves.toEqual({
      updated: 1,
      failed: 0,
      saleOrderIds: ["order-1"],
    });

    expect(saleOrderRepo.listIdsForAutomaticWorkflow).not.toHaveBeenCalled();
    expect(transitionService.advanceAutomatic).toHaveBeenCalledWith(
      "order-1",
      "00000000-0000-0000-0000-000000000001",
      { tx: true },
    );
    expect(transitionService.advanceAutomatic).toHaveBeenCalledTimes(2);
  });

  it("keeps evaluating a sale order while automatic transitions remain executable", async () => {
    const saleOrderRepo = {
      listIdsForAutomaticWorkflow: jest.fn(),
    };
    const transitionService = {
      advanceAutomatic: jest
        .fn()
        .mockResolvedValueOnce({ id: "order-1", currentStateId: "scheduled" })
        .mockResolvedValueOnce({ id: "order-1", currentStateId: "delivered" })
        .mockResolvedValueOnce(null),
    };
    const uow = {
      runInTransaction: jest.fn((handler) => handler({ tx: true })),
    };
    const job = new RunAutomaticWorkflowTransitionsJob(
      saleOrderRepo as any,
      uow as any,
      transitionService as any,
    );

    await expect(job.runForSaleOrder({ saleOrderId: "order-1" })).resolves.toEqual({
      updated: 1,
      failed: 0,
      saleOrderIds: ["order-1"],
    });

    expect(transitionService.advanceAutomatic).toHaveBeenCalledTimes(3);
    expect(uow.runInTransaction).toHaveBeenCalledTimes(3);
  });
});
