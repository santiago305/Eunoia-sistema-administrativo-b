export interface CreditQuotaOutput {
  quotaId: string;
  number: number;
  expirationDate: Date;
  paymentDate?: Date;
  totalToPay: number;
  totalPaid: number;
  createdAt?: Date;
}
