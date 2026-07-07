import { PurchaseHistoryService } from "./purchase-history.service";

describe("PurchaseHistoryService", () => {
  it("records purchase creation with normalized metadata and values", async () => {
    const savedEvents: any[] = [];
    const repo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => {
        savedEvents.push(value);
        return value;
      }),
    };
    const service = new PurchaseHistoryService(repo as any);

    await service.recordCreated({
      purchaseId: "purchase-1",
      performedByUserId: "user-1",
      snapshot: { total: 100, paymentForm: "CONTADO" },
      metadata: { paymentsCreated: 1 },
    });

    expect(repo.save).toHaveBeenCalledWith({
      purchaseId: "purchase-1",
      eventType: "PURCHASE_CREATED",
      description: "Se creó la compra.",
      oldValues: null,
      newValues: { total: 100, paymentForm: "CONTADO" },
      metadata: { paymentsCreated: 1 },
      performedByUserId: "user-1",
      targetUserId: null,
      approvalRequestId: null,
    });
    expect(savedEvents).toHaveLength(1);
  });

  it("uses the transaction repository when a transaction is provided", async () => {
    const baseRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const txRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const service = new PurchaseHistoryService(baseRepo as any);

    await service.record(
      {
        purchaseId: "purchase-1",
        eventType: "PURCHASE_CANCELLED",
        description: "Se canceló la compra.",
      },
      { manager: { getRepository: jest.fn(() => txRepo) } } as any,
    );

    expect(txRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        purchaseId: "purchase-1",
        eventType: "PURCHASE_CANCELLED",
      }),
    );
    expect(baseRepo.save).not.toHaveBeenCalled();
  });
});
