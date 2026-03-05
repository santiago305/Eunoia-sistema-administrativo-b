import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PaymentDocument } from "src/modules/payments/domain/entity/payment-document";
import { PaymentPurchase } from "src/modules/payments/domain/entity/payment-purchase";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { PAYMENT_PURCHASE_REPOSITORY, PaymentPurchaseRepository } from "src/modules/payments/domain/ports/payment-purchase.repository";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { CREDIT_QUOTA_PURCHASE_REPOSITORY, CreditQuotaPurchaseRepository } from "src/modules/payments/domain/ports/credit-quota-purchase.repository";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { CreatePaymentInput } from "../../dtos/payment/input/create.input";

export class CreatePaymentUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentDocRepo: PaymentDocumentRepository,
    @Inject(PAYMENT_PURCHASE_REPOSITORY)
    private readonly paymentPurchaseRepo: PaymentPurchaseRepository,
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
    @Inject(CREDIT_QUOTA_PURCHASE_REPOSITORY)
    private readonly creditQuotaPurchaseRepo: CreditQuotaPurchaseRepository,
  ) {}

  async execute(input: CreatePaymentInput, poId?:string): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      let quotaToUpdate: { quotaId: string; totalPaid: number } | null = null;

      if (input.amount <= 0) {
        throw new BadRequestException({
          type: "error",
          message: "Monto invalido",
        });
      }

      const date = new Date(input.date);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException({
          type: "error",
          message: "Fecha invalida",
        });
      }

      if (input.quotaId) {
        const quota = await this.creditQuotaRepo.findById(input.quotaId, tx);
        if (!quota) {
          throw new NotFoundException({
            type: "error",
            message: "Cuota no encontrada",
          });
        }
        quotaToUpdate = { quotaId: quota.quotaId, totalPaid: quota.totalPaid };

        const link = await this.creditQuotaPurchaseRepo.findByQuotaId(input.quotaId, tx);
        if (!link) {
          throw new BadRequestException({
            type: "error",
            message: "La cuota no tiene orden de compra asociada",
          });
        }
        const porderId = poId ?? input.poId
        if (link.poId !== porderId) {
          throw new BadRequestException({
            type: "error",
            message: "La cuota no pertenece a la orden de compra indicada",
          });
        }
      }

      const document = new PaymentDocument(
        undefined,
        input.method,
        date,
        input.currency,
        input.amount,
        PayDocType.PURCHASE,
        input.operationNumber,
        input.note,
      );

      let created: PaymentDocument;
      try {
        created = await this.paymentDocRepo.create(document, tx);
      } catch {
        throw new BadRequestException({
          type: "error",
          message: "No se pudo crear el documento de pago",
        });
      }

      const purchaseLink = new PaymentPurchase(created.payDocId, poId ?? input.poId, input.quotaId);
      try {
        await this.paymentPurchaseRepo.create(purchaseLink, tx);
        if (quotaToUpdate) {
          const newTotalPaid = quotaToUpdate.totalPaid + input.amount;
          await this.creditQuotaRepo.updateTotalPaid(quotaToUpdate.quotaId, newTotalPaid, tx);
          await this.creditQuotaRepo.updatePaymentDate(quotaToUpdate.quotaId, date, tx);
        }
      } catch {
        throw new BadRequestException({
          type: "error",
          message: "No se pudo vincular el pago a la orden de compra",
        });
      }

      return { type: "success", message: "Pago registrado con exito" };
    });
  }
}
