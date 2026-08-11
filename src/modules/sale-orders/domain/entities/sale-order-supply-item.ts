export class SaleOrderSupplyItem {
  constructor(
    public readonly id: string,
    public readonly saleOrderId: string,
    public readonly supplySkuId: string,
    public readonly quantity: number,
    public readonly unitId: string,
    public readonly referenceRecipeItemId: string | null,
    public readonly supplyNameSnapshot: string,
    public readonly skuNameSnapshot: string,
    public readonly backendSkuSnapshot: string,
    public readonly customSkuSnapshot: string | null,
    public readonly unitNameSnapshot: string,
    public readonly unitCodeSnapshot: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
