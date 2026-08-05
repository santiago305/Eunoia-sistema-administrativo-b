export class SaleOrderItemComponent {
  constructor(
    public readonly id: string,
    public readonly saleOrderItemId: string,
    public readonly skuId: string,
    public readonly referencePackItemId: string | null,
    public readonly skuNameSnapshot: string | null,
    public readonly backendSkuSnapshot: string | null,
    public readonly customSkuSnapshot: string | null,
    public readonly barcodeSnapshot: string | null,
    public readonly imageSnapshot: string | null,
    public readonly productIdSnapshot: string | null,
    public readonly attributesSnapshot: Array<{ code: string; name: string | null; value: string }>,
    public readonly quantity: number,
    public readonly unitPrice: number,
    public readonly total: number,
    public readonly createdAt: Date,
  ) {}
}

