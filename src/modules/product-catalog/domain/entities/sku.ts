export class ProductCatalogSku {
  constructor(
    public readonly id: string | undefined,
    public readonly productId: string,
    public readonly backendSku: string,
    public readonly customSku: string | null,
    public readonly name: string,
    public readonly barcode: string | null,
    public readonly image: string | null,
    public readonly price: number,
    public readonly cost: number,
    public readonly isSellable: boolean,
    public readonly isPurchasable: boolean,
    public readonly isManufacturable: boolean,
    public readonly isStockTracked: boolean,
    public readonly isActive: boolean,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}
}
