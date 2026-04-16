import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { CreatePaymentInput } from "../../dtos/payment/input/create.input";
import { PaymentsFactory } from "src/modules/payments/domain/factories/payments.factory";
import { CreditQuotaNotFoundError } from "../../errors/credit-quota-not-found.error";
import { successResponse } from "src/shared/response-standard/response";

export class CreatePaymentUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentDocRepo: PaymentDocumentRepository,
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
  ) {}

  async execute(input: CreatePaymentInput, poId?: string): Promise<{ message: string }> {
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
      });

      try {
        await this.paymentDocRepo.create(document, tx);
      } catch {
        throw new BadRequestException("No se pudo crear el documento de pago");
      }

      try {
        if (quotaToUpdate) {
          const newTotalPaid = quotaToUpdate.totalPaid + input.amount;
          await this.creditQuotaRepo.updateTotalPaid(quotaToUpdate.quotaId, newTotalPaid, tx);
          await this.creditQuotaRepo.updatePaymentDate(quotaToUpdate.quotaId, date, tx);
        }
      } catch {
        throw new BadRequestException("No se pudo vincular el pago a la orden de compra");
      }

      return successResponse("Pago registrado con exito");
    });
  }
}
