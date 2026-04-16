import { PayDocType } from "../value-objects/pay-doc-type";
import { InvalidCreditQuotaError } from "../errors/invalid-credit-quota.error";

export class CreditQuota {
  private constructor(
    public readonly quotaId: string,
    public readonly number: number,
    public readonly expirationDate: Date,
    public readonly totalToPay: number,
    public readonly totalPaid: number = 0,
    public readonly fromDocumentType: PayDocType,
    public readonly paymentDate?: Date,
    public readonly createdAt?: Date,
    public readonly poId?: string,
  ) {}

  static create(params: {
    quotaId?: string;
    number: number;
    expirationDate: Date;
    totalToPay: number;
    totalPaid?: number;
    fromDocumentType: PayDocType;
    paymentDate?: Date;
    createdAt?: Date;
    poId?: string;
  }) {
    
    if (params.number <= 0) {
      throw new InvalidCreditQuotaError("El numero de cuota es invalido");
    }
    if (params.totalToPay <= 0) {
      throw new InvalidCreditQuotaError("El total a pagar es invalido");
    }
    if ((params.totalPaid ?? 0) < 0 || (params.totalPaid ?? 0) > params.totalToPay) {
      throw new InvalidCreditQuotaError("El total pagado es invalido");
    }

    return new CreditQuota(
      params.quotaId,
      params.number,
      params.expirationDate,
      params.totalToPay,
      params.totalPaid ?? 0,
      params.fromDocumentType,
      params.paymentDate,
      params.createdAt,
      params.poId,
    );
  }
}
