import { Inject, Optional } from "@nestjs/common";
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
import { PaymentAllocationEntity } from "src/modules/payments/adapters/out/persistence/typeorm/entities/payment-allocation.entity";
import { PaymentMethodEntity } from "src/modules/payment-methods/adapters/out/persistence/typeorm/entities/payment-method.entity";
import { SupplierPaymentDestinationEntity } from "src/modules/supplier-payment-destinations/adapters/out/persistence/typeorm/entities/supplier-payment-destination.entity";
import { PURCHASE_ATTACHMENT_REPOSITORY, PurchaseAttachmentRepository } from "src/modules/purchase-attachments/domain/ports/purchase-attachment.repository";
import { PurchaseAttachmentType } from "src/modules/purchase-attachments/domain/value-objects/purchase-attachment-type";
import { CompanyMethodEntity } from "src/modules/payment-methods/adapters/out/persistence/typeorm/entities/company-method.entity";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { resolveCompanyMethodRequiresVoucher } from "src/modules/payment-methods/domain/services/payment-method-voucher-policy";
import { PaymentFinancialPolicy } from "src/modules/payments/domain/services/payment-financial-policy";

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
    @Optional()
    @InjectRepository(PaymentAllocationEntity)
    private readonly allocationRepo?: Repository<PaymentAllocationEntity>,
    @Optional()
    @InjectRepository(PaymentMethodEntity)
    private readonly paymentMethodRepo?: Repository<PaymentMethodEntity>,
    @Optional()
    @InjectRepository(SupplierPaymentDestinationEntity)
    private readonly supplierDestinationRepo?: Repository<SupplierPaymentDestinationEntity>,
    @Optional()
    @Inject(PURCHASE_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepo?: PurchaseAttachmentRepository,
    @Optional()
    @InjectRepository(CompanyPaymentAccountEntity)
    private readonly companyPaymentAccountRepo?: Repository<CompanyPaymentAccountEntity>,
    @Optional()
    @InjectRepository(CompanyMethodEntity)
    private readonly companyMethodRepo?: Repository<CompanyMethodEntity>,
  ) {}

  async execute(input: { paymentId: string; userId: string }) {
    const existing = await this.paymentEntityRepo.findOne({ where: { id: input.paymentId } });
    if (!existing) {
      return { type: "error" as const, message: "Pago no encontrado" };
    }
    if (existing.status !== "PENDING_APPROVAL" && existing.status !== "SCHEDULED") {
      return { type: "error" as const, message: "El pago no está pendiente de aprobación" };
    }

    const paymentMethod = existing.paymentMethodId && this.paymentMethodRepo
      ? await this.paymentMethodRepo.findOne({ where: { id: existing.paymentMethodId } })
      : null;
    if (this.paymentMethodRepo && (!paymentMethod || !paymentMethod.isActive)) {
      return { type: "error" as const, message: "El metodo de pago no esta disponible" };
    }
    const sourceAccount = existing.companyPaymentAccountId && this.companyPaymentAccountRepo
      ? await this.companyPaymentAccountRepo.findOne({ where: { id: existing.companyPaymentAccountId } })
      : null;
    if (this.companyPaymentAccountRepo && paymentMethod?.requiresSourceAccount && !sourceAccount) {
      return { type: "error" as const, message: "La cuenta de origen no existe o esta inactiva" };
    }
    const companyMethod = sourceAccount && this.companyMethodRepo
      ? await this.companyMethodRepo.findOne({
          where: { companyId: sourceAccount.companyId, methodId: paymentMethod!.id },
        })
      : null;
    if (this.companyMethodRepo && sourceAccount && !companyMethod?.enabled) {
      return { type: "error" as const, message: "El metodo de pago no esta habilitado para la empresa" };
    }
    const requiresVoucher = paymentMethod
      ? resolveCompanyMethodRequiresVoucher(
          paymentMethod.requiresVoucher,
          companyMethod?.evidencePolicy,
        )
      : false;
    if (paymentMethod && sourceAccount) {
      try {
        PaymentFinancialPolicy.validate({
          method: {
            code: paymentMethod.code,
            isActive: paymentMethod.isActive,
            requiresSourceAccount: paymentMethod.requiresSourceAccount,
            requiresDestination: false,
            requiresOperationReference: false,
            requiresVoucher,
          },
          account: {
            id: sourceAccount.id,
            isActive: sourceAccount.isActive,
            currency: sourceAccount.currency,
            usage: sourceAccount.usage,
            type: sourceAccount.type,
          },
          currency: existing.currency,
        });
      } catch (error) {
        return {
          type: "error" as const,
          message: error instanceof Error ? error.message : "La cuenta de origen no es válida",
        };
      }
    }
    if (paymentMethod?.requiresDestination && !existing.supplierPaymentDestinationId) {
      return { type: "error" as const, message: "El pago no tiene un destino de proveedor confirmado" };
    }
    if (requiresVoucher) {
      if (!this.attachmentRepo) {
        return { type: "error" as const, message: "No se pudo validar la evidencia del pago" };
      }
      const evidence = await this.attachmentRepo.list({
        paymentId: existing.id,
        type: PurchaseAttachmentType.PAYMENT_PROOF,
      });
      if (!evidence.length) {
        return { type: "error" as const, message: "El pago requiere evidencia antes de ser aprobado" };
      }
    }
    if (existing.supplierPaymentDestinationId) {
      if (!this.supplierDestinationRepo) {
        return { type: "error" as const, message: "No se pudo validar el destino del proveedor" };
      }
      const destination = await this.supplierDestinationRepo.findOne({
        where: { id: existing.supplierPaymentDestinationId },
      });
      if (!destination || !destination.isActive || destination.requiresManualReview) {
        return { type: "error" as const, message: "El destino del proveedor no esta disponible" };
      }
      if (destination.currency !== existing.currency || (existing.paymentMethodId && destination.methodId !== existing.paymentMethodId)) {
        return { type: "error" as const, message: "El destino del proveedor no es compatible con el pago" };
      }
    }

    existing.status = "POSTED";
    existing.approvedByUserId = input.userId;
    existing.approvedAt = new Date();
    existing.paidByUserId = input.userId;
    existing.paidAt = existing.paidAt ?? new Date();
    await this.paymentEntityRepo.save(existing);

    if (existing.accountPayableId && this.allocationRepo) {
      await this.allocationRepo.save(this.allocationRepo.create({
        paymentId: existing.id,
        accountPayableId: existing.accountPayableId,
        amount: Number(existing.amount),
        currency: existing.currency,
      }));
    }

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
