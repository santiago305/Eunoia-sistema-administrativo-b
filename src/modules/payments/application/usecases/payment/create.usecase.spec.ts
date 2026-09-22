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
  const companyPaymentAccounts = {
    findOne: jest.fn(),
  };
  const paymentMethods = {
    findOne: jest.fn(),
  };
  const companyMethods = {
    findOne: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    uow.runInTransaction.mockImplementation((callback) => callback(tx));
    paymentDocRepo.create.mockResolvedValue({
      payDocId: "payment-1",
    });
    companyPaymentAccounts.findOne.mockResolvedValue({
      id: "account-1",
      companyId: "company-1",
      isActive: true,
      currency: "PEN",
      usage: "OUTFLOW",
      type: "CREDIT_CARD",
    });
    paymentMethods.findOne.mockResolvedValue({
      id: "method-1",
      code: "CARD",
      isActive: true,
      requiresSourceAccount: true,
      requiresDestination: false,
      requiresOperationReference: false,
      requiresVoucher: true,
    });
    companyMethods.findOne.mockResolvedValue({
      companyId: "company-1",
      methodId: "method-1",
      enabled: true,
      evidencePolicy: "OPTIONAL",
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

  it("rejects a globally active method that is not enabled for the account company", async () => {
    companyMethods.findOne.mockResolvedValueOnce(null);
    const usecase = new CreatePaymentUsecase(
      uow as any,
      paymentDocRepo as any,
      creditQuotaRepo as any,
      recalculateAccountPayable as any,
      history as any,
      companyPaymentAccounts as any,
      paymentMethods as any,
      undefined,
      undefined,
      undefined,
      undefined,
      companyMethods as any,
    );

    await expect(usecase.execute({
      poId: "purchase-1",
      method: "Tarjeta",
      paymentMethodId: "method-1",
      companyPaymentAccountId: "account-1",
      date: "2026-09-22",
      currency: "PEN",
      amount: 100,
    } as any, undefined, { status: "DRAFT" })).rejects.toThrow(
      "El metodo de pago no esta habilitado para la empresa",
    );
  });

  it("uses the company evidence policy instead of the global voucher default", async () => {
    const usecase = new CreatePaymentUsecase(
      uow as any,
      paymentDocRepo as any,
      creditQuotaRepo as any,
      recalculateAccountPayable as any,
      history as any,
      companyPaymentAccounts as any,
      paymentMethods as any,
      undefined,
      undefined,
      undefined,
      undefined,
      companyMethods as any,
    );

    await expect(usecase.execute({
      poId: "purchase-1",
      method: "Tarjeta",
      paymentMethodId: "method-1",
      companyPaymentAccountId: "account-1",
      date: "2026-09-22",
      currency: "PEN",
      amount: 100,
    } as any, undefined, { status: "APPROVED" })).resolves.toEqual(
      expect.objectContaining({ paymentId: "payment-1" }),
    );
  });
});
