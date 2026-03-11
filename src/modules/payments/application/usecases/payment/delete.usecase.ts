import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork, TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { PAYMENT_PURCHASE_REPOSITORY, PaymentPurchaseRepository } from "src/modules/payments/domain/ports/payment-purchase.repository";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";

export class DeletePaymentUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentDocRepo: PaymentDocumentRepository,
    @Inject(PAYMENT_PURCHASE_REPOSITORY)
    private readonly paymentPurchaseRepo: PaymentPurchaseRepository,
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
  ) {}

  async execute(payDocId: string, tx?: TransactionContext): Promise<{ type: string; message: string }> {
    if (tx) {
      return this.deleteInTransaction(payDocId, tx);
    }
    return this.uow.runInTransaction((innerTx) => this.deleteInTransaction(payDocId, innerTx));
  }

  private async deleteInTransaction(payDocId: string, tx: TransactionContext): Promise<{ type: string; message: string }> {
    const existing = await this.paymentDocRepo.findById(payDocId, tx);
    if (!existing) {
      throw new NotFoundException({
        type: "error",
        message: "Pago no encontrado",
      });
    }
    const link = await this.paymentPurchaseRepo.findByPayDocId(payDocId, tx);
    if (link?.quotaId) {
      const quota = await this.creditQuotaRepo.findById(link.quotaId, tx);
      if (quota) {
        const newTotalPaid = Math.max(0, quota.totalPaid - link.amount);
        await this.creditQuotaRepo.updateTotalPaid(quota.quotaId, newTotalPaid, tx);
        if (quota.paymentDate && existing.date && quota.paymentDate.getTime() === existing.date.getTime()) {
          const latest = await this.paymentPurchaseRepo.findLatestByQuotaId(link.quotaId, payDocId, tx);
          await this.creditQuotaRepo.updatePaymentDate(quota.quotaId, latest ? latest.date : null, tx);
        }
      }
    }

    try {
      await this.paymentDocRepo.deleteById(payDocId, tx);
    } catch {
      throw new BadRequestException({
        type: "error",
        message: "No se pudo eliminar el pago",
      });
    }

    return { type: "success", message: "Pago eliminado con exito" };
  }
}
