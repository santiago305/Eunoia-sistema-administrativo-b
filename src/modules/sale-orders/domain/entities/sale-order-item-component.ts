export class SaleOrderItemComponent {
  constructor(
    public readonly id: string,
    public readonly saleOrderItemId: string,
    public readonly skuId: string,
    public readonly referencePackItemId: string | null,
    public readonly quantity: number,
    public readonly unitPrice: number,
    public readonly total: number,
    public readonly createdAt: Date,
  ) {}
}

