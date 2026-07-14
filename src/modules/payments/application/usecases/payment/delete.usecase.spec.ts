import { DeletePaymentUsecase } from "./delete.usecase";

describe("DeletePaymentUsecase", () => {
  const tx = { id: "tx-1" };
  const uow = {
    runInTransaction: jest.fn((callback) => callback(tx)),
  };
  const paymentDocRepo = {
    findById: jest.fn(),
    findLatestByQuotaId: jest.fn(),
    deleteById: jest.fn(),
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
    paymentDocRepo.deleteById.mockResolvedValue(undefined);
  });

  it("recalculates the linked account payable after deleting a payment", async () => {
    paymentDocRepo.findById.mockResolvedValueOnce({
      payDocId: "payment-1",
      poId: "purchase-1",
      accountPayableId: "payable-1",
      quotaId: undefined,
      amount: 300,
      currency: "PEN",
      method: "Transferencia",
      status: "APPROVED",
      operationNumber: "OP-1",
    });
    const usecase = new DeletePaymentUsecase(
      uow as any,
      paymentDocRepo as any,
      creditQuotaRepo as any,
      recalculateAccountPayable as any,
      history as any,
    );

    const result = await usecase.execute("payment-1", undefined, "user-1");

    expect(result).toEqual(expect.objectContaining({ message: "Pago eliminado con exito" }));
    expect(paymentDocRepo.deleteById).toHaveBeenCalledWith("payment-1", tx);
    expect(recalculateAccountPayable.execute).toHaveBeenCalledWith(
      { accountPayableId: "payable-1" },
      tx,
    );
  });
});
