import { ApprovePaymentUsecase } from "./approve.usecase";

describe("ApprovePaymentUsecase", () => {
  const paymentRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const creditQuotaRepo = {
    findById: jest.fn(),
    updateTotalPaid: jest.fn(),
    updatePaymentDate: jest.fn(),
  };
  const recalculateAccountPayable = {
    execute: jest.fn(),
  };
  const purchaseOrderRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const approvalRequestRepo = {
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

  it("approves a pending payment and applies all accounting side effects", async () => {
    const payment = {
      id: "payment-1",
      status: "PENDING_APPROVAL",
      amount: 150,
      date: new Date("2026-07-10T00:00:00.000Z"),
      quotaId: "quota-1",
      accountPayableId: "payable-1",
      poId: "purchase-1",
      requestedByUserId: "requester-1",
    };
    paymentRepo.findOne.mockResolvedValueOnce(payment);
    creditQuotaRepo.findById.mockResolvedValueOnce({
      quotaId: "quota-1",
      totalPaid: 50,
    });
    purchaseOrderRepo.findOne.mockResolvedValueOnce({
      id: "purchase-1",
      approvalStatus: "PENDING",
    });
    approvalRequestRepo.findOne.mockResolvedValueOnce({
      id: "approval-1",
      status: "PENDING",
    });
    const usecase = new ApprovePaymentUsecase(
      paymentRepo as any,
      approvalRequestRepo as any,
      purchaseOrderRepo as any,
      creditQuotaRepo as any,
      recalculateAccountPayable as any,
      notifications as any,
      history as any,
    );

    const result = await usecase.execute({
      paymentId: "payment-1",
      userId: "approver-1",
    });

    expect(result).toEqual({ type: "success", message: "Pago aprobado correctamente" });
    expect(paymentRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      status: "APPROVED",
      approvedByUserId: "approver-1",
      paidByUserId: "approver-1",
      paidAt: new Date("2026-07-13T12:00:00.000Z"),
    }));
    expect(creditQuotaRepo.updateTotalPaid).toHaveBeenCalledWith("quota-1", 200);
    expect(creditQuotaRepo.updatePaymentDate).toHaveBeenCalledWith("quota-1", payment.date);
    expect(recalculateAccountPayable.execute).toHaveBeenCalledWith({ accountPayableId: "payable-1" });
    expect(purchaseOrderRepo.update).toHaveBeenCalledWith(
      { id: "purchase-1" },
      { approvalStatus: "APPROVED" },
    );
    expect(approvalRequestRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      status: "APPROVED",
      reviewedByUserId: "approver-1",
      reviewedAt: new Date("2026-07-13T12:00:00.000Z"),
    }));
    expect(history.recordPayment).toHaveBeenCalledWith({
      purchaseId: "purchase-1",
      eventType: "PAYMENT_APPROVED",
      description: "Se aprobó un pago pendiente.",
      performedByUserId: "approver-1",
      targetUserId: "requester-1",
      metadata: { paymentId: "payment-1", amount: 150 },
    });
    expect(notifications.createNotificationForUsers).toHaveBeenCalledWith(expect.objectContaining({
      recipientUserIds: ["requester-1"],
      title: "Pago aprobado",
      sourceEntityId: "payment-1",
    }));
  });

  it("rejects approval when payment is not pending or scheduled", async () => {
    paymentRepo.findOne.mockResolvedValueOnce({
      id: "payment-1",
      status: "APPROVED",
    });
    const usecase = new ApprovePaymentUsecase(
      paymentRepo as any,
      approvalRequestRepo as any,
      purchaseOrderRepo as any,
      creditQuotaRepo as any,
      recalculateAccountPayable as any,
      notifications as any,
      history as any,
    );

    const result = await usecase.execute({
      paymentId: "payment-1",
      userId: "approver-1",
    });

    expect(result).toEqual({ type: "error", message: "El pago no está pendiente de aprobación" });
    expect(paymentRepo.save).not.toHaveBeenCalled();
  });
});
