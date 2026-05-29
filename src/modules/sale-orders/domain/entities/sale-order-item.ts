export class SaleOrderItem {
  constructor(
    public readonly id: string,
    public readonly saleOrderId: string,
    public readonly referencePackId: string | null,
    public readonly description: string | null,
    public readonly quantity: number,
    public readonly unitPrice: number,
    public readonly total: number,
    public readonly createdAt: Date,
  ) {}
}

