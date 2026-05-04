import { PurchaseOrderExpectedScheduler } from "src/modules/purchases/application/jobs/purchase-order-expected-scheduler";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse } from "src/shared/response-standard/response";
import { PurchaseOrderNotFoundApplicationError } from "../../errors/purchase-order-not-found.error";
import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { NotificationsService } from "src/modules/notifications/application/use-cases/notifications.service";
import { PURCHASE_NOTIFICATION_TYPES } from "src/modules/notifications/domain/constants/purchase-notification-types";

export class SetSentPurchaseOrderUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    private readonly scheduler: PurchaseOrderExpectedScheduler,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    private readonly notificationsService: NotificationsService,
  ) {}

  async execute(poId: string): Promise<ReturnType<typeof successResponse>> {
    const result = await this.uow.runInTransaction(async (tx) => {
      const order = await this.purchaseRepo.findById(poId, tx);
      if (!order) {
        throw new NotFoundException(new PurchaseOrderNotFoundApplicationError().message);
      }

      if (!order.expectedAt) {
        throw new BadRequestException("La orden no tiene expectedAt");
      }

      if (![PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.PARTIAL].includes(order.status)) {
        throw new BadRequestException("Estado invalido para pasar a SENT");
      }

      const now = this.clock.now();
      const baseDate = order.dateIssue ?? order.createdAt ?? now;
      const originalWaitMs = Math.max(
        0,
        order.expectedAt.getTime() - baseDate.getTime(),
      );
      const recalculatedExpectedAt = new Date(now.getTime() + originalWaitMs);

      const updated = await this.purchaseRepo.update(
        {
          poId: order.poId,
          status: PurchaseOrderStatus.SENT,
          expectedAt: recalculatedExpectedAt,
        },
        tx,
      );

      if (!updated) {
        throw new BadRequestException("No se pudo actualizar estado");
      }

      this.scheduler.schedule(updated.poId, recalculatedExpectedAt);

      return {
        response: successResponse("Orden marcada como SENT y programada"),
        poId: updated.poId,
        createdBy: updated.createdBy,
        expectedAt: recalculatedExpectedAt,
        purchaseCode: [updated.serie, updated.correlative].filter(Boolean).join("-") || updated.poId.slice(0, 8),
      };
    });

    if (result.createdBy) {
      await this.notificationsService.createNotificationForUsers({
        recipientUserIds: [result.createdBy],
        type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_SENT,
        category: "PURCHASES",
        title: "Compra enviada",
        message: `La compra ${result.purchaseCode} fue enviada y quedó programada para ingreso.`,
        priority: "NORMAL",
        actionUrl: "/compras",
        actionLabel: "Ver compras",
        sourceModule: "purchases",
        sourceEntityType: "purchase_order",
        sourceEntityId: result.poId,
        metadata: {
          poId: result.poId,
          purchaseCode: result.purchaseCode,
          expectedAt: result.expectedAt,
          status: "SENT",
        },
      });
    }

    return result.response;
  }
}
