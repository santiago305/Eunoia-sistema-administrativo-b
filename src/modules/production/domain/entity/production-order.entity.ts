
import { InvalidStatusError } from "../errors/invalid-status.error";
import { ProductionDocType } from "../value-objects/doc-type.vo";
import { ManufactureDate } from "../value-objects/manufacture-date.error";
import { ProductionStatus } from "../value-objects/production-status.vo";

export class ProductionOrder {
  constructor(
    public readonly productionId: string,
    public readonly fromWarehouseId: string,
    public readonly toWarehouseId: string,
    public readonly docType: ProductionDocType,
    public readonly serieId: string,
    public readonly correlative: number,
    public readonly status: ProductionStatus,
    public readonly manufactureDate: Date,
    public readonly createdBy: string,
    public readonly createdAt: Date,
    public readonly reference?: string | null,
    public readonly updatedAt?: Date | null,
    public readonly updatedBy?: string | null
  ) {}

  assertCanAddItem(): void {
    if (this.status !== ProductionStatus.DRAFT) {
      throw new InvalidStatusError({
        action: "add-item",
        current: this.status,
        allowed: [ProductionStatus.DRAFT],
      });
    }
  }

  assertCanUpdate(): void {
    if (this.status !== ProductionStatus.DRAFT) {
      throw new InvalidStatusError({
        action: "update",
        current: this.status,
        allowed: [ProductionStatus.DRAFT],
      });
    }
  }

  assertCanAutoClose(now: Date): void {
    if (this.status !== ProductionStatus.IN_PROGRESS) {
      throw new InvalidStatusError({
        action: "auto-close",
        current: this.status,
        allowed: [ProductionStatus.IN_PROGRESS],
      });
    }
    ManufactureDate.create(this.manufactureDate).assertNotFuture(now);
  }
}
