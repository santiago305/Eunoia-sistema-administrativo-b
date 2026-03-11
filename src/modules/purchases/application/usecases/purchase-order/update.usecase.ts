import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { UpdatePurchaseOrderInput } from "../../dtos/purchase-order/input/update.input";
import { Money } from "src/modules/catalog/domain/value-object/money.vo";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { PurchaseOrderItem } from "src/modules/purchases/domain/entities/purchase-order-item";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PaymentDocument } from "src/modules/payments/domain/entity/payment-document";
import { PaymentPurchase } from "src/modules/payments/domain/entity/payment-purchase";
import { CreditQuota } from "src/modules/payments/domain/entity/credit-quota";
import { CreditQuotaPurchase } from "src/modules/payments/domain/entity/credit-quota-purchase";
import { CreateCreditQuotaInput } from "src/modules/payments/application/dtos/credit-quota/input/create.input";
import { DeletePaymentUsecase } from "src/modules/payments/application/usecases/payment/delete.usecase";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { PAYMENT_PURCHASE_REPOSITORY, PaymentPurchaseRepository } from "src/modules/payments/domain/ports/payment-purchase.repository";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { CREDIT_QUOTA_PURCHASE_REPOSITORY, CreditQuotaPurchaseRepository } from "src/modules/payments/domain/ports/credit-quota-purchase.repository";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";

export class UpdatePurchaseOrderUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    @Inject(PURCHASE_ORDER_ITEM)
    private readonly itemRepo: PurchaseOrderItemRepository,
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentDocRepo: PaymentDocumentRepository,
    @Inject(PAYMENT_PURCHASE_REPOSITORY)
    private readonly paymentPurchaseRepo: PaymentPurchaseRepository,
    private readonly deletePayment: DeletePaymentUsecase,
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
    @Inject(CREDIT_QUOTA_PURCHASE_REPOSITORY)
    private readonly creditQuotaPurchaseRepo: CreditQuotaPurchaseRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: UpdatePurchaseOrderInput): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const expectedAt = input.expectedAt ? new Date(input.expectedAt) : undefined;
      if (expectedAt && Number.isNaN(expectedAt.getTime())) {
        throw new BadRequestException({ type: "error", message: "Fecha esperada invalida" });
      }

      const dateIssue = input.dateIssue ? new Date(input.dateIssue) : undefined;
      if (dateIssue && Number.isNaN(dateIssue.getTime())) {
        throw new BadRequestException({ type: "error", message: "Fecha de emision invalida" });
      }

      const dateExpiration = input.dateExpiration ? new Date(input.dateExpiration) : undefined;
      if (dateExpiration && Number.isNaN(dateExpiration.getTime())) {
        throw new BadRequestException({ type: "error", message: "Fecha de vencimiento invalida" });
      }

      const currency = input.currency ?? "PEN";

      const updated = await this.purchaseRepo.update(
        {
          poId: input.poId,
          supplierId: input.supplierId,
          warehouseId: input.warehouseId,
          documentType: input.documentType,
          serie: input.serie,
          correlative: input.correlative,
          currency: input.currency,
          paymentForm: input.paymentForm,
          creditDays: input.creditDays,
          numQuotas: input.numQuotas,
          totalTaxed: input.totalTaxed !== undefined ? Money.create(input.totalTaxed, currency) : undefined,
          totalExempted: input.totalExempted !== undefined ? Money.create(input.totalExempted, currency) : undefined,
          totalIgv: input.totalIgv !== undefined ? Money.create(input.totalIgv, currency) : undefined,
          purchaseValue: input.purchaseValue !== undefined ? Money.create(input.purchaseValue, currency) : undefined,
          total: input.total !== undefined ? Money.create(input.total, currency) : undefined,
          note: input.note,
          status: input.status,
          expectedAt,
          dateIssue,
          dateExpiration,
        },
        tx,
      );

      if (!updated) {
        throw new NotFoundException({
          type: "error",
          message: "Orden de compra no encontrada",
        });
      }

      const isCredit = updated.paymentForm === PaymentFormType.CREDITO;
      let quotasChanged = false;
      let existingQuotas: CreditQuota[] = [];
      if (isCredit && input.quotas !== undefined) {
        existingQuotas = await this.creditQuotaRepo.findByPoId(updated.poId, tx);
        quotasChanged = this.hasQuotaChanges(existingQuotas, input.quotas);
      }

      const itemCurrency = updated.currency ?? input.currency ?? "PEN";

      if (input.items !== undefined) {
        const existingItems = await this.itemRepo.getByPurchaseId(updated.poId, tx);
        for (const item of existingItems) {
          const removed = await this.itemRepo.remove(item.poItemId, tx);
          if (!removed) {
            throw new BadRequestException({
              type: "error",
              message: "No se pudo eliminar items de la orden de compra",
            });
          }
        }

        if (input.items.length > 0) {
          for (const item of input.items) {
            const orderItem = new PurchaseOrderItem(
              undefined,
              updated.poId,
              item.stockItemId,
              item.unitBase,
              item.equivalence,
              item.factor,
              item.afectType,
              item.quantity,
              Money.create(item.porcentageIgv ?? 0, itemCurrency),
              Money.create(item.baseWithoutIgv ?? 0, itemCurrency),
              Money.create(item.amountIgv ?? 0, itemCurrency),
              Money.create(item.unitValue ?? 0, itemCurrency),
              Money.create(item.unitPrice ?? 0, itemCurrency),
              Money.create(item.purchaseValue ?? 0, itemCurrency),
            );

            try {
              await this.itemRepo.add(orderItem, tx);
            } catch {
              throw new BadRequestException({
                type: "error",
                message: "No se pudo agregar items a la orden de compra",
              });
            }
          }
        }
      }

      const shouldDeletePayments =
        (!isCredit && input.payments !== undefined) ||
        (isCredit && input.quotas !== undefined && quotasChanged);

      if (shouldDeletePayments) {
        const existingPayments = await this.paymentPurchaseRepo.findByPoId(updated.poId, tx);
        for (const payment of existingPayments) {
          try {
            await this.deletePayment.execute(payment.payDocId, tx);
          } catch {
            throw new BadRequestException({ type: "error", message: "No se pudo eliminar pagos de la orden de compra" });
          }
        }
      }

      const shouldReplaceQuotas = input.quotas !== undefined && (!isCredit || quotasChanged);
      if (shouldReplaceQuotas) {
        const quotasToDelete = existingQuotas.length > 0 ? existingQuotas : await this.creditQuotaRepo.findByPoId(updated.poId, tx);
        for (const quota of quotasToDelete) {
          try {
            await this.creditQuotaRepo.deleteById(quota.quotaId, tx);
          } catch {
            throw new BadRequestException({ type: "error", message: "No se pudo eliminar cuotas de la orden de compra" });
          }
        }
      }

      if (updated.paymentForm === PaymentFormType.CONTADO && input.payments && input.payments.length > 0) {
        for (const payment of input.payments) {
          if (payment.amount <= 0) {
            throw new BadRequestException({ type: "error", message: "Monto invalido" });
          }

          const payDate = new Date(payment.date);
          if (Number.isNaN(payDate.getTime())) {
            throw new BadRequestException({ type: "error", message: "Fecha invalida" });
          }

          if (payment.quotaId) {
            const quota = await this.creditQuotaRepo.findById(payment.quotaId, tx);
            if (!quota) {
              throw new NotFoundException({ type: "error", message: "Cuota no encontrada" });
            }

            const link = await this.creditQuotaPurchaseRepo.findByQuotaId(payment.quotaId, tx);
            if (!link) {
              throw new BadRequestException({ type: "error", message: "La cuota no tiene orden de compra asociada" });
            }

            if (link.poId !== updated.poId) {
              throw new BadRequestException({
                type: "error",
                message: "La cuota no pertenece a la orden de compra indicada",
              });
            }
          }

          const document = new PaymentDocument(
            undefined,
            payment.method,
            payDate,
            payment.currency,
            payment.amount,
            PayDocType.PURCHASE,
            payment.operationNumber,
            payment.note,
          );

          let createdDoc: PaymentDocument;
          try {
            createdDoc = await this.paymentDocRepo.create(document, tx);
          } catch {
            throw new BadRequestException({ type: "error", message: "No se pudo crear el documento de pago" });
          }

          const purchaseLink = new PaymentPurchase(createdDoc.payDocId, updated.poId, payment.quotaId);
          try {
            await this.paymentPurchaseRepo.create(purchaseLink, tx);
          } catch {
            throw new BadRequestException({ type: "error", message: "No se pudo vincular el pago a la orden de compra" });
          }
        }
      }

      if (updated.paymentForm === PaymentFormType.CREDITO && input.quotas !== undefined && quotasChanged) {
        if (input.quotas.length === 0) {
          throw new BadRequestException({ type: "error", message: "Debe registrar al menos una cuota" });
        }

        for (const quotaInput of input.quotas) {
          if (quotaInput.totalPaid !== undefined && quotaInput.totalPaid > quotaInput.totalToPay) {
            throw new BadRequestException({ type: "error", message: "El total pagado no puede ser mayor al total a pagar" });
          }

          const expirationDate = new Date(quotaInput.expirationDate);
          if (Number.isNaN(expirationDate.getTime())) {
            throw new BadRequestException({ type: "error", message: "Fecha de expiracion invalida" });
          }

          const paymentDate = quotaInput.paymentDate ? new Date(quotaInput.paymentDate) : undefined;
          if (paymentDate && Number.isNaN(paymentDate.getTime())) {
            throw new BadRequestException({ type: "error", message: "Fecha de pago invalida" });
          }

          const quota = new CreditQuota(
            undefined,
            quotaInput.number,
            expirationDate,
            quotaInput.totalToPay,
            quotaInput.totalPaid ?? 0,
            paymentDate,
            this.clock.now(),
          );

          let createdQuota: CreditQuota;
          try {
            createdQuota = await this.creditQuotaRepo.create(quota, tx);
          } catch {
            throw new BadRequestException({ type: "error", message: "No se pudo crear la cuota" });
          }

          const link = new CreditQuotaPurchase(createdQuota.quotaId, updated.poId);
          try {
            await this.creditQuotaPurchaseRepo.create(link, tx);
          } catch {
            throw new BadRequestException({ type: "error", message: "No se pudo vincular la cuota a la orden de compra" });
          }
        }
      }

      return { type: "success", message: "Orden de compra actualizada con exito" };
    });
  }

  private hasQuotaChanges(existing: CreditQuota[], input: CreateCreditQuotaInput[]): boolean {
    if (existing.length !== input.length) return true;

    const byNumber = new Map(existing.map((q) => [q.number, q]));
    for (const item of input) {
      const match = byNumber.get(item.number);
      if (!match) return true;

      if (match.totalToPay !== item.totalToPay) return true;
      if (match.totalPaid !== (item.totalPaid ?? 0)) return true;

      const exp = new Date(item.expirationDate);
      if (Number.isNaN(exp.getTime())) return true;
      if (match.expirationDate.getTime() !== exp.getTime()) return true;

      const pay = item.paymentDate ? new Date(item.paymentDate) : undefined;
      const payTime = pay ? pay.getTime() : undefined;
      const matchPay = match.paymentDate ? match.paymentDate.getTime() : undefined;
      if (payTime !== matchPay) return true;
    }
    return false;
  }
}
