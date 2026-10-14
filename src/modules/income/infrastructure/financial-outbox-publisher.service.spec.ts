import { FinancialOutboxPublisher } from "./financial-outbox-publisher.service";

describe("FinancialOutboxPublisher", () => {
  it("publishes committed income and order events, then marks the outbox row", async () => {
    const manager = { query: jest.fn()
      .mockResolvedValueOnce([{ id: "event-1", event_type: "income.payment_posted", aggregate_type: "sale_payment", aggregate_id: "payment-1", payload: { saleOrderId: "order-1", incomeId: "payment-1" } }])
      .mockResolvedValueOnce([]),
    };
    const entityManager = { transaction: jest.fn((work: any) => work(manager)) };
    const realtime = { emitToAllConnected: jest.fn() };
    const publisher = new FinancialOutboxPublisher(entityManager as any, realtime as any);

    await expect(publisher.runOnce()).resolves.toBe(1);
    expect(realtime.emitToAllConnected).toHaveBeenNthCalledWith(1, "income.updated", { eventId: "event-1" });
    expect(realtime.emitToAllConnected).toHaveBeenNthCalledWith(2, "sale-orders.updated", expect.objectContaining({ saleOrderIds: ["order-1"] }));
    expect(manager.query).toHaveBeenLastCalledWith(expect.stringContaining("published_at = now()"), ["event-1"]);
  });

  it("records an attempt and leaves a failed event available for retry", async () => {
    const manager = { query: jest.fn()
      .mockResolvedValueOnce([{ id: "event-1", event_type: "income.payment_posted", aggregate_type: "sale_payment", aggregate_id: "payment-1", payload: {} }])
      .mockResolvedValueOnce([]),
    };
    const entityManager = { transaction: jest.fn((work: any) => work(manager)) };
    const realtime = { emitToAllConnected: jest.fn(() => { throw new Error("socket down"); }) };
    const publisher = new FinancialOutboxPublisher(entityManager as any, realtime as any);

    await expect(publisher.runOnce()).resolves.toBe(0);
    expect(manager.query).toHaveBeenLastCalledWith(expect.stringContaining("dead_lettered_at = CASE WHEN attempts + 1 >= $3 * (manual_retry_count + 1)"), ["event-1", "socket down", 10]);
    expect(manager.query.mock.calls[0][0]).toContain("next_attempt_at <= now()");
    expect(manager.query.mock.calls[1][0]).toContain("make_interval(secs => LEAST(3600");
  });

  it("publishes order-only events without emitting a misleading income update", async () => {
    const manager = { query: jest.fn()
      .mockResolvedValueOnce([{ id: "event-order", event_type: "sale_order.cancelled", aggregate_type: "sale_order", aggregate_id: "order-1", payload: { saleOrderId: "order-1" } }])
      .mockResolvedValueOnce([]),
    };
    const entityManager = { transaction: jest.fn((work: any) => work(manager)) };
    const realtime = { emitToAllConnected: jest.fn() };
    const publisher = new FinancialOutboxPublisher(entityManager as any, realtime as any);

    await expect(publisher.runOnce()).resolves.toBe(1);
    expect(realtime.emitToAllConnected).toHaveBeenCalledTimes(1);
    expect(realtime.emitToAllConnected).toHaveBeenCalledWith("sale-orders.updated", {
      updated: 1, saleOrderIds: ["order-1"], eventId: "event-order",
    });
  });

  it("summarizes pending, delayed, dead-lettered and oldest unpublished events", async () => {
    const entityManager = { query: jest.fn().mockResolvedValue([{ pending: "2", delayed: "3", deadLettered: "1", oldestPendingAt: "2026-10-12T10:00:00.000Z" }]) };
    const publisher = new FinancialOutboxPublisher(entityManager as any, {} as any);
    await expect(publisher.getHealth()).resolves.toEqual({
      pending: 2, delayed: 3, deadLettered: 1, oldestPendingAt: "2026-10-12T10:00:00.000Z",
    });
    expect(entityManager.query.mock.calls[0][0]).toContain("WHERE published_at IS NULL AND dead_lettered_at IS NOT NULL");
  });

  it("alerts once for dead letters and stale pending events, then resets after recovery", async () => {
    const previousThreshold = process.env.INCOME_OUTBOX_ALERT_AGE_SECONDS;
    process.env.INCOME_OUTBOX_ALERT_AGE_SECONDS = "60";
    const entityManager = { query: jest.fn()
      .mockResolvedValueOnce([{ pending: 1, delayed: 0, deadLettered: 2, oldestPendingAt: "2026-10-13T08:00:00.000Z" }])
      .mockResolvedValueOnce([{ pending: 1, delayed: 0, deadLettered: 2, oldestPendingAt: "2026-10-13T08:00:00.000Z" }])
      .mockResolvedValueOnce([{ pending: 0, delayed: 0, deadLettered: 0, oldestPendingAt: null }])
      .mockResolvedValueOnce([{ pending: 1, delayed: 0, deadLettered: 1, oldestPendingAt: "2026-10-13T08:00:00.000Z" }]),
    };
    const publisher = new FinancialOutboxPublisher(entityManager as any, {} as any);
    const logger = { error: jest.fn() };
    (publisher as any).logger = logger;
    const now = Date.now;
    Date.now = () => Date.parse("2026-10-13T08:10:00.000Z");
    try {
      await (publisher as any).checkHealthSafely();
      await (publisher as any).checkHealthSafely();
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error.mock.calls[0][0]).toContain("financial_outbox_operational_alert");
      expect(logger.error.mock.calls[0][0]).toContain('"deadLettered":2');
      expect(logger.error.mock.calls[0][0]).toContain('"oldestPendingAgeSeconds":600');

      await (publisher as any).checkHealthSafely();
      await (publisher as any).checkHealthSafely();
      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.error.mock.calls[1][0]).toContain('"deadLettered":1');
    } finally {
      Date.now = now;
      if (previousThreshold === undefined) delete process.env.INCOME_OUTBOX_ALERT_AGE_SECONDS;
      else process.env.INCOME_OUTBOX_ALERT_AGE_SECONDS = previousThreshold;
    }
  });

  it("lists bounded dead-letter metadata without exposing event payloads", async () => {
    const entityManager = { query: jest.fn().mockResolvedValue([{
      id: "event-1", event_type: "income.payment_posted", aggregate_type: "income", aggregate_id: "payment-1",
      attempts: 10, last_error: "socket down", occurred_at: "2026-10-12T10:00:00.000Z",
      dead_lettered_at: "2026-10-12T11:00:00.000Z", manual_retry_count: 1,
      retry_requested_at: null, retry_requested_by_user_id: null,
    }]) };
    const publisher = new FinancialOutboxPublisher(entityManager as any, {} as any);
    await expect(publisher.listDeadLetters(500)).resolves.toMatchObject([{ id: "event-1", attempts: 10, lastError: "socket down", manualRetryCount: 1 }]);
    expect(entityManager.query.mock.calls[0][0]).not.toContain("payload");
    expect(entityManager.query.mock.calls[0][1]).toEqual([100]);
  });

  it("queues an authorized manual retry and rejects an event that is not dead-lettered", async () => {
    const entityManager = { query: jest.fn().mockResolvedValueOnce([{ id: "event-1" }]).mockResolvedValueOnce([]) };
    const publisher = new FinancialOutboxPublisher(entityManager as any, {} as any);
    await expect(publisher.retryDeadLetter("event-1", "operator-1")).resolves.toEqual({ id: "event-1", queued: true });
    expect(entityManager.query.mock.calls[0][1]).toEqual(["event-1", "operator-1"]);
    await expect(publisher.retryDeadLetter("missing", "operator-1")).rejects.toMatchObject({ status: 404 });
  });
});
