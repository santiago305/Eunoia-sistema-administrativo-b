import { BadRequestException, Inject, NotFoundException, Optional } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PurchaseOrder } from "src/modules/purchases/domain/entities/purchase-order";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { CreatePurchaseOrderInput } from "../../dtos/purchase-order/input/create.input";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { PurchaseOrderFactory } from "src/modules/purchases/domain/factories/purchase-order.factory";
import { PurchaseOrderItemFactory } from "src/modules/purchases/domain/factories/purchase-order-item.factory";
import { DomainError } from "src/modules/purchases/domain/errors/domain.error";
import { PaymentsFactory } from "src/modules/payments/domain/factories/payments.factory";
import { PaymentDocument } from "src/modules/payments/domain/entity/payment-document";
import { CreditQuotaNotFoundError } from "src/modules/payments/application/errors/credit-quota-not-found.error";
import { CreateProductCatalogStockItem } from "src/modules/product-catalog/application/usecases/create-stock-item.usecase";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, ProductCatalogStockItemRepository } from "src/modules/product-catalog/domain/ports/stock-item.repository";
import { PurchaseUnitConversionService } from "../../services/purchase-unit-conversion.service";
import { NotificationsService } from "src/modules/mail/application/use-cases/notifications.service";
import { PURCHASE_NOTIFICATION_TYPES } from "src/modules/mail/domain/constants/purchase-notification-types";
import { CreateAccountPayableUsecase } from "src/modules/accounts-payable";
import { PurchaseItemType } from "src/modules/purchases/domain/value-objects/purchase-item-type";
import { PurchaseHistoryService } from "../../services/purchase-history.service";

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
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: ProductCatalogStockItemRepository,
    private readonly createStockItem: CreateProductCatalogStockItem,
    private readonly purchaseUnitConversionService: PurchaseUnitConversionService,
    private readonly notificationsService: NotificationsService,
    @Optional()
    private readonly createAccountPayable?: CreateAccountPayableUsecase,
    @Optional()
    private readonly history?: PurchaseHistoryService,
  ) {}

  async execute(
    input: CreatePurchaseOrderInput,
    createdBy: string,
    options?: {
      allowDirectPaymentCreation?: boolean;
    },
  ): Promise<{
    order: PurchaseOrder;
    pendingPaymentsCreated: number;
    directPaymentsCreated: number;
    createdPayments: PaymentDocument[];
  }> {
    const result = await this.uow.runInTransaction(async (tx) => {
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
          purchaseType: input.purchaseType,
          receptionStatus: input.receptionStatus,
          paymentStatus: input.paymentStatus,
          isRecurringSource: input.isRecurringSource,
          recurringTemplateId: input.recurringTemplateId,
          requiresReceipt: input.requiresReceipt,
          requiresStockEntry: input.requiresStockEntry,
          requiresAssetCreation: input.requiresAssetCreation,
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
          const itemType = item.itemType ?? PurchaseItemType.PRODUCT;
          const affectsStock = item.affectsStock ?? ![PurchaseItemType.SERVICE, PurchaseItemType.SUBSCRIPTION].includes(itemType);
          let stockItemId: string | undefined;
          let unitBase = item.unitBase ?? "";
          let equivalence = item.equivalence ?? "";
          let factor = item.factor ?? 1;

          if (affectsStock) {
            if (!item.skuId && !item.stockItemId) {
              throw new BadRequestException("Debe enviar skuId o stockItemId en items que afectan stock");
            }

            if (item.stockItemId) {
              const stockItem = await this.stockItemRepo.findById(item.stockItemId, tx);
              if (!stockItem?.skuId) {
                throw new BadRequestException("No se pudo resolver sku para el stockItem indicado");
              }
              stockItemId = stockItem.id;
              const conversion = await this.purchaseUnitConversionService.resolveFactor({
                skuId: stockItem.skuId,
                unitBase: item.unitBase,
                factor: item.factor,
                tx,
              });
              unitBase = conversion.unitBase ?? unitBase;
              equivalence = conversion.equivalence ?? equivalence;
              factor = conversion.factor;
            } else {
              let stockItem = await this.stockItemRepo.findBySkuId(item.skuId!, tx);
              if(!stockItem){
                stockItem = await this.createStockItem.execute(
                {
                  skuId: item.skuId!,
                  isActive: true,
                },
                tx,
              );
              }
              stockItemId = stockItem.id;
              const conversion = await this.purchaseUnitConversionService.resolveFactor({
                skuId: item.skuId!,
                unitBase: item.unitBase,
                factor: item.factor,
                tx,
              });
              unitBase = conversion.unitBase ?? unitBase;
              equivalence = conversion.equivalence ?? equivalence;
              factor = conversion.factor;
            }
          }
          try {
            orderItem = PurchaseOrderItemFactory.createNew({
              poId: po.poId,
              stockItemId,
              unitBase,
              equivalence,
              factor,
              afectType: item.afectType,
              quantity: item.quantity,
              porcentageIgv: item.porcentageIgv ?? 0,
              baseWithoutIgv: item.baseWithoutIgv ?? 0,
              amountIgv: item.amountIgv ?? 0,
              unitValue: item.unitValue ?? 0,
              unitPrice: item.unitPrice ?? 0,
              purchaseValue: item.purchaseValue ?? 0,
              itemType,
              internalMaterialId: item.internalMaterialId,
              assetCategoryId: item.assetCategoryId,
              serviceName: item.serviceName,
              description: item.description,
              warehouseId: item.warehouseId ?? input.warehouseId,
              affectsStock,
              generatesAsset: item.generatesAsset ?? itemType === PurchaseItemType.FIXED_ASSET,
              isService: item.isService ?? itemType === PurchaseItemType.SERVICE,
              isSubscription: item.isSubscription ?? itemType === PurchaseItemType.SUBSCRIPTION,
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

      let pendingPaymentsCreated = 0;
      let directPaymentsCreated = 0;
      let quotasCreated = 0;
      let paidQuotas = 0;
      const createdPayments: PaymentDocument[] = [];
      if (po.paymentForm === PaymentFormType.CONTADO && input.payments && input.payments.length > 0) {
        const allowDirectPaymentCreation = options?.allowDirectPaymentCreation ?? false;
        let paymentsCreated = 0;
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
            status: allowDirectPaymentCreation ? "APPROVED" : "PENDING_APPROVAL",
            requestedByUserId: createdBy,
            approvedByUserId: allowDirectPaymentCreation ? createdBy : undefined,
            approvedAt: allowDirectPaymentCreation ? this.clock.now() : undefined,
          });

          try {
            const createdPayment = await this.paymentDocRepo.create(document, tx);
            if (createdPayment) createdPayments.push(createdPayment);
            paymentsCreated += 1;
            if (allowDirectPaymentCreation) directPaymentsCreated += 1;
            else pendingPaymentsCreated += 1;
            await this.history?.recordPayment({
              purchaseId: po.poId,
              eventType: allowDirectPaymentCreation ? "PAYMENT_REGISTERED" : "PAYMENT_REQUESTED",
              description: allowDirectPaymentCreation
                ? "Se registró un pago de la compra."
                : "Se solicitó registrar un pago pendiente de aprobación.",
              performedByUserId: createdBy,
              targetUserId: allowDirectPaymentCreation ? null : createdBy,
              metadata: {
                paymentId: createdPayment?.payDocId ?? null,
                amount: payment.amount,
                currency: payment.currency,
                method: payment.method,
                operationNumber: payment.operationNumber ?? null,
                quotaId: payment.quotaId ?? null,
                status: allowDirectPaymentCreation ? "APPROVED" : "PENDING_APPROVAL",
              },
              tx,
            });
          } catch {
            throw new BadRequestException("No se pudo crear el documento de pago");
          }
        }

        const purchaseCode = [po.serie, po.correlative].filter(Boolean).join("-") || po.poId.slice(0, 8);
        await this.notificationsService.createNotificationForUsers({
          recipientUserIds: [createdBy],
          type: allowDirectPaymentCreation
            ? PURCHASE_NOTIFICATION_TYPES.PURCHASE_PAYMENT_CREATED
            : PURCHASE_NOTIFICATION_TYPES.PURCHASE_PAYMENT_PENDING_APPROVAL,
          category: "PURCHASES",
          title: allowDirectPaymentCreation ? "Compra creada" : "Compra enviada",
          message: allowDirectPaymentCreation
            ? "Pago registrado."
            : "En espera de confirmación.",
          priority: "NORMAL",
          actionUrl: "/compras",
          actionLabel: "Ver compra",
          sourceModule: "purchases",
          sourceEntityType: "purchase_order",
          sourceEntityId: po.poId,
          metadata: {
            poId: po.poId,
            purchaseCode,
            paymentsCreated,
            paymentForm: po.paymentForm,
          },
        });
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
            const createdQuota = await this.creditQuotaRepo.create(quota, tx);
            if (this.createAccountPayable) {
              await this.createAccountPayable.execute(
                {
                  purchaseId: po.poId,
                  quotaId: createdQuota.quotaId,
                  supplierId: po.supplierId,
                  description: `Cuota ${quotaInput.number}`,
                  currency: currency as any,
                  amountTotal: quotaInput.totalToPay,
                  dueDate: expirationDate,
                  createdByUserId: createdBy,
                },
                tx,
              );
            }
            quotasCreated += 1;
            if ((quotaInput.totalPaid ?? 0) > 0) {
              paidQuotas += 1;
            }
            await this.history?.record({
              purchaseId: po.poId,
              eventType: "PURCHASE_QUOTA_CREATED",
              description: "Se registró una cuota de crédito de la compra.",
              performedByUserId: createdBy,
              metadata: {
                quotaId: createdQuota.quotaId,
                number: quotaInput.number,
                totalToPay: quotaInput.totalToPay,
                totalPaid: quotaInput.totalPaid ?? 0,
                expirationDate,
                paymentDate: paymentDate ?? null,
              },
            }, tx);
          } catch {
            throw new BadRequestException("No se pudo crear la cuota");
          }
        }

        const purchaseCode = [po.serie, po.correlative].filter(Boolean).join("-") || po.poId.slice(0, 8);
        await this.notificationsService.createNotificationForUsers({
          recipientUserIds: [createdBy],
          type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_QUOTA_CREATED,
          category: "PURCHASES",
          title: "Compra creada",
          message: "Cuotas registradas.",
          priority: "NORMAL",
          actionUrl: "/compras",
          actionLabel: "Ver compra",
          sourceModule: "purchases",
          sourceEntityType: "purchase_order",
          sourceEntityId: po.poId,
          metadata: {
            poId: po.poId,
            purchaseCode,
            quotasCreated,
            paidQuotas,
            paymentForm: po.paymentForm,
          },
        });

        if (paidQuotas > 0) {
          await this.notificationsService.createNotificationForUsers({
            recipientUserIds: [createdBy],
            type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_QUOTA_PAID,
            category: "PURCHASES",
            title: "Compra creada",
            message: "Pago inicial registrado.",
            priority: "NORMAL",
            actionUrl: "/compras",
            actionLabel: "Ver compra",
            sourceModule: "purchases",
            sourceEntityType: "purchase_order",
            sourceEntityId: po.poId,
            metadata: {
              poId: po.poId,
              purchaseCode,
              paidQuotas,
              paymentForm: po.paymentForm,
            },
          });
        }
      }

      await this.history?.recordCreated({
        purchaseId: po.poId,
        performedByUserId: createdBy,
        snapshot: this.purchaseSnapshot(po),
        metadata: {
          itemsCount: input.items?.length ?? 0,
          paymentsRequested: pendingPaymentsCreated,
          directPaymentsCreated,
          quotasCreated,
          paidQuotas,
          items: (input.items ?? []).map((item) => ({
            skuId: item.skuId ?? null,
            stockItemId: item.stockItemId ?? null,
            itemType: item.itemType ?? PurchaseItemType.PRODUCT,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            purchaseValue: item.purchaseValue,
            affectsStock: item.affectsStock ?? null,
          })),
        },
        tx,
      });

      return { order: po, pendingPaymentsCreated, directPaymentsCreated, createdPayments };
    });

    const purchaseCode = [result.order.serie, result.order.correlative].filter(Boolean).join("-") || result.order.poId.slice(0, 8);
    await this.notificationsService.createNotificationForUsers({
      recipientUserIds: [createdBy],
      type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_CREATED,
      category: "PURCHASES",
      title: result.pendingPaymentsCreated > 0 ? "Compra enviada" : "Compra creada",
      message: result.pendingPaymentsCreated > 0
        ? "En espera de confirmación."
        : `Se creó la compra ${purchaseCode} por ${result.order.total.getAmount().toFixed(2)} ${result.order.currency ?? "PEN"}.`,
      priority: "NORMAL",
      actionUrl: `/compras`,
      actionLabel: "Ver compra",
      sourceModule: "purchases",
      sourceEntityType: "purchase_order",
      sourceEntityId: result.order.poId,
      metadata: {
        poId: result.order.poId,
        purchaseCode,
        status: result.order.status,
        total: result.order.total.getAmount(),
        currency: result.order.currency ?? "PEN",
        paymentForm: result.order.paymentForm ?? null,
      },
    });

    return result;
  }

  private purchaseSnapshot(order: PurchaseOrder): Record<string, unknown> {
    return {
      poId: order.poId,
      supplierId: order.supplierId,
      warehouseId: order.warehouseId ?? null,
      documentType: order.documentType ?? null,
      serie: order.serie ?? null,
      correlative: order.correlative ?? null,
      currency: order.currency ?? null,
      paymentForm: order.paymentForm ?? null,
      status: order.status,
      purchaseType: order.purchaseType,
      receptionStatus: order.receptionStatus,
      paymentStatus: order.paymentStatus,
      totalTaxed: this.moneyAmount(order.totalTaxed),
      totalExempted: this.moneyAmount(order.totalExempted),
      totalIgv: this.moneyAmount(order.totalIgv),
      purchaseValue: this.moneyAmount(order.purchaseValue),
      total: this.moneyAmount(order.total),
      note: order.note ?? null,
      expectedAt: order.expectedAt ?? null,
      dateIssue: order.dateIssue ?? null,
      dateExpiration: order.dateExpiration ?? null,
      createdBy: order.createdBy ?? null,
    };
  }

  private moneyAmount(value: { getAmount?: () => number } | undefined): number | null {
    return typeof value?.getAmount === "function" ? value.getAmount() : null;
  }
}

