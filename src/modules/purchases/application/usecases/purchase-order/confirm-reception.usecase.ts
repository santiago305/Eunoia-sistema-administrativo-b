import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { PostInventoryFromPurchaseUsecase } from "./Inventory-purchase.usecase";
import { errorResponse } from "src/shared/response-standard/response";
import { NotificationsService } from "src/modules/notifications/application/use-cases/notifications.service";
import { PURCHASE_NOTIFICATION_TYPES } from "src/modules/notifications/domain/constants/purchase-notification-types";

export class ConfirmPurchaseReceptionUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    private readonly inventoryPurchase: PostInventoryFromPurchaseUsecase,
    private readonly notificationsService: NotificationsService,
  ) {}

  async execute(poId: string): Promise<{ type: string; message: string }> {
    const result = await this.uow.runInTransaction(async (tx) => {
      const order = await this.purchaseRepo.findById(poId, tx);
      if (!order) {
        throw new NotFoundException(errorResponse("Orden no encontrada"));
      }

      if (order.status !== PurchaseOrderStatus.PENDING_RECEIPT_CONFIRMATION) {
        throw new BadRequestException(
          errorResponse("La orden no esta pendiente de confirmacion de recepcion"),
        );
      }

      await this.inventoryPurchase.execute({
        poId: order.poId,
        toWarehouseId: order.warehouseId,
        postedBy: order.createdBy,
        createdBy: order.createdBy,
        note: "Ingreso por compra confirmada",
        tx,
      });

      await this.purchaseRepo.update(
        { poId: order.poId, status: PurchaseOrderStatus.RECEIVED },
        tx,
      );

      const hasPhotoEvidence = Array.isArray(order.imageProdution) && order.imageProdution.length > 0;
      return {
        response: { type: "success", message: "Compra confirmada e ingresada a stock" },
        poId: order.poId,
        createdBy: order.createdBy,
        hasPhotoEvidence,
        purchaseCode: [order.serie, order.correlative].filter(Boolean).join("-") || order.poId.slice(0, 8),
      };
    });

    if (result.createdBy) {
      await this.notificationsService.createNotificationForUsers({
        recipientUserIds: [result.createdBy],
        type: result.hasPhotoEvidence
          ? PURCHASE_NOTIFICATION_TYPES.PURCHASE_PHOTO_UPLOADED
          : PURCHASE_NOTIFICATION_TYPES.PURCHASE_PHOTO_SKIPPED,
        category: "PURCHASES",
        title: result.hasPhotoEvidence ? "Evidencia registrada" : "Evidencia omitida",
        message: result.hasPhotoEvidence
          ? `La compra ${result.purchaseCode} se confirmó con evidencia y se ingresó a stock.`
          : `La compra ${result.purchaseCode} se confirmó sin evidencia y se ingresó a stock.`,
        priority: "NORMAL",
        actionUrl: "/compras",
        actionLabel: "Ver compra",
        sourceModule: "purchases",
        sourceEntityType: "purchase_order",
        sourceEntityId: result.poId,
        metadata: {
          poId: result.poId,
          purchaseCode: result.purchaseCode,
          withPhotoEvidence: result.hasPhotoEvidence,
          status: PurchaseOrderStatus.RECEIVED,
        },
      });

      await this.notificationsService.createNotificationForUsers({
        recipientUserIds: [result.createdBy],
        type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_STOCK_POSTED,
        category: "PURCHASES",
        title: "Compra ingresada a stock",
        message: `La compra ${result.purchaseCode} fue procesada correctamente y su stock ya fue registrado.`,
        priority: "HIGH",
        actionUrl: "/compras",
        actionLabel: "Ver compra",
        sourceModule: "purchases",
        sourceEntityType: "purchase_order",
        sourceEntityId: result.poId,
        metadata: {
          poId: result.poId,
          purchaseCode: result.purchaseCode,
          status: PurchaseOrderStatus.RECEIVED,
        },
      });
    }

    return result.response;
  }
}
