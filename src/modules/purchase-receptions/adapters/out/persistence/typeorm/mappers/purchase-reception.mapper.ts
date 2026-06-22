import { PurchaseReception } from "src/modules/purchase-receptions/domain/entity/purchase-reception";
import { PurchaseReceptionItem } from "src/modules/purchase-receptions/domain/entity/purchase-reception-item";
import { PurchaseReceptionEntity } from "../entities/purchase-reception.entity";
import { PurchaseReceptionItemEntity } from "../entities/purchase-reception-item.entity";

export class PurchaseReceptionMapper {
  static toDomain(row: PurchaseReceptionEntity): PurchaseReception {
    return new PurchaseReception(
      row.id,
      row.purchaseId,
      row.warehouseId ?? undefined,
      row.status,
      row.receivedByUserId ?? undefined,
      row.receivedAt ?? undefined,
      row.note ?? undefined,
      row.evidenceUrls ?? [],
      row.inventoryDocumentId ?? undefined,
      row.createdAt,
    );
  }

  static toItemDomain(row: PurchaseReceptionItemEntity): PurchaseReceptionItem {
    return new PurchaseReceptionItem(
      row.id,
      row.receptionId,
      row.purchaseItemId,
      row.stockItemId ?? undefined,
      row.itemType,
      Number(row.orderedQuantity),
      Number(row.receivedQuantity),
      Number(row.acceptedQuantity),
      Number(row.rejectedQuantity),
      row.affectsStock,
      row.stockPosted,
      row.serviceConfirmed,
      row.note ?? undefined,
    );
  }

  static toPersistence(domain: PurchaseReception): Partial<PurchaseReceptionEntity> {
    return {
      id: domain.receptionId,
      purchaseId: domain.purchaseId,
      warehouseId: domain.warehouseId,
      status: domain.status,
      receivedByUserId: domain.receivedByUserId,
      receivedAt: domain.receivedAt,
      note: domain.note,
      evidenceUrls: domain.evidenceUrls,
      inventoryDocumentId: domain.inventoryDocumentId,
    };
  }

  static toItemPersistence(domain: PurchaseReceptionItem): Partial<PurchaseReceptionItemEntity> {
    return {
      id: domain.receptionItemId,
      receptionId: domain.receptionId,
      purchaseItemId: domain.purchaseItemId,
      stockItemId: domain.stockItemId,
      itemType: domain.itemType,
      orderedQuantity: domain.orderedQuantity,
      receivedQuantity: domain.receivedQuantity,
      acceptedQuantity: domain.acceptedQuantity,
      rejectedQuantity: domain.rejectedQuantity,
      affectsStock: domain.affectsStock,
      stockPosted: domain.stockPosted,
      serviceConfirmed: domain.serviceConfirmed,
      note: domain.note,
    };
  }
}
