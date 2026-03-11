import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PurchaseOrder } from "src/modules/purchases/domain/entities/purchase-order";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { CreatePurchaseOrderInput } from "../../dtos/purchase-order/input/create.input";
import { Money } from "src/modules/catalog/domain/value-object/money.vo";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { PurchaseOrderItem } from "src/modules/purchases/domain/entities/purchase-order-item";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PaymentDocument } from "src/modules/payments/domain/entity/payment-document";
import { PaymentPurchase } from "src/modules/payments/domain/entity/payment-purchase";
import { CreditQuota } from "src/modules/payments/domain/entity/credit-quota";
import { CreditQuotaPurchase } from "src/modules/payments/domain/entity/credit-quota-purchase";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { PAYMENT_PURCHASE_REPOSITORY, PaymentPurchaseRepository } from "src/modules/payments/domain/ports/payment-purchase.repository";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { CREDIT_QUOTA_PURCHASE_REPOSITORY, CreditQuotaPurchaseRepository } from "src/modules/payments/domain/ports/credit-quota-purchase.repository";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";

export class CreatePurchaseOrderUsecase {
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
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
    @Inject(CREDIT_QUOTA_PURCHASE_REPOSITORY)
    private readonly creditQuotaPurchaseRepo: CreditQuotaPurchaseRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CreatePurchaseOrderInput): Promise<{ order: PurchaseOrder }> {
    return this.uow.runInTransaction(async (tx) => {
      const currency = input.currency ?? "PEN";
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

      const data = new PurchaseOrder(
        undefined,
        input.supplierId,
        input.warehouseId,
        input.creditDays ?? 0,
        input.numQuotas ?? 0,
        Money.create(input.totalTaxed ?? 0, currency),
        Money.create(input.totalExempted ?? 0, currency),
        Money.create(input.totalIgv ?? 0, currency),
        Money.create(input.purchaseValue ?? 0, currency),
        Money.create(input.total ?? 0, currency),
        input.documentType,
        input.serie,
        input.correlative,
        input.currency,
        input.paymentForm,
        input.note,
        input.status,
        input.isActive ?? true,
        expectedAt,
        dateIssue,
        dateExpiration,
        undefined,
      );

      let po: PurchaseOrder;
      try {
        po = await this.purchaseRepo.create(data, tx);
      } catch {
        throw new BadRequestException({
          type: "error",
          message: "No se pudo crear la orden de compra",
        });
      }

      if (input.items && input.items.length > 0) {
        for (const item of input.items) {
          const orderItem = new PurchaseOrderItem(
            undefined,
            po.poId,
            item.stockItemId,
            item.unitBase,
            item.equivalence,
            item.factor,
            item.afectType,
            item.quantity,
            Money.create(item.porcentageIgv ?? 0, currency),
            Money.create(item.baseWithoutIgv ?? 0, currency),
            Money.create(item.amountIgv ?? 0, currency),
            Money.create(item.unitValue ?? 0, currency),
            Money.create(item.unitPrice ?? 0, currency),
            Money.create(item.purchaseValue ?? 0, currency),
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

      if (po.paymentForm === PaymentFormType.CONTADO && input.payments && input.payments.length > 0) {
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

            if (link.poId !== po.poId) {
              throw new BadRequestException({ type: "error", message: "La cuota no pertenece a la orden de compra indicada" });
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

          const purchaseLink = new PaymentPurchase(createdDoc.payDocId, po.poId, payment.quotaId);
          try {
            await this.paymentPurchaseRepo.create(purchaseLink, tx);
          } catch {
            throw new BadRequestException({ type: "error", message: "No se pudo vincular el pago a la orden de compra" });
          }
        }
      }

      if (po.paymentForm === PaymentFormType.CREDITO) {
        if (!input.quotas || input.quotas.length === 0) {
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

          const link = new CreditQuotaPurchase(createdQuota.quotaId, po.poId);
          try {
            await this.creditQuotaPurchaseRepo.create(link, tx);
          } catch {
            throw new BadRequestException({ type: "error", message: "No se pudo vincular la cuota a la orden de compra" });
          }
        }
      }

      return { order: po };
    });
  }
}
