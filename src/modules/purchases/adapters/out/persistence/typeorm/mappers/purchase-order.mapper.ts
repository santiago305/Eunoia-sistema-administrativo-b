import { PurchaseOrder } from "src/modules/purchases/domain/entities/purchase-order";
import { PurchaseOrderFactory } from "src/modules/purchases/domain/factories/purchase-order.factory";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PurchaseOrderEntity } from "../entities/purchase-order.entity";

export class PurchaseOrderMapper {
  static toDomain(orm: PurchaseOrderEntity): PurchaseOrder {
    const currency = orm.currency ?? CurrencyType.PEN;
    return PurchaseOrderFactory.reconstitute({
      poId: orm.id,
      supplierId: orm.supplierId,
      warehouseId: orm.warehouseId,
      creditDays: Number(orm.creditDays ?? 0),
      numQuotas: Number(orm.numQuotas ?? 0),
      totalTaxed: Number(orm.totalTaxed ?? 0),
      totalExempted: Number(orm.totalExempted ?? 0),
      totalIgv: Number(orm.totalIgv ?? 0),
      purchaseValue: Number(orm.purchaseValue ?? 0),
      total: Number(orm.total ?? 0),
      documentType: orm.documentType ?? undefined,
      serie: orm.serie ?? undefined,
      correlative: orm.correlative ?? undefined,
      currency,
      paymentForm: orm.paymentForm ?? undefined,
      note: orm.note ?? undefined,
      status: orm.status,
      isActive: orm.isActive,
      expectedAt: orm.expectedAt ?? undefined,
      dateIssue: orm.dateIssue ?? undefined,
      dateExpiration: orm.dateExpiration ?? undefined,
      createdAt: orm.createdAt ?? undefined,
      createdBy: orm.createdBy ?? undefined,
      imageProdution: Array.isArray(orm.imageProdution) ? orm.imageProdution : [],
    });
  }

  static toPersistence(domain: PurchaseOrder): Partial<PurchaseOrderEntity> {
    return {
      id: domain.poId,
      supplierId: domain.supplierId,
      warehouseId: domain.warehouseId,
      documentType: domain.documentType ?? null,
      serie: domain.serie ?? null,
      correlative: domain.correlative ?? null,
      currency: domain.currency ?? null,
      paymentForm: domain.paymentForm ?? null,
      creditDays: domain.creditDays ?? 0,
      numQuotas: domain.numQuotas ?? 0,
      totalTaxed: domain.totalTaxed.getAmount(),
      totalExempted: domain.totalExempted.getAmount(),
      totalIgv: domain.totalIgv.getAmount(),
      purchaseValue: domain.purchaseValue.getAmount(),
      total: domain.total.getAmount(),
      note: domain.note ?? null,
      status: domain.status,
      isActive: domain.isActive ?? true,
      expectedAt: domain.expectedAt ?? null,
      dateIssue: domain.dateIssue ?? null,
      dateExpiration: domain.dateExpiration ?? null,
      createdBy: domain.createdBy ?? null,
      imageProdution: domain.imageProdution ?? [],
      createdAt: domain.createdAt ?? undefined,
    };
  }
}
