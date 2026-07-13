import { RejectPaymentUsecase } from "./reject.usecase";

describe("RejectPaymentUsecase", () => {
  const paymentRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const history = {
    recordPayment: jest.fn(),
  };
  const notifications = {
    createNotificationForUsers: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date("2026-07-13T12:00:00.000Z"));
  });

  afterEach(() => jest.useRealTimers());

  it("rejects a pending payment and records history and notification", async () => {
    const payment = {
      id: "payment-1",
      status: "PENDING_APPROVAL",
      poId: "purchase-1",
      requestedByUserId: "requester-1",
    };
    paymentRepo.findOne.mockResolvedValueOnce(payment);
    const usecase = new RejectPaymentUsecase(
      paymentRepo as any,
      notifications as any,
      history as any,
    );

    const result = await usecase.execute({
      paymentId: "payment-1",
      userId: "reviewer-1",
      reason: "  Documento ilegible  ",
    });

    expect(result).toEqual({ type: "success", message: "Pago rechazado correctamente" });
    expect(paymentRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      status: "REJECTED",
      rejectedByUserId: "reviewer-1",
      rejectedAt: new Date("2026-07-13T12:00:00.000Z"),
      rejectionReason: "Documento ilegible",
    }));
    expect(history.recordPayment).toHaveBeenCalledWith({
      purchaseId: "purchase-1",
      eventType: "PAYMENT_REJECTED",
      description: "Se rechazó un pago pendiente.",
      performedByUserId: "reviewer-1",
      targetUserId: "requester-1",
      metadata: { paymentId: "payment-1", reason: "Documento ilegible" },
    });
    expect(notifications.createNotificationForUsers).toHaveBeenCalledWith(expect.objectContaining({
      recipientUserIds: ["requester-1"],
      title: "Pago rechazado",
      sourceEntityId: "payment-1",
      metadata: expect.objectContaining({
        paymentId: "payment-1",
        reason: "Documento ilegible",
      }),
    }));
  });

  it("rejects non-pending payments without side effects", async () => {
    paymentRepo.findOne.mockResolvedValueOnce({
      id: "payment-1",
      status: "SCHEDULED",
    });
    const usecase = new RejectPaymentUsecase(
      paymentRepo as any,
      notifications as any,
      history as any,
    );

    const result = await usecase.execute({
      paymentId: "payment-1",
      userId: "reviewer-1",
    });

    expect(result).toEqual({ type: "error", message: "El pago no está pendiente de aprobación" });
    expect(paymentRepo.save).not.toHaveBeenCalled();
    expect(history.recordPayment).not.toHaveBeenCalled();
  });
});
