import { ProductionOrder } from "../entity/production-order.entity";
import { ProductionDocType } from "../value-objects/doc-type.vo";
import { ManufactureDate } from "../value-objects/manufacture-date.error";
import { ProductionStatus } from "../value-objects/production-status.vo";


export class ProductionOrderFactory {
  static createNew(params: {
    fromWarehouseId: string;
    toWarehouseId: string;
    serieId: string;
    correlative: number;
    manufactureDate: Date;
    createdBy: string;
    now: Date;
    reference?: string | null;
  }): ProductionOrder {
    const mfg = ManufactureDate.create(params.manufactureDate);

    return new ProductionOrder(
      undefined,
      params.fromWarehouseId,
      params.toWarehouseId,
      ProductionDocType.PRODUCTION,
      params.serieId,
      params.correlative,
      ProductionStatus.DRAFT,
      mfg.getValue(),
      params.createdBy,
      params.now,
      params.reference ?? null,
      null,
      null
    );
  }

  static reconstitute(params: {
    id: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    docType: ProductionDocType;
    serieId: string;
    correlative: number;
    status: ProductionStatus;
    manufactureDate: Date;
    createdBy: string;
    createdAt: Date;
    reference?: string | null;
    updatedAt?: Date | null;
    updatedBy?: string | null;
    imageProdution?: string[];
  }): ProductionOrder {
    return new ProductionOrder(
      params.id,
      params.fromWarehouseId,
      params.toWarehouseId,
      params.docType,
      params.serieId,
      params.correlative,
      params.status,
      params.manufactureDate,
      params.createdBy,
      params.createdAt,
      params.reference ?? null,
      params.updatedAt ?? null,
      params.updatedBy ?? null,
      params.imageProdution ?? []
    );
  }
}
