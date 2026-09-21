import { ReleaseDueScheduledPaymentsJob } from "./release-due-scheduled-payments.job";

describe("ReleaseDueScheduledPaymentsJob", () => {
  it("moves due scheduled payments to approval and records history", async () => {
    const manager = {
      query: jest.fn().mockResolvedValue([{
        id: "payment-1",
        poId: "purchase-1",
        scheduledByUserId: "user-1",
        scheduledAt: new Date("2026-09-20T12:00:00.000Z"),
      }]),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    };
    const history = { recordPayment: jest.fn().mockResolvedValue(undefined) };
    const job = new ReleaseDueScheduledPaymentsJob(dataSource as any, history as any);

    await expect(job.run()).resolves.toEqual({ released: 1 });
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("FOR UPDATE SKIP LOCKED"), [100]);
    expect(history.recordPayment).toHaveBeenCalledWith(expect.objectContaining({
      purchaseId: "purchase-1",
      eventType: "PAYMENT_REQUESTED",
      metadata: expect.objectContaining({ paymentId: "payment-1", releasedAutomatically: true }),
    }));
  });

  it("does not create history when there are no due payments", async () => {
    const manager = { query: jest.fn().mockResolvedValue([]) };
    const dataSource = { transaction: jest.fn((callback) => callback(manager)) };
    const history = { recordPayment: jest.fn() };
    const job = new ReleaseDueScheduledPaymentsJob(dataSource as any, history as any);

    await expect(job.run()).resolves.toEqual({ released: 0 });
    expect(history.recordPayment).not.toHaveBeenCalled();
  });
});
