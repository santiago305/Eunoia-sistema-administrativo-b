import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationsService } from "src/modules/mail/application/use-cases/notifications.service";
import { PURCHASE_NOTIFICATION_TYPES } from "src/modules/mail/domain/constants/purchase-notification-types";
import { PurchaseHistoryService } from "src/modules/purchases/application/services/purchase-history.service";
import { PaymentDocumentEntity } from "src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity";

export class RejectPaymentUsecase {
  constructor(
    @InjectRepository(PaymentDocumentEntity)
    private readonly paymentEntityRepo: Repository<PaymentDocumentEntity>,
    private readonly notificationsService: NotificationsService,
    private readonly history: PurchaseHistoryService,
  ) {}

  async execute(input: { paymentId: string; userId: string; reason?: string }) {
    const existing = await this.paymentEntityRepo.findOne({ where: { id: input.paymentId } });
    if (!existing) {
      return { type: "error" as const, message: "Pago no encontrado" };
    }
    if (existing.status !== "PENDING_APPROVAL") {
      return { type: "error" as const, message: "El pago no está pendiente de aprobación" };
    }

    const reason = input.reason?.trim() || null;
    existing.status = "REJECTED";
    existing.rejectedByUserId = input.userId;
    existing.rejectedAt = new Date();
    existing.rejectionReason = reason;
    await this.paymentEntityRepo.save(existing);

    if (existing.poId) {
      await this.history.recordPayment({
        purchaseId: existing.poId,
        eventType: "PAYMENT_REJECTED",
        description: "Se rechazó un pago pendiente.",
        performedByUserId: input.userId,
        targetUserId: existing.requestedByUserId ?? null,
        metadata: { paymentId: existing.id, reason },
      });
    }

    if (existing.requestedByUserId) {
      await this.notificationsService.createNotificationForUsers({
        recipientUserIds: [existing.requestedByUserId],
        type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_PAYMENT_REJECTED,
        category: "PURCHASES",
        title: "Pago rechazado",
        message: "Tu pago fue rechazado.",
        priority: "NORMAL",
        actionUrl: existing.poId ? `/compras?purchaseId=${existing.poId}&modal=payments` : "/compras",
        actionLabel: "Ver detalle",
        sourceModule: "payments",
        sourceEntityType: "payment_document",
        sourceEntityId: existing.id,
        metadata: {
          paymentId: existing.id,
          poId: existing.poId,
          reason,
          showAsToast: true,
        },
        showAsToast: true,
      });
    }

    return { type: "success" as const, message: "Pago rechazado correctamente" };
  }
}
