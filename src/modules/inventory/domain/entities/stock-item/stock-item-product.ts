export class StockItemProduct {
  constructor(
    public readonly stockItemId: string | undefined,
    public readonly productId: string,
  ) {}
}
