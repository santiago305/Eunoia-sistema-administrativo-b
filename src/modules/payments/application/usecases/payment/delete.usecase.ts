import { BadRequestException, Inject, NotFoundException, Optional } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork, TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { PaymentNotFoundError } from "../../errors/payment-not-found.error";
import { successResponse } from "src/shared/response-standard/response";
import { PurchaseHistoryService } from "src/modules/purchases/application/services/purchase-history.service";

export class DeletePaymentUsecase {
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

  async execute(payDocId: string, tx?: TransactionContext, performedByUserId?: string): Promise<{ message: string }> {
    if (tx) {
      return this.deleteInTransaction(payDocId, tx, performedByUserId);
    }
    return this.uow.runInTransaction((innerTx) => this.deleteInTransaction(payDocId, innerTx, performedByUserId));
  }

  private async deleteInTransaction(payDocId: string, tx: TransactionContext, performedByUserId?: string): Promise<{ message: string }> {
    const existing = await this.paymentDocRepo.findById(payDocId, tx);
    if (!existing) {
      throw new NotFoundException(new PaymentNotFoundError().message);
    }
    if (existing.quotaId) {
      const quota = await this.creditQuotaRepo.findById(existing.quotaId, tx);
      if (quota) {
        const newTotalPaid = Math.max(0, quota.totalPaid - existing.amount);
        await this.creditQuotaRepo.updateTotalPaid(quota.quotaId, newTotalPaid, tx);
        if (quota.paymentDate && existing.date && quota.paymentDate.getTime() === existing.date.getTime()) {
          const latest = await this.paymentDocRepo.findLatestByQuotaId(existing.quotaId, payDocId, tx);
          await this.creditQuotaRepo.updatePaymentDate(quota.quotaId, latest ? latest.date : null, tx);
        }
      }
    }

    try {
      await this.paymentDocRepo.deleteById(payDocId, tx);
      if (existing.poId) {
        await this.history?.recordPayment({
          purchaseId: existing.poId,
          eventType: "PAYMENT_DELETED",
          description: "Se eliminó un pago de la compra.",
          performedByUserId: performedByUserId ?? null,
          oldValues: {
            paymentId: existing.payDocId,
            amount: existing.amount,
            currency: existing.currency,
            method: existing.method,
            status: existing.status,
            quotaId: existing.quotaId ?? null,
            operationNumber: existing.operationNumber ?? null,
          },
          metadata: {
            paymentId: existing.payDocId,
            quotaId: existing.quotaId ?? null,
            accountPayableId: existing.accountPayableId ?? null,
          },
          tx,
        });
      }
    } catch {
      throw new BadRequestException("No se pudo eliminar el pago");
    }

    return successResponse("Pago eliminado con exito");
  }
}
