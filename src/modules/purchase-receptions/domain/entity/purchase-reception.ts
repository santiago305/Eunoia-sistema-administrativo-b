export type PurchaseReceptionStatus = "DRAFT" | "CONFIRMED";

export class PurchaseReception {
  constructor(
    public readonly receptionId: string | undefined,
    public readonly purchaseId: string,
    public readonly warehouseId: string | undefined,
    public readonly status: PurchaseReceptionStatus,
    public readonly receivedByUserId: string | undefined,
    public readonly receivedAt: Date | undefined,
    public readonly note: string | undefined,
    public readonly evidenceUrls: string[] = [],
    public readonly inventoryDocumentId?: string,
    public readonly createdAt?: Date,
  ) {}
}
