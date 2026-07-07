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
  ) {}
}
