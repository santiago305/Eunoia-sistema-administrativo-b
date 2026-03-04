export interface CreateCreditQuotaInput {
  number: number;
  expirationDate: string;
  paymentDate?: string;
  totalToPay: number;
  totalPaid?: number;
  poId?: string;
}
