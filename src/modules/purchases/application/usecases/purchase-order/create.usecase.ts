import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PurchaseOrder } from "src/modules/purchases/domain/entities/purchase-order";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { CreatePurchaseOrderInput } from "../../dtos/purchase-order/input/create.input";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { CLOCK, ClockPort } from "src/modules/inventory/application/ports/clock.port";
import { PurchaseOrderFactory } from "src/modules/purchases/domain/factories/purchase-order.factory";
import { PurchaseOrderItemFactory } from "src/modules/purchases/domain/factories/purchase-order-item.factory";
import { DomainError } from "src/modules/purchases/domain/errors/domain.error";
import { PaymentsFactory } from "src/modules/payments/domain/factories/payments.factory";
import { CreditQuotaNotFoundError } from "src/modules/payments/application/errors/credit-quota-not-found.error";

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
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CreatePurchaseOrderInput, createdBy: string): Promise<{ order: PurchaseOrder }> {
    return this.uow.runInTransaction(async (tx) => {
      const currency = input.currency ?? "PEN";

      let data: PurchaseOrder;
      try {
        data = PurchaseOrderFactory.createNew({
          supplierId: input.supplierId,
          warehouseId: input.warehouseId,
          creditDays: input.creditDays,
          numQuotas: input.numQuotas,
          totalTaxed: input.totalTaxed ?? 0,
          totalExempted: input.totalExempted ?? 0,
          totalIgv: input.totalIgv ?? 0,
          purchaseValue: input.purchaseValue ?? 0,
          total: input.total ?? 0,
          documentType: input.documentType,
          serie: input.serie,
          correlative: input.correlative,
          currency: input.currency,
          paymentForm: input.paymentForm,
          note: input.note,
          status: input.status,
          isActive: input.isActive ?? true,
          expectedAt: input.expectedAt,
          dateIssue: input.dateIssue,
          dateExpiration: input.dateExpiration,
          createdBy,
        });
      } catch (err) {
        if (err instanceof DomainError || (err as any)?.name === "InvalidMoneyError") {
          throw new BadRequestException((err as Error).message);
        }
        throw err;
      }

      let po: PurchaseOrder;
      try {
        po = await this.purchaseRepo.create(data, tx);
      } catch {
        throw new BadRequestException("No se pudo crear la orden de compra");
      }

      if (input.items && input.items.length > 0) {
        for (const item of input.items) {
          let orderItem;
          try {
            orderItem = PurchaseOrderItemFactory.createNew({
              poId: po.poId,
              stockItemId: item.stockItemId as any,
              unitBase: item.unitBase as any,
              equivalence: item.equivalence as any,
              factor: item.factor as any,
              afectType: item.afectType as any,
              quantity: item.quantity as any,
              porcentageIgv: item.porcentageIgv ?? 0,
              baseWithoutIgv: item.baseWithoutIgv ?? 0,
              amountIgv: item.amountIgv ?? 0,
              unitValue: item.unitValue ?? 0,
              unitPrice: item.unitPrice ?? 0,
              purchaseValue: item.purchaseValue ?? 0,
              currency: currency as any,
            });
          } catch (err) {
            if (err instanceof DomainError || (err as any)?.name === "InvalidMoneyError") {
              throw new BadRequestException((err as Error).message);
            }
            throw err;
          }

          try {
            await this.itemRepo.add(orderItem, tx);
          } catch {
            throw new BadRequestException("No se pudo agregar items a la orden de compra");
          }
        }
      }

      if (po.paymentForm === PaymentFormType.CONTADO && input.payments && input.payments.length > 0) {
        for (const payment of input.payments) {
          if (payment.amount <= 0) {
            throw new BadRequestException("Monto inválido");
          }

          const payDate = new Date(payment.date);
          if (Number.isNaN(payDate.getTime())) {
            throw new BadRequestException("Fecha inválida");
          }

          if (payment.quotaId) {
            const quota = await this.creditQuotaRepo.findById(payment.quotaId, tx);
            if (!quota) {
              throw new NotFoundException(new CreditQuotaNotFoundError().message);
            }

            if (!quota.poId) {
              throw new BadRequestException("La cuota no tiene orden de compra asociada");
            }

            if (quota.poId !== po.poId) {
              throw new BadRequestException("La cuota no pertenece a la orden de compra indicada");
            }
          }

          const document = PaymentsFactory.createPaymentDocument({
            method: payment.method,
            date: payDate,
            currency: payment.currency,
            amount: payment.amount,
            fromDocumentType: PayDocType.PURCHASE,
            operationNumber: payment.operationNumber,
            note: payment.note,
            poId: po.poId,
            quotaId: payment.quotaId,
          });

          try {
            await this.paymentDocRepo.create(document, tx);
          } catch {
            throw new BadRequestException("No se pudo crear el documento de pago");
          }
        }
      }

      if (po.paymentForm === PaymentFormType.CREDITO) {
        if (!input.quotas || input.quotas.length === 0) {
          throw new BadRequestException("Debe registrar al menos una cuota");
        }

        for (const quotaInput of input.quotas) {
          if (quotaInput.totalPaid !== undefined && quotaInput.totalPaid > quotaInput.totalToPay) {
            throw new BadRequestException("El total pagado no puede ser mayor al total a pagar");
          }

          const expirationDate = new Date(quotaInput.expirationDate);
          if (Number.isNaN(expirationDate.getTime())) {
            throw new BadRequestException("Fecha de expiración inválida");
          }

          const paymentDate = quotaInput.paymentDate ? new Date(quotaInput.paymentDate) : undefined;
          if (paymentDate && Number.isNaN(paymentDate.getTime())) {
            throw new BadRequestException("Fecha de pago inválida");
          }

          const quota = PaymentsFactory.createCreditQuota({
            number: quotaInput.number,
            expirationDate,
            totalToPay: quotaInput.totalToPay,
            totalPaid: quotaInput.totalPaid ?? 0,
            fromDocumentType: PayDocType.PURCHASE,
            paymentDate,
            createdAt: this.clock.now(),
            poId: po.poId,
          });

          try {
            await this.creditQuotaRepo.create(quota, tx);
          } catch {
            throw new BadRequestException("No se pudo crear la cuota");
          }
        }
      }

      return { order: po };
    });
  }
}
