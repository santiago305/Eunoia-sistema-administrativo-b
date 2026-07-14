import { CreatePaymentUsecase } from "./create.usecase";

describe("CreatePaymentUsecase", () => {
  const tx = { id: "tx-1" };
  const uow = {
    runInTransaction: jest.fn((callback) => callback(tx)),
  };
  const paymentDocRepo = {
    create: jest.fn(),
  };
  const creditQuotaRepo = {
    findById: jest.fn(),
    updateTotalPaid: jest.fn(),
    updatePaymentDate: jest.fn(),
  };
  const recalculateAccountPayable = {
    execute: jest.fn(),
  };
  const history = {
    recordPayment: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    uow.runInTransaction.mockImplementation((callback) => callback(tx));
    paymentDocRepo.create.mockResolvedValue({
      payDocId: "payment-1",
    });
  });

  it("recalculates the linked account payable when creating an approved payment", async () => {
    const usecase = new CreatePaymentUsecase(
      uow as any,
      paymentDocRepo as any,
      creditQuotaRepo as any,
      recalculateAccountPayable as any,
      history as any,
    );

    const result = await usecase.execute(
      {
        poId: "purchase-1",
        accountPayableId: "payable-1",
        method: "Transferencia",
        date: "2026-07-13",
        currency: "PEN",
        amount: 250,
      } as any,
      undefined,
      { status: "APPROVED", approvedByUserId: "user-1" },
    );

    expect(result).toEqual(expect.objectContaining({
      message: "Pago registrado con exito",
      paymentId: "payment-1",
    }));
    expect(recalculateAccountPayable.execute).toHaveBeenCalledWith(
      { accountPayableId: "payable-1" },
      tx,
    );
  });

  it("does not recalculate the account payable when scheduling a payment", async () => {
    const usecase = new CreatePaymentUsecase(
      uow as any,
      paymentDocRepo as any,
      creditQuotaRepo as any,
      recalculateAccountPayable as any,
      history as any,
    );

    await usecase.execute(
      {
        poId: "purchase-1",
        accountPayableId: "payable-1",
        method: "Transferencia",
        date: "2026-07-13",
        currency: "PEN",
        amount: 250,
        scheduledAt: "2026-07-20",
      } as any,
      undefined,
      { status: "SCHEDULED", scheduledByUserId: "user-1" },
    );

    expect(recalculateAccountPayable.execute).not.toHaveBeenCalled();
  });
});
