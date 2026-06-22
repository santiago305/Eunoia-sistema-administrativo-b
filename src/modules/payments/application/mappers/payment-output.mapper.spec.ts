import { PaymentDocument } from "../../domain/entity/payment-document";
import { CurrencyType } from "../../domain/value-objects/currency-type";
import { PayDocType } from "../../domain/value-objects/pay-doc-type";
import { PaymentOutputMapper } from "./payment-output.mapper";

describe("PaymentOutputMapper", () => {
  it("maps scheduled payment account fields without exposing raw account numbers", () => {
    const payment = PaymentDocument.create({
      payDocId: "pay-1",
      method: "Transferencia",
      date: new Date("2026-06-22T10:00:00.000Z"),
      currency: CurrencyType.PEN,
      amount: 120,
      fromDocumentType: PayDocType.PURCHASE,
      poId: "po-1",
      companyPaymentAccountId: "account-1",
      paymentMethodId: "method-1",
      scheduledByUserId: "user-1",
      scheduledAt: new Date("2026-06-25T10:00:00.000Z"),
      bankName: "BCP",
      cardLastFour: "1234",
      operationCode: "OP-77",
      isPartial: true,
      companyPaymentAccountMaskedLabel: "BCP Empresa ****1234",
    });

    expect(PaymentOutputMapper.toOutput(payment)).toMatchObject({
      companyPaymentAccountId: "account-1",
      paymentMethodId: "method-1",
      scheduledByUserId: "user-1",
      scheduledAt: new Date("2026-06-25T10:00:00.000Z"),
      bankName: "BCP",
      cardLastFour: "1234",
      operationCode: "OP-77",
      isPartial: true,
      companyPaymentAccountMaskedLabel: "BCP Empresa ****1234",
    });
  });
});
