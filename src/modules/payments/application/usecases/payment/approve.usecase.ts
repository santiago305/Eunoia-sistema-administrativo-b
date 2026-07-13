import { Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RecalculateAccountPayableUsecase } from "src/modules/accounts-payable";
import { NotificationsService } from "src/modules/mail/application/use-cases/notifications.service";
import { PURCHASE_NOTIFICATION_TYPES } from "src/modules/mail/domain/constants/purchase-notification-types";
import { ApprovalRequestEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/approval-request.entity";
import { PurchaseOrderEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity";
import { PurchaseHistoryService } from "src/modules/purchases/application/services/purchase-history.service";
import { PaymentDocumentEntity } from "src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";

export class ApprovePaymentUsecase {
  constructor(
    @InjectRepository(PaymentDocumentEntity)
    private readonly paymentEntityRepo: Repository<PaymentDocumentEntity>,
    @InjectRepository(ApprovalRequestEntity)
    private readonly approvalRequestRepo: Repository<ApprovalRequestEntity>,
    @InjectRepository(PurchaseOrderEntity)
    private readonly purchaseOrderRepo: Repository<PurchaseOrderEntity>,
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
    private readonly recalculateAccountPayable: RecalculateAccountPayableUsecase,
    private readonly notificationsService: NotificationsService,
    private readonly history: PurchaseHistoryService,
  ) {}

  async execute(input: { paymentId: string; userId: string }) {
    const existing = await this.paymentEntityRepo.findOne({ where: { id: input.paymentId } });
    if (!existing) {
      return { type: "error" as const, message: "Pago no encontrado" };
    }
    if (existing.status !== "PENDING_APPROVAL" && existing.status !== "SCHEDULED") {
      return { type: "error" as const, message: "El pago no está pendiente de aprobación" };
    }

    existing.status = "APPROVED";
    existing.approvedByUserId = input.userId;
    existing.approvedAt = new Date();
    existing.paidByUserId = input.userId;
    existing.paidAt = existing.paidAt ?? new Date();
    await this.paymentEntityRepo.save(existing);

    if (existing.quotaId) {
      const quota = await this.creditQuotaRepo.findById(existing.quotaId);
      if (quota) {
        await this.creditQuotaRepo.updateTotalPaid(quota.quotaId, quota.totalPaid + Number(existing.amount));
        await this.creditQuotaRepo.updatePaymentDate(quota.quotaId, existing.date);
      }
    }

    if (existing.accountPayableId) {
      await this.recalculateAccountPayable.execute({ accountPayableId: existing.accountPayableId });
    }

    if (existing.poId) {
      const purchase = await this.purchaseOrderRepo.findOne({
        where: { id: existing.poId },
        select: ["id", "approvalStatus"],
      });
      if (purchase?.approvalStatus === "PENDING") {
        await this.purchaseOrderRepo.update({ id: existing.poId }, { approvalStatus: "APPROVED" });
        const creationApproval = await this.approvalRequestRepo.findOne({
          where: {
            entityId: existing.poId,
            action: "PURCHASE_CREATION_WITH_PAYMENT",
            status: "PENDING",
          },
          order: { createdAt: "DESC" },
        });
        if (creationApproval) {
          creationApproval.status = "APPROVED";
          creationApproval.reviewedByUserId = input.userId;
          creationApproval.reviewedAt = new Date();
          await this.approvalRequestRepo.save(creationApproval);
        }
      }

      await this.history.recordPayment({
        purchaseId: existing.poId,
        eventType: "PAYMENT_APPROVED",
        description: "Se aprobó un pago pendiente.",
        performedByUserId: input.userId,
        targetUserId: existing.requestedByUserId ?? null,
        metadata: { paymentId: existing.id, amount: Number(existing.amount) },
      });
    }

    if (existing.requestedByUserId) {
      await this.notificationsService.createNotificationForUsers({
        recipientUserIds: [existing.requestedByUserId],
        type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_PAYMENT_APPROVED,
        category: "PURCHASES",
        title: "Pago aprobado",
        message: "Tu pago fue aprobado.",
        priority: "NORMAL",
        actionUrl: existing.poId ? `/compras?purchaseId=${existing.poId}&modal=payments` : "/compras",
        actionLabel: "Ver pago",
        sourceModule: "payments",
        sourceEntityType: "payment_document",
        sourceEntityId: existing.id,
        metadata: { paymentId: existing.id, poId: existing.poId, showAsToast: true },
        showAsToast: true,
      });
    }

    return { type: "success" as const, message: "Pago aprobado correctamente" };
  }
}
