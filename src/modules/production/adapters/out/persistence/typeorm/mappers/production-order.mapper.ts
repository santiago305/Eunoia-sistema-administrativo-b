import { ProductionOrder as DomainOrder } from "src/modules/production/domain/entity/production-order.entity";
import { ProductionOrderFactory } from "src/modules/production/domain/factories/production-order.factory";
import { ProductionOrderEntity as OrmOrder } from "../entities/production_order.entity";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";

export class ProductionOrderMapper {
  static toDomain(orm: OrmOrder): DomainOrder {
    return ProductionOrderFactory.reconstitute({
      id: orm.id,
      fromWarehouseId: orm.fromWarehouseId,
      toWarehouseId: orm.toWarehouseId,
      docType: orm.docType, 
      serieId: orm.serieId,
      correlative: orm.correlative,
      status: orm.status as ProductionStatus,
      manufactureDate: orm.manufactureDate,
      createdBy: orm.createdBy,
      createdAt: orm.createdAt,
      reference: orm.reference ?? null,
      updatedAt: orm.updatedAt ?? null,
      updatedBy: orm.updatedBy ?? null,
      imageProdution: orm.imageProdution ?? [],
    });
  }

  static toPersistence(domain: DomainOrder): Partial<OrmOrder> {
    return {
      id: domain.productionId,
      fromWarehouseId: domain.fromWarehouseId,
      toWarehouseId: domain.toWarehouseId,
      docType: domain.docType, 
      serieId: domain.serieId,
      correlative: domain.correlative,
      status: domain.status as any,
      manufactureDate: domain.manufactureDate,
      createdBy: domain.createdBy,
      reference: domain.reference ?? null,
      updatedBy: domain.updatedBy ?? null,
      updatedAt: domain.updatedAt ?? null,
      imageProdution: domain.imageProdution ?? [],
    };
  }
}
