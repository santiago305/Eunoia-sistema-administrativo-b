import { BadRequestException, Inject, NotFoundException, Optional } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { CreatePaymentInput } from "../../dtos/payment/input/create.input";
import { PaymentsFactory } from "src/modules/payments/domain/factories/payments.factory";
import { CreditQuotaNotFoundError } from "../../errors/credit-quota-not-found.error";
import { successResponse } from "src/shared/response-standard/response";
import { PurchaseHistoryService } from "src/modules/purchases/application/services/purchase-history.service";

export class CreatePaymentUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentDocRepo: PaymentDocumentRepository,
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
    @Optional()
    private readonly history?: PurchaseHistoryService,
  ) {}

  async execute(
    input: CreatePaymentInput,
    poId?: string,
    options?: {
      status?: "SCHEDULED" | "PENDING_APPROVAL" | "APPROVED";
      requestedByUserId?: string;
      approvedByUserId?: string;
      approvedAt?: Date;
      scheduledByUserId?: string;
    },
  ): Promise<{ message: string; paymentId?: string }> {
    return this.uow.runInTransaction(async (tx) => {
      let quotaToUpdate: { quotaId: string; totalPaid: number } | null = null;
      const paymentPoId = poId ?? input.poId;
      if (!paymentPoId) {
        throw new BadRequestException("Debe indicar la orden de compra");
      }

      if (input.amount <= 0) {
        throw new BadRequestException("Monto invalido");
      }

      const date = new Date(input.date);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException("Fecha invalida");
      }
      const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : undefined;
      if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
        throw new BadRequestException("Fecha programada invalida");
      }
      const paidAt = input.paidAt ? new Date(input.paidAt) : undefined;
      if (paidAt && Number.isNaN(paidAt.getTime())) {
        throw new BadRequestException("Fecha de pago invalida");
      }

      if (input.quotaId) {
        const quota = await this.creditQuotaRepo.findById(input.quotaId, tx);
        if (!quota) {
          throw new NotFoundException(new CreditQuotaNotFoundError().message);
        }
        quotaToUpdate = { quotaId: quota.quotaId, totalPaid: quota.totalPaid };

        const porderId = paymentPoId;
        if (!quota.poId) {
          throw new BadRequestException("La cuota no tiene orden de compra asociada");
        }
        if (porderId && quota.poId !== porderId) {
          throw new BadRequestException("La cuota no pertenece a la orden de compra indicada");
        }
      }

      const document = PaymentsFactory.createPaymentDocument({
        method: input.method,
        date,
        currency: input.currency,
        amount: input.amount,
        fromDocumentType: PayDocType.PURCHASE,
        operationNumber: input.operationNumber,
        note: input.note,
        poId: paymentPoId,
        quotaId: input.quotaId,
        accountPayableId: input.accountPayableId,
        companyPaymentAccountId: input.companyPaymentAccountId,
        paymentMethodId: input.paymentMethodId,
        status: options?.status ?? "APPROVED",
        requestedByUserId: options?.requestedByUserId,
        approvedByUserId: options?.approvedByUserId,
        approvedAt: options?.approvedAt,
        paidByUserId: input.paidByUserId,
        scheduledByUserId: input.scheduledByUserId ?? options?.scheduledByUserId,
        scheduledAt,
        paidAt,
        paymentEvidenceFileId: input.paymentEvidenceFileId,
        bankName: input.bankName,
        cardLastFour: input.cardLastFour,
        operationCode: input.operationCode,
        isPartial: input.isPartial,
      });

      let createdPaymentId: string | undefined;
      try {
        const created = await this.paymentDocRepo.create(document, tx);
        createdPaymentId = created.payDocId;
        const status = options?.status ?? "APPROVED";
        if (status === "APPROVED" || status === "SCHEDULED") {
          await this.history?.recordPayment({
            purchaseId: paymentPoId,
            eventType: status === "SCHEDULED" ? "PAYMENT_SCHEDULED" : "PAYMENT_REGISTERED",
            description: status === "SCHEDULED"
              ? "Se programó un pago de la compra."
              : "Se registró un pago de la compra.",
            performedByUserId: options?.scheduledByUserId ?? options?.approvedByUserId ?? options?.requestedByUserId ?? input.paidByUserId ?? null,
            metadata: {
              paymentId: created.payDocId,
              amount: input.amount,
              currency: input.currency,
              method: input.method,
              operationNumber: input.operationNumber ?? null,
              quotaId: input.quotaId ?? null,
              accountPayableId: input.accountPayableId ?? null,
              companyPaymentAccountId: input.companyPaymentAccountId ?? null,
              paymentMethodId: input.paymentMethodId ?? null,
              scheduledAt: scheduledAt ?? null,
              paidAt: paidAt ?? null,
              status,
              isPartial: input.isPartial ?? false,
            },
            tx,
          });
        }
      } catch {
        throw new BadRequestException("No se pudo crear el documento de pago");
      }

      try {
        if (quotaToUpdate && (options?.status ?? "APPROVED") === "APPROVED") {
          const newTotalPaid = quotaToUpdate.totalPaid + input.amount;
          await this.creditQuotaRepo.updateTotalPaid(quotaToUpdate.quotaId, newTotalPaid, tx);
          await this.creditQuotaRepo.updatePaymentDate(quotaToUpdate.quotaId, date, tx);
        }
      } catch {
        throw new BadRequestException("No se pudo vincular el pago a la orden de compra");
      }

      return {
        ...successResponse("Pago registrado con exito"),
        paymentId: createdPaymentId,
      };
    });
  }
}
