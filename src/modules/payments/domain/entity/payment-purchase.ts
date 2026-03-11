export class PaymentPurchase {
  constructor(
    public readonly payDocId: string,
    public readonly poId: string,
    public readonly quotaId?: string,
  ) {}
}
