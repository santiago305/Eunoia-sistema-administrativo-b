import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

export class SalePayment {
  constructor(
    public readonly id: string,
    public readonly saleOrderId: string,
    public readonly bankAccountId: string | null,
    public readonly date: Date,
    public readonly method: string,
    public readonly operationNumber: string | null,
    public readonly amount: number,
    public readonly note: string | null,
    public readonly paymentPhoto: string | null,
    public readonly createdAt: Date,
    public readonly bankAccount: { id: string; name: string; number: string | null } | null = null,
    public readonly companyPaymentAccountId: string | null = null,
    public readonly paymentMethodId: string | null = null,
    public readonly currency: CurrencyType = CurrencyType.PEN,
    public readonly status: "DRAFT" | "POSTED" | "VOIDED" = "POSTED",
    public readonly operationCode: string | null = null,
    public readonly voidedAt: Date | null = null,
    public readonly voidReason: string | null = null,
  ) {}
}
