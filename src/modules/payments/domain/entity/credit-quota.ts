import { PayDocType } from "../value-objects/pay-doc-type";

export class CreditQuota {
  constructor(
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
}
