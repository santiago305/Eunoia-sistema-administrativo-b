import { RecalculateAccountPayableUsecase } from "./recalculate-account-payable.usecase";
import { AccountPayable } from "../../domain/entity/account-payable";

describe("RecalculateAccountPayableUsecase", () => {
  const makeBasePayable = () => AccountPayable.create({
    accountPayableId: "ap-1",
    purchaseId: "po-1",
    quotaId: "quota-1",
    currency: "PEN",
    amountTotal: 1000,
  });

  it("reduces pending amount with approved payments", async () => {
    const payableRepo = {
      findById: jest.fn().mockResolvedValue(makeBasePayable()),
      update: jest.fn(async (payable) => payable),
    };
    const paymentRepo = {
      findApprovedByAccountPayableId: jest.fn().mockResolvedValue([
        { amount: 400, status: "APPROVED" },
      ]),
    };
    const usecase = new RecalculateAccountPayableUsecase(payableRepo as any, paymentRepo as any);

    const result = await usecase.execute({ accountPayableId: "ap-1" });

    expect(result.amountPaid).toBe(400);
    expect(result.amountPending).toBe(600);
    expect(result.status).toBe("PARTIAL");
    expect(payableRepo.update).toHaveBeenCalledWith(expect.objectContaining({
      amountPaid: 400,
      amountPending: 600,
      status: "PARTIAL",
    }), undefined);
  });

  it("ignores rejected payments when recalculating the balance", async () => {
    const payableRepo = {
      findById: jest.fn().mockResolvedValue(makeBasePayable()),
      update: jest.fn(async (payable) => payable),
    };
    const paymentRepo = {
      findApprovedByAccountPayableId: jest.fn().mockResolvedValue([]),
    };
    const usecase = new RecalculateAccountPayableUsecase(payableRepo as any, paymentRepo as any);

    const result = await usecase.execute({ accountPayableId: "ap-1" });

    expect(result.amountPaid).toBe(0);
    expect(result.amountPending).toBe(1000);
    expect(result.status).toBe("PENDING");
  });
});
