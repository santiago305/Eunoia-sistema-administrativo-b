import { randomUUID } from "crypto";
import { CurrencyType } from "../value-objects/currency-type";

export class PaymentAllocation {
  private constructor(
    public readonly allocationId: string,
    public readonly paymentId: string,
    public readonly accountPayableId: string,
    public readonly amount: number,
    public readonly currency: CurrencyType,
    public readonly createdAt?: Date,
  ) {}

  static create(params: { allocationId?: string; paymentId: string; accountPayableId: string; amount: number; currency: CurrencyType; createdAt?: Date }) {
    if (!params.paymentId || !params.accountPayableId || !Number.isFinite(params.amount) || params.amount <= 0) {
      throw new Error("La aplicación del pago debe tener una obligación y un monto positivo");
    }
    return new PaymentAllocation(params.allocationId ?? randomUUID(), params.paymentId, params.accountPayableId, params.amount, params.currency, params.createdAt);
  }
}
