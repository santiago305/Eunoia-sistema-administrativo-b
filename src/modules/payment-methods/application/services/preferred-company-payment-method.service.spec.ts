import { PaymentMethod } from "../../domain/entity/payment-method";
import { PreferredCompanyPaymentMethodService } from "./preferred-company-payment-method.service";

const method = (params: {
  methodId: string;
  name: string;
  code: string;
}) =>
  PaymentMethod.create({
    ...params,
    isActive: true,
    requiresVoucher: true,
  });

describe("PreferredCompanyPaymentMethodService", () => {
  it("returns the company preferred configured method", async () => {
    const companyRepo = {
      findSingle: jest.fn().mockResolvedValue({ companyId: "company-1" }),
    };
    const paymentMethodRepo = {
      getByCompany: jest.fn().mockResolvedValue([
        {
          method: method({
            methodId: "bank-1",
            name: "Transferencia bancaria",
            code: "BANK_TRANSFER",
          }),
          isDefault: false,
        },
        {
          method: method({
            methodId: "card-1",
            name: "Tarjeta",
            code: "CARD",
          }),
          isDefault: true,
        },
      ]),
    };
    const service = new PreferredCompanyPaymentMethodService(
      companyRepo as any,
      paymentMethodRepo as any,
    );

    await expect(service.resolve()).resolves.toEqual({
      companyId: "company-1",
      paymentMethodId: "card-1",
      method: "Tarjeta",
      code: "CARD",
    });
  });

  it("falls back to bank transfer when legacy data has no preferred flag", async () => {
    const companyRepo = {
      findSingle: jest.fn().mockResolvedValue({ companyId: "company-1" }),
    };
    const paymentMethodRepo = {
      getByCompany: jest.fn().mockResolvedValue([
        {
          method: method({
            methodId: "bank-1",
            name: "Transferencia bancaria",
            code: "BANK_TRANSFER",
          }),
          isDefault: false,
        },
      ]),
    };
    const service = new PreferredCompanyPaymentMethodService(
      companyRepo as any,
      paymentMethodRepo as any,
    );

    await expect(service.resolve()).resolves.toEqual(
      expect.objectContaining({ paymentMethodId: "bank-1" }),
    );
  });
});
