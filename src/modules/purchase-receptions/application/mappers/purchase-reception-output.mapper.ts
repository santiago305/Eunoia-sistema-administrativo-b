import { PurchaseReceptionWithItems } from "../../domain/ports/purchase-reception.repository";
import { PurchaseReceptionOutput } from "../dtos/purchase-reception.output";

export class PurchaseReceptionOutputMapper {
  static toOutput(row: PurchaseReceptionWithItems): PurchaseReceptionOutput {
    return {
      receptionId: row.reception.receptionId,
      purchaseId: row.reception.purchaseId,
      warehouseId: row.reception.warehouseId,
      status: row.reception.status,
      receivedByUserId: row.reception.receivedByUserId,
      receivedAt: row.reception.receivedAt,
      note: row.reception.note,
      evidenceUrls: row.reception.evidenceUrls,
      inventoryDocumentId: row.reception.inventoryDocumentId,
      createdAt: row.reception.createdAt,
      items: row.items.map((item) => ({
        receptionItemId: item.receptionItemId,
        purchaseItemId: item.purchaseItemId,
        stockItemId: item.stockItemId,
        itemType: item.itemType,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: item.receivedQuantity,
        acceptedQuantity: item.acceptedQuantity,
        rejectedQuantity: item.rejectedQuantity,
        affectsStock: item.affectsStock,
        stockPosted: item.stockPosted,
        serviceConfirmed: item.serviceConfirmed,
        note: item.note,
      })),
    };
  }
}
