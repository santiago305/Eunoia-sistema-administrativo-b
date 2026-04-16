import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { UpdatePurchaseOrderInput } from "../../dtos/purchase-order/input/update.input";
import { Money } from "src/shared/value-objets/money.vo";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { CreateCreditQuotaInput } from "src/modules/payments/application/dtos/credit-quota/input/create.input";
import { DeletePaymentUsecase } from "src/modules/payments/application/usecases/payment/delete.usecase";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { PurchaseOrderItemFactory } from "src/modules/purchases/domain/factories/purchase-order-item.factory";
import { PurchaseOrderId } from "src/modules/purchases/domain/value-objects/purchase-order-id.vo";
import { PurchaseSupplierId } from "src/modules/purchases/domain/value-objects/purchase-supplier-id.vo";
import { PurchaseWarehouseId } from "src/modules/purchases/domain/value-objects/purchase-warehouse-id.vo";
import { PurchaseCreditDays } from "src/modules/purchases/domain/value-objects/credit-days.vo";
import { PurchaseNumQuotas } from "src/modules/purchases/domain/value-objects/num-quotas.vo";
import { PurchaseOrderDocument } from "src/modules/purchases/domain/value-objects/purchase-order-document.vo";
import { PurchaseExpectedAt } from "src/modules/purchases/domain/value-objects/expected-at.vo";
import { PurchaseIssueDate } from "src/modules/purchases/domain/value-objects/issue-date.vo";
import { PurchaseExpirationDate } from "src/modules/purchases/domain/value-objects/expiration-date.vo";
import { DomainError } from "src/modules/purchases/domain/errors/domain.error";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PaymentsFactory } from "src/modules/payments/domain/factories/payments.factory";
import { CreditQuota } from "src/modules/payments/domain/entity/credit-quota";
import { PurchaseOrderNotFoundApplicationError } from "../../errors/purchase-order-not-found.error";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, ProductCatalogStockItemRepository } from "src/modules/product-catalog/domain/ports/stock-item.repository";
import { CreateProductCatalogStockItem } from "src/modules/product-catalog/application/usecases/create-stock-item.usecase";
import { errorResponse } from "src/shared/response-standard/response";

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
    private readonly deletePayment: DeletePaymentUsecase,
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: ProductCatalogStockItemRepository,
    private readonly createStockItem: CreateProductCatalogStockItem,
  ) {}

  async execute(input: UpdatePurchaseOrderInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      let poId: string;
      let supplierId: string | undefined;
      let warehouseId: string | undefined;
      let creditDays: number | undefined;
      let numQuotas: number | undefined;
      let expectedAt: Date | undefined;
      let dateIssue: Date | undefined;
      let dateExpiration: Date | undefined;
      let document: PurchaseOrderDocument | null | undefined;

      try {
        poId = new PurchaseOrderId(input.poId).value;
        if (input.supplierId !== undefined) supplierId = new PurchaseSupplierId(input.supplierId).value;
        if (input.warehouseId !== undefined) warehouseId = new PurchaseWarehouseId(input.warehouseId).value;
        if (input.creditDays !== undefined) creditDays = PurchaseCreditDays.create(input.creditDays).value;
        if (input.numQuotas !== undefined) numQuotas = PurchaseNumQuotas.create(input.numQuotas).value;

        const hasDoc =
          input.documentType !== undefined || input.serie !== undefined || input.correlative !== undefined;
        if (hasDoc) {
          document = PurchaseOrderDocument.create({
            documentType: input.documentType,
            serie: input.serie,
            correlative: input.correlative,
          });
        }

        expectedAt = input.expectedAt ? PurchaseExpectedAt.create(input.expectedAt) : undefined;
        dateIssue = input.dateIssue ? PurchaseIssueDate.create(input.dateIssue) : undefined;
        dateExpiration = input.dateExpiration ? PurchaseExpirationDate.create(input.dateExpiration) : undefined;
      } catch (err) {
        if (err instanceof DomainError || (err as any)?.name === "InvalidMoneyError") {
          throw new BadRequestException((err as Error).message);
        }
        throw err;
      }
      const current = await this.purchaseRepo.findById(poId, tx);
      if (!current) {
        throw new NotFoundException(new PurchaseOrderNotFoundApplicationError().message);
      }

      const currency = input.currency ?? current.currency ?? CurrencyType.PEN;
      let totalTaxed: Money | undefined;
      let totalExempted: Money | undefined;
      let totalIgv: Money | undefined;
      let purchaseValue: Money | undefined;
      let total: Money | undefined;

      try {
        totalTaxed = input.totalTaxed !== undefined ? Money.create(input.totalTaxed, currency) : undefined;
        totalExempted = input.totalExempted !== undefined ? Money.create(input.totalExempted, currency) : undefined;
        totalIgv = input.totalIgv !== undefined ? Money.create(input.totalIgv, currency) : undefined;
        purchaseValue = input.purchaseValue !== undefined ? Money.create(input.purchaseValue, currency) : undefined;
        total = input.total !== undefined ? Money.create(input.total, currency) : undefined;
      } catch (err) {
        if (err instanceof DomainError || (err as any)?.name === "InvalidMoneyError") {
          throw new BadRequestException((err as Error).message);
        }
        throw err;
      }

      const updated = await this.purchaseRepo.update(
        {
          poId,
          supplierId,
          warehouseId,
          documentType: document ? document.documentType : undefined,
          serie: document ? document.serie : undefined,
          correlative: document ? document.correlative : undefined,
          currency: input.currency ?? current.currency ?? CurrencyType.PEN,
          paymentForm: input.paymentForm,
          creditDays,
          numQuotas,
          totalTaxed,
          totalExempted,
          totalIgv,
          purchaseValue,
          total,
          note: input.note,
          status: input.status,
          expectedAt,
          dateIssue,
          dateExpiration,
        },
        tx,
      );

      if (!updated) {
        throw new NotFoundException(new PurchaseOrderNotFoundApplicationError().message);
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
        try {
          await this.itemRepo.removeByPurchaseId(poId, tx);
        } catch {
          throw new BadRequestException(errorResponse("No se pudo eliminar items de la orden de compra"));
        }

        if (input.items.length > 0) {
          for (const item of input.items) {
            if (!item.skuId && !item.stockItemId) {
              throw new BadRequestException(errorResponse("Debe enviar skuId o stockItemId en el item"));
            }

            let stockItemId: string;
            if (item.stockItemId) {
              stockItemId = item.stockItemId;
            } else {
              let stockItem = await this.stockItemRepo.findBySkuId(item.skuId!, tx);
              if (!stockItem) {
                stockItem = await this.createStockItem.execute(
                  { skuId: item.skuId!, isActive: true },
                  tx,
                );
              }
              if (!stockItem.id) {
                throw new BadRequestException(errorResponse("No se pudo resolver el stockItemId para el skuId indicado"));
              }
              stockItemId = stockItem.id;
            }

            let orderItem;
            try {
              orderItem = PurchaseOrderItemFactory.createNew({
                poId: updated.poId,
                stockItemId,
                unitBase: item.unitBase,
                equivalence: item.equivalence,
                factor: item.factor,
                afectType: item.afectType     ,
                quantity: item.quantity,
                porcentageIgv: item.porcentageIgv ?? 0,
                baseWithoutIgv: item.baseWithoutIgv ?? 0,
                amountIgv: item.amountIgv ?? 0,
                unitValue: item.unitValue ?? 0,
                unitPrice: item.unitPrice ?? 0,
                purchaseValue: item.purchaseValue ?? 0,
                currency: itemCurrency as any,
              });

              await this.itemRepo.add(orderItem, tx);
            } catch (err) {
              throw new BadRequestException(errorResponse("Error al crear items"));
            }
          }
        }
      }

      const shouldDeletePayments =
        (!isCredit && input.payments !== undefined) ||
        (isCredit && input.quotas !== undefined && quotasChanged);

      if (shouldDeletePayments) {
        const existingPayments = await this.paymentDocRepo.findByPoId(updated.poId, tx);
        for (const payment of existingPayments) {
          try {
            await this.deletePayment.execute(payment.payDocId, tx);
          } catch {
            throw new BadRequestException("No se pudo eliminar pagos de la orden de compra");
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
            throw new BadRequestException("No se pudo eliminar cuotas de la orden de compra");
          }
        }
      }

      if (updated.paymentForm === PaymentFormType.CONTADO && input.payments && input.payments.length > 0) {
        for (const payment of input.payments) {
          if (payment.amount <= 0) {
            throw new BadRequestException("Monto invalido");
          }

          const payDate = new Date(payment.date);
          if (Number.isNaN(payDate.getTime())) {
            throw new BadRequestException("Fecha invalida");
          }

          if (payment.quotaId) {
            const quota = await this.creditQuotaRepo.findById(payment.quotaId, tx);
            if (!quota) {
              throw new NotFoundException("Cuota no encontrada");
            }

            if (!quota.poId) {
              throw new BadRequestException("La cuota no tiene orden de compra asociada");
            }

            if (quota.poId !== updated.poId) {
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
            poId: updated.poId,
            quotaId: payment.quotaId,
          });

          try {
            await this.paymentDocRepo.create(document, tx);
          } catch {
            throw new BadRequestException("No se pudo crear el documento de pago");
          }
        }
      }

      if (updated.paymentForm === PaymentFormType.CREDITO && input.quotas !== undefined && quotasChanged) {
        if (input.quotas.length === 0) {
          throw new BadRequestException("Debe registrar al menos una cuota");
        }

        for (const quotaInput of input.quotas) {
          if (quotaInput.totalPaid !== undefined && quotaInput.totalPaid > quotaInput.totalToPay) {
            throw new BadRequestException("El total pagado no puede ser mayor al total a pagar");
          }

          const expirationDate = new Date(quotaInput.expirationDate);
          if (Number.isNaN(expirationDate.getTime())) {
            throw new BadRequestException("Fecha de expiracion invalida");
          }

          const paymentDate = quotaInput.paymentDate ? new Date(quotaInput.paymentDate) : undefined;
          if (paymentDate && Number.isNaN(paymentDate.getTime())) {
            throw new BadRequestException("Fecha de pago invalida");
          }

          const quota = PaymentsFactory.createCreditQuota({
            number: quotaInput.number,
            expirationDate,
            totalToPay: quotaInput.totalToPay,
            totalPaid: quotaInput.totalPaid ?? 0,
            fromDocumentType: PayDocType.PURCHASE,
            paymentDate,
            createdAt: this.clock.now(),
            poId: updated.poId,
          });

          try {
            await this.creditQuotaRepo.create(quota, tx);
          } catch {
            throw new BadRequestException("No se pudo crear la cuota");
          }
        }
      }

      return {type:"success", message: "Orden de compra actualizada con exito" };
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

