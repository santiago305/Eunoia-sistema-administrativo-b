import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { PurchaseOrderId } from "src/modules/purchases/domain/value-objects/purchase-order-id.vo";
import { DomainError } from "src/modules/purchases/domain/errors/domain.error";
import { errorResponse } from "src/shared/response-standard/response";
import { NotificationsService } from "src/modules/notifications/application/use-cases/notifications.service";
import { PURCHASE_NOTIFICATION_TYPES } from "src/modules/notifications/domain/constants/purchase-notification-types";

export class RunExpectedAtUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async execute(poId: string): Promise<{ type: string; message: string }> {
    let validatedPoId: string;
    try {
      validatedPoId = new PurchaseOrderId(poId).value;
    } catch (err) {
      if (err instanceof DomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const result = await this.uow.runInTransaction(async (tx) => {
      const order = await this.purchaseRepo.findById(validatedPoId, tx);
      if (!order) {
        throw new NotFoundException(errorResponse("Orden no encontrada"));
      }

      if (![PurchaseOrderStatus.SENT, PurchaseOrderStatus.PARTIAL].includes(order.status)) {
        throw new BadRequestException(errorResponse("La orden no esta en estado SENT o PARTIAL"));
      }

      if (!order.expectedAt) {
        throw new BadRequestException(errorResponse("La orden no tiene expectedAt"));
      }

      const updated = await this.purchaseRepo.update(
        { poId: order.poId, status: PurchaseOrderStatus.PENDING_RECEIPT_CONFIRMATION },
        tx,
      );

      return {
        response: {
          type: "success",
          message: "Compra lista para confirmacion final. Falta decision de evidencia/foto.",
        },
        poId: order.poId,
        createdBy: order.createdBy,
        purchaseCode: [order.serie, order.correlative].filter(Boolean).join("-") || order.poId.slice(0, 8),
        expectedAt: order.expectedAt,
        status: updated?.status ?? PurchaseOrderStatus.PENDING_RECEIPT_CONFIRMATION,
      };
    });

    if (result.createdBy) {
      await this.notificationsService.createNotificationForUsers({
        recipientUserIds: [result.createdBy],
        type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_PENDING_STOCK_CONFIRMATION,
        category: "PURCHASES",
        title: "Compra lista para confirmar",
        message: `La compra ${result.purchaseCode} llegó a almacén. Falta decidir evidencia/foto y confirmar ingreso.`,
        priority: "HIGH",
        actionUrl: "/compras",
        actionLabel: "Confirmar ingreso",
        sourceModule: "purchases",
        sourceEntityType: "purchase_order",
        sourceEntityId: result.poId,
        metadata: {
          poId: result.poId,
          purchaseCode: result.purchaseCode,
          expectedAt: result.expectedAt,
          status: result.status,
        },
      });
    }

    return result.response;
  }
}
